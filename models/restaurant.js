// models/restaurant.js
import { Schema, model } from 'mongoose'

const schema = new Schema(
  // 餐廳
  {
    restaurantId: {
      type: Number,
      unique: true,
      index: true,
    },
    image: {
      type: String,
      required: [true, '餐廳圖片必須放上'],
    },
    menuImage: {
      type: String,
      required: false, // 存放「整份菜單」的圖片，非必填
      trim: true,
    },
    name: {
      type: String,
      required: [true, '餐廳名稱必須填寫'],
      trim: true,
      minlength: [1, '餐廳名稱至少需要 1 個字元'],
      maxlength: [100, '餐廳名稱最多只能 100 個字元'],
    },
    phone: {
      type: String,
      required: [true, '餐廳電話必須填寫'],
    },
    address: {
      type: String,
      required: false,
      trim: true,
      minlength: [1, '餐廳地址至少需要 1 個字元'],
      maxlength: [60, '餐廳地址最多只能 60 個字元'],
    },
    link: {
      type: String,
      required: false,
      trim: true,
      minlength: [1, '餐廳連結至少需要 1 個字元'],
      maxlength: [100, '餐廳連結最多只能 100 個字元'],
    },
    category: {
      type: String,
      required: [true, '餐廳分類必須選擇'],
      enum: {
        values: ['食物', '飲料', '其他'],
        message: '請選擇有效的分類',
      },
    },
    tags: [
      {
        // type: [String],
        // default: [],
        type: Schema.Types.ObjectId,
        ref: 'Tag',
        // 引用 tag model
      },
    ],
    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Review', // 引用 Review model
      },
    ],
    delivery: {
      type: Boolean,
      default: false,
      required: [true, '是否外送必須填寫'],
    },
    delivery_price: {
      type: Number,
      default: 0,
      min: [0, '外送最低金額不能是負數'],
      required: function () {
        return this.delivery
        // 只有當 delivery 為 true 時，此欄位才為必填
      },
    },
    delivery_number: {
      type: Number,
      default: 0,
      min: [0, '外送所需份數不能是負數'],
      required: function () {
        return this.delivery
        // 只有當 delivery 為 true 時，此欄位才為必填
      },
    },
    business_hours: [
      {
        day: {
          type: String,
          enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          required: true,
        },
        open: {
          type: String,
          required: function () {
            return !this.isClosed
          },
          // 這裡可以儲存 'HH:mm' 格式的字串，例如 '09:00'
        },
        close: {
          type: String,
          required: function () {
            return !this.isClosed
          },
          // 例如 '18:00'
        },
        isClosed: {
          type: Boolean,
          default: false,
          // 例如國定假日或店休
        },
      },
    ],
    order_time: {
      type: String,
      required: [false, '訂餐時間必須填寫'],
    },
    average_score: {
      // 平均分數
      type: Number,
      default: 0,
      required: [false, '必須填寫'],
    },
    review_count: {
      // 總評價數
      type: Number,
      default: 0,
      required: [false, '必須填寫'],
    },
    // price: {
    //   type: Number,
    //   required: [true, '價格必須填寫'],
    //   min: [0, '價格不能是負數'],
    // },
    // description: {
    //   type: String,
    //   trim: true,
    //   maxlength: [500, '描述最多只能 500 個字元'],
    // },
    // quantity: {
    //   type: Number,
    //   required: [true, '數量必須填寫'],
    //   min: [0, '數量最少為 0'],
    //   default: 0,
    // },
    // menu: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: 'Menu',
    //   },
    // ],
    sell: {
      type: Boolean,
      default: true,
      required: [true, '是否上架必須填寫'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // *****統計欄位*****
    // 全部加總
    totalGroups: {
      type: Number,
      default: 0,
      required: true,
    },
    // 當前（前端或 API 自動補）
    currentGroups: {
      type: Number,
      default: 0,
      required: true,
    },
    group_stats: {
      type: Map,
      of: Number, // key: 部門名稱, value: 次數
      default: {},
    },
    review_stats: {
      type: Map,
      of: {
        average: { type: Number },
        count: { type: Number },
      },
      default: {},
    },
  },

  {
    versionKey: false,
    timestamps: true,
    // 加上 toJSON 和 toObject 選項，轉換為 JSON 或物件時，要包含虛擬欄位
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

schema.virtual('menu', {
  ref: 'Menu', // 保持引用到 'Menu' 模型即可
  localField: '_id',
  foreignField: 'restaurant',
  justOne: false,
})

export default model('Restaurant', schema)
