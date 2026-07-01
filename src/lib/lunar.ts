/**
 * 农历计算工具
 * 使用 chinese-lunar-calendar 库，覆盖 1900-2100 年
 */

import { getLunar } from "chinese-lunar-calendar";

const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

/**
 * 获取今日的日期信息（公历 + 农历）
 */
export function getTodayDateInfo(): {
  solar: string;        // 如 "2025年6月22日"
  weekday: string;      // 如 "周日"
  lunar: string;        // 如 "五月初九"
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const w = now.getDay();

  const lunar = getLunar(y, m, d);

  return {
    solar: `${y}年${m}月${d}日`,
    weekday: `周${WEEKDAY_NAMES[w]}`,
    lunar: lunar.dateStr,
  };
}
