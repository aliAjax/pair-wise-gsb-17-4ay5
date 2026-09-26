// 资料结构：钻孔编录的核心数据模型。
// 本文件只定义数据形状，不含规则判断、存储和页面逻辑。

/** 地层分层：每孔按孔深顺序追加，新层层顶必须接住上一层层底 */
export interface SoilLayer {
  id: string;
  fromDepth: number; // 层顶深度（m）
  toDepth: number; // 层底深度（m）
  lithology: string; // 岩性
  color: string; // 土色
  sptBlows: number | null; // 标贯击数，未测为 null
}

/** 水位量测：初见水位与稳定水位共用此结构，各记一次 */
export interface WaterMark {
  depth: number; // 水位埋深（m）
  measuredAt: string; // 量测时间（ISO 字符串）
}

/** 终孔后可纠正的字段 */
export type CorrectableField = "finalDepth" | "firstWaterDepth" | "stableWaterDepth";

export const CORRECTABLE_FIELD_LABELS: Record<CorrectableField, string> = {
  finalDepth: "终孔深度",
  firstWaterDepth: "初见水位埋深",
  stableWaterDepth: "稳定水位埋深",
};

/** 终孔纠正：原值、新值与纠正原因留在同一条追溯记录里 */
export interface Correction {
  id: string;
  correctedAt: string; // 纠正时间（ISO 字符串）
  field: CorrectableField;
  oldValue: number; // 原值
  newValue: number; // 纠正后的值
  reason: string; // 纠正原因
}

/** 终孔记录：提交时生成的快照，附纠正追溯链 */
export interface FinalRecord {
  submittedAt: string;
  finalDepth: number; // 终孔深度（m）
  layerCount: number;
  firstWater: WaterMark | null;
  stableWater: WaterMark | null;
  corrections: Correction[];
}

export type HoleStatus = "logging" | "completed";

/** 钻孔 */
export interface Borehole {
  id: string;
  name: string; // 钻孔编号
  designDepth: number; // 设计孔深（m）
  status: HoleStatus;
  layers: SoilLayer[]; // 按孔深顺序排列
  firstWater: WaterMark | null; // 初见水位，只记一次
  stableWater: WaterMark | null; // 稳定水位，只记一次
  final: FinalRecord | null; // 提交终孔后生成
}
