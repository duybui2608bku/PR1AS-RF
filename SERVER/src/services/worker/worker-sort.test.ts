import { compareWorkerRanking, WorkerRankingInput } from "./worker.service";

const baseWorker = (
  overrides: Partial<WorkerRankingInput> & { id: string }
): WorkerRankingInput => ({
  reputation_score: 100,
  completed_bookings: 0,
  average_rating: 0,
  created_at: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

describe("compareWorkerRanking", () => {
  const slotId = 100;
  const noBoosts = new Map<string, { tier: number }>();
  const noneOnline = new Set<string>();

  it("ranks a featured-boosted worker ahead of a higher-merit unboosted worker", () => {
    const featured = baseWorker({ id: "worker-featured" });
    const unboosted = baseWorker({ id: "worker-unboosted", completed_bookings: 999 });
    const boostByWorkerId = new Map([["worker-featured", { tier: 1 }]]);

    const result = compareWorkerRanking(
      featured,
      unboosted,
      boostByWorkerId,
      noneOnline,
      slotId
    );

    expect(result).toBeLessThan(0);
  });

  it("pushes a reputation-flagged worker (<30) to the back even with more completed bookings", () => {
    const flagged = baseWorker({
      id: "worker-flagged",
      reputation_score: 10,
      completed_bookings: 999,
    });
    const clean = baseWorker({ id: "worker-clean", reputation_score: 100 });

    const result = compareWorkerRanking(flagged, clean, noBoosts, noneOnline, slotId);

    expect(result).toBeGreaterThan(0);
  });

  it("ranks an online worker ahead of an offline worker within the same tier and reputation gate", () => {
    const online = baseWorker({ id: "worker-aaaa1111" });
    const offline = baseWorker({ id: "worker-bbbb2222" });
    const onlineWorkerIds = new Set(["worker-aaaa1111"]);

    const result = compareWorkerRanking(online, offline, noBoosts, onlineWorkerIds, slotId);

    expect(result).toBeLessThan(0);
  });

  it("ranks higher completed_bookings ahead when tier/gate/online are tied", () => {
    const busy = baseWorker({ id: "worker-busy", completed_bookings: 10 });
    const idle = baseWorker({ id: "worker-idle", completed_bookings: 1 });

    const result = compareWorkerRanking(busy, idle, noBoosts, noneOnline, slotId);

    expect(result).toBeLessThan(0);
  });

  it("falls back to average_rating when completed_bookings are tied", () => {
    const highRated = baseWorker({
      id: "worker-high",
      completed_bookings: 5,
      average_rating: 4.8,
    });
    const lowRated = baseWorker({
      id: "worker-low",
      completed_bookings: 5,
      average_rating: 3.0,
    });

    const result = compareWorkerRanking(highRated, lowRated, noBoosts, noneOnline, slotId);

    expect(result).toBeLessThan(0);
  });

  it("falls back to reputation_score when bookings and rating are tied", () => {
    const higherRep = baseWorker({
      id: "worker-rep-high",
      completed_bookings: 5,
      average_rating: 4,
      reputation_score: 95,
    });
    const lowerRep = baseWorker({
      id: "worker-rep-low",
      completed_bookings: 5,
      average_rating: 4,
      reputation_score: 60,
    });

    const result = compareWorkerRanking(higherRep, lowerRep, noBoosts, noneOnline, slotId);

    expect(result).toBeLessThan(0);
  });

  it("ranks a newly created worker ahead of an older one when every merit stat is tied", () => {
    const newer = baseWorker({
      id: "worker-new",
      created_at: new Date("2026-08-10T00:00:00Z"),
    });
    const older = baseWorker({
      id: "worker-old",
      created_at: new Date("2025-01-01T00:00:00Z"),
    });

    const result = compareWorkerRanking(newer, older, noBoosts, noneOnline, slotId);

    expect(result).toBeLessThan(0);
  });

  it("is deterministic for the same inputs (stable scatter tiebreak)", () => {
    const a = baseWorker({ id: "worker-aaaa0001" });
    const b = baseWorker({ id: "worker-bbbb0002" });

    const first = compareWorkerRanking(a, b, noBoosts, noneOnline, slotId);
    const second = compareWorkerRanking(a, b, noBoosts, noneOnline, slotId);

    expect(first).toBe(second);
  });
});
