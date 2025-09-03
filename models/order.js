// models/order.js
import { Schema, model, ObjectId } from 'mongoose'

// 訂單中的單一品項結構
const itemSchema = new Schema({
  menuItemId: {
    type: Schema.Types.ObjectId,
    required: [true, '缺少菜單項目 ID'],
  },
  name: {
    type: String,
    required: [true, '缺少品項名稱'],
  },
  price: {
    type: Number,
    required: [true, '缺少品項單價'],
    min: [0, '價格不能小於 0'],
  },
  quantity: {
    type: Number,
    required: [true, '缺少數量'],
    min: [1, '數量不能小於 1'],
  },
})

// 主訂單結構
const schema = new Schema(
  {
    user: {
      type: ObjectId,
      ref: 'User',
      required: [true, '缺少訂購者'],
    },
    restaurant: {
      type: ObjectId,
      ref: 'Restaurant',
      required: [true, '缺少餐廳'],
    },
    items: {
      type: [itemSchema],
      validate: {
        validator: value => Array.isArray(value) && value.length > 0,
        message: '訂單不能為空',
      },
    },
    totalPrice: {
      type: Number,
      required: [true, '缺少總金額'],
    },
    status: {
      type: String,
      default: '處理中', // 例如：處理中, 已完成, 已取消
    },
  },
  {
    versionKey: false,
    timestamps: true, // 自動加入 createdAt 和 updatedAt
  },
)

// 在 models/order.js 中加入

schema.post('findOneAndUpdate', async function (doc) {
  // 確保是訂單完成才觸發
  if (!doc || doc.status !== '已完成') return;

  const Order = doc;
  const Restaurant = mongoose.model('Restaurant');
  const Menu = mongoose.model('Menu');
  const User = mongoose.model('User');

  const user = await User.findById(Order.user);
  const grade = user.grade || '未知';

  // ✅ 更新每個品項的統計次數
  for (const item of Order.items) {
    const menuItem = await Menu.findById(item.menuItemId);
    if (!menuItem) continue;

    menuItem.totalOrders += item.quantity;

    const prev = menuItem.order_stats.get(grade) || 0;
    menuItem.order_stats.set(grade, prev + item.quantity);

    await menuItem.save();
  }

  // ✅ 更新餐廳的統計
  const restaurant = await Restaurant.findById(Order.restaurant);
  if (restaurant) {
    restaurant.totalGroups += 1;

    const prev = restaurant.group_stats.get(grade) || 0;
    restaurant.group_stats.set(grade, prev + 1);

    await restaurant.save();
  }
});


export default model('Order', schema)
