// 後端/controllers/restaurant.js
import { StatusCodes } from 'http-status-codes'
// import validator from 'validator'
import { findRestaurantByParam } from '../utils/restaurant.js'
import mongoose from 'mongoose'
// import fs from 'fs/promises'
// import path from 'path'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

import Restaurant from '../models/restaurant.js'
import Menu from '../models/menu.js'
import Review from '../models/review.js'
import Counter from '../models/counter.js'
import Tag from '../models/Tag.js'

// 取得下一個序號
// async function getNextSequence(name) {
//   const counter = await Counter.findByIdAndUpdate(
//     name,
//     { $inc: { seq: 1 } },
//     { new: true, upsert: true },
//   )
//   return counter.seq
// }

// 新增餐廳
// export const createRestaurant = async (req, res) => {
//   try {
//     const nextId = await getNextSequence('restaurant')

//     // const restaurant = await Restaurant.create(req.body)
//     const restaurant = new Restaurant({
//       restaurantId: nextId,
//       ...req.body,
//       image: req.file?.path,
//     })
//     const saved = await restaurant.save()
//     res.status(201).json(saved)
//   } catch (error) {
//     res.status(StatusCodes.BAD_REQUEST).json({ error: error.message })
//   }
// }
export const createRestaurant_ = async (req, res) => {
  const session = await mongoose.startSession()
  // 重構成使用 transaction：餐廳與菜單一定會「同時」成功或失敗，避免一部分成功一部分失敗的情況。
  session.startTransaction()
  // 開始一個新的 session，並啟動 transaction

  // let imagePath = null
  let imageUrl = null
  let publicId = null

  try {
    // const nextId = await getNextSequence('restaurant')
    const nextId = await Counter.getNextSequence('restaurant')

    // const { menu: menuItems, ...restaurantData } = req.body
    // 從 req.body 拆出 menu（是 array of menu items），其餘是餐廳的基本資料
    let { menu, tags, ...restaurantData } = req.body
    // console.log('原始 menu:', menu)
    // 取出 menu 字串，解析成 JSON

    if (typeof menu === 'string') {
      try {
        menu = JSON.parse(menu)
        // console.log('解析後 menu:', menu)

        // eslint-disable-next-line
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'menu 欄位必須是有效的 JSON 格式',
        })
      }
    }

    if (!Array.isArray(menu) || menu.length === 0) {
      console.log('menu 是空的或不是陣列')
      menu = []
    }

    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags)
        // console.log('解析後 tags:', tags)
        // eslint-disable-next-line
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'tags 欄位必須是有效的 JSON 格式',
        })
      }
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      console.log('tags 是空的或不是陣列')
      tags = []
    }

    // if (req.file) {
    //   imagePath = req.file.path
    // }
    // 確認是否有圖片(本地)
    if (req.file) {
      imageUrl = req.file?.path // 圖片網址
      publicId = req.file.filename // Cloudinary public_id
    }
    // 處理 Cloudinary 上傳圖片

    console.log('🧪 原始 tags payload:', req.body.tags)
    if (Array.isArray(tags)) {
      const cleanedTagNames = tags
        // .filter(tag => typeof tag === 'string')
        // .map(tag => tag.trim())
        .map(tag => String(tag).trim()) // 強制轉字串並去除空白
        .filter(tag => tag.length > 0) // 避免空字串

      console.log('cleanedTagNames:', cleanedTagNames)
      console.log('type of cleanedTagNames:', typeof cleanedTagNames)
      // 找出已存在的標籤
      // const existingTags = await Tag.find({
      //   name: { $in: cleanedTagNames },
      //   isDeleted: false,
      // })
      let existingTags = []
      if (cleanedTagNames.length > 0) {
        // 找出已存在的標籤
        existingTags = await Tag.find({
          name: { $in: cleanedTagNames },
          isDeleted: false,
        })

        const existingTagMap = new Map(existingTags.map(tag => [tag.name, tag._id]))
        const newTagNames = cleanedTagNames.filter(name => !existingTagMap.has(name))

        // 建立新標籤
        // const newTags = await Tag.insertMany(
        //   newTagNames.map(name => ({ name, type: 'user-defined' })),
        //   { ordered: false },
        // )
        console.log('準備新增的 tags:', newTagNames)
        let newTags = []
        if (newTagNames.length > 0) {
          newTags = await Tag.insertMany(
            newTagNames.map(name => ({ name, type: 'user-defined' })),
            { ordered: false },
          )
        }

        // 合併所有 tag ObjectId
        const allTagIds = [...existingTags.map(tag => tag._id), ...newTags.map(tag => tag._id)]

        restaurantData.tags = allTagIds
      }
      // 將標籤名稱轉換成 ObjectId（找不到的自動建立）
    }
    // 標籤處理

    const restaurant = new Restaurant({
      restaurantId: nextId,
      ...restaurantData,
      // image: req.file?.path,
      image: imageUrl,
    })
    // 用解構的方式建立一筆新的 Restaurant 實體

    const savedRestaurant = await restaurant.save({ session })
    // 儲存餐廳時，把 transaction 的 session 帶進去，代表這筆操作要包含在交易中

    let createdMenus = []
    if (Array.isArray(menu) && menu.length > 0) {
      const menusToCreate = menu.map(item => ({
        ...item,
        restaurant: savedRestaurant._id,
      }))
      createdMenus = await Menu.insertMany(menusToCreate, { session })
    }
    // 把每道菜都加上剛剛建立好的 restaurant._id
    // 用 insertMany 一次性寫入，並同樣帶入 session

    await session.commitTransaction()
    // session.endSession()
    // 所有操作都成功時，提交 transaction，這樣所有操作才會真正寫入資料庫。然後關閉 session

    res.status(201).json({
      success: true,
      data: {
        restaurant: savedRestaurant,
        menus: createdMenus,
      },
    })
    // 回傳建立成功的餐廳與菜單資料
  } catch (error) {
    await session.abortTransaction()
    // abortTransaction()：整個交易撤銷（就連餐廳也不會寫入）
    // session.endSession()
    // endSession()：結束 session
    // 回滾交易

    // if (imagePath) {
    //   try {
    //     await fs.unlink(path.resolve(imagePath))
    //   } catch (fileError) {
    //     console.error('圖片刪除失敗:', fileError.message)
    //   }
    // }
    // 刪除圖片（若已上傳但交易失敗）(本地)

    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId)
      } catch (deleteErr) {
        console.error('Cloudinary 圖片刪除失敗：', deleteErr.message)
      }
    }
    // 刪除 Cloudinary 圖片（若已上傳但儲存失敗）

    console.error(error)
    res.status(400).json({ success: false, message: error.message })
  } finally {
    session.endSession()
  }
}

