import { SHEET_ROOMS } from "@/lib/schedule-data"
import type { RoomInfo } from "@/lib/scheduling"

export type EquipmentStatus = "active" | "off" | "maintenance" | "broken" | "offline"

export type EquipmentItem = {
  id: string
  name: string
  category: string
  roomId: string
  roomKey?: string
  assetCode?: string
  quantity: number
  status: EquipmentStatus
  controllable: boolean
  notes: string
  updatedAt: string
  isDemo?: boolean
  isStandard?: boolean
}

export const EQUIPMENT_STORAGE_KEY = "apag-equipment-v1"
export const EQUIPMENT_UPDATED_EVENT = "apag-equipment-updated"

const ROOM_EQUIPMENT = [
  { suffix: "air-conditioner", name: "Điều hòa", category: "Điều hòa", quantity: 2 },
  { suffix: "projector", name: "Máy chiếu", category: "Máy chiếu", quantity: 1 },
  { suffix: "ceiling-fan", name: "Quạt trần", category: "Quạt trần", quantity: 4 },
] as const

export function getRoomKey(room: Pick<RoomInfo, "id" | "building" | "campus">): string {
  return `${room.campus ?? ""}::${room.building ?? ""}::${room.id}`
}

function normalizeEquipmentText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLocaleLowerCase()
}

function matchesStandardEquipment(item: EquipmentItem, suffix: string): boolean {
  const normalized = normalizeEquipmentText(`${item.name} ${item.category}`)
  if (suffix === "air-conditioner") {
    return normalized.includes("dieu hoa") || normalized.includes("may lanh")
  }
  if (suffix === "projector") return normalized.includes("may chieu")
  return normalized.includes("quat")
}

function equipmentCodeBase(item: EquipmentItem): string {
  const room = SHEET_ROOMS.find((candidate) => getRoomKey(candidate) === item.roomKey)
  const roomPart = room
    ? `${room.building?.replace(/^36XL-/, "") ?? "ROOM"}-${room.id}`
    : item.roomId || "UNASSIGNED"
  const namePart = normalizeEquipmentText(`${item.name}-${item.category}`)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()
  const type = namePart.includes("DIEU-HOA") || namePart.includes("MAY-LANH")
    ? "DH"
    : namePart.includes("MAY-CHIEU")
      ? "MC"
      : namePart.includes("QUAT")
        ? "QT"
        : "TB"
  return `TB-${roomPart}-${type}`
}

function makeUniqueAssetCode(item: EquipmentItem, index: number, usedCodes: Set<string>): string {
  const base = equipmentCodeBase(item)
  let code = `${base}-${String(index + 1).padStart(2, "0")}`
  let suffix = 2
  while (usedCodes.has(code)) {
    code = `${base}-${String(index + 1).padStart(2, "0")}-${suffix}`
    suffix += 1
  }
  usedCodes.add(code)
  return code
}

function splitIntoIndividualEquipment(items: EquipmentItem[]): EquipmentItem[] {
  const usedCodes = new Set<string>()
  return items.flatMap((item) => {
    const count = Math.max(1, item.quantity)
    return Array.from({ length: count }, (_, index) => {
      const assetCode = item.assetCode && count === 1 && !usedCodes.has(item.assetCode)
        ? item.assetCode
        : makeUniqueAssetCode(item, index, usedCodes)
      usedCodes.add(assetCode)
      return {
        ...item,
        id: index === 0 ? item.id : `${item.id}-${index + 1}`,
        quantity: 1,
        assetCode,
      }
    })
  })
}

