import { useState } from "react";
import type { Borehole } from "../domain/types";
import { fmtDepth, fmtTime, nowLocalInput } from "../domain/format";

interface Props {
  hole: Borehole;
  onRecordInitial: (depth: number, at: string) => string[];
  onRecordStable: (depth: number, at: string) => string[];
}

interface BlockProps {
  title: string;
  recorded: { depth: number; at: string } | null;
  locked: boolean;
  hint?: string;
  liveWarn?: (at: string) => string | null;
  onSubmit: (depth: number, at: string) => string[];
}

function WaterBlock({ title, recorded, locked, hint, liveWarn, onSubmit }: BlockProps) {
  const [depth, setDepth] = useState("");
  const [at, setAt] = useState(nowLocalInput());
  const [errors, setErrors] = useState<string[]>([]);

  if (recorded) {
    return (
      <div className="water-block">
        <div className="water-head">
          <h3>{title}</h3>
          <i className="badge badge-closed">已记录</i>
        </div>
        <p className="water-value">埋深 {fmtDepth(recorded.depth)}m</p>
        <p className="muted">{fmtTime(recorded.at)}</p>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="water-block">
        <div className="water-head">
          <h3>{title}</h3>
          <i className="badge badge-open">未记录</i>
        </div>
        <p className="muted">终孔前未记录该项；如需补登请使用纠正流程。</p>
      </div>
    );
  }

  const warn = liveWarn ? liveWarn(at) : null;

  return (
    <form
      className="water-block"
      onSubmit={(e) => {
        e.preventDefault();
        setErrors(onSubmit(depth.trim() === "" ? NaN : Number(depth), at));
      }}
    >
      <div className="water-head">
        <h3>{title}</h3>
        <i className="badge badge-open">未记录</i>
      </div>
      <label>
        <span>水位埋深(m)</span>
        <input value={depth} inputMode="decimal" placeholder="如 3.4" onChange={(e) => setDepth(e.target.value)} />
      </label>
      <label>
        <span>观测时间</span>
        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
      </label>
      {hint && <p className="field-hint">{hint}</p>}
      {warn && <p className="field-hint warn">⚠ {warn}</p>}
      {errors.length > 0 && (
        <div className="alert">
          <ul>{errors.map((er) => <li key={er}>{er}</li>)}</ul>
        </div>
      )}
      <button type="submit">记录{title}</button>
    </form>
  );
}

export function WaterSection({ hole, onRecordInitial, onRecordStable }: Props) {
  const locked = hole.finalization !== null;
  const { water } = hole;

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>地下水位</p>
          <h2>初见与稳定水位（各记一次）</h2>
        </div>
      </div>
      <div className="water-grid">
        <WaterBlock
          title="初见水位"
          recorded={water.initialDepth !== null && water.initialAt !== null
            ? { depth: water.initialDepth, at: water.initialAt }
            : null}
          locked={locked}
          onSubmit={onRecordInitial}
        />
        <WaterBlock
          title="稳定水位"
          recorded={water.stableDepth !== null && water.stableAt !== null
            ? { depth: water.stableDepth, at: water.stableAt }
            : null}
          locked={locked}
          hint={water.initialDepth === null ? "需先记录初见水位" : undefined}
          liveWarn={(at) =>
            water.initialAt !== null && at && Date.parse(at) < Date.parse(water.initialAt)
              ? "稳定水位时间不能早于初见水位时间"
              : null
          }
          onSubmit={onRecordStable}
        />
      </div>
    </section>
  );
}
