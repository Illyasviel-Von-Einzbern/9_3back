import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import upload from '../middlewares/upload.js'
import { authorizeRoles } from '../middlewares/roleCheck.js'

const router = Router()

// router.get('/', product.get)
// router.get('/all', auth.token, auth.admin, product.getAll)
// router.get('/:id', product.getId)
// // 順序有差，先 all 再 id，才不會被 :id 把 all 當作 id
// router.post('/', auth.token, upload, product.create)
// router.patch('/:id', auth.token, auth.admin, upload, product.update)

// routes/restaurant.js
import {
  createRestaurant,
  getRestaurants,
  getRestaurantById,
  updateRestaurant,
  deleteRestaurant,
  createMenu,
  getMenusByRestaurant,
  softDeleteRestaurant,
  restoreRestaurant,
} from '../controllers/restaurant.js'

// ✅ 取得所有餐廳（公開訪問）
router.get('/', getRestaurants)

// ✅ 管理員取得所有餐廳（包括已刪除和未上架的）
router.get('/admin/all', auth.token, authorizeRoles('admin'), getRestaurants)

// ✅ 新增餐廳（user + admin）
router.post('/', auth.token, authorizeRoles('user', 'admin'), upload, createRestaurant)

// ✅ 取得單一餐廳（公開訪問）
router.get('/:id', getRestaurantById)
// router.get('/:id', getRestaurantById)
// ✅ 編輯餐廳（user + admin）
router.patch('/:id', auth.token, authorizeRoles('user', 'admin'), upload, updateRestaurant)

// ✅ 刪除餐廳（admin）
router.delete('/:id', auth.token, authorizeRoles('admin'), deleteRestaurant)

// ✅ 建立菜單（user + admin）
// router.post('/:id/menus', auth.token, authorizeRoles('user', 'admin'), upload, createMenu)
router.post('/:restaurantId/menus', auth.token, authorizeRoles('user', 'admin'), upload, createMenu)

// ✅ 查詢菜單
// router.get('/:id/menus', getMenusByRestaurant)
// router.get('/:id/menus', auth.token, authorizeRoles('user', 'admin'), getMenusByRestaurant)
router.get(
  '/:restaurantId/menus',
  auth.token,
  authorizeRoles('user', 'admin'),
  getMenusByRestaurant,
)

// 軟刪除
router.patch('/:id/soft-delete', auth.token, authorizeRoles('admin'), softDeleteRestaurant)

// 還原
router.patch('/:id/restore', auth.token, authorizeRoles('admin'), restoreRestaurant)

// postman LH/restaurants/
// 要改路徑名稱去 index.js 改
export default router

// | 功能            | Method | Route                    | 說明          |
// | --------        | ------ | ------------------------ | ----------- |
// | 新增餐廳         | POST   | `/restaurants`           | 建立新餐廳       |
// | 取得所有餐廳     | GET    | `/restaurants`           | 取得所有餐廳      |
// | 取得單一餐廳資訊 | GET    | `/restaurants/:id`       | 根據 id 拿餐廳資料 |
// | 編輯餐廳資訊     | PATCH  | `/restaurants/:id`       | 修改餐廳資料      |
// | 刪除餐廳         | DELETE | `/restaurants/:id`       | 刪除餐廳        |
// | 建立該餐廳的菜單  | POST   | `/restaurants/:id/menus` | 建立屬於某餐廳的菜單  |
// | 查詢該餐廳菜單    | GET    | `/restaurants/:id/menus` | 取得該餐廳的所有菜單  |
// | 單獨查詢菜單項目  | GET    | `/menus/:menuId`         | 查詢單一菜單項目    |
// | 編輯菜單         | PATCH  | `/menus/:menuId`         | 修改菜單項目      |
// | 刪除菜單         | DELETE | `/menus/:menuId`         | 刪除菜單項目      |

// | 功能              | Method | Route                            | 說明                   |
// | ---------         | ------ | -------------------------------- | -------------------- |
// | 建立訂單           | POST   | `/orders`                        | 建立新訂單（指定餐廳與訂購時間等）    |
// | 取得所有訂單       | GET    | `/orders`                        | 取得目前所有訂單（可篩選特定日期或餐廳） |
// | 取得單一訂單詳細   | GET    | `/orders/:orderId`               | 取得訂單資訊與所有訂購項目        |
// | 加入訂單          | POST   | `/orders/:orderId/items`         | 加入餐點到某筆訂單            |
// | 修改自己的訂購項目 | PATCH  | `/orders/:orderId/items/:itemId` | 修改自己的訂購項目（例如改菜色或數量）  |
// | 移除訂購項目       | DELETE | `/orders/:orderId/items/:itemId` | 移除自己的訂購項目            |
// | 刪除整筆訂單       | DELETE | `/orders/:orderId`               | 管理者刪除整筆訂單（非一般使用者功能）  |

import Restaurant from '../models/restaurant.js'
import Menu from '../models/menu.js'

// routes/restaurant.js 或 menu.js
router.post(
  '/:id/menus/bulkImport',
  auth.token,
  authorizeRoles('admin', 'user'),
  async (req, res) => {
    const restaurantId = req.params.id
    const { menus } = req.body

    if (!Array.isArray(menus) || menus.length === 0) {
      return res.status(400).json({ success: false, message: '菜單資料格式錯誤' })
    }

    try {
      // 確認餐廳存在 (選擇性)
      const restaurant = await Restaurant.findById(restaurantId)
      if (!restaurant) {
        return res.status(404).json({ success: false, message: '找不到餐廳' })
      }

      // 把菜單加入資料庫
      // 假設你的 Menu model 有 fields: name, price, restaurantId
      const newMenus = menus.map(menu => ({
        name: menu.name,
        price: menu.price,
        restaurantId: restaurantId,
      }))

      await Menu.insertMany(newMenus)

      res.status(201).json({ success: true, message: '匯入成功' })
    } catch (err) {
      console.error(err)
      res.status(500).json({ success: false, message: '伺服器錯誤' })
    }
  },
)
