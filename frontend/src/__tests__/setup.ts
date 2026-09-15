import "@testing-library/jest-dom";
import { vi } from "vitest";

// Silenciar warnings esperados de React Router v7 future flags durante tests
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("React Router Future Flag Warning")
  ) {
    return;
  }
  originalWarn(...args);
};

// Mock URL.createObjectURL para entornos jsdom
if (typeof window.URL.createObjectURL === 'undefined') {
  Object.defineProperty(window.URL, 'createObjectURL', { value: vi.fn(() => 'mocked-url') });
}
if (typeof window.URL.revokeObjectURL === 'undefined') {
  Object.defineProperty(window.URL, 'revokeObjectURL', { value: vi.fn() });
}

