// /utils/reviewUtils.js
import Review from '../models/review.js'
import Restaurant from '../models/restaurant.js'

/**
 * 根據餐廳 ID 重新計算該餐廳的平均分數和評論數量，並更新到資料庫。
 * 這是最安全、最推薦的實作方式，因為它總是從原始數據（評論）計算，保證了數據的準確性。
 * @param {mongoose.Types.ObjectId} restaurantId - 要更新的餐廳 ID
 */
export async function updateRestaurantScores(restaurantId) {
  if (!restaurantId) return

  // 1. 透過聚合管道 (Aggregation Pipeline) 重新計算，確保精確
  //    只計算 isDeleted: false 的評論
  const result = await Review.aggregate([
    { $match: { restaurant: restaurantId, isDeleted: false } },
    {
      $group: {
        _id: '$restaurant', // 以餐廳 ID 分組
        average_score: { $avg: '$score' },
        review_count: { $sum: 1 },
      },
    },
  ])

  // 2. 取得計算結果
  const updateData = {
    average_score: 0,
    review_count: 0,
  }

  if (result.length > 0) {
    // 四捨五入到小數點後一位
    updateData.average_score = Math.round(result[0].average_score * 10) / 10
    updateData.review_count = result[0].review_count
  }

  console.log('[updateRestaurantScores] 更新結果：', updateData);
  // 3. 更新餐廳資料
  await Restaurant.findByIdAndUpdate(restaurantId, updateData)

}
// 更新餐廳評級的星數
