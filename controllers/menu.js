// controllers/menu.js
import Menu from '../models/menu.js'
import validator from 'validator'

export const getAllMenus = async (req, res) => {
  try {
    // 可依需求是否要顯示 isDeleted=true 的菜單，加上 populate('restaurant')
    const menus = await Menu.find().populate('restaurant')
    res.status(200).json({ success: true, data: menus })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

export const getMenuById = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.menuId)) {
      return res.status(400).json({ success: false, message: '無效的菜單 ID' })
    }

    // const menu = await Menu.findById(req.params.menuId)
    const menu = await Menu.findOne({ _id: req.params.menuId, isDeleted: false })
    if (!menu) {
      return res.status(404).json({ success: false, message: '找不到菜單' })
    }

    res.status(200).json({ success: true, data: menu })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

export const updateMenu = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.menuId)) {
      return res.status(400).json({ success: false, message: '無效的菜單 ID' })
    }

    const updated = await Menu.findByIdAndUpdate(req.params.menuId, req.body, {
      new: true,
      runValidators: true,
    })

    if (!updated) {
      return res.status(404).json({ success: false, message: '找不到菜單' })
    }

    res.status(200).json({ success: true, data: updated })
  } catch (error) {
    console.error(error)
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message })
    }
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

export const deleteMenu = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.menuId)) {
      return res.status(400).json({ success: false, message: '無效的菜單 ID' })
    }

    const deleted = await Menu.findByIdAndDelete(req.params.menuId)

    if (!deleted) {
      return res.status(404).json({ success: false, message: '找不到菜單' })
    }

    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

// 軟刪除
export const softDeleteMenu = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.menuId)) {
      return res.status(400).json({ success: false, message: '無效的菜單 ID' })
    }

    const updated = await Menu.findByIdAndUpdate(
      req.params.menuId,
      { isDeleted: true },
      { new: true },
    )

    if (!updated) {
      return res.status(404).json({ success: false, message: '找不到菜單' })
    }

    res.status(200).json({
      success: true,
      message: '菜單已標記為刪除（軟刪除）',
      data: updated,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}

// 還原
export const restoreMenu = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.menuId)) {
      return res.status(400).json({ success: false, message: '無效的菜單 ID' })
    }

    const updated = await Menu.findByIdAndUpdate(
      req.params.menuId,
      { isDeleted: false },
      { new: true },
    )

    if (!updated) {
      return res.status(404).json({ success: false, message: '找不到菜單' })
    }

    res.status(200).json({
      success: true,
      message: '菜單已還原',
      data: updated,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: '伺服器錯誤' })
  }
}
