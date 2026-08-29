export function monthIndex(month: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new RangeError(`Invalid month: ${month}`);
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

function formatMonth(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function addMonths(month: string, count: number): string {
  return formatMonth(monthIndex(month) + count);
}
