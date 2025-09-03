import { StatusCodes } from 'http-status-codes'

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: '您沒有權限執行此操作',
      })
    }
    next()
  }
}
