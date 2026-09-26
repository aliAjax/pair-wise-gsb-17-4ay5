import { useState } from "react";
import type { Borehole } from "../types";
import { checkNewHole, currentDepth, type RuleIssue } from "../rules";
import { fmtM } from "../utils";

interface Props {
  holes: Borehole[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, designDepth: number) => void;
}

export function HoleList({ holes, selectedId, onSelect, onCreate }: Props) {
  const [name, setName] = useState("");
  const [depth, setDepth] = useState("");
  const [issues, setIssues] = useState<RuleIssue[]>([]);

  const submit = () => {
    const designDepth = Number(depth.trim());
    const found = checkNewHole(holes, name, designDepth);
    setIssues(found);
    if (found.length > 0) return;
    onCreate(name.trim(), Math.round(designDepth * 100) / 100);
    setName("");
    setDepth("");
  };

  return (
    <aside className="panel narrow">
      <h2>钻孔列表</h2>
      <div className="hole-list">
        {holes.map((h) => (
          <button
            key={h.id}
            className={`hole-item${h.id === selectedId ? " active" : ""}`}
            onClick={() => onSelect(h.id)}
          >
            <span className="hole-name">{h.name}</span>
            <span className={`badge ${h.status === "completed" ? "badge-done" : "badge-logging"}`}>
              {h.status === "completed" ? "已终孔" : "编录中"}
            </span>
            <span className="hole-depth">
              孔深 {fmtM(currentDepth(h))} / {fmtM(h.designDepth)} m · {h.layers.length} 层
            </span>
          </button>
        ))}
      </div>

      <h2>新增钻孔</h2>
      <div className="stack-form">
        <label>
          <span>钻孔编号</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如 ZK-25" />
        </label>
        <label>
          <span>设计孔深（m）</span>
          <input
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            placeholder="如 25.00"
            inputMode="decimal"
          />
        </label>
        {issues.length > 0 && (
          <ul className="issue-list">
            {issues.map((i, idx) => (
              <li key={`${i.code}-${idx}`}>{i.message}</li>
            ))}
          </ul>
        )}
        <button className="primary-action" onClick={submit}>
          建立钻孔
        </button>
      </div>
    </aside>
  );
}
