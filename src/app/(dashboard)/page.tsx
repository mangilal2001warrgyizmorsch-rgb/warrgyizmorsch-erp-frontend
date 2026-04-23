"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  TrendingUp, ShoppingCart, Factory, Package,
  Users, UserSearch, IndianRupee, AlertTriangle,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Draft: "#94a3b8",
  Confirmed: "#3b82f6",
  "In Production": "#a855f7",
  Delivered: "#22c55e",
  "In Progress": "#f59e0b",
  Completed: "#22c55e",
};

const CHART_COLORS = ["#6366f1", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444"];

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={cn("p-2.5 rounded-lg", color)}>
            <Icon size={18} className="text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(n: number) {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString()}`;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => api.get<any>("/dashboard/stats"),
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: () => api.get<any[]>("/dashboard/activity?limit=8"),
  });

  if (statsLoading || !stats) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Omni Dashboard</h1>
            <p className="text-sm text-muted-foreground">Real-time overview across finance, operations, manufacturing, sales and inventory.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">Updated live</span>
            <span className="rounded-full bg-muted px-3 py-1">8 modules</span>
          </div>
        </div>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} sub="All time sales" icon={IndianRupee} color="bg-emerald-500" />
        <StatCard title="Pending Orders" value={stats.pendingOrders} sub="Confirmed + In Production" icon={ShoppingCart} color="bg-blue-500" />
        <StatCard title="Active Mfg Orders" value={stats.activeManufacturing} sub="Currently in progress" icon={Factory} color="bg-violet-500" />
        <StatCard title="New Leads" value={stats.newLeads} sub={`${stats.totalLeads} total leads`} icon={UserSearch} color="bg-rose-500" />
        <StatCard title="Receivables" value={formatCurrency(stats.receivables)} sub="Outstanding invoices" icon={TrendingUp} color="bg-indigo-500" />
        <StatCard title="Active Employees" value={stats.activeEmployees} sub="Across all departments" icon={Users} color="bg-teal-500" />
        <StatCard title="Pending POs" value={stats.pendingPO} sub="Awaiting approval" icon={Package} color="bg-amber-500" />
        <StatCard title="Low Stock Alerts" value={stats.lowStockCount ?? 0} sub="Below reorder point" icon={AlertTriangle} color="bg-orange-500" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2 text-sm font-semibold"><CardTitle>Revenue Trend </CardTitle></CardHeader>
          <CardContent>
            {!stats.recentSales || stats.recentSales.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No sales data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={stats.recentSales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                  <Tooltip cursor={{ stroke: "transparent" }} formatter={(v) => `₹${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sales by Status */}
        <Card>
          <CardHeader className="pb-2 text-sm font-semibold"><CardTitle>Sales Orders by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.ordersByStatus}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32}>
                  {stats.ordersByStatus?.map((entry: any, i: number) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Manufacturing & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MO by Status Pie */}
        <Card>
          <CardHeader className="pb-2 text-sm font-semibold"><CardTitle>Manufacturing Orders</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={stats.moByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={50}
                  paddingAngle={5}
                  label={false}
                  labelLine={false}
                  style={{
                    marginBottom:"10"
                  }}
                >
                  {stats.moByStatus?.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip cursor={{ fill: "transparent" }} />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  layout="vertical"
                  iconType="circle"
                  wrapperStyle={{
                    display: "flex",
                    flexDirection: "column",
                    marginTop: "10px",
                    gap: "5px",
                    color: "#94a3b8",
                    fontSize: 12,
                    lineHeight: "20px",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 text-sm font-semibold">Recent Activity</CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
              ) : !activity || activity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
              ) : (
                activity.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter shrink-0",
                        item.type === "sales_order" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        item.type === "manufacturing_order" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" :
                        "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                      )}>
                        {item.type === "sales_order" ? "SO" : item.type === "manufacturing_order" ? "MO" : "Lead"}
                      </span>
                      <div className="truncate">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(item.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 lowercase">{item.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
