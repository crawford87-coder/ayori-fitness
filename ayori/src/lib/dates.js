// All date computation goes through here — no raw `new Date()` in app code

// Returns "YYYY-MM-DD" for today in the given IANA timezone
export function todayInTz(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
}

// Returns the Monday of the current week as a local Date object (date parts only)
function mondayOfWeek(tz) {
  const str = todayInTz(tz); // "2026-05-15"
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(y, m - 1, d); // local midnight — only using date parts
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(y, m - 1, d + diff);
}

// Returns { Mon:"2026-05-11", Tue:"2026-05-12", ... } for the current week
export function weekDatesInTz(tz) {
  const mon = mondayOfWeek(tz);
  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return Object.fromEntries(DAYS.map((name, i) => {
    const dt = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
    const y = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    return [name, `${y}-${mo}-${da}`];
  }));
}

// Returns a stable week key string e.g. "w-2026-4-11"
export function weekKeyInTz(tz) {
  const mon = mondayOfWeek(tz);
  return `w-${mon.getFullYear()}-${mon.getMonth()}-${mon.getDate()}`;
}

// Returns 0=Mon, 1=Tue, ..., 6=Sun for today in the given timezone
export function dayIndexInTz(tz) {
  const str = todayInTz(tz);
  const [y, m, d] = str.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay(); // 0=Sun
  return day === 0 ? 6 : day - 1;
}
