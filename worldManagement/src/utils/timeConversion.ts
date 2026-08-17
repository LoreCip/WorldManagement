import { TimeInput, TimePrecision } from "../types/timeline";

// Calendario convenzionale semplificato: mesi di lunghezza fissa.
// Non rappresenta un vero calendario reale, serve solo a dare un ordinamento
// coerente e uno "spazio" prevedibile fra le date sull'asse.
export interface CalendarConfig {
  daysPerMonth: number;
  daysPerYear: number;
}

export const DEFAULT_CALENDAR: CalendarConfig = { daysPerMonth: 30, daysPerYear: 360 };

const MONTH_NAMES = [
  "Nevaio", "Gelo", "Disgelo", "Germoglio", "Fioritura", "Sole Alto",
  "Mietitura", "Bracia", "Foglia Caduta", "Nebbia", "Brina", "Notte Lunga",
]; // placeholder generico — personalizzabile per-mondo in una fase futura

function monthName(m: number): string {
  return MONTH_NAMES[((m - 1) % 12 + 12) % 12];
}

export function timeInputToValue(input: TimeInput, calendar: CalendarConfig = DEFAULT_CALENDAR): number {
  const { daysPerMonth, daysPerYear } = calendar;
  const month = input.month ?? 1;
  const day = input.day ?? 1;
  return input.year * daysPerYear + (month - 1) * daysPerMonth + (day - 1);
}

export function valueToTimeInput(value: number, calendar: CalendarConfig = DEFAULT_CALENDAR): TimeInput {
  const { daysPerMonth, daysPerYear } = calendar;
  const year = Math.floor(value / daysPerYear);
  const rem = value - year * daysPerYear;
  const month = Math.floor(rem / daysPerMonth) + 1;
  const day = (rem % daysPerMonth) + 1;
  return { year, month, day };
}

export function formatTimeValue(value: number, precision: TimePrecision, calendar: CalendarConfig = DEFAULT_CALENDAR): string {
  const { year, month, day } = valueToTimeInput(value, calendar);
  if (precision === "year") return `Anno ${year}`;
  if (precision === "month") return `${monthName(month ?? 1)}, Anno ${year}`;
  return `${day} ${monthName(month ?? 1)}, Anno ${year}`;
}

// --- Nice ticks ---
// Intervalli "puliti" espressi in giorni (unità interna dell'asse)
const TICK_STEPS_DAYS = [
  1, 5, 10, 30,
  90, 180, 360,
  360 * 5, 360 * 10, 360 * 25, 360 * 50,
  360 * 100, 360 * 250, 360 * 500,
  360 * 1000, 360 * 5000, 360 * 10000, 360 * 50000,
];

export interface TickInfo {
  value: number;
  label: string;
}

export function computeNiceTicks(
  minValue: number,
  maxValue: number,
  pixelWidth: number,
  minPixelsBetweenTicks = 90,
  calendar: CalendarConfig = DEFAULT_CALENDAR
): TickInfo[] {
  const range = Math.max(1, maxValue - minValue);
  const maxTicks = Math.max(2, Math.floor(pixelWidth / minPixelsBetweenTicks));

  let step = TICK_STEPS_DAYS[TICK_STEPS_DAYS.length - 1];
  for (const candidate of TICK_STEPS_DAYS) {
    if (range / candidate <= maxTicks) {
      step = candidate;
      break;
    }
  }

  const ticks: TickInfo[] = [];
  const start = Math.floor(minValue / step) * step;
  for (let v = start; v <= maxValue + step; v += step) {
    ticks.push({ value: v, label: tickLabel(v, step, calendar) });
  }
  return ticks;
}

function tickLabel(value: number, step: number, calendar: CalendarConfig): string {
  const { year, month, day } = valueToTimeInput(value, calendar);
  if (step < calendar.daysPerMonth) return `${day} ${monthName(month ?? 1)} ${year}`;
  if (step < calendar.daysPerYear) return `${monthName(month ?? 1)} ${year}`;
  if (step < calendar.daysPerYear * 1000) return `${year}`;
  return `${Math.round(year / 1000)} mila`;
}

export function formatDuration(
  start: number,
  end: number,
  precision: TimePrecision,
  calendar: CalendarConfig = DEFAULT_CALENDAR
): string {
  const days = end - start;
  if (days <= 0) return formatTimeValue(start, precision, calendar);
  if (days < calendar.daysPerMonth) return `${days} giorni`;
  if (days < calendar.daysPerYear) return `${Math.round(days / calendar.daysPerMonth)} mesi`;
  const years = Math.round(days / calendar.daysPerYear);
  return years === 1 ? "1 anno" : `${years} anni`;
}