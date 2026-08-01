import { createWorkerBlackoutSchema } from "./worker-blackout.validation";

describe("createWorkerBlackoutSchema", () => {
  it("rejects a blackout whose start_time is in the past", () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const later = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const result = createWorkerBlackoutSchema.safeParse({
      start_time: past,
      end_time: later,
    });

    expect(result.success).toBe(false);
  });

  it("accepts a blackout whose start_time is in the future", () => {
    const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const result = createWorkerBlackoutSchema.safeParse({
      start_time: start,
      end_time: end,
    });

    expect(result.success).toBe(true);
  });

  it("still rejects end_time before start_time", () => {
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const result = createWorkerBlackoutSchema.safeParse({
      start_time: start,
      end_time: end,
    });

    expect(result.success).toBe(false);
  });
});
