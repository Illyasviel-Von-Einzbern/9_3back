import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import upload from '../middlewares/upload.js'
import { authorizeRoles } from '../middlewares/roleCheck.js'

const router = Router()

// routes/menu.js
import {
  getAllMenus,
  getMenuById,
  updateMenu,
  deleteMenu,
  softDeleteMenu,
  restoreMenu,
} from '../controllers/menu.js'

router
  .get('/', getAllMenus)
  .get('/:menuId', getMenuById)
  .patch('/:menuId', auth.token, authorizeRoles('user', 'admin'), upload, updateMenu)
  .delete('/:menuId', auth.token, authorizeRoles('admin'), deleteMenu)
  .patch('/:menuId/soft-delete', auth.token, authorizeRoles('admin'), softDeleteMenu)
  .patch('/:menuId/restore', auth.token, authorizeRoles('admin'), restoreMenu)

// postman LH//menus/
// 要改路徑名稱去 index.js 改
export default router
