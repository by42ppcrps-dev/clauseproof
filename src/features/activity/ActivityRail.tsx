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

function actionLabel(action: string): string {
  switch (action) {
    case "stage_interpretations":
      return "Readings staged";
    case "run_contract_crash_test":
      return "Same facts executed";
    case "lock_outcome":
      return "Intent locked";
    case "propose_clarifying_redline":
      return "Clarification staged";
    case "verify_contract_tests":
      return "Candidate tested";
    case "accept_redline":
      return "Revision accepted";
    case "reset_demo":
      return "Case reset";
    default:
      return "Action recorded";
  }
}

export function ActivityRail({ events }: ActivityRailProps) {
  return (
    <section
      className="activity-rail"
      aria-labelledby="activity-heading"
      aria-live="polite"
    >
      <div>
        <p className="eyebrow">Recorded provenance</p>
        <h2 id="activity-heading">Proof ledger</h2>
      </div>
      {events.length === 0 ? (
        <p className="activity-empty">
          No actions yet. Every transition records who acted and what happened.
        </p>
      ) : (
        <ol>
          {events.map((event) => (
            <li key={event.id}>
              <span
                className={`actor-dot actor-${event.actor.kind}`}
                aria-hidden="true"
              />
              <div>
                <strong>{actorLabel(event.actor)}</strong>
                <span className="event-action">
                  {actionLabel(event.action)}
                </span>
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
