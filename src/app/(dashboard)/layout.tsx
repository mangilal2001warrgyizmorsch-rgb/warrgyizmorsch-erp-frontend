"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  ClipboardList,
  Package,
  Factory,
  Wallet,
  UserSearch,
  CheckSquare,
  Truck,
  Cpu,
  Bot,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronLeft,
  ChevronRight,
  Shield,
  Plug,
  HardHat,
  ClipboardCheck,
  CircleDollarSign,
  Zap,
  BadgeDollarSign,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "CRM", href: "/crm", icon: UserSearch },
  { label: "Sales", href: "/sales", icon: BadgeDollarSign },
  { label: "Purchase", href: "/purchase", icon: ShoppingCart },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Manufacturing", href: "/manufacturing", icon: Factory },
  { label: "Shop Floor", href: "/shopfloor", icon: HardHat },
  { label: "Quality", href: "/quality", icon: ClipboardCheck },
  { label: "Challan", href: "/Challan", icon: ClipboardList },
  { label: "Delivery", href: "/delivery", icon: Truck },
  { label: "Finance", href: "/finance", icon: CircleDollarSign },
  { label: "HR", href: "/hr", icon: Users },
  { label: "Automations", href: "/automations", icon: Zap },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "Admin", href: "/admin", icon: Shield, isFooter: true },
  { label: "Settings", href: "/settings", icon: Settings, isFooter: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { hasAccess, isAdmin } = useUserRole();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api.get<{ _id: string; title: string; isRead: boolean }[]>(
        "/operations/notifications",
      ),
    enabled: !!user,
  });
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-10 w-40" />
          <p className="text-xs text-muted-foreground animate-pulse">
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (item.href === "/admin" && !isAdmin) return false;
    return hasAccess(item.href);
  });

  const currentPage =
    NAV_ITEMS.find(
      (item) =>
        item.href === pathname ||
        (item.href !== "/" && pathname.startsWith(item.href)),
    ) ?? NAV_ITEMS[0];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 border-r border-sidebar-border",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 h-16 px-3 border-b border-sidebar-border",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-full flex items-center justify-center p-1 bg-white/5 overflow-hidden">
                  <img src="/assets/images/logo.webp" alt="logo" className="w-full h-full object-contain" />
                </div>
            {!collapsed && (
              <div className="flex items-center gap-3">
                
                <div className="min-w-0">
                  <p className="font-bold text-sm tracking-tight text-sidebar-primary">
                    Warrgyiz Morsch
                  </p>
                  <p className="text-[11px] uppercase text-sidebar-foreground/60">
                    Enterprise ERP
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {filteredNav.map((item, index) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            
            return (
              <div key={item.href}>
                {item.isFooter && filteredNav[index - 1] && !filteredNav[index - 1].isFooter && (
                  <div className="my-3 border-t border-sidebar-border mx-2" />
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center py-2.5 rounded-md text-sm transition-colors",
                    collapsed ? "justify-center px-0" : "gap-2.5 px-3",
                    isActive
                      ? "bg-[#00afa7] text-black font-bold shadow-sm"
                      : "font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3 flex flex-col gap-1">
          <button
            onClick={logout}
            className={cn(
              "flex items-center py-2 rounded-md text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground cursor-pointer transition-colors",
              collapsed ? "justify-center px-0" : "gap-3 px-2 hover:bg-sidebar-accent/50"
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex items-center py-2 rounded-md text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground cursor-pointer transition-colors",
              collapsed ? "justify-center px-0 mt-1" : "gap-3 px-2 mt-1 bg-sidebar-accent/30 hover:bg-sidebar-accent/60"
            )}
          >
            {collapsed ? <ChevronRight size={18} className="shrink-0" /> : <><ChevronLeft size={18} className="shrink-0" /> <span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar text-sidebar-foreground flex flex-col">
            <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
              <div>
                <p className="font-bold text-sm text-sidebar-primary">
                  Warrgyiz Morsch
                </p>
                <p className="text-[11px] text-sidebar-foreground/60">
                  Enterprise ERP
                </p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded hover:bg-sidebar-accent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
              {filteredNav.map((item, index) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <div key={item.href}>
                    {item.isFooter && filteredNav[index - 1] && !filteredNav[index - 1].isFooter && (
                      <div className="my-3 border-t border-sidebar-border mx-2" />
                    )}
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-[#00AFA7] text-black font-bold shadow-sm"
                          : "font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50",
                      )}
                    >
                      <item.icon size={18} className="shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </div>
                );
              })}
            </nav>
            <div className="border-t border-sidebar-border p-2">
              <button
                onClick={logout}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent cursor-pointer"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>

            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded hover:bg-muted cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                {currentPage.label}
              </p>
              <p className="text-[11px] text-muted-foreground/70">
                {currentPage.label === "Dashboard"
                  ? "Real-time overview across all modules"
                  : `Manage ${currentPage.label.toLowerCase()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="relative">
              <Bell size={16} className="text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 rounded-full border border-border pl-1.5 pr-4 py-1">
              <div className="w-8 h-8 rounded-full bg-[#00AFA7]/15 flex items-center justify-center text-[#00AFA7] text-[13px] font-bold tracking-wider">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden sm:flex flex-col items-start justify-center gap-0.5">
                <p className="text-[13px] font-medium leading-none">{user.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize leading-none">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
