import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { Borehole, CorrectableField, Correction, FinalRecord, SoilLayer, WaterMark } from "./types";
import { checkFinalReady, currentDepth } from "./rules";
import { loadBoreholes, saveBoreholes } from "./storage";
import { fmtM, uid } from "./utils";
import { HoleList } from "./components/HoleList";
import { LayerSection } from "./components/LayerSection";
import { WaterSection } from "./components/WaterSection";
import { FinalSection } from "./components/FinalSection";

const statusColors = ["status-ok", "status-watch", "status-danger"];

function MetricCard({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={statusColors[index % statusColors.length]} />
    </article>
  );
}

function App() {
  const [holes, setHoles] = useState<Borehole[]>(() => loadBoreholes());
  const [selectedId, setSelectedId] = useState<string | null>(() => holes[0]?.id ?? null);

  // 本机保存：任何变更即写入 localStorage
  useEffect(() => {
    saveBoreholes(holes);
  }, [holes]);

  const selected = holes.find((h) => h.id === selectedId) ?? holes[0] ?? null;

  const updateHole = (id: string, updater: (h: Borehole) => Borehole) =>
    setHoles((prev) => prev.map((h) => (h.id === id ? updater(h) : h)));

  const createHole = (name: string, designDepth: number) => {
    const hole: Borehole = {
      id: uid(),
      name,
      designDepth,
      status: "logging",
      layers: [],
      firstWater: null,
      stableWater: null,
      final: null,
    };
    setHoles((prev) => [...prev, hole]);
    setSelectedId(hole.id);
  };

  const appendLayer = (holeId: string, layer: SoilLayer) =>
    updateHole(holeId, (h) => (h.status === "logging" ? { ...h, layers: [...h.layers, layer] } : h));

  const updateLayer = (holeId: string, layerId: string, patch: Partial<SoilLayer>) =>
    updateHole(holeId, (h) =>
      h.status === "logging"
        ? { ...h, layers: h.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)) }
        : h
    );

  const removeLastLayer = (holeId: string) =>
    updateHole(holeId, (h) => (h.status === "logging" ? { ...h, layers: h.layers.slice(0, -1) } : h));

  // 初见、稳定水位各记一次：已存在则忽略
  const recordFirst = (holeId: string, mark: WaterMark) =>
    updateHole(holeId, (h) => (h.status === "logging" && !h.firstWater ? { ...h, firstWater: mark } : h));

  const recordStable = (holeId: string, mark: WaterMark) =>
    updateHole(holeId, (h) => (h.status === "logging" && !h.stableWater ? { ...h, stableWater: mark } : h));

  const finalize = (holeId: string) =>
    updateHole(holeId, (h) => {
      if (h.status === "completed" || checkFinalReady(h).length > 0) return h;
      const final: FinalRecord = {
        submittedAt: new Date().toISOString(),
        finalDepth: currentDepth(h),
        layerCount: h.layers.length,
        firstWater: h.firstWater,
        stableWater: h.stableWater,
        corrections: [],
      };
      return { ...h, status: "completed", final };
    });

  // 终孔纠正：原值、新值、原因写入同一条追溯记录，并同步当前生效值
  const correct = (holeId: string, field: CorrectableField, newValue: number, reason: string) =>
    updateHole(holeId, (h) => {
      if (!h.final) return h;
      const oldValue =
        field === "finalDepth"
          ? h.final.finalDepth
          : field === "firstWaterDepth"
            ? h.final.firstWater?.depth
            : h.final.stableWater?.depth;
      if (oldValue === undefined || oldValue === null) return h;
      const correction: Correction = {
        id: uid(),
        correctedAt: new Date().toISOString(),
        field,
        oldValue,
        newValue,
        reason,
      };
      const final: FinalRecord = { ...h.final, corrections: [...h.final.corrections, correction] };
      const next: Borehole = { ...h, final };
      if (field === "finalDepth") {
        final.finalDepth = newValue;
      } else if (field === "firstWaterDepth" && final.firstWater) {
        final.firstWater = { ...final.firstWater, depth: newValue };
        if (next.firstWater) next.firstWater = { ...next.firstWater, depth: newValue };
      } else if (field === "stableWaterDepth" && final.stableWater) {
        final.stableWater = { ...final.stableWater, depth: newValue };
        if (next.stableWater) next.stableWater = { ...next.stableWater, depth: newValue };
      }
      return next;
    });

  const metrics = useMemo(
    () => [
      { label: "在编钻孔", value: holes.filter((h) => h.status === "logging").length },
      { label: "已终孔", value: holes.filter((h) => h.status === "completed").length },
      { label: "累计分层", value: holes.reduce((n, h) => n + h.layers.length, 0) },
      { label: "纠正追溯", value: holes.reduce((n, h) => n + (h.final?.corrections.length ?? 0), 0) },
    ],
    [holes]
  );

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-03 · 岩土工程</p>
          <h1>岩土钻孔编录</h1>
          <p className="subtitle">
            按孔深顺序追加分层，重叠或留空当场拦截；初见与稳定水位各记一次；达到设计孔深且分层资料齐全方可提交终孔，纠正留痕可复查。
          </p>
        </div>
        <div className="stack-card">
          <span>技术栈</span>
          <strong>React + Vite + TypeScript + CSS</strong>
          <span>资料结构 / 规则判断 / 本机保存 / 页面 四层分离</span>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((m, index) => (
          <MetricCard key={m.label} label={m.label} value={String(m.value)} index={index} />
        ))}
      </section>

      <section className="workspace">
        <HoleList holes={holes} selectedId={selected?.id ?? null} onSelect={setSelectedId} onCreate={createHole} />
        {selected ? (
          <div className="hole-flow">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <p>钻孔编录单</p>
                  <h2>
                    {selected.name}{" "}
                    <span className={`badge ${selected.status === "completed" ? "badge-done" : "badge-logging"}`}>
                      {selected.status === "completed" ? "已终孔" : "编录中"}
                    </span>
                  </h2>
                </div>
                <div className="hole-facts">
                  <span>设计孔深 {fmtM(selected.designDepth)} m</span>
                  <span>累计孔深 {fmtM(currentDepth(selected))} m</span>
                  <span>分层 {selected.layers.length} 层</span>
                </div>
              </div>
            </section>

            <LayerSection
              hole={selected}
              onAppend={(layer) => appendLayer(selected.id, layer)}
              onUpdateLayer={(layerId, patch) => updateLayer(selected.id, layerId, patch)}
              onRemoveLast={() => removeLastLayer(selected.id)}
            />
            <WaterSection
              hole={selected}
              onRecordFirst={(mark) => recordFirst(selected.id, mark)}
              onRecordStable={(mark) => recordStable(selected.id, mark)}
            />
            <FinalSection
              hole={selected}
              onFinalize={() => finalize(selected.id)}
              onCorrect={(field, newValue, reason) => correct(selected.id, field, newValue, reason)}
            />
          </div>
        ) : (
          <section className="panel">
            <p className="empty-hint">请先在左侧新增钻孔。</p>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
