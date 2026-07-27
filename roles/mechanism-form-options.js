export const MECHANISM_SCHEDULES = [
  { value: "5/2", label: "5/2 — по будням", shortLabel: "5/2" },
  { value: "6/1", label: "6/1 — один выходной", shortLabel: "6/1" },
  { value: "2/2", label: "2/2 — посменно", shortLabel: "2/2" },
  { value: "7/0", label: "7/0 — ежедневно", shortLabel: "7/0" },
  { value: "manual", label: "Вручную — свой график", shortLabel: "Вручную" },
];

export const MECHANISM_START_TIMES = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minutes = index % 2 ? "30" : "00";
  return `${String(hour).padStart(2, "0")}:${minutes}`;
});

export const MECHANISM_END_TIMES = [...MECHANISM_START_TIMES.slice(1), "24:00"];

export const mechanismScheduleOptions = (selected = "5/2") => MECHANISM_SCHEDULES
  .map(({ value, label }) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`)
  .join("");

export const mechanismTimeOptions = (times, selected) => times
  .map((time) => `<option value="${time}" ${time === selected ? "selected" : ""}>${time}</option>`)
  .join("");
