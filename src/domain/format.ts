/** 展示用格式化小工具 */

/** 深度显示：去掉多余的尾零，如 22.60 -> "22.6" */
export function fmtDepth(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** 时间显示：2026-09-26T08:30 -> "2026-09-26 08:30" */
export function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 当前时间，格式适配 datetime-local 输入框 */
export function nowLocalInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
