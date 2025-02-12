/**
 * Given a multi-line string, return the first line excluding '\n'.
 * If no newlines in the string, return the whole string.
 */
export function firstLine(s: string): string {
  return s.split("\n", 1)[0];
}

export function firstOfIterable<T>(it: IterableIterator<T>): T | undefined {
  return it.next().value;
}

export function assert(shouldBeTrue: boolean, error: string): void {
  if (!shouldBeTrue) {
    throw new Error(error);
  }
}

export type NonNullReactElement = React.ReactElement | React.ReactFragment;

/**
 * name of the gti platform being used,
 * for example 'browser' or 'vscode'.
 * Note: This is exposed outisde of gti/platform.ts to prevent import cycles.
 */
export function gtiPlatformName(): string {
  return window.gtiPlatform?.platformName ?? "browser";
}

export function getWindowWidthInPixels(): number {
  if (process.env.NODE_ENV === "test") {
    return 1000;
  }
  // Use client width and not screen width to handle embedding as an iframe.
  return document.body.clientWidth;
}
