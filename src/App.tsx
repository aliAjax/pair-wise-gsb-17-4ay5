import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import type { Borehole, CorrectableField } from "./domain/types";
import {
  appendLayer,
  applyCorrection,
  createBorehole,
  currentDepth,
  finalizeBorehole,
  recordInitialWater,
  recordStableWater,
  updateLayer,
  type LayerDraft,
  type LayerPatch,
  type RuleResult,
} from "./domain/rules";
import { loadBoreholes, resetBoreholes, saveBoreholes } from "./domain/storage";
import { fmtDepth, nowLocalInput } from "./domain/format";
import { BoreholeSidebar } from "./components/BoreholeSidebar";
import { LayerSection } from "./components/LayerSection";
import { WaterSection } from "./components/WaterSection";
import { FinalizeSection } from "./components/FinalizeSection";

const statusColors = ["status-ok", "status-watch", "status-danger"];

function App() {
  const [holes, setHoles] = useState<Borehole[]>(() => loadBoreholes());
  const [selectedId, setSelectedId] = useState("");

  // 本机保存：任何变更后落盘
  useEffect(() => {
    saveBoreholes(holes);
  }, [holes]);

  const selected = holes.find((h) => h.id === selectedId) ?? holes[0];

  /** 统一提交入口：规则通过则更新状态，失败则把错误交回页面当场提示 */
  function commit(result: RuleResult<Borehole>): string[] {
    if (result.ok) {
      setHoles((prev) => prev.map((h) => (h.id === result.value.id ? result.value : h)));
      return [];
    }
    return result.errors;
  }

  const handleCreate = (code: string, designDepth: number): string[] => {
    const r = createBorehole(holes, code, designDepth, nowLocalInput());
    if (r.ok) {
      setHoles((prev) => [...prev, r.value]);
      setSelectedId(r.value.id);
      return [];
    }
    return r.errors;
  };

  const handleAppend = (draft: LayerDraft) =>
    selected ? commit(appendLayer(selected, draft)) : ["未选择钻孔"];
  const handleUpdateLayer = (layerId: string, patch: LayerPatch) => {
    if (selected) commit(updateLayer(selected, layerId, patch));
  };
  const handleInitial = (depth: number, at: string) =>
    selected ? commit(recordInitialWater(selected, depth, at)) : ["未选择钻孔"];
  const handleStable = (depth: number, at: string) =>
    selected ? commit(recordStableWater(selected, depth, at)) : ["未选择钻孔"];
  const handleFinalize = () =>
    selected ? commit(finalizeBorehole(selected, nowLocalInput())) : ["未选择钻孔"];
  const handleCorrect = (field: CorrectableField, value: number, reason: string) =>
    selected ? commit(applyCorrection(selected, field, value, reason, nowLocalInput())) : ["未选择钻孔"];
  const handleReset = () => {
    const seeds = resetBoreholes();
    setHoles(seeds);
    setSelectedId(seeds[0]?.id ?? "");
  };

  const metrics = useMemo(() => {
    const totalDepth = holes.reduce((s, h) => s + currentDepth(h), 0);
    const totalLayers = holes.reduce((s, h) => s + h.layers.length, 0);
    const sptValues = holes.flatMap((h) =>
      h.layers.map((l) => l.sptBlows).filter((v): v is number => v !== null)
    );
    const stableDepths = holes
      .map((h) => h.water.stableDepth)
      .filter((v): v is number => v !== null);
    return [
      { label: "累计孔深", value: `${totalDepth.toFixed(1)}m` },
      { label: "地层数量", value: String(totalLayers) },
      { label: "最高标贯", value: sptValues.length ? `${Math.max(...sptValues)}击` : "—" },
      { label: "地下水位", value: stableDepths.length ? `${fmtDepth(Math.min(...stableDepths))}m` : "—" },
    ];
  }, [holes]);

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-03 · port 5103</p>
          <h1>岩土钻孔编录</h1>
          <p className="subtitle">
            按孔深顺序追加分层，新层起点必须接住上一层终点；地下水初见与稳定水位各记一次；
            达到设计孔深且每层岩性、土色、标贯齐全后方可提交终孔，终孔后纠正全程留痕。
          </p>
        </div>
        <div className="stack-card">
          <span>技术栈</span>
          <strong>React + Vite + TypeScript + CSS</strong>
          <span>资料结构 / 规则判断 / 本机保存 / 页面 分层实现</span>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((m, i) => (
          <article key={m.label} className="metric-card">
            <span>{m.label}</span>
            <strong>{m.value}</strong>
            <i className={statusColors[i % statusColors.length]} />
          </article>
        ))}
      </section>

      <section className="workspace">
        <BoreholeSidebar
          holes={holes}
          selectedId={selected?.id ?? ""}
          onSelect={setSelectedId}
          onCreate={handleCreate}
          onReset={handleReset}
        />

        {selected ? (
          <div className="detail">
            <section className="panel hole-head">
              <div className="section-heading">
                <div>
                  <p>钻孔编录单</p>
                  <h2>
                    {selected.code}{" "}
                    <i className={`badge ${selected.finalization ? "badge-closed" : "badge-open"}`}>
                      {selected.finalization ? "已终孔" : "在编"}
                    </i>
                  </h2>
                </div>
                <div className="stat-row">
                  <div>
                    <span>设计孔深</span>
                    <strong>{fmtDepth(selected.designDepth)}m</strong>
                  </div>
                  <div>
                    <span>当前孔深</span>
                    <strong>{fmtDepth(currentDepth(selected))}m</strong>
                  </div>
                  {selected.finalization && (
                    <div>
                      <span>终孔深度</span>
                      <strong>{fmtDepth(selected.finalization.finalDepth)}m</strong>
                    </div>
                  )}
                </div>
              </div>
              <div className="progress">
                <i
                  style={{
                    width: `${Math.min(100, (currentDepth(selected) / selected.designDepth) * 100)}%`,
                  }}
                />
              </div>
            </section>

            <LayerSection
              key={`layer-${selected.id}`}
              hole={selected}
              onAppend={handleAppend}
              onUpdateLayer={handleUpdateLayer}
            />
            <WaterSection
              key={`water-${selected.id}`}
              hole={selected}
              onRecordInitial={handleInitial}
              onRecordStable={handleStable}
            />
            <FinalizeSection
              key={`fin-${selected.id}`}
              hole={selected}
              onFinalize={handleFinalize}
              onCorrect={handleCorrect}
            />
          </div>
        ) : (
          <section className="panel empty-state">暂无钻孔，请在左侧新建。</section>
        )}
      </section>
    </main>
  );
}

export default App;
