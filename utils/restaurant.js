import mongoose from 'mongoose'
import Restaurant from '../models/restaurant.js'

export const findRestaurantByParam = async param => {
  if (mongoose.Types.ObjectId.isValid(param)) {
    // 優先使用 findOne 以便鏈接 populate 等方法
    return Restaurant.findOne({ _id: param })
  } else {
    return Restaurant.findOne({ restaurantId: param })
  }
}
// 利用 mongoDB的_id 或是 自定義的餐廳id 來搜尋
