"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseConfig } from "./config"
import {
  getPortalSessionCookieName,
  type PortalSessionRole,
} from "./portal-session"

export function createSupabaseBrowserClient(role: PortalSessionRole) {
  const config = getSupabaseConfig()
  if (!config) throw new Error("Supabase chưa được cấu hình.")

  return createBrowserClient(config.url, config.anonKey, {
    cookieOptions: {
      name: getPortalSessionCookieName(role),
    },
  })
}
