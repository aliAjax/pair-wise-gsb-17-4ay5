// 规则判断：编录流程的全部校验规则，均为纯函数。
// 不读写存储、不依赖页面；返回的问题列表由页面负责当场提示。

import type { Borehole, SoilLayer, WaterMark } from "./types";

export interface RuleIssue {
  code: string;
  message: string;
}

/** 深度比较容差（m），避免浮点误差误判重叠/留空 */
const EPS = 0.001;

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 解析深度输入；非法（空、非数字、负数）返回 null */
export function parseDepth(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return round2(n);
}

/** 解析标贯击数：留空表示未测（null），否则须为不小于 0 的整数 */
export function parseSpt(raw: string): { ok: boolean; value: number | null } {
  const t = raw.trim();
  if (t === "") return { ok: true, value: null };
  const n = Number(t);
  if (!Number.isInteger(n) || n < 0) return { ok: false, value: null };
  return { ok: true, value: n };
}

/** 当前累计孔深 = 末层层底深度；无分层时为 0 */
export function currentDepth(hole: Borehole): number {
  const last = hole.layers[hole.layers.length - 1];
  return last ? last.toDepth : 0;
}

/** 单层缺项：岩性、土色、标贯击数 */
export function layerMissingFields(layer: SoilLayer): string[] {
  const missing: string[] = [];
  if (!layer.lithology.trim()) missing.push("岩性");
  if (!layer.color.trim()) missing.push("土色");
  if (layer.sptBlows === null) missing.push("标贯击数");
  return missing;
}

/**
 * 追加分层校验：新层起点必须接住上一层终点。
 * 重叠或留空都会返回问题，调用方应当场提示并保持原表不变。
 */
export function checkLayerAppend(
  layers: SoilLayer[],
  candidate: { fromDepth: number; toDepth: number }
): RuleIssue[] {
  const issues: RuleIssue[] = [];
  if (!(candidate.toDepth > candidate.fromDepth)) {
    issues.push({ code: "range", message: "层底深度必须大于层顶深度" });
  }
  const last = layers[layers.length - 1];
  if (!last) {
    if (Math.abs(candidate.fromDepth) > EPS) {
      issues.push({
        code: "gap",
        message: `首层应从孔口 0.00m 开始，当前起点 ${candidate.fromDepth.toFixed(2)}m 与孔口之间留空`,
      });
    }
    return issues;
  }
  const expected = last.toDepth;
  if (candidate.fromDepth < expected - EPS) {
    issues.push({
      code: "overlap",
      message: `新层起点 ${candidate.fromDepth.toFixed(2)}m 与上一层（终了 ${expected.toFixed(2)}m）重叠，起点应接在 ${expected.toFixed(2)}m`,
    });
  } else if (candidate.fromDepth > expected + EPS) {
    issues.push({
      code: "gap",
      message: `新层起点 ${candidate.fromDepth.toFixed(2)}m 与上一层终点 ${expected.toFixed(2)}m 之间留空，起点应接在 ${expected.toFixed(2)}m`,
    });
  }
  return issues;
}

/** 单次水位量测的基本校验 */
export function checkWaterMark(mark: WaterMark): RuleIssue[] {
  const issues: RuleIssue[] = [];
  if (!(mark.depth >= 0)) {
    issues.push({ code: "depth", message: "水位埋深不能为负" });
  }
  if (!mark.measuredAt || Number.isNaN(new Date(mark.measuredAt).getTime())) {
    issues.push({ code: "time", message: "请填写量测时间" });
  }
  return issues;
}

/** 稳定水位校验：必须先有初见水位，且量测时间不能早于初见 */
export function checkStableWater(first: WaterMark | null, stable: WaterMark): RuleIssue[] {
  if (!first) {
    return [{ code: "no-first", message: "请先记录初见水位，再记录稳定水位" }];
  }
  if (new Date(stable.measuredAt).getTime() < new Date(first.measuredAt).getTime()) {
    return [
      {
        code: "order",
        message: `稳定水位量测时间不能早于初见水位（初见量测于 ${new Date(first.measuredAt).toLocaleString("zh-CN", { hour12: false })}）`,
      },
    ];
  }
  return [];
}

/** 终孔条件：达到设计孔深，且每层都有岩性、土色和标贯结果 */
export function checkFinalReady(hole: Borehole): RuleIssue[] {
  const issues: RuleIssue[] = [];
  if (hole.layers.length === 0) {
    issues.push({ code: "no-layer", message: "尚未录入任何分层" });
  }
  const depth = currentDepth(hole);
  if (depth < hole.designDepth - EPS) {
    issues.push({
      code: "depth",
      message: `累计孔深 ${depth.toFixed(2)}m 未达设计孔深 ${hole.designDepth.toFixed(2)}m`,
    });
  }
  hole.layers.forEach((layer, i) => {
    const missing = layerMissingFields(layer);
    if (missing.length > 0) {
      issues.push({
        code: "incomplete",
        message: `第 ${i + 1} 层（${layer.fromDepth.toFixed(2)}–${layer.toDepth.toFixed(2)}m）缺：${missing.join("、")}`,
      });
    }
  });
  return issues;
}

/** 新建钻孔校验 */
export function checkNewHole(holes: Borehole[], name: string, designDepth: number): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const trimmed = name.trim();
  if (!trimmed) {
    issues.push({ code: "name", message: "请填写钻孔编号" });
  } else if (holes.some((h) => h.name === trimmed)) {
    issues.push({ code: "dup", message: `钻孔编号 ${trimmed} 已存在` });
  }
  if (!(designDepth > 0)) {
    issues.push({ code: "depth", message: "设计孔深必须大于 0" });
  }
  return issues;
}

/** 终孔纠正校验：纠正值有效、与原值不同、必须填写原因 */
export function checkCorrection(newValue: number, oldValue: number, reason: string): RuleIssue[] {
  const issues: RuleIssue[] = [];
  if (Math.abs(newValue - oldValue) < EPS) {
    issues.push({ code: "same", message: "纠正值与原值相同，无需纠正" });
  }
  if (!reason.trim()) {
    issues.push({ code: "reason", message: "必须填写纠正原因，与原值一起留档" });
  }
  return issues;
}
