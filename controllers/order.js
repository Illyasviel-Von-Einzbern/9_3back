// /controllers/order.js
import Order from '../models/order.js'
import Restaurant from '../models/restaurant.js'
import { StatusCodes } from 'http-status-codes'

export const createOrder = async (req, res) => {
  try {
    const { restaurantId, items } = req.body

    // 1. 檢查餐廳是否存在
    const restaurant = await Restaurant.findById(restaurantId).populate('menu')
    if (!restaurant) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到餐廳' })
    }

    // 2. 處理訂單項目，從餐廳菜單中獲取最新資訊並計算總價
    const processedItems = []
    let totalPrice = 0
    for (const item of items) {
      const menuItem = restaurant.menu.find(m => m._id.toString() === item.menuItemId)
      if (!menuItem) {
        // 使用者可能點擊了一個已被刪除的菜單項
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ success: false, message: `找不到菜單項目: ${item.name || item.menuItemId}` })
      }
      processedItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
      })
      totalPrice += menuItem.price * item.quantity
    }

    // 3. 建立訂單
    const order = await Order.create({
      user: req.user._id,
      restaurant: restaurantId,
      items: processedItems,
      totalPrice,
    })

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '訂單建立成功',
      data: order,
    })
  } catch (error) {
    console.error(error)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: messages.join(', ') })
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

export const getAllOrders = async (req, res) => {
  try {
    // 在真實應用中，這裡可能需要權限檢查 (例如：僅限管理員)
    // 也可以根據需求加入日期篩選，例如只顯示今天的訂單
    const orders = await Order.find()
      .populate('user', 'account')
      .populate('restaurant', 'name category')
      .sort({ createdAt: -1 }) // 最近的訂單在最前面

    res.status(StatusCodes.OK).json({
      success: true,
      data: orders,
    })
  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('restaurant', 'name image')
      .sort({ createdAt: -1 })

    res.status(StatusCodes.OK).json({
      success: true,
      data: orders,
    })
  } catch (error) {
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}
