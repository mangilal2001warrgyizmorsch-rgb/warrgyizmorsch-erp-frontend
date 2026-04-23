"use client";

import { useAuth } from "@/components/providers/auth-provider";

// Role access mapping for the JWT-based auth system
export const ALL_ROLES = ["admin", "sales", "purchase", "inventory", "manufacturing", "hr", "finance", "quality", "readonly"];

export const ROLE_MODULE_ACCESS: Record<string, string[]> = {
  admin: ["*"],
  sales: ["/", "/crm", "/sales", "/delivery"],
  purchase: ["/", "/purchase", "/inventory"],
  inventory: ["/", "/inventory", "/delivery"],
  manufacturing: ["/", "/manufacturing", "/shopfloor", "/quality", "/inventory"],
  hr: ["/", "/hr"],
  finance: ["/", "/finance"],
  quality: ["/", "/quality", "/manufacturing"],
  readonly: ["*"],
};

export function useUserRole() {
  const { user, isLoading } = useAuth();
  const role = user?.role || "readonly";
  const allowedModules = ROLE_MODULE_ACCESS[role] || ["*"];
  const hasAccess = (path: string) => allowedModules.includes("*") || allowedModules.some(m => path.startsWith(m));
  const isAdmin = role === "admin";

  return { role, hasAccess, isAdmin, user, isLoading };
}
