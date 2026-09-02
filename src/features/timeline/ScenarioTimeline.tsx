import { describeScenario } from "../../domain/engine.js";
import type { ScenarioFacts } from "../../domain/schemas.js";

interface ScenarioTimelineProps {
  scenario: ScenarioFacts;
  slaThresholdBps: number;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function percent(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(1)}%`;
}

function monthLabel(month: string): string {
  const [year = 0, index = 1] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dateLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ScenarioTimeline({
  scenario,
  slaThresholdBps,
}: ScenarioTimelineProps) {
  const view = describeScenario(scenario, slaThresholdBps);
  const threshold = percent(slaThresholdBps);

  return (
    <section
      className="panel timeline-panel"
      aria-labelledby="timeline-heading"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Same adverse facts</p>
          <h2 id="timeline-heading">Bad-day timeline</h2>
        </div>
        <span className="fee-label">
          {money(scenario.monthlyFeeCents)} / month
        </span>
      </div>
      <ol className="timeline-list">
        {view.months.map((entry, index) => (
          <li key={entry.month}>
            <span className="timeline-marker" aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <p className="timeline-date">{monthLabel(entry.month)}</p>
              <strong>{percent(entry.uptimeBps)} uptime</strong>
              <p>
                {entry.belowThreshold
                  ? `Below the ${threshold} commitment · ${money(entry.creditCents)} credit`
                  : `Meets the ${threshold} commitment · no credit`}
              </p>
            </div>
          </li>
        ))}
        <li>
          <span className="timeline-marker notice" aria-hidden="true">
            {view.months.length + 1}
          </span>
          <div>
            <p className="timeline-date">{dateLabel(scenario.noticeDate)}</p>
            <strong>
              {scenario.noticeGiven
                ? "Written notice sent"
                : "No written notice"}
            </strong>
            <p>
              {scenario.curedAtDate
                ? `Cured on ${dateLabel(scenario.curedAtDate)}.`
                : "The failure remains uncured at the relevant deadline."}
            </p>
          </div>
        </li>
      </ol>
      <div className="scenario-foot">
        <span>{scenario.monthsRemaining} months remain</span>
        <span>{money(view.feesAtStakeCents)} future fees at stake</span>
      </div>
      <p className="whatif-hint">
        What-if: before you lock intent, ask the browser agent to change these
        facts. Both readings re-run on the new facts.
      </p>
    </section>
  );
}
