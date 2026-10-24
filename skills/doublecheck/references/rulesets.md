# Alibaba Open Code Review AST & Defect Rulesets

The principal engineer lens in `doublecheck` enforces production code quality, stability, and defensive programming standards:

---

## 1. Null & Undefined Safety
- **Unchecked Property Dereference:** Accessing nested properties (`a.b.c`) without optional chaining or null guards on parameters from untrusted or external callers.
- **Nullish Coalescing Bugs:** Using `val ?? fallback` on functions returning `undefined` by specification, causing unintended fallback evaluation.
- **Missing Default Configuration Merging:** Functions accepting partial configuration objects (`thresholds = DEFAULT_THRESHOLDS`) that fail to merge caller overrides over defaults (`{ ...DEFAULT_THRESHOLDS, ...thresholds }`), resulting in runtime `TypeError` on omitted keys.

---

## 2. Asynchronous Flow & Concurrency
- **Unhandled Promise Rejections:** Async calls scheduled inside `setTimeout`, event listeners, or callbacks without `.catch()` or try/catch wrappers.
- **Race Conditions & Cache Invalidation:** Concurrency hazards where state updates run out of order without mutexes or transaction isolation.
- **Signal Abort Omission:** Network and worker fetch calls that register `addEventListener('abort')` without checking if `signal.aborted` is already `true`.

---

## 3. Type Coercion & Boundary Validation
- **Implicit Coercion Bugs:** Using loose equality (`==`) or `String(val)` coercion on objects/booleans (`[object Object]`, `"false"`), causing invalid types to pass empty-string checks.
- **Permissive Identifier Regexes:** Regular expressions like `/^[a-z0-9-]+$/` that accept `--`, leading/trailing hyphens, or numbers instead of segment-separated kebab-case (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`).
- **Array Content & Bounds Integrity:** Checking only `Array.isArray(bounds)` without verifying that every element is a finite number (`bounds.every(Number.isFinite)`) and ordered correctly (`west < east`).

---

## 4. Resource Leaks & Lifecycle Management
- **Unbounded Event Listeners:** Attaching listeners to global objects (`window`, `document`) inside components or repeat functions without removal on unmount/cleanup.
- **Mutable Exported Constants:** Exporting mutable objects or arrays (`export const FIELDS = [...]`) instead of freezing them with `Object.freeze(...)`.
