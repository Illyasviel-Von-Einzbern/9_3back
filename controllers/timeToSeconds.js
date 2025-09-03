// timeToSeconds.js

/**
 * 將年月日時分秒轉換為總秒數
 * 年：365 天、月：30 天（簡化計算）
 * @param {Object} options
 * @returns {number} 總秒數
 */
export function timeToSeconds({
  years = 0,
  months = 0,
  days = 0,
  hours = 0,
  minutes = 0,
  seconds = 0,
}) {
  const totalSeconds =
    years * 365 * 86400 + months * 30 * 86400 + days * 86400 + hours * 3600 + minutes * 60 + seconds

  return totalSeconds
}
