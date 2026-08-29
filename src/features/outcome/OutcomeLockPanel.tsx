import { useState } from "react";

import type { ClarificationRule } from "../../domain/schemas.js";
import type { OutcomeLock } from "../../domain/workflow.js";

interface OutcomeLockPanelProps {
  outcomeLock: OutcomeLock | null;
  canLock: boolean;
  busy: boolean;
  onLock: (rule: ClarificationRule) => Promise<void>;
}

export function OutcomeLockPanel({
  outcomeLock,
  canLock,
  busy,
  onLock,
}: OutcomeLockPanelProps) {
  const [requiredOccurrences, setRequiredOccurrences] = useState(2);
  const [rollingWindowMonths, setRollingWindowMonths] = useState(6);
  const [cureDays, setCureDays] = useState(10);
  const [preserveAccruedCredits, setPreserveAccruedCredits] = useState(true);

  const rule = outcomeLock?.expectedRule;
  return (
    <section className="panel outcome-panel" aria-labelledby="outcome-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Human authority</p>
          <h2 id="outcome-heading">Lock intended behavior</h2>
        </div>
        <span className={`authority-badge ${outcomeLock ? "locked" : ""}`}>
          {outcomeLock ? "Locked by person" : "Person only"}
        </span>
      </div>
      {outcomeLock && rule ? (
        <div className="locked-rule-summary">
          <p>Expected outcome</p>
          <strong>
            {rule.trigger.requiredOccurrences} misses below 99.5% within{" "}
            {rule.trigger.rollingWindowMonths} months
          </strong>
          <ul>
            <li>{rule.cureDays}-day cure after written notice</li>
            <li>Termination without penalty</li>
            <li>
              {rule.preserveAccruedCredits
                ? "Accrued credits preserved"
                : "Accrued credits not preserved"}
            </li>
          </ul>
        </div>
      ) : (
        <>
          <p className="panel-intro">
            The agent may model readings. Only you define what this agreement
            should do.
          </p>
          <div className="rule-editor">
            <label>
              Qualifying misses
              <input
                max="4"
                min="1"
                onChange={(event) =>
                  setRequiredOccurrences(Number(event.target.value))
                }
                type="number"
                value={requiredOccurrences}
              />
            </label>
            <label>
              Rolling window
              <span className="input-with-unit">
                <input
                  max="18"
                  min="1"
                  onChange={(event) =>
                    setRollingWindowMonths(Number(event.target.value))
                  }
                  type="number"
                  value={rollingWindowMonths}
                />
                months
              </span>
            </label>
            <label>
              Cure period
              <span className="input-with-unit">
                <input
                  max="60"
                  min="0"
                  onChange={(event) => setCureDays(Number(event.target.value))}
                  type="number"
                  value={cureDays}
                />
                days
              </span>
            </label>
            <label className="check-control">
              <input
                checked={preserveAccruedCredits}
                onChange={(event) =>
                  setPreserveAccruedCredits(event.target.checked)
                }
                type="checkbox"
              />
              Preserve accrued credits
            </label>
          </div>
          <button
            className="human-button"
            disabled={!canLock || busy}
            onClick={() =>
              onLock({
                trigger: {
                  metric: "monthly_uptime_percentage",
                  comparator: "below",
                  thresholdBps: 9_950,
                  requiredOccurrences,
                  rollingWindowMonths,
                },
                noticeRequired: true,
                cureDays,
                effect: "customer_may_terminate_without_penalty",
                preserveAccruedCredits,
                overridesClauseIds: ["sla-exclusive-remedy", "material-breach"],
              })
            }
            type="button"
          >
            Lock this outcome
          </button>
        </>
      )}
    </section>
  );
}
