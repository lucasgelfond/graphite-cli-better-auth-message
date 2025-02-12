import type { Logger } from "@withgraphite/gti-server/src/logger";
import type { Json } from "./typeUtils";

export const mockLogger: Logger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

export function clone<T extends Json>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

/**
 * Returns a Promise which resolves after the current async tick is finished.
 * Useful for testing code which `await`s.
 */
export function nextTick(): Promise<void> {
  return new Promise((res) => setTimeout(res, 0));
}
