"use client"
import { useState, useEffect } from "react"
import { Layout } from "@/components/layout/Layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Archive,
  ClipboardCheck,
  Server,
  Settings,
  Shield,
  Save,
  RotateCcw,
} from "lucide-react"
import { getRecord, updateRecord, createRecord } from "@/services/firebase"

// All menu items with their IDs matching Sidebar
const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "sales",     label: "Sales",      icon: ShoppingCart },
  { id: "hr",        label: "HR",         icon: Users },
  { id: "production",label: "Production", icon: Archive },
  { id: "quality",   label: "Quality",    icon: ClipboardCheck },
  { id: "master",    label: "Master Lists",icon: Server },
  { id: "settings",  label: "Settings",   icon: Settings },
]

// All roles in the system
const ROLES = [
  { id: "admin",      label: "Admin",            color: "bg-purple-100 text-purple-800" },
  { id: "sales",      label: "Sales",            color: "bg-blue-100 text-blue-800" },
  { id: "hr",         label: "HR",               color: "bg-green-100 text-green-800" },
  { id: "accountant", label: "Accountant",        color: "bg-yellow-100 text-yellow-800" },
  { id: "manager",    label: "Manager",           color: "bg-orange-100 text-orange-800" },
  { id: "quality",    label: "Quality",           color: "bg-red-100 text-red-800" },
  { id: "production", label: "Production",        color: "bg-teal-100 text-teal-800" },
]

// Default permissions (fallback)
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin:      ["dashboard", "sales", "hr", "quality", "production", "master", "settings"],
  sales:      ["dashboard", "sales"],
  hr:         ["dashboard", "hr"],
  accountant: ["dashboard", "finance"],
  manager:    ["dashboard", "production", "quality"],
  quality:    ["dashboard", "quality"],
  production: ["dashboard", "production"],
}

export default function SettingsPage() {
  // permissions: role → set of allowed module IDs
  const [permissions, setPermissions] = useState<Record<string, string[]>>(DEFAULT_PERMISSIONS)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load from Firebase on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getRecord("settings", "rolePermissions") as any
        if (data) {
          setPermissions(data as Record<string, string[]>)
        }
      } catch {
        // use defaults
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggle = (role: string, moduleId: string) => {
    // Admin always keeps dashboard + settings (can't remove)
    if (role === "admin" && (moduleId === "dashboard" || moduleId === "settings")) return

    setPermissions((prev) => {
      const current = prev[role] || []
      const has = current.includes(moduleId)
      return {
        ...prev,
        [role]: has ? current.filter((m) => m !== moduleId) : [...current, moduleId],
      }
    })
  }

  const hasPermission = (role: string, moduleId: string) =>
    (permissions[role] || []).includes(moduleId)

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save to Firebase - try update first, create if not exists
      try {
        await updateRecord("settings", "rolePermissions", permissions)
      } catch {
        await createRecord("settings", permissions)
      }
      // Also persist to localStorage so AuthContext can read it immediately
      localStorage.setItem("erp_role_permissions", JSON.stringify(permissions))
      toast.success("Privileges saved successfully")
    } catch {
      toast.error("Failed to save privileges")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setPermissions(DEFAULT_PERMISSIONS)
    toast.info("Reset to default permissions")
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading privileges...</p>
      </div>
    )
  }

  return (
    <Layout>
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Settings — Privileges
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Control which menu sections each role can access. Changes take effect on next login.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save Privileges"}
          </Button>
        </div>
      </div>

      {/* Privileges Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Role × Menu Access Matrix</CardTitle>
          <p className="text-xs text-muted-foreground">
            Toggle to enable/disable menu items per role. Admin always retains access to Dashboard & Settings.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-5 py-3 text-sm font-semibold text-muted-foreground w-36">
                    Role
                  </th>
                  {MENU_ITEMS.map((menu) => {
                    const Icon = menu.icon
                    return (
                      <th
                        key={menu.id}
                        className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground min-w-[90px]"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Icon className="h-4 w-4" />
                          <span>{menu.label}</span>
                        </div>
                      </th>
                    )
                  })}
                  <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground w-28">
                    Access Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map((role, idx) => {
                  const count = (permissions[role.id] || []).length
                  return (
                    <tr
                      key={role.id}
                      className={`border-b transition-colors hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                    >
                      {/* Role label */}
                      <td className="px-5 py-4">
                        <Badge className={`font-semibold text-xs ${role.color} border-0`}>
                          {role.label}
                        </Badge>
                      </td>

                      {/* Toggle per menu */}
                      {MENU_ITEMS.map((menu) => {
                        const locked =
                          role.id === "admin" &&
                          (menu.id === "dashboard" || menu.id === "settings")
                        const enabled = hasPermission(role.id, menu.id)
                        return (
                          <td key={menu.id} className="px-3 py-4 text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={enabled}
                                disabled={locked}
                                onCheckedChange={() => toggle(role.id, menu.id)}
                                className={locked ? "opacity-50 cursor-not-allowed" : ""}
                              />
                            </div>
                          </td>
                        )
                      })}

                      {/* Access count */}
                      <td className="px-5 py-4 text-right">
                        <span
                          className={`text-sm font-bold ${
                            count === 0
                              ? "text-red-500"
                              : count <= 2
                              ? "text-orange-500"
                              : "text-green-600"
                          }`}
                        >
                          {count} / {MENU_ITEMS.length}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
          Toggle ON = role can see this menu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-gray-300"></span>
          Toggle OFF = menu hidden for this role
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-purple-300 opacity-50"></span>
          Greyed out = locked (cannot change)
        </span>
      </div>
    </div>
    </Layout>
  )
}
