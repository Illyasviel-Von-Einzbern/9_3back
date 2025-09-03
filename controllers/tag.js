// /controllers/tag.js
import Tag from '../models/Tag.js'

export const getTags = async (req, res) => {
  try {
    const tags = await Tag.find({ isDeleted: false }).sort({ name: 1 })
    res.status(200).json(tags)
  } catch (error) {
    res.status(500).json({ message: '取得標籤清單失敗', error: error.message })
  }
}

export const getDefaultTags = async (req, res) => {
  try {
    const tags = await Tag.find({
      type: 'admin-defined',
      isDeleted: false,
    }).sort({ name: 1 })

    res.status(200).json(tags)
  } catch (error) {
    res.status(500).json({ message: '取得預設標籤失敗', error: error.message })
  }
}

// 取得單一標籤
export const getTagById = async (req, res) => {
  try {
    const { id } = req.params
    const tag = await Tag.findById(id)

    if (!tag || tag.isDeleted) {
      return res.status(404).json({ message: '找不到該標籤' })
    }

    res.status(200).json(tag)
  } catch (error) {
    res.status(500).json({ message: '取得標籤失敗', error: error.message })
  }
}

// 新增一個標籤 (通常需要管理員權限)
export const createTag = async (req, res) => {
  try {
    const { name, type } = req.body

    // 檢查標籤是否已存在，避免重複新增
    const existingTag = await Tag.findOne({ name })
    if (existingTag) {
      return res.status(409).json({ message: '該標籤名稱已存在' })
    }

    const newTag = await Tag.create({
      name,
      type: type || 'user-defined', // 預設為使用者自訂
    })

    res.status(201).json({ message: '標籤新增成功', tag: newTag })
  } catch (error) {
    res.status(500).json({ message: '新增標籤失敗', error: error.message })
  }
}

// 更新標籤 (通常需要管理員權限)
export const updateTag = async (req, res) => {
  try {
    const { id } = req.params
    const { name, type, isDeleted } = req.body

    const updatedTag = await Tag.findByIdAndUpdate(
      id,
      { name, type, isDeleted },
      { new: true, runValidators: true }, // new: true 回傳更新後的 document, runValidators: true 啟用 schema 驗證
    )

    if (!updatedTag) {
      return res.status(404).json({ message: '找不到該標籤' })
    }

    res.status(200).json({ message: '標籤更新成功', tag: updatedTag })
  } catch (error) {
    res.status(500).json({ message: '更新標籤失敗', error: error.message })
  }
}

// 刪除標籤
export const deleteTag = async (req, res) => {
  try {
    const { id } = req.params
    // 使用 findByIdAndDelete 執行永久刪除
    const tag = await Tag.findByIdAndDelete(id)

    if (!tag) {
      return res.status(404).json({ message: '找不到該標籤' })
    }

    res.status(200).json({ message: '標籤已成功永久刪除' })
  } catch (error) {
    res.status(500).json({ message: '永久刪除標籤失敗', error: error.message })
  }
}

// 刪除標籤 (軟刪除)
export const softDeleteTag = async (req, res) => {
  try {
    const { id } = req.params
    const tag = await Tag.findByIdAndUpdate(id, { isDeleted: true }, { new: true })

    if (!tag) {
      return res.status(404).json({ message: '找不到該標籤' })
    }

    res.status(200).json({ message: '標籤已成功刪除', tag })
  } catch (error) {
    res.status(500).json({ message: '刪除標籤失敗', error: error.message })
  }
}

// 還原標籤
export const restoreTag = async (req, res) => {
  try {
    const { id } = req.params

    // 使用 findByIdAndUpdate 找到被軟刪除的標籤，並將 isDeleted 設回 false
    const tag = await Tag.findByIdAndUpdate(id, { isDeleted: false }, { new: true })

    if (!tag) {
      // 如果找不到標籤，回傳 404
      return res.status(404).json({ message: '找不到該標籤' })
    }

    res.status(200).json({ message: '標籤已成功還原', tag })
  } catch (error) {
    res.status(500).json({ message: '還原標籤失敗', error: error.message })
  }
}
