// /routes/tag.js
import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import { authorizeRoles } from '../middlewares/roleCheck.js'
import {
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  softDeleteTag,
  restoreTag,
} from '../controllers/tag.js'

const router = Router()

// 取得所有標籤
router.get('/', auth.token, authorizeRoles('user', 'admin'), getTags)

// 取得單一標籤
router.get('/:id', auth.token, authorizeRoles('user', 'admin'), getTagById)

// 新增標籤
router.post('/', auth.token, authorizeRoles('user', 'admin'), createTag)

// 更新標籤 (需要管理員權限)
router.patch('/:id', auth.token, authorizeRoles('admin'), updateTag)

// 刪除標籤 (需要管理員權限)
router.delete('/:id', auth.token, authorizeRoles('admin'), deleteTag)

// 軟刪除標籤 (需要管理員權限)
router.patch('/:id/soft-delete', auth.token, authorizeRoles('admin'), softDeleteTag)

// 還原標籤 (需要管理員權限)
router.patch('/:id/restore', auth.token, authorizeRoles('admin'), restoreTag)

// postman LH/tags/
// 要改路徑名稱去 index.js 改
export default router