// 替代方案：逐個查詢標籤
export const createRestaurant = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  let imageUrl = null
  let publicId = null

  try {
    const nextId = await Counter.getNextSequence('restaurant')
    let { menu, tags, business_hours, ...restaurantData } = req.body

    // --- 新增 business_hours 解析 ---
    if (typeof business_hours === 'string') {
      try {
        restaurantData.business_hours = JSON.parse(business_hours)
      } catch (error) {
        console.log(error)
        /* ignore */
      }
    }

    // 處理 menu
    if (typeof menu === 'string') {
      try {
        menu = JSON.parse(menu)
      } catch (error) {
        console.log(error)
        return res.status(400).json({
          success: false,
          message: 'menu 欄位必須是有效的 JSON 格式',
        })
      }
    }
    if (!Array.isArray(menu)) menu = []

    // 處理 tags
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags)
      } catch (error) {
        console.log(error)
        return res.status(400).json({
          success: false,
          message: 'tags 欄位必須是有效的 JSON 格式',
        })
      }
    }
    if (!Array.isArray(tags)) tags = []

    // 處理圖片
    if (req.file) {
      imageUrl = req.file?.path
      publicId = req.file.filename
    }
    // const result = await cloudinary.uploader.upload(req.file.path)
    // imageUrl = result.secure_url
    // publicId = result.public_id // ← 正確 publicId

    // 標籤處理 - 逐個處理避免 $in 查詢
    if (Array.isArray(tags) && tags.length > 0) {
      const cleanedTagNames = tags.map(tag => String(tag).trim()).filter(tag => tag.length > 0)

      if (cleanedTagNames.length > 0) {
        try {
          const tagIds = []

          // 逐個處理每個標籤
          for (const tagName of cleanedTagNames) {
            // 先查詢是否存在
            let existingTag = await Tag.findOne({
              name: tagName, // 直接用字串，不用 $in
              isDeleted: false,
            }).session(session)

            if (existingTag) {
              // 標籤已存在
              tagIds.push(existingTag._id)
            } else {
              // 建立新標籤
              const newTag = await Tag.create(
                [
                  {
                    name: tagName,
                    type: 'user-defined',
                  },
                ],
                { session },
              )
              tagIds.push(newTag[0]._id)
            }
          }

          restaurantData.tags = tagIds
        } catch (tagError) {
          console.error('標籤處理錯誤:', tagError)
          throw tagError
        }
      } else {
        restaurantData.tags = []
      }
    } else {
      restaurantData.tags = []
    }

    // 建立餐廳
    const restaurant = new Restaurant({
      restaurantId: nextId,
      ...restaurantData,
      owner: req.user._id,
      image: imageUrl,
    })

    const savedRestaurant = await restaurant.save({ session })

    // 建立菜單
    let createdMenus = []
    if (Array.isArray(menu) && menu.length > 0) {
      const menusToCreate = menu.map(item => ({
        ...item,
        restaurant: savedRestaurant._id,
      }))
      createdMenus = await Menu.insertMany(menusToCreate, { session })
    }

    await session.commitTransaction()

    res.status(201).json({
      success: true,
      data: {
        restaurant: savedRestaurant,
        menus: createdMenus,
      },
    })
  } catch (error) {
    await session.abortTransaction()

    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId)
      } catch (deleteErr) {
        console.error('Cloudinary 圖片刪除失敗：', deleteErr.message)
      }
    }

    console.error('createRestaurant 錯誤:', error)
    res.status(400).json({
      success: false,
      message: error.message || '建立餐廳失敗',
    })
  } finally {
    session.endSession()
  }
}

