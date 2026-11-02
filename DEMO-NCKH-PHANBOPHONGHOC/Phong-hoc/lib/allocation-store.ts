import type { ClassInfo, ScheduleResult } from "./scheduling"

const SNAPSHOTS_STORAGE_KEY = "apag-allocation-snapshots-v1"
const HISTORY_STORAGE_KEY = "apag-allocation-history-v1"
const SEMESTER_CLASSES_STORAGE_KEY = "apag-semester-classes-v1"
export const ALLOCATION_UPDATED_EVENT = "apag-allocation-updated"
export const ALLOCATION_ALGORITHM_VERSION = 2

export type SemesterKey = `${number}-${number}-HK${1 | 2}`

export type AllocationSnapshot = {
  classes: ClassInfo[]
  result: ScheduleResult
  algorithmVersion?: number
  semesterKey?: SemesterKey
  savedAt?: string
}

export type AllocationHistoryEntry = AllocationSnapshot & {
  id: string
  action: "auto-schedule" | "manual-update" | "import"
}

export function getCurrentSemesterKey(value = new Date()): SemesterKey {
  const year = value.getFullYear()
  const month = value.getMonth() + 1
  return month >= 8
    ? `${year}-${year + 1}-HK1`
    : `${year - 1}-${year}-HK2`
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    window.localStorage.removeItem(key)
    return fallback
  }
}

function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.code === 22)
  )
}

function writeJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    if (!isQuotaExceededError(error)) throw error
    return false
  }
}

export function saveAllocationSnapshot(snapshot: AllocationSnapshot): void {
  if (typeof window === "undefined") return
  const semesterKey = snapshot.semesterKey ?? getCurrentSemesterKey()
  const savedSnapshot = {
    ...snapshot,
    semesterKey,
    savedAt: snapshot.savedAt ?? new Date().toISOString(),
  }
  const snapshots = readJson<Record<string, AllocationSnapshot>>(
    SNAPSHOTS_STORAGE_KEY,
    {},
  )
  snapshots[semesterKey] = savedSnapshot
  if (!writeJson(SNAPSHOTS_STORAGE_KEY, snapshots)) {
    const compactSnapshots = { [semesterKey]: savedSnapshot }
    window.localStorage.removeItem(HISTORY_STORAGE_KEY)
    if (!writeJson(SNAPSHOTS_STORAGE_KEY, compactSnapshots)) {
      throw new Error(
        "Bộ nhớ trình duyệt đã đầy. Hãy xóa dữ liệu trang localhost rồi thử lại.",
      )
    }
  }
  window.dispatchEvent(new Event(ALLOCATION_UPDATED_EVENT))
}

export function loadAllocationSnapshot(
  semesterKey = getCurrentSemesterKey(),
): AllocationSnapshot | null {
  if (typeof window === "undefined") return null
  const snapshots = readJson<Record<string, AllocationSnapshot>>(
    SNAPSHOTS_STORAGE_KEY,
    {},
  )
  if (snapshots[semesterKey]) return snapshots[semesterKey]
  return null
}

export function listAllocationSnapshots(): AllocationSnapshot[] {
  return Object.values(
    readJson<Record<string, AllocationSnapshot>>(SNAPSHOTS_STORAGE_KEY, {}),
  ).sort((left, right) =>
    (right.savedAt ?? "").localeCompare(left.savedAt ?? ""),
  )
}

export function saveAllocationHistory(
  snapshot: AllocationSnapshot,
  action: AllocationHistoryEntry["action"],
): void {
  if (typeof window === "undefined") return
  const entry: AllocationHistoryEntry = {
    ...snapshot,
    id: `allocation-history-${Date.now()}`,
    semesterKey: snapshot.semesterKey ?? getCurrentSemesterKey(),
    savedAt: new Date().toISOString(),
    action,
  }
  const history = readJson<AllocationHistoryEntry[]>(HISTORY_STORAGE_KEY, [])
  const entries = [entry, ...history]
  if (writeJson(HISTORY_STORAGE_KEY, entries.slice(0, 30))) return
  if (writeJson(HISTORY_STORAGE_KEY, entries.slice(0, 10))) return
  if (writeJson(HISTORY_STORAGE_KEY, [entry])) return
  window.localStorage.removeItem(HISTORY_STORAGE_KEY)
  console.warn("Không thể lưu lịch sử xếp phòng vì bộ nhớ trình duyệt đã đầy.")
}

export function listAllocationHistory(
  semesterKey?: SemesterKey,
): AllocationHistoryEntry[] {
  const history = readJson<AllocationHistoryEntry[]>(HISTORY_STORAGE_KEY, [])
  return history.filter((entry) => !semesterKey || entry.semesterKey === semesterKey)
}

export function clearAllocationSnapshot(
  semesterKey = getCurrentSemesterKey(),
): void {
  if (typeof window === "undefined") return
  const snapshots = readJson<Record<string, AllocationSnapshot>>(
    SNAPSHOTS_STORAGE_KEY,
    {},
  )
  delete snapshots[semesterKey]
  if (!writeJson(SNAPSHOTS_STORAGE_KEY, snapshots)) {
    window.localStorage.removeItem(SNAPSHOTS_STORAGE_KEY)
  }
  window.dispatchEvent(new Event(ALLOCATION_UPDATED_EVENT))
}

export function saveSemesterClasses(
  semesterKey: SemesterKey,
  classes: ClassInfo[],
): void {
  if (typeof window === "undefined") return
  const allClasses = readJson<Record<string, ClassInfo[]>>(
    SEMESTER_CLASSES_STORAGE_KEY,
    {},
  )
  allClasses[semesterKey] = classes
  if (!writeJson(SEMESTER_CLASSES_STORAGE_KEY, allClasses)) {
    const compactClasses = { [semesterKey]: classes }
    if (!writeJson(SEMESTER_CLASSES_STORAGE_KEY, compactClasses)) {
      throw new Error(
        "Bộ nhớ trình duyệt đã đầy. Hãy xóa dữ liệu trang localhost rồi thử lại.",
      )
    }
  }
}

export function loadImportedClasses(
  semesterKey = getCurrentSemesterKey(),
): ClassInfo[] | null {
  if (typeof window === "undefined") return null
  const semesterClasses = readJson<Record<string, ClassInfo[]>>(
    SEMESTER_CLASSES_STORAGE_KEY,
    {},
  )[semesterKey]
  if (semesterClasses) return semesterClasses
  return null
}

export function clearImportedClasses(
  semesterKey = getCurrentSemesterKey(),
): void {
  if (typeof window === "undefined") return
  const allClasses = readJson<Record<string, ClassInfo[]>>(
    SEMESTER_CLASSES_STORAGE_KEY,
    {},
  )
  delete allClasses[semesterKey]
  if (!writeJson(SEMESTER_CLASSES_STORAGE_KEY, allClasses)) {
    window.localStorage.removeItem(SEMESTER_CLASSES_STORAGE_KEY)
  }
}
