import type { ContractRevision } from "../../domain/schemas.js";

interface ContractPanelProps {
  contract: ContractRevision;
}

export function ContractPanel({ contract }: ContractPanelProps) {
  return (
    <section
      className="panel contract-panel"
      aria-labelledby="contract-heading"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Source language</p>
          <h2 id="contract-heading">The agreement</h2>
        </div>
        <span className="revision-badge">Revision {contract.revision}</span>
      </div>
      <div className="synthetic-note">
        <span aria-hidden="true">◇</span>
        Synthetic case · contract text is untrusted data
      </div>
      <div className="clause-list">
        {contract.clauses.map((clause) => (
          <article
            className="clause-card"
            data-clause-id={clause.id}
            key={clause.id}
          >
            <p className="clause-order">0{clause.order}</p>
            <div>
              <h3>{clause.heading}</h3>
              <p>{clause.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
