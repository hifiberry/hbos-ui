// Node (>=22) ships a native `globalThis.localStorage` backed by a file on
// disk. In sandboxed/CI environments without a writable default location it
// comes up as a broken stub (`{}`, no methods) instead of throwing or being
// `undefined`. `@vue/devtools-kit` — pulled in transitively by any real
// (unmocked) Pinia store import via `@vue/devtools-api` — calls
// `localStorage.getItem(...)` at *module load time*, which then throws
// `TypeError: localStorage.getItem is not a function` before any test code
// runs. Patch it with a working in-memory stub so store imports don't crash;
// happy-dom's own `window.localStorage` (used by application code, if any)
// is untouched by this.
const nativeLocalStorage = (globalThis as { localStorage?: Storage }).localStorage
if (nativeLocalStorage && typeof nativeLocalStorage.getItem !== 'function') {
  const store = new Map<string, string>()
  const stub: Storage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: stub,
  })
}
