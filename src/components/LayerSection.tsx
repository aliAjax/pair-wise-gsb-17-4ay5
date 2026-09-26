import { useState } from "react";
import type { Borehole } from "../domain/types";
import {
  continuityError,
  currentDepth,
  type LayerDraft,
  type LayerPatch,
} from "../domain/rules";
import { fmtDepth } from "../domain/format";

interface Props {
  hole: Borehole;
  onAppend: (draft: LayerDraft) => string[];
  onUpdateLayer: (layerId: string, patch: LayerPatch) => void;
}

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

export function LayerSection({ hole, onAppend, onUpdateLayer }: Props) {
  const locked = hole.finalization !== null;
  const depth = currentDepth(hole);

  const [fromDepth, setFromDepth] = useState(fmtDepth(depth));
  const [toDepth, setToDepth] = useState("");
  const [lithology, setLithology] = useState("");
  const [soilColor, setSoilColor] = useState("");
  const [spt, setSpt] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  // 当场提示：起点一旦偏离上一层终点（重叠/留空）立即显示
  const liveIssue =
    fromDepth.trim() === "" ? null : continuityError(hole.layers, Number(fromDepth));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const draft: LayerDraft = {
      fromDepth: num(fromDepth),
      toDepth: num(toDepth),
      lithology,
      soilColor,
      sptBlows: spt.trim() === "" ? null : Number(spt),
    };
    const errs = onAppend(draft);
    setErrors(errs);
    if (errs.length === 0) {
      setFromDepth(fmtDepth(Number(toDepth)));
      setToDepth("");
      setLithology("");
      setSoilColor("");
      setSpt("");
    }
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>分层编录</p>
          <h2>分层记录（按孔深顺序追加）</h2>
        </div>
        <span className="muted">当前孔深 {fmtDepth(depth)}m</span>
      </div>

      {hole.layers.length === 0 ? (
        <p className="empty-state">尚未录入分层，请在下方追加第 1 层（起点 0m）。</p>
      ) : (
        <div className="table-wrap">
          <table className="layer-table">
            <thead>
              <tr>
                <th>层序</th>
                <th>深度区间(m)</th>
                <th>层厚(m)</th>
                <th>岩性</th>
                <th>土色</th>
                <th>标贯(击)</th>
              </tr>
            </thead>
            <tbody>
              {hole.layers.map((l) => (
                <tr key={l.id}>
                  <td>{l.seq}</td>
                  <td>
                    {fmtDepth(l.fromDepth)} ~ {fmtDepth(l.toDepth)}
                  </td>
                  <td>{fmtDepth(l.toDepth - l.fromDepth)}</td>
                  <td>
                    <input
                      className={`cell-input${l.lithology.trim() === "" ? " cell-missing" : ""}`}
                      value={l.lithology}
                      disabled={locked}
                      placeholder="待填写"
                      onChange={(e) => onUpdateLayer(l.id, { lithology: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className={`cell-input${l.soilColor.trim() === "" ? " cell-missing" : ""}`}
                      value={l.soilColor}
                      disabled={locked}
                      placeholder="待填写"
                      onChange={(e) => onUpdateLayer(l.id, { soilColor: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className={`cell-input${l.sptBlows === null ? " cell-missing" : ""}`}
                      value={l.sptBlows === null ? "" : String(l.sptBlows)}
                      disabled={locked}
                      placeholder="待填写"
                      inputMode="numeric"
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") onUpdateLayer(l.id, { sptBlows: null });
                        else if (/^\d+$/.test(v)) onUpdateLayer(l.id, { sptBlows: Number(v) });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {locked ? (
        <p className="muted">该孔已终孔，分层记录已锁定；如需改动请使用下方纠正流程。</p>
      ) : (
        <form className="append-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              <span>层顶深度(m)（应接 {fmtDepth(depth)}m）</span>
              <input value={fromDepth} inputMode="decimal" onChange={(e) => setFromDepth(e.target.value)} />
            </label>
            <label>
              <span>层底深度(m)</span>
              <input value={toDepth} inputMode="decimal" placeholder="大于层顶" onChange={(e) => setToDepth(e.target.value)} />
            </label>
            <label>
              <span>岩性（可后补）</span>
              <input value={lithology} placeholder="如 粉质黏土" onChange={(e) => setLithology(e.target.value)} />
            </label>
            <label>
              <span>土色（可后补）</span>
              <input value={soilColor} placeholder="如 黄褐" onChange={(e) => setSoilColor(e.target.value)} />
            </label>
            <label>
              <span>标贯击数（可后补）</span>
              <input value={spt} inputMode="numeric" placeholder="整数" onChange={(e) => setSpt(e.target.value)} />
            </label>
          </div>

          {liveIssue && <p className="field-hint warn">⚠ {liveIssue}</p>}

          {errors.length > 0 && (
            <div className="alert">
              <strong>未追加，原分层表已保留：</strong>
              <ul>{errors.map((er) => <li key={er}>{er}</li>)}</ul>
            </div>
          )}

          <button type="submit" className="primary-action">追加分层</button>
        </form>
      )}
    </section>
  );
}
