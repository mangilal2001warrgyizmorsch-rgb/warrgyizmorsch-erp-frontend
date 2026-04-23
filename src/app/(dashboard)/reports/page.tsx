"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, Package, Factory,
  Users, DollarSign, ClipboardCheck, BarChart2, Globe,
  AlertTriangle, Target, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_COLORS = ["#00AFA7", "#F05D5E", "#E7A977", "#FFE66D", "#6C5B7B", "#C06C84", "#F67280", "#F8B195"];

type Period = "7d" | "30d" | "90d" | "1y";

function fmt(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function KpiCard({
  title, value, sub, icon: Icon, trend, color = "indigo",
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={cn("p-2 rounded-lg", `bg-${color}-100 dark:bg-${color}-900/30`)}>
            <Icon className={cn("h-5 w-5", `text-${color}-600 dark:text-${color}-400`)} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-3">
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : trend === "down" ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Executive Dashboard ───────────────────────────────────────────
function ExecDashboard() {
  const { data } = useQuery({ queryKey: ["reports", "execDashboard"], queryFn: () => api.get<any>("/reports/exec-dashboard") });

  if (!data) return <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>;

  const kpis = [
    { title: "Revenue MTD", value: fmt(data.revenueMtd), icon: DollarSign, color: "green" },
    { title: "Spend MTD", value: fmt(data.spendMtd), icon: TrendingDown, color: "red" },
    { title: "Gross Profit MTD", value: fmt(data.grossProfitMtd), icon: TrendingUp, color: "indigo" },
    { title: "Open Sales Orders", value: String(data.openSalesOrders), icon: ShoppingCart, color: "blue" },
    { title: "Active Mfg Orders", value: String(data.activeMOs), icon: Factory, color: "orange" },
    { title: "Low Stock Items", value: String(data.lowStockCount), icon: AlertTriangle, color: "yellow" },
    { title: "Open Leads", value: String(data.openLeads), icon: Target, color: "purple" },
    { title: "Active Employees", value: String(data.activeEmployees), icon: Users, color: "teal" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.title} title={k.title} value={k.value} icon={k.icon} color={k.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Financial Snapshot</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name: "Revenue", value: data.revenueMtd },
                { name: "Spend", value: data.spendMtd },
                { name: "Gross Profit", value: data.grossProfitMtd },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmt(v as number)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[
                    { name: "Revenue", value: data.revenueMtd },
                    { name: "Spend", value: data.spendMtd },
                    { name: "Gross Profit", value: data.grossProfitMtd },
                  ].map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Operations Pulse</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-2">
            {[
              { label: "Open Sales Orders", val: data.openSalesOrders, max: 50, color: "bg-blue-500" },
              { label: "Active Mfg Orders", val: data.activeMOs, max: 30, color: "bg-orange-500" },
              { label: "Open Leads", val: data.openLeads, max: 100, color: "bg-purple-500" },
              { label: "Low Stock Alerts", val: data.lowStockCount, max: 20, color: "bg-red-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold">{item.val}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", item.color)}
                    style={{ width: `${Math.min((item.val / item.max) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Sales Report ──────────────────────────────────────────────────
function SalesReport({ period }: { period: Period }) {
  const { data } = useQuery({ queryKey: ["reports", "sales", period], queryFn: () => api.get<any>(`/reports/sales?period=${period}`) });
  if (!data) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Orders" value={String(data.totalOrders)} icon={ShoppingCart} color="blue" />
        <KpiCard title="Revenue" value={fmt(data.totalRevenue)} icon={DollarSign} color="green" />
        <KpiCard title="Confirmed Orders" value={String(data.confirmedOrders)} icon={ClipboardCheck} color="indigo" />
        <KpiCard title="Avg Order Value" value={fmt(data.avgOrderValue)} icon={BarChart2} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.byDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => fmt(v as number)} />
                <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Orders by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status}: ${count}`} labelLine={false}>
                  {data.byStatus.map((_, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Top Customers</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.topCustomers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v) => fmt(v as number)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.topCustomers.map((_, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Purchase Report ───────────────────────────────────────────────
function PurchaseReport({ period }: { period: Period }) {
  const { data } = useQuery({ queryKey: ["reports", "purchase", period], queryFn: () => api.get<any>(`/reports/purchase?period=${period}`) });
  if (!data) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard title="Total POs" value={String(data.totalOrders)} icon={Package} color="blue" />
        <KpiCard title="Total Spend" value={fmt(data.totalSpend)} icon={DollarSign} color="red" />
        <KpiCard title="Avg PO Value" value={fmt(data.avgOrderValue)} icon={BarChart2} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Spend Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.byDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => fmt(v as number)} />
                <Line type="monotone" dataKey="value" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Vendors</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topVendors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v) => fmt(v as number)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.topVendors.map((_, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">PO Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.byStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.byStatus.map((_, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Inventory Report ──────────────────────────────────────────────
function InventoryReport() {
  const { data } = useQuery({ queryKey: ["reports", "inventory"], queryFn: () => api.get<any>("/reports/inventory") });
  if (!data) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Active Products" value={String(data.totalProducts)} icon={Package} color="blue" />
        <KpiCard title="Stock Value" value={fmt(data.totalStockValue)} icon={DollarSign} color="green" />
        <KpiCard title="Low Stock Alerts" value={String(data.lowStockCount)} icon={AlertTriangle} color="red" />
        <KpiCard title="30d Inbound" value={String(data.inbound30d)} icon={TrendingUp} color="indigo" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Value by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.byCategory} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={85} label={({ category }) => category}>
                  {data.byCategory.map((_, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Low Stock Items</CardTitle></CardHeader>
          <CardContent>
            {data.lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">All items are adequately stocked</p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-auto">
                {data.lowStockItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span className="font-medium truncate mr-2">{item.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="destructive" className="text-xs">{item.qty} left</Badge>
                      <span className="text-muted-foreground text-xs">min: {item.reorder}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">30-Day Movement Summary</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[
                { name: "Inbound", value: data.inbound30d },
                { name: "Outbound", value: data.outbound30d },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[data.inbound30d, data.outbound30d].map((_, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Manufacturing Report ──────────────────────────────────────────
function ManufacturingReport({ period }: { period: Period }) {
  const { data } = useQuery({ queryKey: ["reports", "manufacturing", period], queryFn: () => api.get<any>(`/reports/manufacturing?period=${period}`) });
  if (!data) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total MOs" value={String(data.total)} icon={Factory} color="orange" />
        <KpiCard title="Units Produced" value={String(data.totalProduced)} icon={Package} color="green" />
        <KpiCard title="Efficiency" value={`${data.efficiency}%`} icon={Zap} color="indigo" />
        <KpiCard title="Total Downtime" value={`${data.totalDowntimeMinutes}m`} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">MO Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status}: ${count}`} labelLine={false}>
                  {data.byStatus.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Produced Products</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="qty" radius={[0, 4, 4, 0]}>
                  {data.topProducts.map((_, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Production vs Scrap</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[
                { name: "Produced", value: data.totalProduced },
                { name: "Scrap", value: data.totalScrap },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <Cell fill={CHART_COLORS[0]} />
                  <Cell fill={CHART_COLORS[1]} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── HR Report ─────────────────────────────────────────────────────
function HRReport() {
  const { data } = useQuery({ queryKey: ["reports", "hr"], queryFn: () => api.get<any>("/reports/hr") });
  if (!data) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Employees" value={String(data.totalEmployees)} icon={Users} color="blue" />
        <KpiCard title="Active Employees" value={String(data.activeEmployees)} icon={Users} color="green" />
        <KpiCard title="Attendance Rate" value={`${data.attendanceRate}%`} icon={ClipboardCheck} color="indigo" />
        <KpiCard title="Monthly Payroll" value={fmt(data.totalMonthlyPayroll)} icon={DollarSign} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Headcount by Department</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byDepartment}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.byDepartment.map((_, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Attendance & Performance</CardTitle></CardHeader>
          <CardContent className="space-y-4 pt-2">
            {[
              { label: "Attendance Rate", value: data.attendanceRate, max: 100, color: "bg-green-500", suffix: "%" },
              { label: "Avg Performance Score", value: data.avgPerformanceScore, max: 10, color: "bg-indigo-500", suffix: "/10" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-bold">{item.value}{item.suffix}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", item.color)} style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{data.presentDays}</p>
                <p className="text-xs text-muted-foreground mt-1">Present (30d)</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-red-500">{data.absentDays}</p>
                <p className="text-xs text-muted-foreground mt-1">Absent (30d)</p>
              </div>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-xl font-bold text-yellow-600">{data.pendingLeaves}</p>
              <p className="text-xs text-muted-foreground mt-1">Pending Leave Requests</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Finance Report ────────────────────────────────────────────────
function FinanceReport({ period }: { period: Period }) {
  const { data } = useQuery({ queryKey: ["reports", "finance", period], queryFn: () => api.get<any>(`/reports/finance?period=${period}`) });
  if (!data) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Revenue" value={fmt(data.revenue)} icon={TrendingUp} color="green" />
        <KpiCard title="Spend" value={fmt(data.spend)} icon={TrendingDown} color="red" />
        <KpiCard title="Gross Profit" value={fmt(data.grossProfit)} icon={DollarSign} color="indigo" />
        <KpiCard title="Outstanding" value={fmt(data.outstanding)} icon={AlertTriangle} color="yellow" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => fmt(v as number)} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => fmt(v as number)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.byMonth.map((_, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">GST Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-2">
            {[
              { label: "GST Collected (Output)", value: data.taxCollected, color: "text-green-600" },
              { label: "GST Paid (Input)", value: data.taxPaid, color: "text-red-500" },
              { label: "Net Tax Liability", value: data.netTaxLiability, color: "text-indigo-600" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={cn("font-bold", item.color)}>{fmt(item.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Invoice Health</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-2">
            {[
              { label: "Overdue Invoices", value: data.overdueCount, color: "text-red-500" },
              { label: "Outstanding Amount", value: fmt(data.outstanding), color: "text-yellow-600" },
              { label: "Journal Entries", value: String(data.totalJournalEntries), color: "text-indigo-600" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={cn("font-bold", item.color)}>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── CRM Report ────────────────────────────────────────────────────
function CRMReport({ period }: { period: Period }) {
  const { data } = useQuery({ queryKey: ["reports", "crm", period], queryFn: () => api.get<any>(`/reports/crm?period=${period}`) });
  if (!data) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Leads" value={String(data.totalLeads)} icon={Target} color="purple" />
        <KpiCard title="New Leads" value={String(data.newLeads)} icon={TrendingUp} color="blue" />
        <KpiCard title="Conversion Rate" value={`${data.conversionRate}%`} icon={Zap} color="green" />
        <KpiCard title="Pipeline Value" value={fmt(data.pipelineValue)} icon={DollarSign} color="indigo" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Leads by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status}: ${count}`} labelLine={false}>
                  {data.byStatus.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Lead Sources</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.bySource}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.bySource.map((_, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end justify-center gap-3 h-40 pt-4">
              {data.byStatus.map((s, i) => {
                const maxCount = Math.max(...data.byStatus.map((x) => x.count));
                const height = maxCount > 0 ? Math.round((s.count / maxCount) * 100) : 0;
                return (
                  <div key={s.status} className="flex flex-col items-center gap-1">
                    <span className="text-xs font-bold">{s.count}</span>
                    <div
                      className="w-14 rounded-t-md transition-all"
                      style={{ height: `${height}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length], minHeight: "4px" }}
                    />
                    <span className="text-xs text-muted-foreground capitalize">{s.status}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Quality Report ────────────────────────────────────────────────
function QualityReport({ period }: { period: Period }) {
  const { data } = useQuery({ queryKey: ["reports", "quality", period], queryFn: () => api.get<any>(`/reports/quality?period=${period}`) });
  if (!data) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total Inspections" value={String(data.total)} icon={ClipboardCheck} color="blue" />
        <KpiCard title="Passed" value={String(data.passed)} icon={TrendingUp} color="green" />
        <KpiCard title="Failed" value={String(data.failed)} icon={AlertTriangle} color="red" />
        <KpiCard title="Pass Rate" value={`${data.passRate}%`} icon={Zap} color="indigo" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Inspections by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.byType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label={({ type, count }) => `${type}: ${count}`}>
                  {data.byType.map((_, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top Failure Reasons</CardTitle></CardHeader>
          <CardContent>
            {data.topFailReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No failures recorded</p>
            ) : (
              <div className="space-y-2">
                {data.topFailReasons.map((r, i) => (
                  <div key={i} className="flex justify-between items-center text-sm py-1 border-b last:border-0">
                    <span className="truncate mr-2">{r.reason}</span>
                    <Badge variant="destructive">{r.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
function ReportsInner() {
  const [period, setPeriod] = useState<Period>("30d");

  const tabs = [
    { id: "executive", label: "Executive", icon: Globe },
    { id: "sales", label: "Sales", icon: ShoppingCart },
    { id: "purchase", label: "Purchase", icon: Package },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "manufacturing", label: "Manufacturing", icon: Factory },
    { id: "hr", label: "HR", icon: Users },
    { id: "finance", label: "Finance", icon: DollarSign },
    { id: "crm", label: "CRM", icon: Target },
    { id: "quality", label: "Quality", icon: ClipboardCheck },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-indigo-500" />
            Reporting & Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-module business intelligence dashboard</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="1y">Last 1 Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="executive">
        <TabsList className="flex-wrap h-auto gap-1">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs md:text-sm">
              <t.icon className="h-3.5 w-3.5 mr-1" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="executive"><ExecDashboard /></TabsContent>
          <TabsContent value="sales"><SalesReport period={period} /></TabsContent>
          <TabsContent value="purchase"><PurchaseReport period={period} /></TabsContent>
          <TabsContent value="inventory"><InventoryReport /></TabsContent>
          <TabsContent value="manufacturing"><ManufacturingReport period={period} /></TabsContent>
          <TabsContent value="hr"><HRReport /></TabsContent>
          <TabsContent value="finance"><FinanceReport period={period} /></TabsContent>
          <TabsContent value="crm"><CRMReport period={period} /></TabsContent>
          <TabsContent value="quality"><QualityReport period={period} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default function ReportsPage() {
  return <ReportsInner />;
}
