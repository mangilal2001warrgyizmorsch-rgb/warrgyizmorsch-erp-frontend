"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ShieldCheck, User, Users, Lock, CheckCircle2, XCircle } from "lucide-react";
import { useUserRole, ALL_ROLES, ROLE_MODULE_ACCESS } from "@/hooks/use-user-role";

type ErpRole = string;

const ROLE_DESCRIPTIONS: Record<ErpRole, string> = {
  admin: "Full access to all modules and admin settings",
  sales: "CRM, Sales, Delivery",
  purchase: "Purchase, Inventory",
  inventory: "Inventory, Delivery",
  manufacturing: "Manufacturing, Shopfloor, Quality, Inventory",
  hr: "HR module only",
  finance: "Finance & Accounting only",
  quality: "Quality & Manufacturing",
  readonly: "View-only access to all modules",
};

const ROLE_COLORS: Record<ErpRole, string> = {
  admin: "bg-red-100 text-red-700",
  sales: "bg-blue-100 text-blue-700",
  purchase: "bg-orange-100 text-orange-700",
  inventory: "bg-yellow-100 text-yellow-700",
  manufacturing: "bg-purple-100 text-purple-700",
  hr: "bg-pink-100 text-pink-700",
  finance: "bg-green-100 text-green-700",
  quality: "bg-teal-100 text-teal-700",
  readonly: "bg-gray-100 text-gray-600",
};

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, isLoading, role } = useUserRole();

  // Redirect non-admins
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push("/");
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading) return <div className="p-6"><Skeleton className="h-32 w-full" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">User management & role-based access control</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Management */}
        <div className="lg:col-span-2">
          <UserManagementCard />
        </div>
        {/* Role Reference */}
        <div>
          <RoleReferenceCard />
        </div>
      </div>
    </div>
  );
}

// ─── User Management ──────────────────────────────────────────────────────────
function UserManagementCard() {
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => api.get<any[]>("/users") });
  const updateRole = useMutation({ mutationFn: ({ userId, role }: any) => api.put(`/users/${userId}/role`, { role }), onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }) });
  const toggleActive = useMutation({ mutationFn: ({ userId, isActive }: any) => api.put(`/users/${userId}/toggle-active`, { isActive }), onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }) });
  const { user: currentUser } = useUserRole();

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateRole.mutateAsync({ userId, role });
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role — admin only");
    }
  };

  const handleToggleActive = async (userId: string, current: boolean) => {
    try {
      await toggleActive.mutateAsync({ userId, isActive: !current });
      toast.success(`User ${!current ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users size={16} />
          System Users ({users?.length ?? 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!users ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : (
          users.map((u: any) => {
            const isSelf = u._id === currentUser?._id;
            const userRole = (u.role ?? "readonly") as ErpRole;
            return (
              <div key={u._id} className={`flex items-center justify-between p-3 rounded-lg border transition ${!u.isActive ? "opacity-50 bg-muted/30" : "hover:bg-muted/30"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User size={15} className="text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{u.name ?? "Unnamed"}</p>
                      {isSelf && <Badge variant="outline" className="text-xs py-0">You</Badge>}
                      {!u.isActive && <Badge className="text-xs bg-gray-100 text-gray-500">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Role selector */}
                  <Select
                    value={u.role ?? "readonly"}
                    onValueChange={(v) => handleRoleChange(u._id, v)}
                    disabled={isSelf}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          <span className="capitalize">{r}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Active toggle */}
                  <Switch
                    checked={u.isActive ?? true}
                    onCheckedChange={() => handleToggleActive(u._id, u.isActive ?? true)}
                    disabled={isSelf}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            );
          })
        )}
        {users?.length === 0 && (
          <p className="text-sm text-center text-muted-foreground py-6">No users found</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Role Reference ───────────────────────────────────────────────────────────
function RoleReferenceCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock size={16} />
          Role Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ALL_ROLES.map((r) => {
          const modules = ROLE_MODULE_ACCESS[r];
          const isAll = modules.includes("*");
          return (
            <div key={r} className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge className={`text-xs capitalize ${ROLE_COLORS[r]}`}>{r}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{ROLE_DESCRIPTIONS[r]}</p>
              <div className="flex flex-wrap gap-1">
                {isAll ? (
                  <span className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800">
                    All modules
                  </span>
                ) : modules.map((m) => (
                  <span key={m} className="text-xs bg-muted px-1.5 py-0.5 rounded">{m === "/" ? "Dashboard" : m.slice(1)}</span>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Access Guard (exported for use in other pages) ───────────────────────────
export function AccessGuard({ allowedRoles, children }: { allowedRoles: ErpRole[]; children: React.ReactNode }) {
  const { role, isLoading } = useUserRole();

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  if (!allowedRoles.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <XCircle size={40} className="mb-3 opacity-30" />
        <p className="text-base font-medium">Access Denied</p>
        <p className="text-sm mt-1">Your role (<span className="capitalize font-medium">{role}</span>) does not have permission to view this page.</p>
        <p className="text-xs mt-2">Contact your admin to request access.</p>
      </div>
    );
  }

  return <>{children}</>;
}
