const HUMAN_AUTHORITY = Symbol("ClauseProof human UI authority");

export interface HumanUiActor {
  readonly kind: "human-ui";
  readonly [HUMAN_AUTHORITY]: true;
}

export function createHumanUiActor(): HumanUiActor {
  const actor: HumanUiActor = { kind: "human-ui", [HUMAN_AUTHORITY]: true };
  return Object.freeze(actor);
}

export function hasHumanAuthority(actor: HumanUiActor): boolean {
  return actor[HUMAN_AUTHORITY] === true;
}
