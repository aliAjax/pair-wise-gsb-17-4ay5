import { useState } from "react";
import type { Borehole, CorrectableField } from "../domain/types";
import {
  CORRECTABLE_FIELDS,
  canFinalize,
  correctableValue,
  finalizeChecklist,
} from "../domain/rules";
import { fmtDepth, fmtTime } from "../domain/format";

interface Props {
  hole: Borehole;
  onFinalize: () => string[];
  onCorrect: (field: CorrectableField, value: number, reason: string) => string[];
}

export function FinalizeSection({ hole, onFinalize, onCorrect }: Props) {
  const fin = hole.finalization;
  const [errors, setErrors] = useState<string[]>([]);
  const [field, setField] = useState<CorrectableField>("finalDepth");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [savedTip, setSavedTip] = useState("");

  if (!fin) {
    const checks = finalizeChecklist(hole);
    const ready = canFinalize(hole);
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <p>终孔</p>
            <h2>终孔条件核查</h2>
          </div>
        </div>
        <ul className="check-list">
          {checks.map((c) => (
            <li key={c.key} className={c.pass ? "pass" : "fail"}>
              <b>{c.pass ? "✓" : "✗"}</b>
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
        {errors.length > 0 && (
          <div className="alert">
            <ul>{errors.map((er) => <li key={er}>{er}</li>)}</ul>
          </div>
        )}
        <button
          type="button"
          className="primary-action"
          disabled={!ready}
          onClick={() => setErrors(onFinalize())}
        >
          提交终孔
        </button>
        {!ready && <p className="field-hint">满足全部条件后才能提交；提交后分层与水位将锁定。</p>}
      </section>
    );
  }

  const currentValue = correctableValue(hole, field);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>终孔</p>
          <h2>已于 {fmtTime(fin.finalizedAt)} 终孔</h2>
        </div>
        <i className="badge badge-closed">终孔深度 {fmtDepth(fin.finalDepth)}m</i>
      </div>

      <h3 className="sub-title">纠正终孔记录</h3>
      <form
        className="correct-form"
        onSubmit={(e) => {
          e.preventDefault();
          const errs = onCorrect(field, value.trim() === "" ? NaN : Number(value), reason);
          setErrors(errs);
          if (errs.length === 0) {
            setValue("");
            setReason("");
            setSavedTip("已记录纠正，原值与原因见下方追溯记录。");
          } else {
            setSavedTip("");
          }
        }}
      >
        <div className="form-grid">
          <label>
            <span>纠正项</span>
            <select value={field} onChange={(e) => setField(e.target.value as CorrectableField)}>
              {CORRECTABLE_FIELDS.map((f) => (
                <option key={f.field} value={f.field}>{f.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>当前值</span>
            <input value={currentValue === null ? "（空）" : `${fmtDepth(currentValue)}m`} disabled />
          </label>
          <label>
            <span>纠正值(m)</span>
            <input value={value} inputMode="decimal" onChange={(e) => setValue(e.target.value)} />
          </label>
          <label>
            <span>纠正原因（必填）</span>
            <input value={reason} placeholder="如 复测孔口标高后修正" onChange={(e) => setReason(e.target.value)} />
          </label>
        </div>
        {errors.length > 0 && (
          <div className="alert">
            <ul>{errors.map((er) => <li key={er}>{er}</li>)}</ul>
          </div>
        )}
        {savedTip && <p className="field-hint ok">{savedTip}</p>}
        <button type="submit">提交纠正</button>
      </form>

      <h3 className="sub-title">追溯记录</h3>
      {fin.corrections.length === 0 ? (
        <p className="muted">暂无纠正记录。</p>
      ) : (
        <div className="timeline">
          {[...fin.corrections].reverse().map((c) => (
            <article key={c.id} className="correction-card">
              <header>
                <strong>{c.fieldLabel}</strong>
                <time>{fmtTime(c.at)}</time>
              </header>
              <p>
                原值 <b>{c.oldValue}</b> → 纠正值 <b>{c.newValue}</b>
              </p>
              <p className="muted">原因：{c.reason}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
