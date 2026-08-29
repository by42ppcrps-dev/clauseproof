function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(Reflect.get(value, key) as unknown);
  }
  return Object.freeze(value);
}

export function ownValue<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}
