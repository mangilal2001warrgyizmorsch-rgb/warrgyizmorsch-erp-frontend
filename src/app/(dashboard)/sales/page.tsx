"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImportDialog } from "@/components/ui/import-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Search, ShoppingCart, FileText, Users, TrendingUp,
  Package, ArrowRight, Eye, CheckCircle, X, BarChart3,
  Calendar, Mail, Building2, Upload, Download,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";

const CHART_COLORS = ["#00AFA7", "#F05D5E", "#E7A977", "#FFE66D", "#6C5B7B", "#C06C84", "#F67280", "#F8B195"];
import { cn } from "@/lib/utils";

const SO_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  in_production: "bg-amber-100 text-amber-700 border-amber-200",
  delivered: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-500 border-red-200",
};

const QT_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  accepted: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-500 border-red-200",
  expired: "bg-orange-100 text-orange-700 border-orange-200",
};

type LineItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  amount: number;
};

export default function SalesPage() {
  const [tabState, setTabState] = useState("dashboard");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setTabState(hash);
    }
  }, []);

  const setTab = (newTab: string) => {
    setTabState(newTab);
    window.history.replaceState(null, "", `#${newTab}`);
  };
  const tab = tabState;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sales & CRM</h1>
        <p className="text-sm text-muted-foreground">Orders, Quotations, and Customer Management</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="dashboard" className="cursor-pointer">Dashboard</TabsTrigger>
          <TabsTrigger value="orders" className="cursor-pointer">Orders</TabsTrigger>
          <TabsTrigger value="quotations" className="cursor-pointer">Quotations</TabsTrigger>
          <TabsTrigger value="customers" className="cursor-pointer">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><SalesDashboard /></TabsContent>
        <TabsContent value="orders"><SalesOrdersTab /></TabsContent>
        <TabsContent value="quotations"><QuotationsTab /></TabsContent>
        <TabsContent value="customers"><CustomersTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function SalesDashboard() {
  const { data: stats, isLoading } = useQuery({ queryKey: ["sales", "stats"], queryFn: () => api.get<any>("/sales/stats") });
  
  if (isLoading || !stats) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue", value: `₹${(stats.total || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: TrendingUp, iconColor: "text-emerald-500" },
          { label: "Total Orders", value: stats.totalOrders || 0, icon: ShoppingCart, iconColor: "text-blue-500" },
          { label: "Confirmed", value: stats.confirmed || 0, icon: CheckCircle, iconColor: "text-violet-500" },
          { label: "Delivered", value: stats.delivered || 0, icon: Package, iconColor: "text-teal-500" },
          { label: "Draft", value: stats.draft || 0, icon: FileText, iconColor: "text-slate-500" },
          { label: "In Production", value: stats.inProduction || 0, icon: ArrowRight, iconColor: "text-amber-500" },
        ].map((item) => (
          <Card key={item.label} className="h-full">
            <CardContent className="pt-4 pb-4 h-full flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{item.label}</p>
                <p className={`text-xl font-bold ${item.iconColor}`}>{item.value}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/95 border border-border shadow-sm"><item.icon size={18} className={item.iconColor} /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 size={16} />Monthly Revenue (₹)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                <Tooltip cursor={{ fill: "transparent" }} formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                <Bar dataKey="revenue" radius={[3, 3, 0, 0]} name="Revenue">
                  {stats.monthly?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp size={16} />Orders per Month</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ stroke: "transparent" }} contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrderForm({ title, onSubmit, onClose, isQuotation = false }: { title: string; onSubmit: (data: any) => Promise<void>; onClose: () => void; isQuotation?: boolean }) {
  const { data: customers } = useQuery({ queryKey: ["sales", "customers"], queryFn: () => api.get<any[]>("/sales/customers") });
  const { data: products } = useQuery({ queryKey: ["inventory", "products"], queryFn: () => api.get<any[]>("/inventory/products") });
  
  const [customerId, setCustomerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDateOrValid, setDeliveryDateOrValid] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredCustomers = customers?.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()));

  const addProduct = (productId: string) => {
    const product = products?.find((p) => p._id === productId);
    if (!product) return;
    const existing = items.findIndex((i) => i.productId === productId);
    if (existing >= 0) {
      setItems((prev) => prev.map((it, idx) => idx === existing ? { ...it, quantity: it.quantity + 1, amount: (it.quantity + 1) * it.unitPrice * (1 + it.taxRate / 100) } : it));
    } else {
      setItems((prev) => [...prev, {
        productId,
        productName: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice || 0,
        discount: 0,
        taxRate: product.taxRate || 0,
        amount: (product.sellingPrice || 0) * (1 + (product.taxRate || 0) / 100),
      }]);
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    addProduct(productId);
  };

  const updateItem = (idx: number, field: keyof LineItem, value: number) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      const base = updated.quantity * updated.unitPrice * (1 - updated.discount / 100);
      updated.amount = base * (1 + updated.taxRate / 100);
      return updated;
    }));
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - i.discount / 100), 0);
  const taxAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - i.discount / 100) * (i.taxRate / 100), 0);
  const total = subtotal + taxAmount;

  const handleSubmit = async () => {
    if (!customerId || items.length === 0) { toast.error("Select a customer and add at least one item"); return; }
    setLoading(true);
    try {
      await onSubmit({ customerId, date, deliveryDateOrValid, items, subtotal, taxAmount, discount: 0, total, notes });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-2 overflow-hidden">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Customer *</Label>
          <Input placeholder="Search customer..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="mb-1 h-8 text-xs" />
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="h-8 text-xs w-full"><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>
              {filteredCustomers?.map((c) => <SelectItem key={c._id} value={c._id}>{c.name} {c.city ? `(${c.city})` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{isQuotation ? "Valid Until" : "Delivery Date"}</Label>
          <Input type="date" value={deliveryDateOrValid} onChange={(e) => setDeliveryDateOrValid(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Add Product</Label>
        <Select value={selectedProductId} onValueChange={handleProductSelect}>
          <SelectTrigger className="h-8 text-xs bg-muted/30 border-dashed w-full"><SelectValue placeholder="Select product to add..." /></SelectTrigger>
          <SelectContent>
            {products?.map((p) => (
              <SelectItem key={p._id} value={p._id}>{p.name} — ₹{p.sellingPrice} / {p.unitOfMeasure}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Product</th>
                <th className="text-left px-3 py-2 font-semibold w-16">Qty</th>
                <th className="text-left px-3 py-2 font-semibold w-24">Unit Price</th>
                <th className="text-left px-3 py-2 font-semibold w-16">Disc%</th>
                <th className="text-left px-3 py-2 font-semibold w-16">Tax%</th>
                <th className="text-right px-3 py-2 font-semibold w-24">Amount</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.productId ?? item.productName ?? i} className="border-b last:border-0 hover:bg-muted/10 transition-colors bg-card">
                  <td className="px-3 py-1.5 font-medium">{item.productName}</td>
                  <td className="px-2 py-1.5">
                    <Input className="h-7 w-12 text-[11px] px-1.5 font-medium" type="number" min={1} value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", Number(e.target.value) || 1)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input className="h-7 w-20 text-[11px] px-1.5 font-medium" type="number" value={item.unitPrice}
                      onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input className="h-7 w-12 text-[11px] px-1.5 font-medium" type="number" min={0} max={100} value={item.discount}
                      onChange={(e) => updateItem(i, "discount", Number(e.target.value))} />
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{item.taxRate}%</td>
                  <td className="px-3 py-1.5 text-right font-semibold">
                    ₹{item.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button className="text-red-400 hover:text-red-600 cursor-pointer p-1 rounded-sm hover:bg-red-50 transition-colors" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}>
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t bg-muted/20 text-xs space-y-1 text-right">
            <div className="text-muted-foreground">Subtotal: <span className="font-medium text-foreground ml-2">₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></div>
            <div className="text-muted-foreground">GST: <span className="font-medium text-foreground ml-2">₹{taxAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></div>
            <div className="font-bold text-[13px] pt-1 border-t border-border/50 mt-1">Total: <span className="text-primary ml-2">₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms & conditions or optional notes..." className="h-8 text-xs" />
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t mt-2">
        <Button variant="ghost" className="cursor-pointer h-8 text-xs" onClick={onClose}>Cancel</Button>
        <Button className="cursor-pointer h-8 text-xs" disabled={loading} onClick={handleSubmit}>{title}</Button>
      </div>
    </div>
  );
}

function SalesOrdersTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery({ queryKey: ["sales", "orders", statusFilter], queryFn: () => api.get<any[]>(`/sales/orders${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`) });
  
  const createOrder = useMutation({
    mutationFn: (data: any) => api.post("/sales/orders", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales"] }); toast.success("Sales order created"); setShowNew(false); }
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/sales/orders/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales"] }); toast.success("Order status updated"); },
    onError: (err: any) => toast.error(err?.message || "Failed to update status")
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post("/sales/orders/import", formData);
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success(`Imported ${res.count} orders`);
    },
    onError: (err: any) => toast.error(err.message || "Import failed"),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
  };

  const handleDownloadInvoice = (orderId: string, orderNumber: string) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/sales/orders/${orderId}/pdf`;
    window.location.href = url;
  };

  const filtered = orders?.filter((o) =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    (o.customer?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: any) => {
    await createOrder.mutateAsync({ ...data, deliveryDate: data.deliveryDateOrValid });
  };

  const statuses = ["all", "draft", "confirmed", "in_production", "delivered", "cancelled"];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}
              className={cn("cursor-pointer h-7 text-[10px] font-bold uppercase tracking-wider rounded-full", statusFilter === s ? "shadow-sm" : "bg-transparent")} onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All" : s.replace("_", " ")}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search orders..." className="pl-8 h-8 text-xs w-48 rounded-full bg-muted/30" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-full relative cursor-pointer" onClick={() => setShowImport(true)}>
            <Upload size={14} className="mr-2" />
            Import
          </Button>
          <ImportDialog
            title="Import Sales Orders"
            entityName="Sales Orders"
            requiredColumns={["customer", "date", "status", "totalAmount", "notes"]}
            templateData="Acme Corp,2023-10-27,draft,15000,Standard order"
            open={showImport}
            onOpenChange={setShowImport}
            onImport={(file) => importMutation.mutate(file)}
            isPending={importMutation.isPending}
          />
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button size="sm" className="cursor-pointer gap-1 h-8 rounded-full px-4"><Plus size={14} /> New Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New Sales Order</DialogTitle></DialogHeader>
              <OrderForm title="Create Sales Order" onSubmit={handleCreate} onClose={() => setShowNew(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Inline Detail View above list when selected */}
      {selectedOrder && (() => {
        const order = orders?.find((o) => o._id === selectedOrder);
        if (!order) return null;
        return (
          <Card className="border-primary/20 shadow-md bg-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-top-4">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">Order: {order.orderNumber} <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${SO_STATUS_COLORS[order.status] ?? ""}`}>{order.status.replace("_", " ")}</Badge></CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 rounded-full" onClick={() => handleDownloadInvoice(order._id, order.orderNumber)}>
                    <Download size={14} /> Invoice PDF
                  </Button>
                  <Button size="sm" variant="ghost" className="cursor-pointer h-7 w-7 p-0 rounded-full hover:bg-muted" onClick={() => setSelectedOrder(null)}><X size={14} /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/20 border border-border/50 text-xs">
                <div><p className="text-muted-foreground uppercase tracking-wider text-[9px] font-bold mb-1">Customer</p><p className="font-semibold text-sm">{order.customer?.name}</p></div>
                <div><p className="text-muted-foreground uppercase tracking-wider text-[9px] font-bold mb-1">Order Date</p><p className="font-medium">{order.date}</p></div>
                <div><p className="text-muted-foreground uppercase tracking-wider text-[9px] font-bold mb-1">Delivery Target</p><p className="font-medium">{order.deliveryDate ?? "—"}</p></div>
                <div><p className="text-muted-foreground uppercase tracking-wider text-[9px] font-bold mb-1">Billed Amount</p><p className="font-bold text-emerald-600 text-sm">₹{order.total?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p></div>
              </div>
              
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><Package size={12}/> Order Items</p>
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/80 border-b">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Product</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Qty</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Rate</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Tax</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                              {(order.items || []).map((item: any, i: number) => (
                        <tr key={item.productId ?? item.productName ?? i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 font-medium">{item.productName}</td>
                          <td className="px-4 py-2.5 text-right font-medium">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">₹{item.unitPrice?.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{item.taxRate}%</td>
                          <td className="px-4 py-2.5 text-right font-semibold">₹{item.amount?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-primary/5 border-t">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Total</td>
                        <td className="px-4 py-3 text-right font-bold text-primary">₹{order.total?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              {order.notes && <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg flex items-start gap-2 border border-border/50"><FileText size={14} className="shrink-0 mt-0.5" />{order.notes}</p>}
            </CardContent>
          </Card>
        );
      })()}

      {!orders || isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : (
        <div className="border rounded-xl overflow-hidden shadow-sm bg-card transition-all">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Order #</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Customer</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">Date</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden lg:table-cell">Delivery</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">Items</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Total</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Status</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {(filtered ?? []).map((order, index) => (
                <tr key={order._id ?? `sales-order-${index}`} className={cn("transition-colors group", selectedOrder === order._id ? "bg-primary/5" : "hover:bg-muted/30")}>
                  <td className="px-5 py-3 font-medium text-primary text-xs">{order.orderNumber}</td>
                  <td className="px-5 py-3 text-sm font-medium">{order.customer?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell flex items-center gap-1.5"><Calendar size={12}/>{order.date}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground hidden lg:table-cell">{order.deliveryDate ?? "—"}</td>
                  <td className="px-5 py-3 text-[10px] text-muted-foreground hidden md:table-cell max-w-[150px] truncate">
                    {order.items?.map((i: any) => `${i.quantity}x ${i.productName || 'Product'}`).join(", ") || "No items"}
                  </td>
                  <td className="px-5 py-3 font-semibold text-sm">₹{order.total?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-tight h-5 px-2", SO_STATUS_COLORS[order.status] ?? "")}>
                      {order.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1.5 items-center opacity-70 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant={selectedOrder === order._id ? "secondary" : "ghost"} className="cursor-pointer h-7 text-xs gap-1.5 font-medium rounded-full px-3"
                        onClick={() => setSelectedOrder(selectedOrder === order._id ? null : order._id)}>
                        <Eye size={12} /> View
                      </Button>
                      {order.status === "draft" && (
                        <Button size="sm" variant="ghost" className="cursor-pointer h-7 w-7 p-0 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100" title="Confirm Order"
                          onClick={() => updateStatus.mutate({ id: order._id, status: "confirmed" })}>
                          <CheckCircle size={14} />
                        </Button>
                      )}
                      {order.status === "confirmed" && (
                        <Button size="sm" variant="ghost" className="cursor-pointer h-7 w-7 p-0 rounded-full text-amber-600 bg-amber-50 hover:bg-amber-100" title="Start Production"
                          onClick={() => updateStatus.mutate({ id: order._id, status: "in_production" })}>
                          <Package size={14} />
                        </Button>
                      )}
                      {order.status === "in_production" && (
                        <Button size="sm" variant="ghost" className="cursor-pointer h-7 w-7 p-0 rounded-full text-green-600 bg-green-50 hover:bg-green-100" title="Mark Delivered"
                          onClick={() => updateStatus.mutate({ id: order._id, status: "delivered" })}>
                          <Package size={14} />
                        </Button>
                      )}
                      {order.status !== "cancelled" && order.status !== "delivered" && (
                        <Button size="sm" variant="ghost" className="cursor-pointer h-7 w-7 p-0 rounded-full text-red-600 bg-red-50 hover:bg-red-100" title="Cancel Order"
                          onClick={() => updateStatus.mutate({ id: order._id, status: "cancelled" })}>
                          <X size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(filtered ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-muted-foreground"><ShoppingCart size={32} className="mx-auto mb-3 opacity-20"/> No sales orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QuotationsTab() {
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const qc = useQueryClient();
  
  // Assuming a Quotation model isn't fully implemented in the current backend but structure is prepared.
  // Using a soft fallback to empty list if API fails, so the UI is preserved as requested.
  const { data: quotations, isLoading } = useQuery({ 
    queryKey: ["sales", "quotations", statusFilter], 
    queryFn: async () => {
      try { return await api.get<any[]>(`/sales/quotations${statusFilter !== "all" ? `?status=${statusFilter}` : ""}`) }
      catch(e) { return [] } // Fallback if route does not exist yet
    } 
  });
  
  const createQuotation = useMutation({
    mutationFn: (data: any) => api.post("/sales/quotations", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales", "quotations"] }); toast.success("Quotation created"); setShowNew(false); }
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/sales/quotations/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales", "quotations"] }); toast.success("Status updated");}
  });

  const handleCreate = async (data: any) => {
    await createQuotation.mutateAsync({ ...data, validUntil: data.deliveryDateOrValid });
  };

  const statuses = ["all", "draft", "sent", "accepted", "rejected", "expired"];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map((s) => (
             <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"}
             className={cn("cursor-pointer h-7 text-[10px] font-bold uppercase tracking-wider rounded-full", statusFilter === s ? "shadow-sm" : "bg-transparent")} onClick={() => setStatusFilter(s)}>
             {s === "all" ? "All" : s}
           </Button>
          ))}
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button size="sm" className="cursor-pointer gap-1 h-8 rounded-full px-4"><Plus size={14} /> New Quotation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Quotation</DialogTitle></DialogHeader>
            <OrderForm title="Create Quotation" onSubmit={handleCreate} onClose={() => setShowNew(false)} isQuotation />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <Skeleton className="h-48 rounded-xl" /> : (
        <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Quote #</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Customer</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">Date</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">Valid Until</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Total</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Status</th>
                <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {(quotations || []).map((qt: any) => (
                <tr key={qt._id} className="transition-colors hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium text-primary text-xs">{qt.quotationNumber || qt._id.slice(-6)}</td>
                  <td className="px-5 py-3 font-medium text-sm">{qt.customer?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell">{qt.date}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell">{qt.validUntil}</td>
                  <td className="px-5 py-3 font-semibold text-sm">₹{qt.total?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-tight h-5 px-2", QT_STATUS_COLORS[qt.status] ?? "")}>{qt.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 items-center">
                      {qt.status === "draft" && (
                        <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                          onClick={() => updateStatus.mutate({ id: qt._id, status: "sent" })}>Send</Button>
                      )}
                      {qt.status === "sent" && (
                        <>
                          <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs font-semibold text-green-600 hover:bg-green-50"
                            onClick={() => updateStatus.mutate({ id: qt._id, status: "accepted" })}>Accept</Button>
                          <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs font-semibold text-red-500 hover:bg-red-50"
                            onClick={() => updateStatus.mutate({ id: qt._id, status: "rejected" })}>Reject</Button>
                        </>
                      )}
                      {qt.status === "accepted" && (
                        <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs gap-1 font-semibold text-emerald-600 hover:bg-emerald-50">
                          <ArrowRight size={12} /> Make SO
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(!quotations || quotations.length === 0) && (
                <tr><td colSpan={7} className="px-5 py-16 text-center text-muted-foreground"><FileText size={32} className="mx-auto mb-3 opacity-20"/> No quotations found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CustomerDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("net30");
  const [segment, setSegment] = useState("");
  const qc = useQueryClient();
  const createCustomer = useMutation({
    mutationFn: (data: any) => api.post("/sales/customers", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sales", "customers"] }); toast.success("Customer created"); onClose(); }
  });

  const handleSubmit = async () => {
    if (!name) { toast.error("Customer name required"); return; }
    await createCustomer.mutateAsync({
      name, email: email || undefined, phone: phone || undefined,
      gstin: gstin || undefined, city: city || undefined, state: state || undefined,
      creditLimit: creditLimit ? Number(creditLimit) : undefined,
      paymentTerms: paymentTerms || undefined,
      segment: segment || undefined,
    });
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="col-span-2 space-y-1"><Label className="text-xs">Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@company.com" className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">GSTIN</Label><Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">Credit Limit (₹)</Label><Input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="100000" className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" className="h-8" /></div>
        <div className="space-y-1"><Label className="text-xs">State</Label><Input value={state} onChange={(e) => setState(e.target.value)} placeholder="Maharashtra" className="h-8" /></div>
        <div className="space-y-1">
          <Label className="text-xs">Payment Terms</Label>
          <Select value={paymentTerms} onValueChange={setPaymentTerms}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate</SelectItem><SelectItem value="net15">Net 15</SelectItem>
              <SelectItem value="net30">Net 30</SelectItem><SelectItem value="net60">Net 60</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Segment</Label>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="enterprise">Enterprise</SelectItem><SelectItem value="sme">SME</SelectItem>
              <SelectItem value="retail">Retail</SelectItem><SelectItem value="distributor">Distributor</SelectItem>
              <SelectItem value="government">Government</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-3 border-t">
        <Button variant="ghost" className="cursor-pointer h-8 text-xs" onClick={onClose}>Cancel</Button>
        <Button className="cursor-pointer h-8 text-xs" onClick={handleSubmit}>Create Customer</Button>
      </div>
    </div>
  );
}

function CustomersTab() {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  
  const { data: customers } = useQuery({ queryKey: ["sales", "customers"], queryFn: () => api.get<any[]>("/sales/customers") });

  const filtered = customers?.filter((c) => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const segmentColors: Record<string, string> = {
    enterprise: "bg-purple-100 text-purple-700 border-purple-200",
    sme: "bg-blue-100 text-blue-700 border-blue-200",
    retail: "bg-green-100 text-green-700 border-green-200",
    distributor: "bg-amber-100 text-amber-700 border-amber-200",
    government: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers..." className="pl-8 h-9 text-xs rounded-full bg-muted/30" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button size="sm" className="cursor-pointer gap-1 h-9 rounded-full px-4"><Plus size={14} /> New Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
            <CustomerDialog onClose={() => setShowNew(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-start">
        {/* Customer List */}
        <div className="lg:col-span-5 border rounded-xl overflow-hidden shadow-sm bg-card flex flex-col h-[600px]">
          <div className="px-4 py-3 border-b bg-muted/20 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Directory ({filtered?.length || 0})</span>
          </div>
          {!customers ? <div className="flex-1 p-4"><Skeleton className="h-full w-full opacity-50" /></div> : (
            <div className="divide-y divide-border/50 overflow-y-auto flex-1">
              {filtered?.map((c) => (
                <div
                  key={c._id}
                  className={cn("px-4 py-3.5 cursor-pointer transition-all border-l-2", selectedCustomer === c._id ? "bg-primary/5 border-primary" : "border-transparent hover:bg-muted/30")}
                  onClick={() => setSelectedCustomer(c._id)}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-start justify-between">
                      <p className="font-bold text-sm leading-tight text-foreground">{c.name}</p>
                      {c.segment && (
                        <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 border", segmentColors[c.segment] ?? "bg-gray-100 text-gray-600 border-gray-200")}>
                          {c.segment}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Mail size={10}/> {c.email || "No Email"}</p>
                      {c.city && <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Building2 size={10}/> {[c.city, c.state].filter(Boolean).join(", ")}</p>}
                    </div>
                  </div>
                </div>
              ))}
              {filtered?.length === 0 && (
                <div className="px-4 py-16 text-center text-muted-foreground"><Users size={32} className="mx-auto mb-3 opacity-20"/> No customers found</div>
              )}
            </div>
          )}
        </div>

        {/* Customer Detail Panel */}
        <div className="lg:col-span-7 h-full">
          {selectedCustomer ? (() => {
            const customerDetail = customers?.find((c) => c._id === selectedCustomer);
            if(!customerDetail) return null;
            return (
              <Card className="h-full border-primary/20 shadow-md bg-card/50 backdrop-blur-sm flex flex-col pt-2 animate-in fade-in slide-in-from-right-4">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Users size={20}/></div>
                        {customerDetail.name}
                      </CardTitle>
                    </div>
                    <Button size="icon" variant="ghost" className="cursor-pointer h-8 w-8 rounded-full" onClick={() => setSelectedCustomer(null)}><X size={16} /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/20 border border-border/50 text-sm">
                    {customerDetail.email && <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Email</p><p className="font-medium text-xs break-all">{customerDetail.email}</p></div>}
                    {customerDetail.phone && <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Phone</p><p className="font-medium text-xs">{customerDetail.phone}</p></div>}
                    {customerDetail.gstin && <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">GSTIN</p><p className="font-medium text-xs text-primary">{customerDetail.gstin}</p></div>}
                    {customerDetail.paymentTerms && <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Terms</p><p className="font-medium text-xs capitalize">{customerDetail.paymentTerms}</p></div>}
                    {customerDetail.creditLimit && <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Credit Limit</p><p className="font-bold text-xs text-amber-600">₹{customerDetail.creditLimit.toLocaleString("en-IN")}</p></div>}
                    {customerDetail.totalSpend !== undefined && <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Spend</p><p className="font-bold text-emerald-600 text-sm">₹{customerDetail.totalSpend?.toLocaleString("en-IN")}</p></div>}
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2"><ShoppingCart size={12}/> Recent Orders Activity (Mock UI)</h3>
                    <div className="space-y-2">
                       {/* This would normally map from customerDetail.orders, mock placeholder below */}
                        <div className="flex items-center justify-between text-xs p-3 rounded-lg border bg-card shadow-sm">
                          <span className="font-bold text-primary">SO-2024-001</span>
                          <span className="text-muted-foreground opacity-80"><Calendar size={10} className="inline mr-1"/> 2024-10-15</span>
                          <span className="font-bold">₹1,25,000</span>
                          <Badge variant="outline" className="text-[10px] uppercase bg-green-50 text-green-700 border-green-200">Delivered</Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs p-3 rounded-lg border bg-card shadow-sm">
                           <span className="font-bold text-primary">QT-2024-012</span>
                           <span className="text-muted-foreground opacity-80"><Calendar size={10} className="inline mr-1"/> 2024-10-10</span>
                           <span className="font-bold">₹40,000</span>
                           <Badge variant="outline" className="text-[10px] uppercase bg-blue-50 text-blue-700 border-blue-200">Sent</Badge>
                         </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })() : (
            <div className="flex flex-col items-center justify-center h-full border rounded-xl bg-muted/10 border-dashed text-muted-foreground p-8">
              <Users size={48} className="mx-auto mb-4 opacity-20 text-primary" />
              <p className="font-medium text-sm text-foreground/70">Select a customer</p>
              <p className="text-xs mt-1 text-center max-w-xs">Click on a customer in the directory to view their complete profile, order history, and stats.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
