export function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}
