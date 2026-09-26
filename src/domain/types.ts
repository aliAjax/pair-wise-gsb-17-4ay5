/** 资料结构：钻孔编录涉及的全部数据模型（纯类型，不含逻辑） */

/** 分层记录：按孔深顺序追加，层顶必须接住上一层层底 */
export interface StratumLayer {
  id: string;
  seq: number;
  fromDepth: number; // 层顶深度 m
  toDepth: number; // 层底深度 m
  lithology: string; // 岩性
  soilColor: string; // 土色
  sptBlows: number | null; // 标贯击数，null 表示未填
}

/** 地下水位：初见与稳定各记一次 */
export interface WaterLevelLog {
  initialDepth: number | null; // 初见水位埋深 m
  initialAt: string | null; // 初见时间（datetime-local）
  stableDepth: number | null; // 稳定水位埋深 m
  stableAt: string | null; // 稳定时间，不得早于初见时间
}

/** 终孔后可纠正的字段 */
export type CorrectableField = "finalDepth" | "initialWaterDepth" | "stableWaterDepth";

/** 追溯记录：原值、纠正值、原因与时间留在同一条记录里 */
export interface CorrectionEntry {
  id: string;
  field: CorrectableField;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  reason: string;
  at: string;
}

/** 终孔记录 */
export interface FinalizationRecord {
  finalizedAt: string;
  finalDepth: number; // 提交时的终孔深度 m
  corrections: CorrectionEntry[];
}

/** 钻孔 */
export interface Borehole {
  id: string;
  code: string; // 钻孔编号，如 ZK-18
  designDepth: number; // 设计孔深 m
  layers: StratumLayer[];
  water: WaterLevelLog;
  finalization: FinalizationRecord | null;
  createdAt: string;
}
