// /controllers/review.js
import Review from '../models/review.js'
import { findRestaurantByParam } from '../utils/restaurant.js'
import { updateRestaurantScores } from '../utils/review.js'
import { StatusCodes } from 'http-status-codes'

// 取得特定餐廳的所有評論
// 一般使用者：取得特定餐廳的所有評論（不含軟刪除）
export const getReviewsByRestaurantId = async (req, res) => {
  try {
    const restaurant = await findRestaurantByParam(req.params.id)

    if (!restaurant) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到該餐廳' })
    }

    const query = { restaurant: restaurant._id }
    // 如果使用者不是管理員，只顯示未被軟刪除的評論
    if (req.user.role !== 'admin') {
      query.isDeleted = false
    }

    // 預設只顯示未被軟刪除的評論
    // const reviews = await Review.find({ restaurant: restaurant._id, isDeleted: false })
    // const reviews = await Review.find(query)
    //   .populate('user', 'account')
    //   .sort({ createdAt: -1 })
    //   .exec()

    // res.status(StatusCodes.OK).json({ success: true, result: reviews })
    const reviews = await Review.find(query)
      .populate('user', 'account') // user 欄位只帶 account
      .sort({ createdAt: -1 })
      .lean() // ⭐️ 轉換為 plain object，才能修改屬性

    // 處理匿名評論顯示
    const result = reviews.map((review) => {
      if (review.isAnonymous) {
        review.user = { account: '匿名使用者' }
      }
      return review
    })

    res.status(StatusCodes.OK).json({ success: true, result })

  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// 取得全部評論（含軟刪除）
// 僅限管理員
export const getAllReviews = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: '沒有權限' })
    }

    const reviews = await Review.find({})
      .populate('user', 'account')
      .populate('restaurant', 'name') // 顯示餐廳名稱
      .sort({ createdAt: -1 })

    res.status(StatusCodes.OK).json({ success: true, result: reviews })
  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// 取得特定餐廳的評論統計資訊
export const getReviewStatsByRestaurantId = async (req, res) => {
  try {
    const restaurant = await findRestaurantByParam(req.params.id)

    if (!restaurant) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到該餐廳' })
    }

    const stats = await Review.aggregate([
      { $match: { restaurant: restaurant._id, isDeleted: false } },
      {
        $group: {
          _id: '$restaurant',
          averageScore: { $avg: '$score' },
          reviewCount: { $sum: 1 },
        },
      },
    ])

    // 如果沒評論
    if (stats.length === 0) {
      return res.status(StatusCodes.OK).json({
        success: true,
        result: {
          averageScore: 0,
          reviewCount: 0,
        },
      })
    }

    res.status(StatusCodes.OK).json({ success: true, result: stats[0] })
  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// 取得單一評論
export const getReviewById = async (req, res) => {
  try {
    const { id } = req.params
    // 取得評論時，也檢查是否被軟刪除
    // const review = await Review.findById(id).populate('user', 'account')
    const review = await Review.findOne({ _id: id, isDeleted: false }).populate('user', 'account')

    if (!review) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到該評論' })
    }

    res.status(StatusCodes.OK).json({ success: true, result: review })
  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// 新增評論 (需要登入)
export const createReview = async (req, res) => {
  // try {
  //   const { score, comment } = req.body
  //   const restaurant = await findRestaurantByParam(req.params.id) // 使用 req.params.id

  //   if (!restaurant) {
  //     return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到該餐廳' })
  //   }

  //   const newReview = await Review.create({
  //     restaurant: restaurant._id,
  //     user: req.user._id,
  //     score,
  //     comment,
  //   })

  //   // 更新餐廳的平均分數和評論總數
  //   await updateRestaurantScores(restaurant._id)

  //   res
  //     .status(StatusCodes.CREATED)
  //     .json({ success: true, message: '評論新增成功', result: newReview })
  // } catch (error) {
  //   console.error(error)
  //   if (error.code === 11000) {
  //     return res
  //       .status(StatusCodes.CONFLICT)
  //       .json({ success: false, message: '您已評論過此餐廳。' })
  //   }
  //   res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  // }
  try {
    const restaurantId = req.params.id
    const userId = req.user._id

    // 如果已經評論過就回傳 409
    const existingReview = await Review.findOne({
      restaurant: restaurantId,
      user: userId,
      // isDeleted: false,
      // 不管是否軟刪除都抓出來
    })

    // if (existingReview) {
    //   return res.status(409).json({ message: '您已評論過此餐廳，請使用編輯功能' })
    // }

    // 有留下評論（無論軟刪除與否）
    if (existingReview) {
      if (existingReview.isDeleted) {
        return res.status(409).json({ 
          success: false,
          message: '您曾評論過此餐廳，但已刪除。請編輯原評論以重新發佈。', 
          reviewId: existingReview._id // ⭐️ 也可以回傳原評論 ID，方便前端跳轉
        })
      }
    
      return res.status(409).json({ 
        success: false,
        message: '您已評論過此餐廳，請使用編輯功能。' 
      })
    }

    const newReview = new Review({
      restaurant: restaurantId,
      user: userId,
      content: req.body.content,
      // rating: req.body.rating,
      score: req.body.score,
      isAnonymous: req.body.isAnonymous || false, // ⭐️ 加這行，預設 false
    })

    await newReview.save()

    // 更新餐廳的平均分數
    await updateRestaurantScores(restaurantId)

    res.status(201).json({ message: '評論新增成功', review: newReview })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '伺服器錯誤' })
  }
}

