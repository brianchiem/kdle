export function todayUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

export function todayInTZ(timeZone: string): string {
  // Use Intl to get the Y-M-D in a target time zone
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA with 2-digit gives YYYY-MM-DD order
  return fmt.format(new Date());
}

export function todayPST(): string {
  // America/Los_Angeles observes PST/PDT; this will reflect user's request to base the app in PST
  return todayInTZ('America/Los_Angeles');
}

export function formatDateInTZ(d: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(d);
}
