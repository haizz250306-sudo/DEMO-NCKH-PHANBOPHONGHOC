import { PortalShell } from "@/components/portal-shell"
import { PortalAuth } from "@/components/portal-auth"

export const dynamic = "force-dynamic"

export default function AdminPanelPage() {
  return (
    <PortalAuth role="admin">
      <PortalShell role="admin" />
    </PortalAuth>
  )
}
