import type { Borehole } from "./types";

/** 示例数据：覆盖在编、缺项、已终孔且有纠正记录三种状态 */
export function seedBoreholes(): Borehole[] {
  return [
    {
      id: "zk-18",
      code: "ZK-18",
      designDepth: 25,
      createdAt: "2026-09-20T08:00",
      layers: [
        { id: "zk18-1", seq: 1, fromDepth: 0, toDepth: 3.2, lithology: "杂填土", soilColor: "灰褐", sptBlows: 8 },
        { id: "zk18-2", seq: 2, fromDepth: 3.2, toDepth: 9.5, lithology: "粉质黏土", soilColor: "黄褐", sptBlows: 12 },
        { id: "zk18-3", seq: 3, fromDepth: 9.5, toDepth: 15.8, lithology: "粉质黏土", soilColor: "", sptBlows: 15 },
        { id: "zk18-4", seq: 4, fromDepth: 15.8, toDepth: 22.6, lithology: "粉砂", soilColor: "灰", sptBlows: null },
      ],
      water: { initialDepth: 3.4, initialAt: "2026-09-22T10:20", stableDepth: null, stableAt: null },
      finalization: null,
    },
    {
      id: "zk-21",
      code: "ZK-21",
      designDepth: 32,
      createdAt: "2026-09-21T08:00",
      layers: [
        { id: "zk21-1", seq: 1, fromDepth: 0, toDepth: 4.6, lithology: "素填土", soilColor: "杂色", sptBlows: 6 },
        { id: "zk21-2", seq: 2, fromDepth: 4.6, toDepth: 12.4, lithology: "粉质黏土", soilColor: "褐黄", sptBlows: 11 },
        { id: "zk21-3", seq: 3, fromDepth: 12.4, toDepth: 31.2, lithology: "卵石", soilColor: "灰白", sptBlows: 31 },
      ],
      water: { initialDepth: null, initialAt: null, stableDepth: null, stableAt: null },
      finalization: null,
    },
    {
      id: "zk-24",
      code: "ZK-24",
      designDepth: 18,
      createdAt: "2026-09-18T08:00",
      layers: [
        { id: "zk24-1", seq: 1, fromDepth: 0, toDepth: 2.8, lithology: "杂填土", soilColor: "灰褐", sptBlows: 7 },
        { id: "zk24-2", seq: 2, fromDepth: 2.8, toDepth: 8.6, lithology: "黏土", soilColor: "棕红", sptBlows: 14 },
        { id: "zk24-3", seq: 3, fromDepth: 8.6, toDepth: 18.4, lithology: "强风化泥岩", soilColor: "紫红", sptBlows: 38 },
      ],
      water: { initialDepth: 5.2, initialAt: "2026-09-19T09:10", stableDepth: 4.8, stableAt: "2026-09-19T16:40" },
      finalization: {
        finalizedAt: "2026-09-19T17:30",
        finalDepth: 18.6,
        corrections: [
          {
            id: "zk24-c1",
            field: "finalDepth",
            fieldLabel: "终孔深度",
            oldValue: "18.4m",
            newValue: "18.6m",
            reason: "复测孔口标高后修正实际终孔深度",
            at: "2026-09-20T09:05",
          },
        ],
      },
    },
  ];
}
