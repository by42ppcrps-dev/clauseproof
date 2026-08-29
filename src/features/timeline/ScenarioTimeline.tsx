import type { ScenarioFacts } from "../../domain/schemas.js";

interface ScenarioTimelineProps {
  scenario: ScenarioFacts;
}

function formatUptime(uptimeBps: number): string {
  return `${(uptimeBps / 100).toFixed(1)}%`;
}

export function ScenarioTimeline({ scenario }: ScenarioTimelineProps) {
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
        <span className="fee-label">$10k / month</span>
      </div>
      <ol className="timeline-list">
        {scenario.monthlyUptime.map((event, index) => (
          <li key={event.month}>
            <span className="timeline-marker" aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <p className="timeline-date">
                {event.month === "2026-01" ? "January 2026" : "February 2026"}
              </p>
              <strong>{formatUptime(event.uptimeBps)} uptime</strong>
              <p>Below the 99.5% commitment · $1,000 credit</p>
            </div>
          </li>
        ))}
        <li>
          <span className="timeline-marker notice" aria-hidden="true">
            3
          </span>
          <div>
            <p className="timeline-date">March 1, 2026</p>
            <strong>Written notice sent</strong>
            <p>The failure remains uncured at the relevant deadline.</p>
          </div>
        </li>
      </ol>
      <div className="scenario-foot">
        <span>8 months remain</span>
        <span>$80,000 future fees at stake</span>
      </div>
    </section>
  );
}
