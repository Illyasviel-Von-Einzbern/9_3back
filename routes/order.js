import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import { createOrder, getAllOrders, getMyOrders } from '../controllers/order.js'
import { authorizeRoles } from '../middlewares/roleCheck.js'

const router = Router()

// POST /orders - 建立新訂單
router.post('/', auth.token, authorizeRoles('user', 'admin'), createOrder)
// GET /orders - 獲取所有訂單 (for 訂單總覽頁)
router.get('/', auth.token, authorizeRoles('user', 'admin'), getAllOrders)
// GET /orders/my - 獲取自己的訂單
router.get('/my', auth.token, authorizeRoles('user', 'admin'), getMyOrders)

export default router
