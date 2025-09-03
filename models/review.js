// models/review.js
import { Schema, model } from 'mongoose'

const reviewSchema = new Schema(
  {
    // 評價所屬的餐廳
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant', // 關聯餐廳
      required: true,
    },
    // 評價者（可以引用 User Model）
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User', // 關聯使用者
      required: true,
    },
    // 評分 0-5
    score: {
      type: Number,
      min: 0,
      max: 5,
      required: [true, '評分必須填寫'],
    },
    // 評價內容
    content: {
      type: String,
      trim: true,
      maxlength: [300, '評價內容最多只能 300 個字元'],
    },
    // 軟刪除標記
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // 匿名
    isAnonymous: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

// *** 關鍵步驟：建立複合索引 ***
reviewSchema.index({ restaurant: 1, user: 1 }, { unique: true })
// 這裡指定 restaurant 和 user 的組合必須是唯一的

// 假設你已經有 mongoose, Schema 等定義好了
reviewSchema.statics.updateRestaurantAverage = async function (restaurantId) {
  const reviews = await this
    .find({ restaurant: restaurantId, isDeleted: false }) // ← 依你的邏輯加上 isDeleted 過濾
    .populate('user'); 

  const totalScore = reviews.reduce((acc, cur) => acc + cur.score, 0);
  const averageScore = reviews.length > 0 ? totalScore / reviews.length : 0;

  // 統計各部門的評分與數量
  const gradeStats = {}

  for (const review of reviews) {
    const grade = review.user.grade || '未知'
    if (!gradeStats[grade]) {
      gradeStats[grade] = { total: 0, count: 0 }
    }
    gradeStats[grade].total += review.score
    gradeStats[grade].count += 1
  }

  const reviewStats = {}
  for (const [grade, stat] of Object.entries(gradeStats)) {
    reviewStats[grade] = {
      average: stat.total / stat.count,
      count: stat.count,
    }
  }

  // 寫入 restaurant 資料表
  await mongoose.model('Restaurant').findByIdAndUpdate(restaurantId, {
    average_score: averageScore,
    review_count: reviews.length,
    review_stats: reviewStats, // ← 新增欄位
  });

  console.log(`[updateRestaurantAverage] 餐廳 ${restaurantId} 的平均分數更新為 ${averageScore.toFixed(1)}`);
};


export default model('Review', reviewSchema)
