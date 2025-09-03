// models/counter.js
import { Schema, model } from 'mongoose'

const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    // 名稱，如 'restaurant'
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
)

// 在 model 上加一個靜態方法取得下一個序號
counterSchema.statics.getNextSequence = async function (name) {
  const counter = await this.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  )
  return counter.seq
}

const Counter = model('Counter', counterSchema)

// export default model('Counter', counterSchema)
export default Counter
