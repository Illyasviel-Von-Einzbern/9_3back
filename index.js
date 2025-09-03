// 後端/index.js
import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import cors from 'cors'
import userRouter from './routes/user.js'
// import errorHandler from './middlewares/errorHandler.js'
import productRouter from './routes/product.js'
import orderRouter from './routes/order.js'
import './passport.js'
import Review from './models/review.js'

mongoose
  .connect(process.env.DB_URL)
  .then(() => {
    console.log('資料庫連線成功')
    mongoose.set('sanitizeFilter', true)
    // *** 關鍵變動：在這裡呼叫 ensureIndexes() ***
    // 連線成功後，執行同步索引，以確保部分索引生效
    Review.ensureIndexes()
      .then(() => {
        console.log('Review 模型的索引同步完成。')
      })
      .catch(error => {
        console.error('同步 Review 模型的索引失敗', error)
      })
  })
  .catch(error => {
    console.log('資料庫連線失敗')
    console.error('資料庫連線失敗', error)
  })

const app = express()

app.use(cors())

app.use(express.json())
app.use((error, req, res, _next) => {
  res.status(StatusCodes.BAD_REQUEST).json({
    success: false,
    message: 'JSON 格式錯誤',
  })
})

app.use('/user', userRouter)
app.use('/product', productRouter)
app.use('/orders', orderRouter) // 將 /order 改為 /orders 以符合前端 API 請求
import restaurantRouter from './routes/restaurant.js'
app.use('/restaurants', restaurantRouter)
import menuRouter from './routes/menu.js'
app.use('/menus', menuRouter) //  或者 '/menus'
import reviewRouter from './routes/review.js' // 引入評論路由
app.use('/reviews', reviewRouter)
import tagRouter from './routes/tag.js'
app.use('/tags', tagRouter)
import rankingRouter from './routes/rankings.js';
app.use('/rankings', rankingRouter);

app.all(/.*/, (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: '找不到該路由',
  })
})
// 處理未定義的路由

// app.use(errorHandler)

app.listen(process.env.PORT || 4000, () => {
  console.log('伺服器啟動')
})
