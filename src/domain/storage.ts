import type { Borehole } from "./types";
import { seedBoreholes } from "./seed";

/** 本机保存：仅负责 localStorage 读写，不含任何业务规则 */

const STORAGE_KEY = "hxwl-03:boreholes:v1";

export function loadBoreholes(): Borehole[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedBoreholes();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedBoreholes();
    return parsed as Borehole[];
  } catch {
    return seedBoreholes();
  }
}

export function saveBoreholes(holes: Borehole[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holes));
  } catch {
    // 本机存储不可用时仅保留内存态，不阻断编录
  }
}

export function resetBoreholes(): Borehole[] {
  const seeds = seedBoreholes();
  saveBoreholes(seeds);
  return seeds;
}
