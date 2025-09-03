// models/tag.js

import { Schema, model } from 'mongoose'

const tagSchema = new Schema(
  {
    // 標籤名稱，例如 '早餐', '外送', '適合聚餐' 等
    name: {
      type: String,
      required: [true, '標籤名稱必須填寫'],
      unique: true, // 確保每個標籤名稱都是唯一的
      trim: true,
      minlength: [1, '標籤名稱至少需要 1 個字元'],
      maxlength: [50, '標籤名稱最多只能 50 個字元'],
    },
    // 標籤類型，用於區分是預設標籤還是使用者自訂
    type: {
      type: String,
      enum: {
        values: ['admin-defined', 'user-defined'],
        message: '請選擇有效的標籤類型',
      },
      default: 'user-defined',
    },
    // 標籤是否已刪除（軟刪除）
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    versionKey: false,
    timestamps: true, // 自動加入 createdAt 和 updatedAt 欄位
  },
)

export default model('Tag', tagSchema)
