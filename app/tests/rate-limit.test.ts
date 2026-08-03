import { describe, expect, it } from "vitest";
import { isRateLimited, pruneExpiredRateLimitBuckets } from "@/lib/rate-limit";

let counter = 0;
function uniqueKey() {
  counter += 1;
  return `test-key-${counter}`;
}

describe("isRateLimited", () => {
  it("allows up to the limit within the window, then blocks", () => {
    const key = uniqueKey();
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(false);
    expect(isRateLimited(key, 3, 60_000)).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const keyA = uniqueKey();
    const keyB = uniqueKey();
    expect(isRateLimited(keyA, 1, 60_000)).toBe(false);
    expect(isRateLimited(keyA, 1, 60_000)).toBe(true);
    expect(isRateLimited(keyB, 1, 60_000)).toBe(false);
  });

  it("resets once the window has passed", async () => {
    const key = uniqueKey();
    expect(isRateLimited(key, 1, 20)).toBe(false);
    expect(isRateLimited(key, 1, 20)).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(isRateLimited(key, 1, 20)).toBe(false);
  });
});

describe("pruneExpiredRateLimitBuckets", () => {
  it("does not throw and leaves fresh buckets working normally", () => {
    const key = uniqueKey();
    isRateLimited(key, 2, 60_000);
    expect(() => pruneExpiredRateLimitBuckets()).not.toThrow();
    expect(isRateLimited(key, 2, 60_000)).toBe(false);
  });
});
