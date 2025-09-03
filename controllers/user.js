// /controllers/user.js
import User from '../models/user.js'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import validator from 'validator'
import Product from '../models/product.js'
import { timeToSeconds } from './timeToSeconds.js'

const CustomTime = timeToSeconds({
  years: 10,
  months: 8,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
})

export const create = async (req, res) => {
  try {
    await User.create({
      account: req.body.account,
      password: req.body.password,
      // email: req.body.email,
      grade: req.body.grade, // ⬅️ 新增這行
    })
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '創建成功',
    })
  } catch (error) {
    console.log('controllers/user.js create')
    console.error(error)
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '使用者已存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

export const login = async (req, res) => {
  try {
    if (req.user.isBlocked) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: '您的帳號已被封鎖，請聯絡管理員',
      })
    }
    if (req.user.isDeleted) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: '您的帳號已被刪除，請聯絡管理員',
      })
    }

    // const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    // const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: 10 })
    // https://github.com/auth0/node-jsonwebtoken?tab=readme-ov-file#jwtsignpayload-secretorprivatekey-options-callback
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: CustomTime })
    req.user.tokens.push(token)
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '登入成功',
      user: {
        _id: req.user._id,
        account: req.user.account,
        role: req.user.role,
        // cartTotal: req.user.cartTotal,
        token,
      },
    })
  } catch (error) {
    console.log('controllers/user.js login')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const profile = (req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    user: {
      _id: req.user._id, // 登入者的 id，用來判斷自己是誰（避免自己刪自己）
      account: req.user.account,
      role: req.user.role,
      // cartTotal: req.user.cartTotal,
    },
  })
}

export const refresh = async (req, res) => {
  try {
    const i = req.user.tokens.indexOf(req.token)
    // const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: CustomTime })
    req.user.tokens[i] = token
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      token,
    })
  } catch (error) {
    console.log('controllers/user.js refresh')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const logout = async (req, res) => {
  try {
    // 從 tokens 中移除當前的 token
    req.user.tokens = req.user.tokens.filter(token => token !== req.token)
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '登出成功',
    })
  } catch (error) {
    console.log('controllers/user.js logout')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const cart = async (req, res) => {
  try {
    if (!validator.isMongoId(req.body.product)) {
      // 驗證請求的商品 ID
      throw new Error('PRODUCT ID')
    }
    await Product.findOne({ _id: req.body.product }).orFail(new Error('PRODUCT NOT FOUND'))
    // 檢查商品是否存在，原本有 , sell: true

    // 檢查購物車中是否已經有該商品
    // 購物車內的 product 資料型態是 ObjectId，使用 .toString() 轉換為字串進行比較
    const i = req.user.cart.findIndex(item => item.product.toString() === req.body.product)
    // 如果購物車中已經有該商品，則增加數量
    if (i > -1) {
      req.user.cart[i].quantity += req.body.quantity
      if (req.user.cart[i].quantity < 1) {
        // 如果數量小於 1，則從購物車中移除該商品
        req.user.cart.splice(i, 1)
      }
    }
    // 如果購物車中沒有該商品，且數量 > 0，則新增商品到購物車
    else if (req.body.quantity > 0) {
      req.user.cart.push({
        product: req.body.product,
        quantity: req.body.quantity,
      })
    }
    await req.user.save()
    // 保存

    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: req.user.cartTotal,
    })
  } catch (error) {
    console.error(error)
    if (error.message === 'USER ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '使用者 ID 格式錯誤',
      })
    } else if (error.message === 'PRODUCT ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '商品 ID 格式錯誤',
      })
    } else if (error.message === 'PRODUCT NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '商品不存在',
      })
    } else if (error.message === 'USER NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '使用者不存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

export const getCart = async (req, res) => {
  try {
    // email account        --> 只取 email 和 account 欄位
    // -password -email     --> 除了 password 和 email 以外的欄位
    const user = await User.findById(req.user._id, 'cart')
      // .populate(ref欄位, 指定取的欄位)
      // 關聯 cart.product 的 ref 指定的 collection，只取 name 欄位
      // .populate('cart.product', 'name')
      .populate('cart.product')
      .orFail(new Error('USER NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: user.cart,
    })
  } catch (error) {
    if (error.message === 'USER ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '使用者 ID 格式錯誤',
      })
    } else if (error.message === 'USER NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '使用者不存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

export const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: '權限不足',
      })
    }

    const users = await User.find({}, 'account grade role createdAt isBlocked isDeleted')// ⬅️ 這裡只取了這幾個欄位
    res.status(StatusCodes.OK).json({
      success: true,
      result: users
    })
  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '取得使用者失敗',
    })
  }
}