function withRoomEquipmentDefaults(items: EquipmentItem[]): EquipmentItem[] {
  const next = [...items]

  for (const room of SHEET_ROOMS) {
    for (const standard of ROOM_EQUIPMENT) {
      const existingItems = next.filter(
        (item) =>
          item.roomId === room.id &&
          (item.roomKey ?? "") === getRoomKey(room) &&
          matchesStandardEquipment(item, standard.suffix),
      )
      for (let index = existingItems.length; index < standard.quantity; index += 1) {
        const standardItem: EquipmentItem = {
          id: `standard-${getRoomKey(room)}-${standard.suffix}-${index + 1}`,
          name: standard.name,
          category: standard.category,
          roomId: room.id,
          roomKey: getRoomKey(room),
          quantity: 1,
          status: "active",
          controllable: false,
          notes: "Thiết bị tiêu chuẩn của phòng",
          updatedAt: "",
          isStandard: true,
        }
        standardItem.assetCode = makeUniqueAssetCode(standardItem, index, new Set(next.map((item) => item.assetCode).filter(Boolean) as string[]))
        next.push(standardItem)
      }
    }
  }
  return next
}

export function loadEquipment(): EquipmentItem[] {
  if (typeof window === "undefined") return []
  const raw = window.localStorage.getItem(EQUIPMENT_STORAGE_KEY)
  if (!raw) {
    const defaults = withRoomEquipmentDefaults([])
    window.localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(defaults))
    return defaults
  }

  try {
    const items: unknown = JSON.parse(raw)
    if (!Array.isArray(items)) {
      const defaults = withRoomEquipmentDefaults([])
      window.localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(defaults))
      return defaults
    }

    const normalizedItems = items.map((item, index) => {
      const legacy = item as Partial<EquipmentItem> & { condition?: string }
      const status: EquipmentStatus =
        legacy.status === "active" || legacy.status === "off" || legacy.status === "maintenance" || legacy.status === "broken" || legacy.status === "offline"
          ? legacy.status
          : legacy.condition === "maintenance" || legacy.condition === "broken"
            ? legacy.condition
            : "active"

      return {
        id: typeof legacy.id === "string" ? legacy.id : `equipment-migrated-${index}`,
        name: typeof legacy.name === "string" ? legacy.name : "Thiết bị chưa đặt tên",
        category: typeof legacy.category === "string" ? legacy.category : "Khác",
        roomId: typeof legacy.roomId === "string" ? legacy.roomId : "",
        roomKey: typeof legacy.roomKey === "string"
          ? legacy.roomKey
          : "",
        assetCode: typeof legacy.assetCode === "string" && /^TB-[A-Z0-9]+-[A-Z0-9]+-[A-Z]{2}-\d{2}$/.test(legacy.assetCode)
          ? legacy.assetCode
          : undefined,
        quantity: Number.isInteger(legacy.quantity) && Number(legacy.quantity) > 0 ? Number(legacy.quantity) : 1,
        status: legacy.isDemo && legacy.id === "demo-a301-projector" && !legacy.updatedAt ? "active" : status,
        controllable: Boolean(legacy.controllable),
        notes: typeof legacy.notes === "string" ? legacy.notes : "",
        updatedAt: typeof legacy.updatedAt === "string" ? legacy.updatedAt : "",
        isDemo: Boolean(legacy.isDemo),
        isStandard: Boolean(legacy.isStandard),
      }
    })
    const itemsWithRoomKeys = normalizedItems.map((item) => {
      if (item.roomKey && item.roomKey.includes("::")) return item
      const room = SHEET_ROOMS.find((candidate) => candidate.id === item.roomId)
      return room ? { ...item, roomKey: getRoomKey(room) } : item
    })
    const itemsWithDefaults = withRoomEquipmentDefaults(splitIntoIndividualEquipment(itemsWithRoomKeys))
    if (JSON.stringify(itemsWithDefaults) !== JSON.stringify(items)) {
      window.localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(itemsWithDefaults))
    }
    return itemsWithDefaults
  } catch {
    const defaults = withRoomEquipmentDefaults([])
    window.localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(defaults))
    return defaults
  }
}

export function saveEquipment(items: EquipmentItem[]): void {
  if (typeof window === "undefined") return
  const normalizedItems = withRoomEquipmentDefaults(splitIntoIndividualEquipment(items))
  window.localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(normalizedItems))
  window.dispatchEvent(new Event(EQUIPMENT_UPDATED_EVENT))
}