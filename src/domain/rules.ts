import type {
  Borehole,
  CorrectableField,
  CorrectionEntry,
  StratumLayer,
} from "./types";
import { fmtDepth } from "./format";

/**
 * 规则判断：全部为纯函数，不碰存储、不碰页面。
 * 校验通过返回 { ok: true, value: 新数据 }，失败返回 { ok: false, errors }，
 * 失败时不产生任何新对象，调用方据此保留原表。
 */
export type RuleResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const ok = <T>(value: T): RuleResult<T> => ({ ok: true, value });
const fail = <T>(errors: string[]): RuleResult<T> => ({ ok: false, errors });

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 当前孔深 = 最后一层的层底深度 */
export function currentDepth(hole: Borehole): number {
  const last = hole.layers[hole.layers.length - 1];
  return last ? last.toDepth : 0;
}

/* ---------- 新建钻孔 ---------- */

export function createBorehole(
  holes: Borehole[],
  code: string,
  designDepth: number,
  now: string
): RuleResult<Borehole> {
  const trimmed = code.trim();
  if (!trimmed) return fail(["钻孔编号不能为空"]);
  if (holes.some((h) => h.code === trimmed))
    return fail([`钻孔编号 ${trimmed} 已存在`]);
  if (!Number.isFinite(designDepth) || designDepth <= 0)
    return fail(["设计孔深需为大于 0 的数值"]);
  return ok({
    id: newId("zk"),
    code: trimmed,
    designDepth,
    layers: [],
    water: { initialDepth: null, initialAt: null, stableDepth: null, stableAt: null },
    finalization: null,
    createdAt: now,
  });
}

/* ---------- 分层追加 ---------- */

export interface LayerDraft {
  fromDepth: number;
  toDepth: number;
  lithology: string;
  soilColor: string;
  sptBlows: number | null;
}

/** 新层起点必须接住上一层终点：重叠或留空时返回提示文案，否则为 null */
export function continuityError(
  layers: StratumLayer[],
  fromDepth: number
): string | null {
  if (!Number.isFinite(fromDepth)) return null;
  const expected = layers.length ? layers[layers.length - 1].toDepth : 0;
  if (fromDepth < expected)
    return `新层起点 ${fmtDepth(fromDepth)}m 与上一层终点 ${fmtDepth(expected)}m 重叠 ${fmtDepth(expected - fromDepth)}m`;
  if (fromDepth > expected)
    return `新层起点 ${fmtDepth(fromDepth)}m 与上一层终点 ${fmtDepth(expected)}m 之间留空 ${fmtDepth(fromDepth - expected)}m`;
  return null;
}

export function validateLayerDraft(
  layers: StratumLayer[],
  draft: LayerDraft
): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(draft.fromDepth) || draft.fromDepth < 0)
    errors.push("层顶深度需为不小于 0 的数值");
  if (!Number.isFinite(draft.toDepth) || draft.toDepth < 0)
    errors.push("层底深度需为不小于 0 的数值");
  if (errors.length === 0) {
    const chain = continuityError(layers, draft.fromDepth);
    if (chain) errors.push(chain);
    if (draft.toDepth <= draft.fromDepth)
      errors.push("层底深度必须大于层顶深度（层厚为正）");
  }
  if (
    draft.sptBlows !== null &&
    (!Number.isInteger(draft.sptBlows) || draft.sptBlows < 0)
  )
    errors.push("标贯击数需为不小于 0 的整数");
  return errors;
}

/** 追加分层；校验失败时返回错误，原分层表保持不变 */
export function appendLayer(
  hole: Borehole,
  draft: LayerDraft
): RuleResult<Borehole> {
  if (hole.finalization) return fail(["该孔已终孔，分层记录已锁定"]);
  const errors = validateLayerDraft(hole.layers, draft);
  if (errors.length) return fail(errors);
  const layer: StratumLayer = {
    id: newId("layer"),
    seq: hole.layers.length + 1,
    fromDepth: draft.fromDepth,
    toDepth: draft.toDepth,
    lithology: draft.lithology.trim(),
    soilColor: draft.soilColor.trim(),
    sptBlows: draft.sptBlows,
  };
  return ok({ ...hole, layers: [...hole.layers, layer] });
}

export type LayerPatch = Partial<
  Pick<StratumLayer, "lithology" | "soilColor" | "sptBlows">
>;

/** 补录/修改某层的岩性、土色、标贯（深度区间不可改，保证层序连续） */
export function updateLayer(
  hole: Borehole,
  layerId: string,
  patch: LayerPatch
): RuleResult<Borehole> {
  if (hole.finalization) return fail(["该孔已终孔，分层记录已锁定"]);
  if (!hole.layers.some((l) => l.id === layerId)) return fail(["分层不存在"]);
  if (
    patch.sptBlows !== undefined &&
    patch.sptBlows !== null &&
    (!Number.isInteger(patch.sptBlows) || patch.sptBlows < 0)
  )
    return fail(["标贯击数需为不小于 0 的整数"]);
  const layers = hole.layers.map((l) =>
    l.id === layerId ? { ...l, ...patch } : l
  );
  return ok({ ...hole, layers });
}

/* ---------- 地下水位 ---------- */

function validDepth(v: number): boolean {
  return Number.isFinite(v) && v >= 0;
}