export const getUsers = async (req, res) => {
  try {
    // 只允許管理員存取
    if (req.user.role !== 'admin') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: '沒有權限',
      })
    }

    const users = await User.find({}, 'account role grade').lean()
    res.status(StatusCodes.OK).json({
      success: true,
      result: users,
    })
  } catch (error) {
    console.error('getUsers error:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器錯誤',
    })
  }
}

export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id
    // 僅允許更新 account(禁改)、grade、role（admin 身分）
    // 這裡先不允許更新密碼，若要更新密碼要另外實作
    const updateFields = {}

    if (req.body.grade) updateFields.grade = req.body.grade
    if (req.body.role) {
      // 防止非 admin 或非法 role
      const validRoles = ['user', 'admin']
      if (!validRoles.includes(req.body.role)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: '身分欄位格式錯誤',
        })
      }
      updateFields.role = req.body.role
    }

    if (typeof req.body.isBlocked === 'boolean') {
      updateFields.isBlocked = req.body.isBlocked
    }
    if (typeof req.body.isDeleted === 'boolean') {
      updateFields.isDeleted = req.body.isDeleted
    }


    // 不能更新 account（唯一帳號）或其他欄位

    // 找到並更新
    const user = await User.findByIdAndUpdate(userId, updateFields, { new: true })

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '使用者不存在',
      })
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: '使用者資料更新成功',
      user,
    })
  } catch (error) {
    console.error('updateUser error:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const adminCreateUser = async (req, res) => {
  try {
    const { account, password, grade, role, isBlocked, isDeleted } = req.body

    // 基本欄位驗證（可自行擴充）
    if (!account || !password || !grade) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '帳號、密碼及班級為必填欄位',
      })
    }

    // 預設角色為 user，除非傳進來的是 admin（且經過權限驗證）
    const newUser = await User.create({
      account,
      password,
      grade,
      role: role === 'admin' ? 'admin' : 'user',
      isBlocked: isBlocked === true, // 確保是 boolean
    })

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '使用者新增成功',
      user: {
        _id: newUser._id,
        account: newUser.account,
        grade: newUser.grade,
        role: newUser.role,
        isBlocked: newUser.isBlocked,
        isDeleted: newUser.isDeleted,
      }
    })
  } catch (error) {
    console.error('adminCreateUser error:', error)
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    }
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '使用者已存在',
      })
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const batchCreate = async (req, res) => {
  try {
    const users = req.body.users // 預期格式: [{account, password, grade, role}, {...}]

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '請提供有效的使用者陣列',
      })
    }

    // // 你可以使用 insertMany 批量新增
    // const newUsers = await User.insertMany(
    //   users.map(user => ({
    //     account: user.account,
    //     password: user.password,
    //     grade: user.grade,
    //     role: user.role === 'admin' ? 'admin' : 'user',
    //     isBlocked: false,
    //     isDeleted: false,
    //   })),
    //   { ordered: false } // 讓插入時如果有錯誤，仍繼續插入其他
    // )

    const createdUsers = []
    const failedUsers = []

    for (const user of users) {
      try {
        const newUser = new User({
          account: user.account,
          password: user.password,
          grade: user.grade,
          role: user.role === 'admin' ? 'admin' : 'user',
        })
        await newUser.save() // 會觸發 pre('save')，自動加密密碼
        createdUsers.push({
          _id: newUser._id,
          account: newUser.account,
          grade: newUser.grade,
          role: newUser.role,
        })
      } catch (err) {
        // 每筆失敗也捕捉起來，不影響其他資料建立
        failedUsers.push({
          account: user.account,
          message:
            err.code === 11000
              ? '帳號已存在'
              : err?.errors?.[Object.keys(err.errors)[0]]?.message || '未知錯誤',
        })
      }
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      // message: `成功新增 ${newUsers.length} 位使用者`,
      // result: newUsers.map(u => ({
      //   _id: u._id,
      //   account: u.account,
      //   grade: u.grade,
      //   role: u.role,
      // })),
      message: `成功建立 ${createdUsers.length} 筆使用者，失敗 ${failedUsers.length} 筆`,
      created: createdUsers,
      failed: failedUsers,
    })
  } catch (error) {
    console.error('batchCreate error:', error)
    if (error.name === 'ValidationError') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.message,
      })
    }
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '部分使用者帳號重複，部分資料未新增',
      })
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}
