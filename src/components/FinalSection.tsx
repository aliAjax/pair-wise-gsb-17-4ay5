import { useState } from "react";
import type { Borehole, CorrectableField } from "../types";
import { CORRECTABLE_FIELD_LABELS } from "../types";
import { checkCorrection, checkFinalReady, currentDepth, parseDepth, type RuleIssue } from "../rules";
import { fmtM, fmtTime } from "../utils";

interface Props {
  hole: Borehole;
  onFinalize: () => void;
  onCorrect: (field: CorrectableField, newValue: number, reason: string) => void;
}

export function FinalSection({ hole, onFinalize, onCorrect }: Props) {
  const [field, setField] = useState<CorrectableField>("finalDepth");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [issues, setIssues] = useState<RuleIssue[]>([]);

  // 编录中：展示终孔条件校验，满足才允许提交
  if (hole.status === "logging" || !hole.final) {
    const blockers = checkFinalReady(hole);
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <p>终孔</p>
            <h2>终孔条件校验</h2>
          </div>
        </div>
        {blockers.length === 0 ? (
          <div className="ready-box">
            已满足终孔条件：累计孔深 {fmtM(currentDepth(hole))}m 达到设计孔深 {fmtM(hole.designDepth)}m，
            {hole.layers.length} 个分层的岩性、土色、标贯结果齐全。
          </div>
        ) : (
          <ul className="issue-list">
            {blockers.map((i, idx) => (
              <li key={`${i.code}-${idx}`}>{i.message}</li>
            ))}
          </ul>
        )}
        <div className="form-actions final-actions">
          <button className="primary-action" disabled={blockers.length > 0} onClick={onFinalize}>
            提交终孔
          </button>
        </div>
      </section>
    );
  }

  // 已终孔：展示终孔记录，支持留痕纠正
  const final = hole.final;
  const availableFields: CorrectableField[] = [
    "finalDepth",
    ...(final.firstWater ? (["firstWaterDepth"] as const) : []),
    ...(final.stableWater ? (["stableWaterDepth"] as const) : []),
  ];
  const oldValueOf = (f: CorrectableField): number =>
    f === "finalDepth" ? final.finalDepth : f === "firstWaterDepth" ? final.firstWater!.depth : final.stableWater!.depth;

  const submitCorrection = () => {
    const parsed = parseDepth(value);
    if (parsed === null) {
      setIssues([{ code: "value", message: "请填写有效的纠正值（m）" }]);
      return;
    }
    const found = checkCorrection(parsed, oldValueOf(field), reason);
    setIssues(found);
    if (found.length > 0) return;
    onCorrect(field, parsed, reason.trim());
    setValue("");
    setReason("");
    setIssues([]);
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>终孔记录</p>
          <h2>提交于 {fmtTime(final.submittedAt)}</h2>
        </div>
      </div>

      <div className="summary-grid">
        <div>
          <span>终孔深度</span>
          <strong>{fmtM(final.finalDepth)} m</strong>
        </div>
        <div>
          <span>分层数</span>
          <strong>{final.layerCount} 层</strong>
        </div>
        <div>
          <span>初见水位</span>
          <strong>{final.firstWater ? `${fmtM(final.firstWater.depth)} m` : "未记录"}</strong>
        </div>
        <div>
          <span>稳定水位</span>
          <strong>{final.stableWater ? `${fmtM(final.stableWater.depth)} m` : "未记录"}</strong>
        </div>
      </div>

      <h3>终孔纠正</h3>
      <p className="empty-hint">纠正会更新终孔记录；原值与纠正原因将留在同一条追溯记录中，可随时复查。</p>
      <div className="field-grid three">
        <label>
          <span>纠正字段</span>
          <select value={field} onChange={(e) => setField(e.target.value as CorrectableField)}>
            {availableFields.map((f) => (
              <option key={f} value={f}>
                {CORRECTABLE_FIELD_LABELS[f]}（当前 {fmtM(oldValueOf(f))} m）
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>纠正值（m）</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="纠正后的数值" />
        </label>
        <label>
          <span>纠正原因</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="必填，随原值留档" />
        </label>
      </div>
      {issues.length > 0 && (
        <ul className="issue-list">
          {issues.map((i, idx) => (
            <li key={`${i.code}-${idx}`}>{i.message}</li>
          ))}
        </ul>
      )}
      <div className="form-actions final-actions">
        <button className="primary-action" onClick={submitCorrection}>
          提交纠正
        </button>
      </div>

      <h3>追溯记录</h3>
      {final.corrections.length === 0 ? (
        <p className="empty-hint">暂无纠正记录。</p>
      ) : (
        <div className="correction-list">
          {final.corrections.map((c) => (
            <article key={c.id} className="correction-card">
              <div className="corr-head">
                <strong>{CORRECTABLE_FIELD_LABELS[c.field]}</strong>
                <span>{fmtTime(c.correctedAt)}</span>
              </div>
              <p>
                原值 {fmtM(c.oldValue)} m → 纠正为 {fmtM(c.newValue)} m
              </p>
              <p>原因：{c.reason}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
