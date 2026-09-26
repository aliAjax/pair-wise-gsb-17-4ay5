import { useState } from "react";
import type { Borehole, WaterMark } from "../types";
import { checkStableWater, checkWaterMark, parseDepth, type RuleIssue } from "../rules";
import { fmtM, fmtTime, toLocalInputValue } from "../utils";

interface Props {
  hole: Borehole;
  onRecordFirst: (mark: WaterMark) => void;
  onRecordStable: (mark: WaterMark) => void;
}

interface CardProps {
  title: string;
  mark: WaterMark | null;
  editable: boolean;
  hint?: string;
  validate: (mark: WaterMark) => RuleIssue[];
  onRecord: (mark: WaterMark) => void;
}

function WaterCard({ title, mark, editable, hint, validate, onRecord }: CardProps) {
  const [depth, setDepth] = useState("");
  const [time, setTime] = useState(() => toLocalInputValue(new Date()));
  const [issues, setIssues] = useState<RuleIssue[]>([]);

  // 各记一次：已记录的水位只展示，不再提供录入入口
  if (mark) {
    return (
      <div className="water-card">
        <h3>{title}</h3>
        <div className="water-value">
          <strong>{fmtM(mark.depth)} m</strong>
          <span>量测于 {fmtTime(mark.measuredAt)}</span>
          <em className="tag-once">已记录 · 仅记一次</em>
        </div>
      </div>
    );
  }

  const submit = () => {
    const parsed = parseDepth(depth);
    if (parsed === null) {
      setIssues([{ code: "depth", message: "请填写有效的水位埋深（m）" }]);
      return;
    }
    const candidate: WaterMark = {
      depth: parsed,
      measuredAt: time ? new Date(time).toISOString() : "",
    };
    const found = validate(candidate);
    setIssues(found);
    if (found.length > 0) return; // 校验不过，已有水位记录保持原样
    onRecord(candidate);
  };

  return (
    <div className="water-card">
      <h3>{title}</h3>
      {editable ? (
        <>
          <label>
            <span>水位埋深（m）</span>
            <input value={depth} onChange={(e) => setDepth(e.target.value)} placeholder="如 3.40" inputMode="decimal" />
          </label>
          <label>
            <span>量测时间</span>
            <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          {issues.length > 0 && (
            <ul className="issue-list">
              {issues.map((i, idx) => (
                <li key={`${i.code}-${idx}`}>{i.message}</li>
              ))}
            </ul>
          )}
          <button className="primary-action" onClick={submit}>
            记录{title}
          </button>
        </>
      ) : (
        <p className="empty-hint">{hint ?? "未记录"}</p>
      )}
    </div>
  );
}

export function WaterSection({ hole, onRecordFirst, onRecordStable }: Props) {
  const logging = hole.status === "logging";
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>地下水位</p>
          <h2>初见 / 稳定水位（各记一次）</h2>
        </div>
      </div>
      <div className="water-grid">
        <WaterCard
          title="初见水位"
          mark={hole.firstWater}
          editable={logging}
          validate={checkWaterMark}
          onRecord={onRecordFirst}
        />
        <WaterCard
          title="稳定水位"
          mark={hole.stableWater}
          editable={logging && hole.firstWater !== null}
          hint={logging ? "需先记录初见水位" : "未记录"}
          validate={(m) => [...checkWaterMark(m), ...checkStableWater(hole.firstWater, m)]}
          onRecord={onRecordStable}
        />
      </div>
    </section>
  );
}
