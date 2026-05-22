import { Buffer as BufferPolyfill } from "buffer";

const target = (typeof window !== "undefined" ? window : globalThis) as any;
target.Buffer = BufferPolyfill;
if (typeof globalThis !== "undefined") {
  (globalThis as any).Buffer = BufferPolyfill;
}
if (typeof window !== "undefined" && !(window as any).global) {
  (window as any).global = window;
}
