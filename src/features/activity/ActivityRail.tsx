import type { AuditEvent } from "../../domain/workflow.js";

interface ActivityRailProps {
  events: AuditEvent[];
}

function actorLabel(actor: AuditEvent["actor"]): string {
  if (actor.kind === "human-ui") return "Person";
  if (actor.kind === "agent-tool") return "Browser agent";
  if (actor.kind === "manual-fallback") return "Manual demo";
  return "Application";
}

export function ActivityRail({ events }: ActivityRailProps) {
  return (
    <section
      className="activity-rail"
      aria-labelledby="activity-heading"
      aria-live="polite"
    >
      <div>
        <p className="eyebrow">Provenance</p>
        <h2 id="activity-heading">Human–agent activity</h2>
      </div>
      {events.length === 0 ? (
        <p className="activity-empty">
          No actions yet. Every transition will show who caused it.
        </p>
      ) : (
        <ol>
          {events.slice(-6).map((event) => (
            <li key={event.id}>
              <span
                className={`actor-dot actor-${event.actor.kind}`}
                aria-hidden="true"
              />
              <div>
                <strong>{actorLabel(event.actor)}</strong>
                <p>{event.summary}</p>
              </div>
              <span className="event-sequence">#{event.sequence}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