// 修改評論
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params
    // const { score, comment } = req.body
    const { score, content, isAnonymous } = req.body

    const review = await Review.findById(id)

    if (!review) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到評論' })
    }

    // 權限檢查：必須是評論者本人或管理員
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ success: false, message: '沒有權限修改此評論' })
    }

    // review.score = score
    // // review.comment = comment
    // review.content = content
    // review.isAnonymous = isAnonymous ?? review.isAnonymous // ⭐️ 支援匿名更新

    // await review.save()

    // // 重新計算並更新餐廳分數
    // await updateRestaurantScores(review.restaurant)

    // res.status(StatusCodes.OK).json({ success: true, message: '評論更新成功', result: review })

    // 檢查是否有變動
    const hasChanged =
      review.score !== score ||
      review.content !== content ||
      review.isAnonymous !== isAnonymous
      
    if (!hasChanged) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '沒有任何變更，無需更新。',
      })
    }
    
    const oldScore = review.score
    
    // 有變才更新
    review.score = score
    review.content = content
    review.isAnonymous = isAnonymous ?? review.isAnonymous
    
    await review.save()
    
    // ⭐️ 若分數有變，才更新餐廳評分
    if (oldScore  !== score) {
      await updateRestaurantScores(review.restaurant)
    }
    
    res.status(StatusCodes.OK).json({ success: true, message: '評論更新成功', result: review })

  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// 硬刪除評論 (僅限管理員)
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params

    const review = await Review.findByIdAndDelete(id)

    if (!review) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到該評論' })
    }

    // 如果刪除成功，重新計算並更新餐廳分數
    await updateRestaurantScores(review.restaurant)

    res.status(StatusCodes.OK).json({ success: true, message: '評論已成功永久刪除' })
  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// 刪除評論 (軟刪除，需要登入且是評論者本人)
export const softDeleteReview = async (req, res) => {
  try {
    const { id } = req.params
    const review = await Review.findById(id)

    if (!review) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到評論' })
    }

    if (req.user.role !== 'admin' && review.user.toString() !== req.user._id.toString()) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: '沒有權限' })
    }

    review.isDeleted = true
    await review.save()

    await updateRestaurantScores(review.restaurant)

    res.status(StatusCodes.OK).json({ success: true, message: '評論已成功軟刪除' })
  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// 還原評論 (需要登入且是評論者本人)
export const restoreReview = async (req, res) => {
  try {
    const { id } = req.params
    const review = await Review.findById(id)

    if (!review) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到評論' })
    }

    if (req.user.role !== 'admin' && review.user.toString() !== req.user._id.toString()) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: '沒有權限' })
    }

    review.isDeleted = false
    await review.save()

    // 更新分數
    await updateRestaurantScores(review.restaurant)

    res.status(StatusCodes.OK).json({ success: true, message: '評論已成功還原', result: review })
  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

export const getUserReviewForRestaurant = async (req, res) => {
  try {
    const restaurantId = req.params.id
    const userId = req.user._id

    const review = await Review.findOne({
      restaurant: restaurantId,
      user: userId,
      isDeleted: false,
    })

    if (!review) {
      return res.status(404).json({ message: '尚未評論' })
    }

    res.status(200).json({ review })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: '伺服器錯誤' })
  }
}
