// /routes/review.js
import { Router } from 'express'
// import { auth } from '../middlewares/auth.js'
import * as auth from '../middlewares/auth.js'
import { authorizeRoles } from '../middlewares/roleCheck.js'
import {
  getReviewsByRestaurantId,
  // 一般使用者，不含軟刪除
  // getReviewsByRestaurantIdForAdmin,
  // 新增：給管理員用，包含軟刪除
  getReviewById,
  getAllReviews,
  getReviewStatsByRestaurantId,
  createReview,
  updateReview,
  deleteReview,
  softDeleteReview,
  restoreReview,
  getUserReviewForRestaurant,
} from '../controllers/review.js'

const router = Router()

// GET /api/reviews/stats/:id → 某餐廳的評論統計資訊
router.get('/stats/:id', auth.token, authorizeRoles('admin'), getReviewStatsByRestaurantId)

// 取得特定餐廳的所有評論
// 一般使用者：取得特定餐廳的所有評論（不含軟刪除）
router.get('/:id', auth.token, authorizeRoles('user', 'admin'), getReviewsByRestaurantId)

// 管理員專用：取得特定餐廳的所有評論（包含軟刪除）
// router.get('/:id/all', auth.token, authorizeRoles('admin'), getReviewsByRestaurantIdForAdmin)
router.get('/', auth.token, authorizeRoles('admin'), getAllReviews)

// 取得單一評論
router.get('/:id', auth.token, authorizeRoles('user', 'admin'), getReviewById)

// 新增評論 (需要登入)
router.post('/:id', auth.token, authorizeRoles('user', 'admin'), createReview)

// 修改評論 (需要登入且是評論者本人)
router.patch('/:id', auth.token, authorizeRoles('user', 'admin'), updateReview)

// 刪除評論 (僅限管理員)
router.delete('/:id', auth.token, authorizeRoles('admin'), deleteReview)

// 刪除評論 (軟刪除，需要登入且是評論者本人)
router.patch('/:id/soft-delete', auth.token, authorizeRoles('admin'), softDeleteReview)

// 還原評論 (需要登入且是評論者本人)
router.patch('/:id/restore', auth.token, authorizeRoles('admin'), restoreReview)

// 使用者取得自己對某餐廳的評論
router.get(
  '/:id/user-review',
  auth.token,
  authorizeRoles('user', 'admin'),
  getUserReviewForRestaurant,
)

// postman LH/reviews/
// 要改路徑名稱去 index.js 改
export default router
