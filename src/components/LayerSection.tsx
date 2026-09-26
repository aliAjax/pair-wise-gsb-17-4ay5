import { useEffect, useState } from "react";
import type { Borehole, SoilLayer } from "../types";
import { checkLayerAppend, layerMissingFields, parseDepth, parseSpt, type RuleIssue } from "../rules";
import { fmtM, uid } from "../utils";

interface Props {
  hole: Borehole;
  onAppend: (layer: SoilLayer) => void;
  onUpdateLayer: (layerId: string, patch: Partial<SoilLayer>) => void;
  onRemoveLast: () => void;
}

export function LayerSection({ hole, onAppend, onUpdateLayer, onRemoveLast }: Props) {
  const logging = hole.status === "logging";
  const lastEnd = hole.layers.length > 0 ? hole.layers[hole.layers.length - 1].toDepth : 0;

  // 追加表单：层顶默认接住上一层终点
  const [from, setFrom] = useState(fmtM(lastEnd));
  const [to, setTo] = useState("");
  const [lithology, setLithology] = useState("");
  const [color, setColor] = useState("");
  const [spt, setSpt] = useState("");
  const [issues, setIssues] = useState<RuleIssue[]>([]);

  // 补录（编辑）已有分层的岩性、土色、标贯
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLithology, setEditLithology] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editSpt, setEditSpt] = useState("");
  const [editIssues, setEditIssues] = useState<RuleIssue[]>([]);

  useEffect(() => {
    setFrom(fmtM(lastEnd));
    setTo("");
    setLithology("");
    setColor("");
    setSpt("");
    setIssues([]);
    setEditingId(null);
    setEditIssues([]);
  }, [hole.id]);

  useEffect(() => {
    setFrom(fmtM(lastEnd));
  }, [lastEnd]);

  const append = () => {
    const fromDepth = parseDepth(from);
    const toDepth = parseDepth(to);
    const sptParsed = parseSpt(spt);
    const found: RuleIssue[] = [];
    if (fromDepth === null) found.push({ code: "from", message: "请填写有效的层顶深度（m）" });
    if (toDepth === null) found.push({ code: "to", message: "请填写有效的层底深度（m）" });
    if (!sptParsed.ok) found.push({ code: "spt", message: "标贯击数需为不小于 0 的整数" });
    if (found.length === 0 && fromDepth !== null && toDepth !== null) {
      found.push(...checkLayerAppend(hole.layers, { fromDepth, toDepth }));
    }
    setIssues(found);
    if (found.length > 0) return; // 重叠/留空当场提示，原分层表保持不变
    onAppend({
      id: uid(),
      fromDepth: fromDepth as number,
      toDepth: toDepth as number,
      lithology: lithology.trim(),
      color: color.trim(),
      sptBlows: sptParsed.value,
    });
    setTo("");
    setLithology("");
    setColor("");
    setSpt("");
  };

  const startEdit = (layer: SoilLayer) => {
    setEditingId(layer.id);
    setEditLithology(layer.lithology);
    setEditColor(layer.color);
    setEditSpt(layer.sptBlows === null ? "" : String(layer.sptBlows));
    setEditIssues([]);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const sptParsed = parseSpt(editSpt);
    if (!sptParsed.ok) {
      setEditIssues([{ code: "spt", message: "标贯击数需为不小于 0 的整数" }]);
      return;
    }
    onUpdateLayer(editingId, {
      lithology: editLithology.trim(),
      color: editColor.trim(),
      sptBlows: sptParsed.value,
    });
    setEditingId(null);
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>分层编录</p>
          <h2>按孔深顺序追加分层</h2>
        </div>
        {logging && (
          <button onClick={onRemoveLast} disabled={hole.layers.length === 0}>
            删除末层
          </button>
        )}
      </div>

      {hole.layers.length === 0 ? (
        <p className="empty-hint">尚未录入分层，首层从孔口 0.00m 开始。</p>
      ) : (
        <table className="layer-table">
          <thead>
            <tr>
              <th>#</th>
              <th>层顶(m)</th>
              <th>层底(m)</th>
              <th>层厚(m)</th>
              <th>岩性</th>
              <th>土色</th>
              <th>标贯(击)</th>
              <th>资料</th>
              {logging && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {hole.layers.map((layer, i) => {
              const missing = layerMissingFields(layer);
              const editing = editingId === layer.id;
              return (
                <tr key={layer.id}>
                  <td>{i + 1}</td>
                  <td>{fmtM(layer.fromDepth)}</td>
                  <td>{fmtM(layer.toDepth)}</td>
                  <td>{fmtM(layer.toDepth - layer.fromDepth)}</td>
                  {editing ? (
                    <>
                      <td>
                        <input value={editLithology} onChange={(e) => setEditLithology(e.target.value)} placeholder="岩性" />
                      </td>
                      <td>
                        <input value={editColor} onChange={(e) => setEditColor(e.target.value)} placeholder="土色" />
                      </td>
                      <td>
                        <input value={editSpt} onChange={(e) => setEditSpt(e.target.value)} placeholder="击数" inputMode="numeric" />
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{layer.lithology || <span className="tag-missing">未填</span>}</td>
                      <td>{layer.color || <span className="tag-missing">未填</span>}</td>
                      <td>{layer.sptBlows === null ? <span className="tag-missing">未测</span> : layer.sptBlows}</td>
                    </>
                  )}
                  <td>
                    {missing.length === 0 ? (
                      <span className="tag-ok">齐全</span>
                    ) : (
                      <span className="tag-missing">缺{missing.join("、")}</span>
                    )}
                  </td>
                  {logging && (
                    <td>
                      {editing ? (
                        <div className="row-actions">
                          <button onClick={saveEdit}>保存</button>
                          <button onClick={() => setEditingId(null)}>取消</button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(layer)}>补录</button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {editingId && editIssues.length > 0 && (
        <ul className="issue-list">
          {editIssues.map((i, idx) => (
            <li key={`${i.code}-${idx}`}>{i.message}</li>
          ))}
        </ul>
      )}

      {logging ? (
        <div className="append-form">
          <div className="field-grid five">
            <label>
              <span>层顶深度（m）</span>
              <input value={from} onChange={(e) => setFrom(e.target.value)} inputMode="decimal" />
            </label>
            <label>
              <span>层底深度（m）</span>
              <input value={to} onChange={(e) => setTo(e.target.value)} inputMode="decimal" placeholder="如 10.20" />
            </label>
            <label>
              <span>岩性</span>
              <input value={lithology} onChange={(e) => setLithology(e.target.value)} placeholder="可后补" />
            </label>
            <label>
              <span>土色</span>
              <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="可后补" />
            </label>
            <label>
              <span>标贯击数</span>
              <input value={spt} onChange={(e) => setSpt(e.target.value)} placeholder="可后补" inputMode="numeric" />
            </label>
          </div>
          {issues.length > 0 && (
            <ul className="issue-list">
              {issues.map((i, idx) => (
                <li key={`${i.code}-${idx}`}>{i.message}</li>
              ))}
            </ul>
          )}
          <div className="form-actions">
            <button className="primary-action" onClick={append}>
              追加分层
            </button>
          </div>
        </div>
      ) : (
        <p className="empty-hint">该孔已终孔，分层表仅供复查；如需纠正终孔数据，请使用下方“终孔纠正”。</p>
      )}
    </section>
  );
}
