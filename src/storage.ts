// 本机保存：钻孔数据在 localStorage 的读写，以及首次使用的示例数据。
// 只负责持久化，不含规则判断和页面逻辑。

import type { Borehole } from "./types";

const STORAGE_KEY = "hxwl-03.boreholes.v1";

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
    // 存储不可用（如隐私模式）时降级为内存态，不阻断编录
  }
}

/** 示例数据：一个在编孔（含缺项分层）和一个已终孔孔（含纠正追溯），便于复查演示 */
function seedBoreholes(): Borehole[] {
  return [
    {
      id: "seed-zk18",
      name: "ZK-18",
      designDepth: 22.5,
      status: "logging",
      layers: [
        { id: "seed-zk18-l1", fromDepth: 0, toDepth: 2.8, lithology: "杂填土", color: "灰褐", sptBlows: 6 },
        { id: "seed-zk18-l2", fromDepth: 2.8, toDepth: 7.5, lithology: "粉质黏土", color: "黄褐", sptBlows: null },
      ],
      firstWater: { depth: 3.4, measuredAt: "2026-09-26T08:20:00" },
      stableWater: null,
      final: null,
    },
    {
      id: "seed-zk21",
      name: "ZK-21",
      designDepth: 18,
      status: "completed",
      layers: [
        { id: "seed-zk21-l1", fromDepth: 0, toDepth: 4.0, lithology: "粉质黏土", color: "黄褐", sptBlows: 9 },
        { id: "seed-zk21-l2", fromDepth: 4.0, toDepth: 11.5, lithology: "粉砂", color: "灰", sptBlows: 15 },
        { id: "seed-zk21-l3", fromDepth: 11.5, toDepth: 18.0, lithology: "强风化泥岩", color: "紫红", sptBlows: 42 },
      ],
      firstWater: { depth: 5.2, measuredAt: "2026-09-25T09:05:00" },
      stableWater: { depth: 4.6, measuredAt: "2026-09-25T17:30:00" },
      final: {
        submittedAt: "2026-09-25T18:02:00",
        finalDepth: 18.0,
        layerCount: 3,
        firstWater: { depth: 5.2, measuredAt: "2026-09-25T09:05:00" },
        stableWater: { depth: 4.6, measuredAt: "2026-09-25T17:30:00" },
        corrections: [
          {
            id: "seed-zk21-c1",
            correctedAt: "2026-09-26T09:12:00",
            field: "stableWaterDepth",
            oldValue: 4.9,
            newValue: 4.6,
            reason: "复核水位计原始记录，稳定水位原抄录值有误",
          },
        ],
      },
    },
  ];
}
