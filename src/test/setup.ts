import "@testing-library/jest-dom";

const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = ((warning: unknown, ...args: unknown[]) => {
  const warningText = typeof warning === "string" ? warning : String(warning ?? "");
  if (warningText.includes("--localstorage-file") && warningText.includes("valid path")) {
    return;
  }
  return (originalEmitWarning as (...params: unknown[]) => void)(warning, ...args);
}) as typeof process.emitWarning;

const originalConsoleWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const firstArg = typeof args[0] === "string" ? args[0] : "";
  if (firstArg.includes("React Router Future Flag Warning")) {
    return;
  }
  originalConsoleWarn(...args);
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
}
