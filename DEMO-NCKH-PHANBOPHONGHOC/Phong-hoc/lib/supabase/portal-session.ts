export type PortalSessionRole = "admin" | "lecturer" | "student"

export function getPortalSessionCookieName(role: PortalSessionRole) {
  const projectReference = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?.match(/^https?:\/\/([^.]+)\./)?.[1] ?? "app"
  return `sb-${projectReference}-${role}-auth-token`
}
