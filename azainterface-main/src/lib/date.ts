const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDate(value: string): Date {
  const match = YMD_RE.exec(value);
  if (!match) return new Date(value);

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  // Midday avoids timezone shifts for date-only values.
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

export function toYmdLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

