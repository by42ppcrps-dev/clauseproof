import type { WorkflowPhase } from "../../domain/model.js";
import {
  agentToolLabels,
  agentToolsByPhase,
  humanOnlyActions,
} from "../../webmcp/surface.js";

interface AuthorityBoundaryProps {
  phase: WorkflowPhase;
}

export function AuthorityBoundary({ phase }: AuthorityBoundaryProps) {
  const agentTools = agentToolsByPhase[phase];

  return (
    <section
      className="authority-boundary"
      aria-labelledby="authority-boundary-heading"
    >
      <div className="authority-boundary-copy">
        <p className="eyebrow">Authority boundary</p>
        <h2 id="authority-boundary-heading">Visible powers, enforced limits</h2>
        <p>
          Agent access changes with the workflow. ClauseProof calculates every
          outcome and test. Human decisions never become browser tools.
        </p>
        <span className="authority-phase">
          Current phase <code>{phase}</code>
        </span>
      </div>

      <div className="authority-lanes">
        <div className="authority-lane agent-authority" aria-live="polite">
          <div className="authority-lane-heading">
            <div>
              <span>Browser agent</span>
              <h3>Service-authorized now</h3>
            </div>
            <span className="authority-count">Available now</span>
          </div>
          <ul>
            {agentTools.map((toolName) => (
              <li key={toolName}>
                <strong>{agentToolLabels[toolName]}</strong>
                <code>{toolName}</code>
              </li>
            ))}
          </ul>
        </div>

        <div className="authority-lane human-authority">
          <div className="authority-lane-heading">
            <div>
              <span>Person</span>
              <h3>Never exposed as tools</h3>
            </div>
            <span className="person-only-badge">Person only</span>
          </div>
          <ul>
            {humanOnlyActions.map((action) => (
              <li key={action.id}>
                <strong>{action.label}</strong>
                <span>Visible UI authority</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