// 所有餐廳
// export const getRestaurants = async (req, res) => {
//   // const restaurants = await Restaurant.find()
//   const restaurants = await Restaurant.find({ isDeleted: false })
//   res.json(restaurants)
// }
// export const getRestaurants = async (req, res) => {
//   try {
//     const restaurants = await Restaurant.find({ isDeleted: false })
//     res.status(StatusCodes.OK).json({ success: true, data: restaurants })
//   } catch (error) {
//     console.error(error)
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
//   }
// }
export const getRestaurants = async (req, res) => {
  try {
    // 從 query 讀取參數並確保類型正確
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const q = req.query.q || ''
    const category = req.query.category || ''
    const delivery = req.query.delivery  // 是否外送，預期是 'true' 或 'false'
    const openAt = req.query.openAt      // 預期格式: '15:00'，代表篩選「15:00營業中的餐廳」
    const isSelling = req.query.isSelling  // 是否上架 (true/false)

    // 確保 page 和 limit 是有效的數字
    if (isNaN(page) || page < 1) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '頁碼必須是有效的正整數',
      })
    }

    if (isNaN(limit) || limit < 1) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '每頁數量必須是有效的正整數',
      })
    }

    // 確保參數類型正確
    console.log('後端/controllers/restaurant.js 原始查詢參數:', req.query)
    console.log('後端/controllers/restaurant.js 解析後的參數:', { page, limit, q, category })
    console.log('後端/controllers/restaurant.js 參數類型:', {
      page: typeof page,
      limit: typeof limit,
      q: typeof q,
      category: typeof category,
    })

    console.log('後端/controllers/restaurant.js 收到查詢參數:', { page, limit, q, category })

    const filter = {}

    // 檢查用戶權限
    if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
      // 非管理員用戶只能看到未刪除且已上架的餐廳
      filter.isDeleted = false
      filter.sell = true
    }
    // 管理員可以看到所有餐廳（包括已刪除和未上架的）

    // 測試：根據用戶權限查詢餐廳數量
    const testFilter =
      !req.user || !req.user.roles || !req.user.roles.includes('admin')
        ? { isDeleted: false, sell: true }
        : {}
    const allCount = await Restaurant.countDocuments(testFilter)
    console.log('後端/controllers/restaurant.js 根據權限查詢到的餐廳數量:', allCount)
    

    // 搜尋功能 - 使用精確匹配或模糊匹配
    if (q && typeof q === 'string' && q.trim()) {
      try {
        const searchTerm = q.trim()

        // 使用精確匹配來避免 Mongoose 驗證器問題
        // filter.name = searchTerm
        // 使用模糊搜尋（不區分大小寫）
        // filter.name = { $regex: searchTerm, $options: 'i' } // i = 不分大小寫

        console.log('後端/controllers/restaurant.js 搜尋條件已設定:', filter.name)

        // 多欄位模糊搜尋條件，$or 用陣列包含多個欄位
        const searchRegex = new RegExp(q.trim(), 'i') // 不分大小寫模糊搜尋
        filter.$or = [
          { name: searchRegex },
          { phone: searchRegex },
          { address: searchRegex },
          { website: searchRegex },
          { description: searchRegex },
          // 若 tags 是 ObjectId 參考，需先 populate 搜尋比較麻煩，不在此用 filter
          // 如果 tags 存名字陣列可改用 { tags: searchRegex }
        ]
      } catch (error) {
        console.error('後端/controllers/restaurant.js 設定搜尋條件時發生錯誤:', error)
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: '搜尋條件格式錯誤',
        })
      }
    }

    // 分類功能
    if (category && typeof category === 'string' && category.trim()) {
      filter.category = category.trim()
    }

     // 是否外送篩選
    if (delivery === 'true') filter.delivery = true
    else if (delivery === 'false') filter.delivery = false

    // 是否上架篩選
    if (isSelling === 'true') filter.sell = true
    else if (isSelling === 'false') filter.sell = false

    // 營業時間篩選（假設資料庫欄位是 openTime, closeTime，格式為 'HH:mm' 字串）
    if (openAt) {
      // 這裡要判斷 openAt 是否介於 openTime 和 closeTime 之間
      // 假設營業時間沒有跨日(例如 22:00 ~ 05:00 跨日複雜度較高)

      filter.$expr = {
        $and: [
          { $lte: ['$openTime', openAt] },
          { $gte: ['$closeTime', openAt] },
        ],
      }
    }

    console.log('後端/controllers/restaurant.js 最終篩選條件:', filter)

    // 取分頁資料，並 populate 關聯資料
    let restaurants
    let total
    try {
      // 使用原生 MongoDB 查詢來避免 Mongoose 問題
      const collection = Restaurant.collection

      // 先獲取總數
      total = await collection.countDocuments(filter)
      console.log('後端/controllers/restaurant.js 原生查詢總筆數:', total)

      // 獲取分頁資料
      const cursor = collection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)

      const rawRestaurants = await cursor.toArray()
      console.log('後端/controllers/restaurant.js 原生查詢到的餐廳數量:', rawRestaurants.length)

      // 暫時不處理 populate，先讓基本查詢工作
      restaurants = rawRestaurants

      console.log('後端/controllers/restaurant.js 處理後的餐廳數量:', restaurants.length)
    } catch (error) {
      console.error('後端/controllers/restaurant.js 查詢餐廳資料時發生錯誤:', error)
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '查詢餐廳資料時發生錯誤',
        error: error.message,
      })
    }

    const total2 = await Restaurant.countDocuments(filter)

    const restaurants2 = await Restaurant.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('tags', 'name type')  // 如果你想要載入 tags 名稱
      // .populate('menu') // 如果需要可以加

    res.status(StatusCodes.OK).json({
      success: true,
      data: restaurants,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error('後端/controllers/restaurant.js getRestaurants 錯誤:', error)
    console.error('後端/controllers/restaurant.js 錯誤堆疊:', error.stack)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器錯誤',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
}

// 單一餐廳
export const getRestaurantById_ = async (req, res) => {
  try {
    // const restaurant = await Restaurant.findById(req.params.id)
    // if (!validator.isMongoId(req.params.id)) {
    //   return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: '無效的餐廳 ID' })
    // }
    // const restaurant = await Restaurant.findOne({ _id: req.params.id, isDeleted: false })
    const param = req.params.id
    let restaurant
    if (mongoose.Types.ObjectId.isValid(param)) {
      restaurant = await Restaurant.findOne({ _id: param, isDeleted: false })
    } else {
      restaurant = await Restaurant.findOne({ restaurantId: param, isDeleted: false })
    }

    if (!restaurant) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到餐廳' })
    }
    res.status(StatusCodes.OK).json({ success: true, data: restaurant })
  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

export const getRestaurantById = async (req, res) => {
  console.log(`[DEBUG] Entering getRestaurantById with id: ${req.params.id}`)
  try {
    const param = req.params.id
    let restaurant

    if (mongoose.Types.ObjectId.isValid(param)) {
      restaurant = await Restaurant.findOne({ _id: param, isDeleted: false })
        .populate('tags', 'name type') // 填充標籤資訊
        .populate('menu') // <-- 加上這一行來載入菜單
        .populate('reviews') // <-- 這裡也加上
    } else {
      restaurant = await Restaurant.findOne({ restaurantId: param, isDeleted: false })
        .populate('tags', 'name type') // 填充標籤資訊
        .populate('menu') // <-- 這裡也加上
        .populate('reviews') // <-- 這裡也加上
    }

    if (!restaurant) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '找不到餐廳',
      })
    }

    res.status(StatusCodes.OK).json({
      success: true,
      data: restaurant,
    })
  } catch (error) {
    console.error(error)
    // res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    //   success: false,
    //   message: '伺服器錯誤',
    // })

    // 增加更詳細的錯誤日誌
    console.error('[ERROR] in getRestaurantById:', error)

    // 針對 Mongoose 的 CastError (通常是 ID 格式問題，雖然你前面已經擋掉了)
    if (error.name === 'CastError') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'ID 格式無效，導致查詢失敗',
      })
    }

    // 其他所有未預期的錯誤都回傳 500
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// 或者建立一個專門測試標籤的 API
export const testTags = async (req, res) => {
  try {
    const allTags = await Tag.find({ isDeleted: false })
    const restaurantId = req.params.restaurantId

    let restaurant
    if (mongoose.Types.ObjectId.isValid(restaurantId)) {
      restaurant = await Restaurant.findById(restaurantId).populate('tags')
    } else {
      restaurant = await Restaurant.findOne({ restaurantId }).populate('tags')
    }

    res.json({
      success: true,
      data: {
        allTags,
        restaurant: restaurant
          ? {
              name: restaurant.name,
              tags: restaurant.tags,
            }
          : null,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// 編輯餐廳
// export const updateRestaurant = async (req, res) => {
//   const updated = await Restaurant.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true,
//   })
//   res.json(updated)
// }
export const updateRestaurant_ = async (req, res) => {
  try {
    const { menu: menuItems, ...restaurantData } = req.body
    const restaurant = await findRestaurantByParam(req.params.id)

    if (!restaurant) {
      return res.status(404).json({ success: false, message: '找不到餐廳' })
    }

    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      restaurant._id,
      {
        ...restaurantData,
        image: req.file?.path, // 有上傳圖片才更新
      },
      {
        new: true,
        runValidators: true,
      },
    )

    if (!updatedRestaurant) {
      return res.status(404).json({ success: false, message: '找不到餐廳' })
    }

    // 取得舊的菜單
    const existingMenus = await Menu.find({ restaurant: req.params.id })

    // 找出已存在的 menuId
    const incomingIds = menuItems.filter(m => m.menuId).map(m => m.menuId)
    const existingIds = existingMenus.map(m => m._id.toString())

    // 🗑️ 刪除沒有出現在傳入的 menuId 中的舊菜單
    const menusToDelete = existingIds.filter(id => !incomingIds.includes(id))
    await Menu.deleteMany({ _id: { $in: menusToDelete } })

    // 🔄 更新有 menuId 的菜單
    for (const item of menuItems) {
      if (item.menuId) {
        await Menu.findByIdAndUpdate(
          item.menuId,
          {
            name: item.name,
            price: item.price,
            image: item.image, // 可選
            tags: item.tags,
          },
          { runValidators: true },
        )
      }
    }

    // ➕ 新增沒有 menuId 的菜單
    const newMenus = menuItems.filter(item => !item.menuId)
    const menusToCreate = newMenus.map(item => ({
      ...item,
      restaurant: req.params.id,
    }))
    await Menu.insertMany(menusToCreate)

    res.status(200).json({
      success: true,
      message: '餐廳與菜單更新成功',
      data: updatedRestaurant,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

export const updateRestaurant = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  let newPublicId = null

  try {
    // 1. 尋找餐廳
    const restaurant = await findRestaurantByParam(req.params.id)
    if (!restaurant) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到餐廳' })
    }

    // 2. 解析請求內容
    let { menu, tags, business_hours, ...restaurantData } = req.body
    if (typeof menu === 'string') menu = JSON.parse(menu)
    if (!Array.isArray(menu)) menu = []
    if (typeof tags === 'string') tags = JSON.parse(tags)
    if (!Array.isArray(tags)) tags = []

    // --- 新增 business_hours 解析 ---
    if (typeof business_hours === 'string') {
      try {
        restaurantData.business_hours = JSON.parse(business_hours)
      } catch (error) {
        console.log(error)
      }
    }

    // 3. 處理圖片上傳
    const oldPublicId = restaurant.image ? restaurant.image.split('/').pop().split('.')[0] : null
    if (req.file) {
      newPublicId = req.file.filename
      restaurantData.image = req.file.path
    }

    // 4. 處理標籤
    const cleanedTagNames = tags.map(tag => String(tag).trim()).filter(Boolean)
    const tagIds = []
    for (const tagName of cleanedTagNames) {
      let tag = await Tag.findOne({ name: tagName, isDeleted: false }).session(session)
      if (!tag) {
        ;[tag] = await Tag.create([{ name: tagName, type: 'user-defined' }], { session })
      }
      tagIds.push(tag._id)
    }
    restaurantData.tags = tagIds

    // 5. 更新餐廳資料
    Object.assign(restaurant, restaurantData)
    await restaurant.save({ session })

    // 6. 更新菜單 (刪除舊的，建立新的)
    await Menu.deleteMany({ restaurant: restaurant._id }, { session })
    if (menu.length > 0) {
      const menusToCreate = menu.map(item => ({
        ...item,
        restaurant: restaurant._id,
      }))
      await Menu.insertMany(menusToCreate, { session })
    }

    // 7. 提交事務
    await session.commitTransaction()

    // 8. 如果有新圖片，刪除舊的
    if (req.file && oldPublicId) {
      await cloudinary.uploader.destroy(oldPublicId)
    }

    const updatedRestaurant = await Restaurant.findById(restaurant._id).populate('tags menu')
    res
      .status(StatusCodes.OK)
      .json({ success: true, message: '餐廳更新成功', data: updatedRestaurant })
  } catch (error) {
    await session.abortTransaction()
    // 如果事務失敗，刪除剛上傳的圖片
    if (newPublicId) {
      try {
        await cloudinary.uploader.destroy(newPublicId)
      } catch (deleteErr) {
        console.error('Cloudinary 圖片刪除失敗：', deleteErr.message)
      }
    }
    console.error('更新餐廳失敗', error)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: messages.join(', ') })
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  } finally {
    session.endSession()
  }
}

// 刪除餐廳時同時刪除其菜單
export const deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await findRestaurantByParam(req.params.id)

    if (!restaurant) {
      return res.status(404).json({ success: false, message: '找不到餐廳' })
    }

    // 刪除所有該餐廳的菜單
    await Menu.deleteMany({ restaurant: restaurant._id })

    // 刪除餐廳
    await restaurant.deleteOne()

    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

// 軟刪除：標記餐廳為已刪除
export const softDeleteRestaurant = async (req, res) => {
  try {
    // const updated = await Restaurant.findByIdAndUpdate(
    //   req.params.id,
    //   { isDeleted: true },
    //   { new: true },
    //   // 預設情況：回傳「更新前」的資料
    //   // 加上 new: true：回傳「更新後」的資料
    // )
    let restaurant
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      restaurant = await Restaurant.findById(req.params.id)
    } else {
      restaurant = await Restaurant.findOne({ restaurantId: req.params.id })
    }

    if (!restaurant) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到餐廳' })
    }

    const updated = await Restaurant.findByIdAndUpdate(
      restaurant._id,
      { isDeleted: true },
      { new: true },
    )

    await Menu.updateMany({ restaurant: restaurant._id }, { isDeleted: true })

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到餐廳' })
    }

    // 選擇是否軟刪除該餐廳的所有菜單 (這邊同樣做軟刪除)
    await Menu.updateMany({ restaurant: updated._id }, { isDeleted: true })

    res.status(StatusCodes.OK).json({
      success: true,
      message: '餐廳已標記為刪除（軟刪除）',
      data: updated,
    })
  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// 還原軟刪除的餐廳
export const restoreRestaurant = async (req, res) => {
  try {
    // const updated = await Restaurant.findByIdAndUpdate(
    //   req.params.id,
    //   { isDeleted: false },
    //   { new: true },
    // )
    const restaurant = await findRestaurantByParam(req.params.id)

    if (!restaurant) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到餐廳' })
    }

    const updated = await Restaurant.findByIdAndUpdate(
      restaurant._id,
      { isDeleted: false },
      { new: true },
    )

    await Menu.updateMany({ restaurant: restaurant._id }, { isDeleted: false })

    if (!updated) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到餐廳' })
    }

    // 還原該餐廳的所有軟刪除菜單
    await Menu.updateMany({ restaurant: updated._id }, { isDeleted: false })

    res.status(StatusCodes.OK).json({ success: true, message: '餐廳已還原', data: updated })
  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// 建立菜單項目
// export const createMenu = async (req, res) => {
//   try {
//     if (!validator.isMongoId(req.params.id)) {
//       return res.status(400).json({ success: false, message: '無效的餐廳 ID' })
//     }
//     const restaurant = await Restaurant.findById(req.params.id)
//     if (!restaurant) {
//       return res.status(404).json({ success: false, message: '找不到餐廳，無法新增菜單' })
//     }

//     const menu = await Menu.create({
//       ...req.body,
//       restaurant: req.params.id,
//     })
//     res.status(201).json({ success: true, data: menu })
//   } catch (error) {
//     console.error(error)
//     res.status(500).json({ success: false, message: '伺服器錯誤' })
//   }
// }

export const createMenu = async (req, res) => {
  try {
    const restaurantId = req.params.restaurantId
    const restaurant = await findRestaurantByParam(restaurantId)

    if (!restaurant) {
      return res.status(404).json({ success: false, message: '找不到餐廳' })
    }

    const menu = await Menu.create({
      ...req.body,
      restaurant: restaurant._id, // 關聯用 MongoDB 的 _id
      image: req.file?.path,
    })

    res.status(201).json({ success: true, data: menu })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'createMenu伺服器錯誤' })
  }
}

// 取得該餐廳所有菜單
// export const getMenusByRestaurant = async (req, res) => {
//   const menus = await Menu.find({ restaurant: req.params.id })
//   res.json(menus)
// }

export const getMenusByRestaurant = async (req, res) => {
  try {
    // const restaurantId = req.params.restaurantId
    const restaurant = await findRestaurantByParam(req.params.restaurantId)

    if (!restaurant) {
      return res.status(404).json({ success: false, message: '找不到餐廳' })
    }

    // const menus = await Menu.find({ restaurant: restaurant._id })
    const menus = await Menu.find({
      restaurant: restaurant._id,
      isDeleted: false, // 自動排除被軟刪除的
    })
      .sort({ createdAt: -1 }) // 最新的在前
      .select('name price image tags') // 不要每次都回傳全部欄位

    res.status(200).json({ success: true, data: menus })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'getMenusByRestaurant伺服器錯誤' })
  }
}
