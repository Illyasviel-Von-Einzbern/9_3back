// models/menu.js
import { Schema, model } from 'mongoose'

const schema = new Schema(
  // 菜單
  {
    restaurant: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, '餐廳必須填寫'],
    },
    image: {
      type: String,
      required: [false, '「單一餐點」的圖片必須放上'],
    },
    name: {
      type: String,
      required: [true, '餐點名稱必須填寫'],
      trim: true,
      minlength: [1, '餐點名稱至少需要 1 個字元'],
      maxlength: [100, '餐點名稱最多只能 100 個字元'],
    },
    price: {
      type: Number,
      required: [true, '價格必須填寫'],
      min: [0, '價格不能是負數'],
    },
    tags: {
      type: [String],
      default: [],
    },
    history: [
      {
        type: Object, // 儲存菜單的歷史版本
        default: [],
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // *****統計欄位*****
    // 全部加總
    totalOrders: {
      type: Number,
      default: 0,
      required: true,
    },
    // 當前（前端或 API 自動補）
    currentOrders: {
      type: Number,
      default: 0,
      required: true,
    },
    order_stats: {
      type: Map,
      of: Number, // key: 部門名稱, value: 次數
      default: {},
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

export default model('Menu', schema)
