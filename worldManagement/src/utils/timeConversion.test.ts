import { describe, expect, it } from "vitest";
import { DEFAULT_CALENDAR, timeInputToValue, valueToTimeInput } from "./timeConversion";

describe("timeConversion", () => {
  it("round-trips year/month/day through timeInputToValue and valueToTimeInput", () => {
    const input = { year: 12, month: 3, day: 15 };
    const value = timeInputToValue(input, DEFAULT_CALENDAR);
    expect(valueToTimeInput(value, DEFAULT_CALENDAR)).toEqual(input);
  });

  it("defaults null month/day to the first month/day", () => {
    expect(timeInputToValue({ year: 1, month: null, day: null }, DEFAULT_CALENDAR)).toBe(
      timeInputToValue({ year: 1, month: 1, day: 1 }, DEFAULT_CALENDAR),
    );
  });
});
