"use client"

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Package, Truck, CheckCircle2, Clock, BarChart3, QrCode,
  Printer, Search, Plus, ArrowRight, MapPin, Hash,
  PackageCheck, ScanLine, AlertCircle,
} from "lucide-react";
import QRCode from "qrcode";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  picking: "bg-blue-100 text-blue-700",
  packed: "bg-purple-100 text-purple-700",
  dispatched: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-700",
};

const STATUS_FLOW = ["draft", "picking", "packed", "dispatched", "delivered"] as const;

function nextStatus(current: string): string | null {
  const idx = STATUS_FLOW.indexOf(current as typeof STATUS_FLOW[number]);
  return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
}

export default function DeliveryPage() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Barcode & Delivery</h1>
          <p className="text-sm text-muted-foreground">Picking, packing, dispatch & barcode management</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="orders">Delivery Orders</TabsTrigger>
          <TabsTrigger value="barcode">Barcode Scanner</TabsTrigger>
          <TabsTrigger value="create">New DO</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="barcode"><BarcodeScannerTab /></TabsContent>
        <TabsContent value="create"><CreateDOTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: stats } = useQuery({ queryKey: ["delivery", "stats"], queryFn: () => api.get<any>("/delivery/stats") });
  const { data: recent } = useQuery({ queryKey: ["delivery", "orders"], queryFn: () => api.get<any[]>("/delivery/orders") });

  const kpis = [
    { label: "Draft", value: stats?.draft ?? 0, icon: <Clock size={16} />, color: "text-gray-500" },
    { label: "Picking", value: stats?.picking ?? 0, icon: <ScanLine size={16} />, color: "text-blue-500" },
    { label: "Packed", value: stats?.packed ?? 0, icon: <PackageCheck size={16} />, color: "text-purple-500" },
    { label: "Dispatched", value: stats?.dispatched ?? 0, icon: <Truck size={16} />, color: "text-yellow-500" },
    { label: "Delivered", value: stats?.delivered ?? 0, icon: <CheckCircle2 size={16} />, color: "text-green-500" },
    { label: "Total", value: stats?.total ?? 0, icon: <BarChart3 size={16} />, color: "text-primary" },
  ];

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3">
              <div className={`mb-1 ${k.color}`}>{k.icon}</div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Delivery Orders</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!recent ? (
            <Skeleton className="h-32 w-full" />
          ) : recent.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-6">No delivery orders yet</p>
          ) : (
            recent.slice(0, 8).map((o) => (
              <div key={o._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition">
                <div className="flex items-center gap-3">
                  <Package size={14} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{o.doNumber}</p>
                    <p className="text-xs text-muted-foreground">{(o as { customer?: { name?: string } }).customer?.name ?? "—"} · {o.items.length} items</p>
                  </div>
                </div>
                <Badge className={`text-xs ${STATUS_COLORS[o.status] ?? ""}`}>{o.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: orders } = useQuery({ queryKey: ["delivery", "orders", statusFilter], queryFn: () => api.get<any[]>(`/delivery/orders${statusFilter ? `?status=${statusFilter}` : ""}`) });

  const filtered = orders?.filter((o) =>
    o.doNumber.toLowerCase().includes(search.toLowerCase()) ||
    ((o as { customer?: { name?: string } }).customer?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2 flex-wrap">
        {["all", ...STATUS_FLOW].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === "all" ? undefined : s)}
            className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${(s === "all" ? !statusFilter : statusFilter === s) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search DO#, customer..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {!orders ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="space-y-2">
          {(filtered ?? []).map((o) => (
            <div
              key={o._id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition"
              onClick={() => setSelected(o._id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{o.doNumber}</p>
                  <p className="text-xs text-muted-foreground">{(o as { customer?: { name?: string } }).customer?.name ?? "—"} · {o.items.length} item(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {o.carrier && <p className="text-xs text-muted-foreground hidden sm:block">{o.carrier}</p>}
                <Badge className={`text-xs ${STATUS_COLORS[o.status] ?? ""}`}>{o.status}</Badge>
                <ArrowRight size={14} className="text-muted-foreground" />
              </div>
            </div>
          ))}
          {(filtered ?? []).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No delivery orders found</p>
            </div>
          )}
        </div>
      )}

      {selected && <DeliveryDetailDialog id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── Delivery Detail Dialog ───────────────────────────────────────────────────
function DeliveryDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: order } = useQuery({ queryKey: ["delivery", "orders", id], queryFn: () => api.get<any>(`/delivery/orders/${id}`) });
  const updateStatus = useMutation({ mutationFn: ({ id, ...data }: any) => api.put(`/delivery/orders/${id}/status`, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery"] }) });
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [printItem, setPrintItem] = useState<{ barcode: string; name: string } | null>(null);

  useEffect(() => {
    if (order) {
      setCarrier(order.carrier ?? "");
      setTracking(order.trackingNumber ?? "");
    }
  }, [order?._id]);

  const handleAdvance = async () => {
    if (!order) return;
    const next = nextStatus(order.status);
    if (!next) return;
    await updateStatus.mutateAsync({ id, status: next, trackingNumber: tracking || undefined, carrier: carrier || undefined });
    toast.success(`Status updated to ${next}`);
  };

  if (!order) return null;
  const next = nextStatus(order.status);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={18} className="text-primary" />
            {order.doNumber}
            <Badge className={`ml-2 text-xs ${STATUS_COLORS[order.status] ?? ""}`}>{order.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-lg">
            <p><span className="text-muted-foreground">Customer: </span>{(order as { customer?: { name?: string } }).customer?.name ?? "—"}</p>
            <p><span className="text-muted-foreground">Carrier: </span>{order.carrier ?? "—"}</p>
            <p><span className="text-muted-foreground">Tracking: </span>{order.trackingNumber ?? "—"}</p>
            <p><span className="text-muted-foreground">Dispatched: </span>{order.dispatchDate ? new Date(order.dispatchDate).toLocaleDateString() : "—"}</p>
          </div>

          {/* Carrier & tracking (editable when moving to dispatched) */}
          {(order.status === "packed" || order.status === "dispatched") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Carrier</Label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger><SelectValue placeholder="Select carrier" /></SelectTrigger>
                  <SelectContent>
                    {["DTDC", "BlueDart", "Delhivery", "FedEx", "DHL", "India Post", "Ekart", "Other"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tracking Number</Label>
                <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="AWB / Tracking #" />
              </div>
            </div>
          )}

          {/* Items with barcodes */}
          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-1"><Hash size={14} />Items & Barcodes</p>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity} · Barcode: {item.barcode ?? "—"}</p>
                  </div>
                  {item.barcode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer h-8"
                      onClick={() => setPrintItem({ barcode: item.barcode!, name: item.productName })}
                    >
                      <QrCode size={14} className="mr-1" /> Print
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Status flow */}
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_FLOW.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.status === s ? "bg-primary text-primary-foreground" : STATUS_FLOW.indexOf(order.status as typeof STATUS_FLOW[number]) > i ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {s}
                </span>
                {i < STATUS_FLOW.length - 1 && <ArrowRight size={12} className="text-muted-foreground" />}
              </div>
            ))}
          </div>

          {next && (
            <Button onClick={handleAdvance} className="w-full cursor-pointer">
              <Truck size={15} className="mr-2" />
              Advance to "{next.charAt(0).toUpperCase() + next.slice(1)}"
            </Button>
          )}
          {!next && order.status === "delivered" && (
            <div className="flex items-center gap-2 text-green-600 justify-center py-2">
              <CheckCircle2 size={18} /> <span className="text-sm font-medium">Delivery Complete</span>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Barcode/QR print dialog */}
      {printItem && (
        <BarcodePrintDialog
          barcode={printItem.barcode}
          label={printItem.name}
          onClose={() => setPrintItem(null)}
        />
      )}
    </Dialog>
  );
}

// ─── Barcode Print Dialog ─────────────────────────────────────────────────────
function BarcodePrintDialog({ barcode, label, onClose }: { barcode: string; label: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    QRCode.toDataURL(barcode, { width: 200, margin: 2 }).then(setQrUrl).catch(console.error);
  }, [barcode]);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Barcode - ${barcode}</title>
      <style>body{font-family:monospace;text-align:center;padding:20px;} img{display:block;margin:0 auto;} p{margin:4px 0;}</style>
      </head><body>
      <img src="${qrUrl}" width="200" />
      <p style="font-size:18px;font-weight:bold;letter-spacing:3px;">${barcode}</p>
      <p style="font-size:13px;">${label}</p>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><QrCode size={16} />Barcode Label</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center space-y-3 py-2">
          {qrUrl ? (
            <img src={qrUrl} alt="QR Code" className="rounded border p-2 bg-white" width={180} />
          ) : (
            <Skeleton className="w-44 h-44" />
          )}
          <canvas ref={canvasRef} className="hidden" />
          <p className="font-mono text-sm font-bold tracking-widest">{barcode}</p>
          <p className="text-xs text-muted-foreground text-center">{label}</p>
          <div className="flex gap-2 w-full">
            <Button onClick={handlePrint} className="flex-1 cursor-pointer" disabled={!qrUrl}>
              <Printer size={14} className="mr-2" /> Print Label
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Barcode Scanner Tab ──────────────────────────────────────────────────────
function BarcodeScannerTab() {
  const [scanned, setScanned] = useState("");
  const [input, setInput] = useState("");
  const { data: orders } = useQuery({ queryKey: ["delivery", "orders"], queryFn: () => api.get<any[]>("/delivery/orders") });

  const handleScan = () => {
    const q = input.trim();
    if (!q) return;
    setScanned(q);
    setInput("");
  };

  const matched = orders?.filter((o) =>
    o.doNumber === scanned ||
    o.items.some((item) => item.barcode === scanned)
  );

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine size={16} className="text-primary" /> Barcode Lookup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Scan or enter a barcode / DO number to look up delivery details.</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 font-mono"
                placeholder="Scan barcode or enter manually..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleScan(); }}
                autoFocus
              />
            </div>
            <Button onClick={handleScan} className="cursor-pointer">
              <Search size={15} className="mr-1" /> Lookup
            </Button>
          </div>

          {scanned && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-2">Results for: <span className="font-mono font-medium text-foreground">{scanned}</span></p>
              {!matched ? <Skeleton className="h-24 w-full" /> : matched.length === 0 ? (
                <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <AlertCircle size={16} />
                  <p className="text-sm">No delivery order or item matched this barcode.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {matched.map((o) => (
                    <div key={o._id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm">{o.doNumber}</p>
                        <Badge className={`text-xs ${STATUS_COLORS[o.status] ?? ""}`}>{o.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{(o as { customer?: { name?: string } }).customer?.name} · {o.items.length} items</p>
                      {o.carrier && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Truck size={11} />{o.carrier} {o.trackingNumber && `· ${o.trackingNumber}`}</p>}
                      {o.dispatchDate && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin size={11} />Dispatched: {new Date(o.dispatchDate).toLocaleDateString()}</p>}
                      <div className="mt-2 space-y-1">
                        {o.items.filter((item) => item.barcode === scanned || o.doNumber === scanned).map((item, i) => (
                          <div key={i} className="text-xs bg-muted rounded px-2 py-1">
                            {item.productName} · Qty: {item.quantity} · <span className="font-mono">{item.barcode}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barcode generator */}
      <BarcodeGenerator />
    </div>
  );
}

function BarcodeGenerator() {
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  const handleGenerate = async () => {
    if (!text) { toast.error("Enter barcode text"); return; }
    const url = await QRCode.toDataURL(text, { width: 200, margin: 2 });
    setQrUrl(url);
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Barcode</title>
      <style>body{font-family:monospace;text-align:center;padding:20px;} img{display:block;margin:0 auto;} p{margin:4px 0;}</style>
      </head><body>
      <img src="${qrUrl}" width="200" />
      <p style="font-size:18px;font-weight:bold;letter-spacing:3px;">${text}</p>
      ${label ? `<p style="font-size:13px;">${label}</p>` : ""}
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><QrCode size={14} />Custom Barcode / QR Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Barcode Text</Label><Input value={text} onChange={(e) => setText(e.target.value)} placeholder="SKU, serial, batch..." /></div>
          <div><Label>Label (optional)</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Product name" /></div>
        </div>
        <Button onClick={handleGenerate} className="cursor-pointer"><QrCode size={14} className="mr-2" />Generate QR Code</Button>
        {qrUrl && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <img src={qrUrl} alt="QR" className="rounded border p-2 bg-white" width={160} />
            <p className="font-mono text-xs tracking-widest">{text}</p>
            {label && <p className="text-xs text-muted-foreground">{label}</p>}
            <Button onClick={handlePrint} variant="secondary" size="sm" className="cursor-pointer"><Printer size={13} className="mr-2" />Print Label</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Create DO Tab ────────────────────────────────────────────────────────────
function CreateDOTab() {
  const qc = useQueryClient();
  const { data: salesOrders } = useQuery({ queryKey: ["delivery", "readySalesOrders"], queryFn: () => api.get<any[]>("/delivery/ready-sales-orders") });
  const { data: customers } = useQuery({ queryKey: ["crm", "customers"], queryFn: () => api.get<any[]>("/crm/customers") });
  const createDO = useMutation({ mutationFn: (d: any) => api.post("/delivery/orders", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery"] }) });

  const [selectedSO, setSelectedSO] = useState("");
  const [carrier, setCarrier] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ productName: "", quantity: 1, barcode: "" }]);

  const handleAddItem = () => setItems([...items, { productName: "", quantity: 1, barcode: "" }]);
  const handleRemoveItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const handleItemChange = (i: number, field: string, value: string | number) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  const handleCreate = async () => {
    if (!selectedSO) { toast.error("Select a Sales Order"); return; }
    const so = salesOrders?.find((o) => o._id === selectedSO);
    if (!so) return;

    const validItems = items.filter((it) => it.productName.trim());
    if (validItems.length === 0) { toast.error("Add at least one item"); return; }

    // Use first product as placeholder id — in real usage, link product
    await createDO.mutateAsync({
      salesOrderId: so._id,
      customerId: so.customerId || so.customer?._id,
      items: validItems.map((it) => ({
        productId: so.items?.[0]?.productId || so.items?.[0]?.product?._id || "unknown",
        productName: it.productName,
        quantity: it.quantity,
        barcode: it.barcode || undefined,
      })),
      carrier: carrier || undefined,
      notes: notes || undefined,
    });
    toast.success("Delivery Order created");
    setSelectedSO("");
    setCarrier("");
    setNotes("");
    setItems([{ productName: "", quantity: 1, barcode: "" }]);
  };

  return (
    <div className="space-y-4 mt-4 max-w-2xl">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Plus size={16} />New Delivery Order</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Sales Order *</Label>
            <Select value={selectedSO} onValueChange={setSelectedSO}>
              <SelectTrigger>
                <SelectValue placeholder="Select confirmed sales order" />
              </SelectTrigger>
              <SelectContent>
                {!salesOrders ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : salesOrders.length === 0 ? (
                  <SelectItem value="none" disabled>No confirmed sales orders</SelectItem>
                ) : salesOrders.map((o) => (
                  <SelectItem key={o._id} value={o._id}>
                    {(o as { orderNumber?: string }).orderNumber ?? o._id} — {(o as { customer?: { name?: string } }).customer?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Carrier</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger><SelectValue placeholder="Select carrier (optional)" /></SelectTrigger>
              <SelectContent>
                {["DTDC", "BlueDart", "Delhivery", "FedEx", "DHL", "India Post", "Ekart", "Other"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items</Label>
              <Button variant="ghost" size="sm" onClick={handleAddItem} className="cursor-pointer h-7 text-xs"><Plus size={12} className="mr-1" />Add Item</Button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5"><Input value={item.productName} onChange={(e) => handleItemChange(i, "productName", e.target.value)} placeholder="Product name" /></div>
                  <div className="col-span-2"><Input type="number" min={1} value={item.quantity} onChange={(e) => handleItemChange(i, "quantity", parseInt(e.target.value) || 1)} /></div>
                  <div className="col-span-4"><Input value={item.barcode} onChange={(e) => handleItemChange(i, "barcode", e.target.value)} placeholder="Barcode (auto if blank)" className="font-mono text-xs" /></div>
                  <div className="col-span-1">
                    {items.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(i)} className="cursor-pointer h-8 w-8 p-0 text-muted-foreground hover:text-destructive">×</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Leave barcode blank for auto-generation.</p>
          </div>

          <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions..." /></div>

          <Button onClick={handleCreate} className="w-full cursor-pointer">
            <Package size={15} className="mr-2" /> Create Delivery Order
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