export function recordInitialWater(
  hole: Borehole,
  depth: number,
  at: string
): RuleResult<Borehole> {
  if (hole.finalization) return fail(["该孔已终孔，水位修改请使用纠正流程"]);
  if (hole.water.initialDepth !== null)
    return fail(["初见水位已记录，每孔仅记录一次"]);
  if (!validDepth(depth)) return fail(["初见水位埋深需为不小于 0 的数值"]);
  if (!at) return fail(["请填写初见水位时间"]);
  return ok({
    ...hole,
    water: { ...hole.water, initialDepth: depth, initialAt: at },
  });
}

export function recordStableWater(
  hole: Borehole,
  depth: number,
  at: string
): RuleResult<Borehole> {
  if (hole.finalization) return fail(["该孔已终孔，水位修改请使用纠正流程"]);
  if (hole.water.initialDepth === null) return fail(["请先记录初见水位"]);
  if (hole.water.stableDepth !== null)
    return fail(["稳定水位已记录，每孔仅记录一次"]);
  if (!validDepth(depth)) return fail(["稳定水位埋深需为不小于 0 的数值"]);
  if (!at) return fail(["请填写稳定水位时间"]);
  if (Date.parse(at) < Date.parse(hole.water.initialAt!))
    return fail(["稳定水位时间不能早于初见水位时间"]);
  return ok({
    ...hole,
    water: { ...hole.water, stableDepth: depth, stableAt: at },
  });
}

/* ---------- 终孔 ---------- */

export interface FinalizeCheck {
  key: string;
  label: string;
  pass: boolean;
}

/** 终孔条件清单：达到设计孔深，且每层都有岩性、土色、标贯结果 */
export function finalizeChecklist(hole: Borehole): FinalizeCheck[] {
  const depth = currentDepth(hole);
  const hasLayers = hole.layers.length > 0;
  return [
    {
      key: "depth",
      label: `达到设计孔深（当前 ${fmtDepth(depth)}m / 设计 ${fmtDepth(hole.designDepth)}m）`,
      pass: depth >= hole.designDepth,
    },
    {
      key: "lithology",
      label: "每层均已填写岩性",
      pass: hasLayers && hole.layers.every((l) => l.lithology.trim() !== ""),
    },
    {
      key: "color",
      label: "每层均已填写土色",
      pass: hasLayers && hole.layers.every((l) => l.soilColor.trim() !== ""),
    },
    {
      key: "spt",
      label: "每层均已填写标贯结果",
      pass: hasLayers && hole.layers.every((l) => l.sptBlows !== null),
    },
  ];
}

export function canFinalize(hole: Borehole): boolean {
  return hole.finalization === null && finalizeChecklist(hole).every((c) => c.pass);
}

export function finalizeBorehole(
  hole: Borehole,
  at: string
): RuleResult<Borehole> {
  if (hole.finalization) return fail(["该孔已提交终孔"]);
  const missing = finalizeChecklist(hole).filter((c) => !c.pass);
  if (missing.length) return fail(missing.map((m) => `未满足：${m.label}`));
  return ok({
    ...hole,
    finalization: {
      finalizedAt: at,
      finalDepth: currentDepth(hole),
      corrections: [],
    },
  });
}

/* ---------- 终孔纠正 ---------- */

export const CORRECTABLE_FIELDS: { field: CorrectableField; label: string }[] = [
  { field: "finalDepth", label: "终孔深度" },
  { field: "initialWaterDepth", label: "初见水位埋深" },
  { field: "stableWaterDepth", label: "稳定水位埋深" },
];

export function correctableValue(
  hole: Borehole,
  field: CorrectableField
): number | null {
  switch (field) {
    case "finalDepth":
      return hole.finalization ? hole.finalization.finalDepth : null;
    case "initialWaterDepth":
      return hole.water.initialDepth;
    case "stableWaterDepth":
      return hole.water.stableDepth;
  }
}

/** 纠正终孔记录：原值、纠正值与原因写入同一条追溯记录 */
export function applyCorrection(
  hole: Borehole,
  field: CorrectableField,
  newValue: number,
  reason: string,
  at: string
): RuleResult<Borehole> {
  if (!hole.finalization) return fail(["该孔尚未终孔，可直接修改原始记录"]);
  if (!reason.trim()) return fail(["请填写纠正原因"]);
  if (!Number.isFinite(newValue) || newValue < 0)
    return fail(["纠正值需为不小于 0 的数值"]);
  if (field === "finalDepth" && newValue <= 0)
    return fail(["终孔深度需大于 0"]);
  const oldValue = correctableValue(hole, field);
  if (oldValue === null) return fail(["原记录中该项为空，无法纠正"]);
  if (oldValue === newValue) return fail(["纠正值与原值相同，无需纠正"]);
  const fin = hole.finalization;
  const meta = CORRECTABLE_FIELDS.find((f) => f.field === field)!;
  const entry: CorrectionEntry = {
    id: newId("fix"),
    field,
    fieldLabel: meta.label,
    oldValue: `${fmtDepth(oldValue)}m`,
    newValue: `${fmtDepth(newValue)}m`,
    reason: reason.trim(),
    at,
  };
  const next: Borehole = {
    ...hole,
    finalization: { ...fin, corrections: [...fin.corrections, entry] },
  };
  if (field === "finalDepth") next.finalization!.finalDepth = newValue;
  if (field === "initialWaterDepth")
    next.water = { ...next.water, initialDepth: newValue };
  if (field === "stableWaterDepth")
    next.water = { ...next.water, stableDepth: newValue };
  return ok(next);
}
