import { useState } from "react";
import type { Borehole } from "../domain/types";
import { currentDepth } from "../domain/rules";
import { fmtDepth } from "../domain/format";

interface Props {
  holes: Borehole[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: (code: string, designDepth: number) => string[];
  onReset: () => void;
}

export function BoreholeSidebar({ holes, selectedId, onSelect, onCreate, onReset }: Props) {
  const [code, setCode] = useState("");
  const [depth, setDepth] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errs = onCreate(code, depth.trim() === "" ? NaN : Number(depth));
    setErrors(errs);
    if (errs.length === 0) {
      setCode("");
      setDepth("");
    }
  }

  return (
    <aside className="panel narrow sidebar">
      <h2>钻孔列表</h2>
      <div className="hole-list">
        {holes.map((h) => {
          const depthNow = currentDepth(h);
          const closed = h.finalization !== null;
          return (
            <button
              key={h.id}
              type="button"
              className={`hole-item${h.id === selectedId ? " active" : ""}`}
              onClick={() => onSelect(h.id)}
            >
              <span className="hole-item-head">
                <strong>{h.code}</strong>
                <i className={`badge ${closed ? "badge-closed" : "badge-open"}`}>
                  {closed ? "已终孔" : "在编"}
                </i>
              </span>
              <span className="muted">
                孔深 {fmtDepth(depthNow)} / {fmtDepth(h.designDepth)}m · {h.layers.length} 层
              </span>
            </button>
          );
        })}
      </div>

      <h2>新建钻孔</h2>
      <form className="side-form" onSubmit={handleCreate}>
        <label>
          <span>钻孔编号</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="如 ZK-25" />
        </label>
        <label>
          <span>设计孔深(m)</span>
          <input value={depth} onChange={(e) => setDepth(e.target.value)} inputMode="decimal" placeholder="如 30" />
        </label>
        {errors.length > 0 && (
          <div className="alert">
            <ul>{errors.map((er) => <li key={er}>{er}</li>)}</ul>
          </div>
        )}
        <button type="submit" className="primary-action">创建</button>
      </form>

      <button
        type="button"
        className="reset-btn"
        onClick={() => {
          if (window.confirm("将清空本机保存的数据并恢复示例钻孔，确定？")) onReset();
        }}
      >
        重置示例数据
      </button>
    </aside>
  );
}
