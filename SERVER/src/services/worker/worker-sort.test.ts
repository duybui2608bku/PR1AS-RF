import { getWorkerBoostSortKey } from "./worker.service";

describe("getWorkerBoostSortKey", () => {
  const slotId = 100;

  it("ranks a featured-boosted worker ahead of an online unboosted worker", () => {
    const boostByWorkerId = new Map([["worker-featured", { tier: 1 }]]);
    const onlineWorkerIds = new Set(["worker-online"]);

    const featuredKey = getWorkerBoostSortKey(
      "worker-featured",
      boostByWorkerId,
      onlineWorkerIds,
      slotId
    );
    const onlineKey = getWorkerBoostSortKey(
      "worker-online",
      boostByWorkerId,
      onlineWorkerIds,
      slotId
    );

    expect(featuredKey[0]).toBeLessThan(onlineKey[0]);
  });

  it("ranks an online worker ahead of an offline worker within the same (no-boost) tier", () => {
    const boostByWorkerId = new Map<string, { tier: number }>();
    const onlineWorkerIds = new Set(["worker-aaaa1111"]);

    const onlineKey = getWorkerBoostSortKey(
      "worker-aaaa1111",
      boostByWorkerId,
      onlineWorkerIds,
      slotId
    );
    const offlineKey = getWorkerBoostSortKey(
      "worker-bbbb2222",
      boostByWorkerId,
      onlineWorkerIds,
      slotId
    );

    expect(onlineKey[0]).toBe(offlineKey[0]);
    expect(onlineKey[1]).toBeLessThan(offlineKey[1]);
  });
});
