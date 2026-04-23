"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Factory, Hammer, ChevronRight, CheckCircle2,
  Clock, AlertCircle, TrendingUp, List, Settings, FlaskConical, Package,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Status helpers ──
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  pending: "bg-gray-100 text-gray-600 border-gray-200",
};
const STATUS_NEXT: Record<string, string> = { draft: "confirmed", confirmed: "in_progress", in_progress: "completed" };
const STATUS_LABEL: Record<string, string> = { draft: "Confirm", confirmed: "Start Production", in_progress: "Mark Complete" };
const WO_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 border-gray-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

type BOMComponent = { productId: string; productName: string; quantity: number; unitOfMeasure: string };
type BOMOperation = { name: string; workCenterId?: string; duration: number; sequence: number };

export default function ManufacturingPage() {
  const qc = useQueryClient();
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
  const [showNewMO, setShowNewMO] = useState(false);
  const [showNewBOM, setShowNewBOM] = useState(false);
  const [showNewWC, setShowNewWC] = useState(false);
  const [selectedMO, setSelectedMO] = useState<string | null>(null);

  useEffect(() => {
    // Only execute on client side where window is available
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const newBomFor = searchParams.get("newBomFor");
      if (newBomFor) {
        setBomProductId(newBomFor);
        setShowNewBOM(true);
        window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      }
    }
  }, []);

  // ── Queries ──
  const { data: stats } = useQuery({ queryKey: ["manufacturing", "stats"], queryFn: () => api.get<any>("/manufacturing/stats") });
  const { data: mos } = useQuery({ queryKey: ["manufacturing", "orders"], queryFn: () => api.get<any[]>("/manufacturing/orders") });
  const { data: boms } = useQuery({ queryKey: ["manufacturing", "boms"], queryFn: () => api.get<any[]>("/manufacturing/boms") });
  const { data: workCenters } = useQuery({ queryKey: ["manufacturing", "work-centers"], queryFn: () => api.get<any[]>("/manufacturing/work-centers") });
  const { data: workOrders } = useQuery({ queryKey: ["manufacturing", "work-orders"], queryFn: () => api.get<any[]>("/manufacturing/work-orders") });
  const { data: products } = useQuery({ queryKey: ["inventory", "products"], queryFn: () => api.get<any[]>("/inventory/products") });
  const { data: warehouses } = useQuery({ queryKey: ["inventory", "warehouses"], queryFn: () => api.get<any[]>("/inventory/warehouses") });
  const { data: moDetail } = useQuery({
    queryKey: ["manufacturing", "orders", selectedMO],
    queryFn: () => api.get<any>(`/manufacturing/orders/${selectedMO}`),
    enabled: !!selectedMO,
  });
  const { data: materialReqs } = useQuery({
    queryKey: ["manufacturing", "materials", selectedMO],
    queryFn: () => api.get<any[]>(`/manufacturing/orders/${selectedMO}/materials`),
    enabled: !!selectedMO,
  });

  // ── Mutations ──
  const invalidateAll = () => qc.invalidateQueries({ queryKey: ["manufacturing"] });
  const createMO = useMutation({ mutationFn: (data: any) => api.post("/manufacturing/orders", data), onSuccess: invalidateAll });
  const updateMOStatus = useMutation({ mutationFn: ({ id, ...data }: any) => api.put(`/manufacturing/orders/${id}/status`, data), onSuccess: invalidateAll });
  const createBOM = useMutation({ mutationFn: (data: any) => api.post("/manufacturing/boms", data), onSuccess: invalidateAll });
  const createWC = useMutation({ mutationFn: (data: any) => api.post("/manufacturing/work-centers", data), onSuccess: invalidateAll });
  const updateWOStatus = useMutation({ mutationFn: ({ id, ...data }: any) => api.put(`/manufacturing/work-orders/${id}/status`, data), onSuccess: invalidateAll });
  const createWO = useMutation({ mutationFn: (data: any) => api.post("/manufacturing/work-orders", data), onSuccess: invalidateAll });

  // ── MO form ──
  const [moForm, setMoForm] = useState({
    productId: "", quantity: "1",
    scheduledStart: new Date().toISOString().slice(0, 10),
    scheduledEnd: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    warehouseId: "", notes: "",
  });

  // ── BOM form ──
  const [bomProductId, setBomProductId] = useState("");
  const [bomVersion, setBomVersion] = useState("1.0");
  const [bomYield, setBomYield] = useState("1");
  const [bomComponents, setBomComponents] = useState<BOMComponent[]>([]);
  const [bomOperations, setBomOperations] = useState<BOMOperation[]>([]);
  const [newComp, setNewComp] = useState({ productId: "", quantity: "1", unitOfMeasure: "Pcs" });
  const [newOp, setNewOp] = useState({ name: "", workCenterId: "", duration: "60", sequence: "1" });

  // ── WC form ──
  const [wcForm, setWcForm] = useState({ name: "", code: "", capacity: "8", costPerHour: "" });

  // ── Add WO form ──
  const [showAddWO, setShowAddWO] = useState(false);
  const [woForm, setWoForm] = useState({ workCenterId: "", operationName: "", sequence: "1", plannedDuration: "60" });

  // ── Completion dialog ──
  const [showComplete, setShowComplete] = useState(false);
  const [completingMO, setCompletingMO] = useState<string | null>(null);
  const { data: completingDetail } = useQuery({
    queryKey: ["manufacturing", "orders", completingMO],
    queryFn: () => api.get<any>(`/manufacturing/orders/${completingMO}`),
    enabled: !!completingMO,
  });
  const { data: completingMaterialReqs } = useQuery({
    queryKey: ["manufacturing", "materials", completingMO],
    queryFn: () => api.get<any[]>(`/manufacturing/orders/${completingMO}/materials`),
    enabled: !!completingMO,
  });
  const [completionProduced, setCompletionProduced] = useState("");
  const [completionScrap, setCompletionScrap] = useState("0");
  const [completionConsumption, setCompletionConsumption] = useState<Record<string, string>>({});

  // ── Handlers ──
  const handleCreateMO = async () => {
    if (!moForm.productId || !moForm.warehouseId) { toast.error("Select product and warehouse"); return; }
    const product = products?.find((p: any) => p._id === moForm.productId);
    const bom = boms?.find((b: any) => b.productId === moForm.productId && b.isActive);
    try {
      await createMO.mutateAsync({
        productId: moForm.productId,
        productName: product?.name ?? "",
        bomId: bom?._id,
        quantity: parseInt(moForm.quantity) || 1,
        scheduledStart: moForm.scheduledStart,
        scheduledEnd: moForm.scheduledEnd,
        warehouseId: moForm.warehouseId,
        notes: moForm.notes || undefined,
      });
      toast.success("Manufacturing order created");
      setShowNewMO(false);
      setMoForm({ productId: "", quantity: "1", scheduledStart: new Date().toISOString().slice(0, 10), scheduledEnd: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), warehouseId: "", notes: "" });
    } catch (err: any) { toast.error(err?.response?.data?.error || "Failed to create MO"); }
  };

  const handleProgressMO = async (id: string, currentStatus: string) => {
    const next = STATUS_NEXT[currentStatus];
    if (!next) return;
    if (next === "completed") {
      setCompletingMO(id);
      setCompletionProduced("");
      setCompletionScrap("0");
      setCompletionConsumption({});
      setShowComplete(true);
      return;
    }
    try {
      await updateMOStatus.mutateAsync({ id, status: next });
      toast.success(`MO status updated to ${next.replace("_", " ")}`);
    } catch (err: any) { toast.error(err?.response?.data?.error || "Failed to update"); }
  };

  const handleCompleteMO = async () => {
    if (!completingMO || !completingDetail) return;
    const produced = parseFloat(completionProduced) || completingDetail.quantity;
    const scrap = parseFloat(completionScrap) || 0;
    const actualConsumption: { productId: string; quantity: number }[] = [];
    for (const [pid, val] of Object.entries(completionConsumption)) {
      const qty = parseFloat(val);
      if (!isNaN(qty)) actualConsumption.push({ productId: pid, quantity: qty });
    }
    try {
      await updateMOStatus.mutateAsync({
        id: completingMO, status: "completed",
        producedQuantity: produced, scrapQuantity: scrap,
        actualConsumption: actualConsumption.length > 0 ? actualConsumption : undefined,
      });
      toast.success("MO completed and stock updated");
      setShowComplete(false);
      setCompletingMO(null);
    } catch (err: any) { toast.error(err?.response?.data?.error || "Failed to complete MO"); }
  };

  const handleCreateBOM = async () => {
    let finalComponents = [...bomComponents];
    if (newComp.productId) {
      const product = products?.find((p: any) => p._id === newComp.productId);
      finalComponents.push({
        productId: newComp.productId, productName: product?.name ?? "",
        quantity: parseFloat(newComp.quantity) || 1, unitOfMeasure: newComp.unitOfMeasure,
      });
    }

    let finalOperations = [...bomOperations];
    if (newOp.name && newOp.workCenterId) {
      finalOperations.push({
        name: newOp.name, workCenterId: newOp.workCenterId || undefined,
        duration: parseInt(newOp.duration) || 60,
        sequence: parseInt(newOp.sequence) || finalOperations.length + 1,
      });
    }

    if (!bomProductId || finalComponents.length === 0) { toast.error("Select product and add components"); return; }
    try {
      await createBOM.mutateAsync({
        productId: bomProductId, version: bomVersion,
        components: finalComponents, operations: finalOperations,
        yieldQuantity: parseFloat(bomYield) || 1,
      });
      toast.success("BOM created");
      setShowNewBOM(false);
      setBomProductId(""); setBomComponents([]); setBomOperations([]);
      setNewComp({ productId: "", quantity: "1", unitOfMeasure: "Pcs" });
      setNewOp({ name: "", workCenterId: "", duration: "60", sequence: "1" });
    } catch (err: any) { toast.error(err?.response?.data?.error || "Failed to create BOM"); }
  };

  const handleAddComponent = () => {
    if (!newComp.productId) return;
    const product = products?.find((p: any) => p._id === newComp.productId);
    setBomComponents([...bomComponents, {
      productId: newComp.productId, productName: product?.name ?? "",
      quantity: parseFloat(newComp.quantity) || 1, unitOfMeasure: newComp.unitOfMeasure,
    }]);
    setNewComp({ productId: "", quantity: "1", unitOfMeasure: "Pcs" });
  };

  const handleAddOperation = () => {
    if (!newOp.name) return;
    setBomOperations([...bomOperations, {
      name: newOp.name, workCenterId: newOp.workCenterId || undefined,
      duration: parseInt(newOp.duration) || 60,
      sequence: parseInt(newOp.sequence) || bomOperations.length + 1,
    }]);
    setNewOp({ name: "", workCenterId: "", duration: "60", sequence: String(bomOperations.length + 2) });
  };

  const handleCreateWC = async () => {
    if (!wcForm.name) return;
    try {
      await createWC.mutateAsync({
        name: wcForm.name, code: wcForm.code || wcForm.name.toUpperCase().slice(0, 4),
        capacity: parseInt(wcForm.capacity) || 8,
        costPerHour: wcForm.costPerHour ? parseFloat(wcForm.costPerHour) : undefined,
      });
      toast.success("Work center created");
      setShowNewWC(false);
      setWcForm({ name: "", code: "", capacity: "8", costPerHour: "" });
    } catch (err: any) { toast.error(err?.response?.data?.error || "Failed to create work center"); }
  };

  const handleCreateWO = async () => {
    if (!selectedMO || !woForm.workCenterId || !woForm.operationName) { toast.error("Fill all fields"); return; }
    try {
      await createWO.mutateAsync({
        moId: selectedMO, workCenterId: woForm.workCenterId,
        operationName: woForm.operationName,
        sequence: parseInt(woForm.sequence) || 1,
        plannedDuration: parseInt(woForm.plannedDuration) || 60,
      });
      toast.success("Work order added");
      setShowAddWO(false);
      setWoForm({ workCenterId: "", operationName: "", sequence: "1", plannedDuration: "60" });
    } catch (err: any) { toast.error(err?.response?.data?.error || "Failed to add work order"); }
  };

  const pieData = stats ? [
    { name: "Draft", value: stats.draft ?? 0, color: "#9ca3af" },
    { name: "Confirmed", value: stats.confirmed ?? 0, color: "#3b82f6" },
    { name: "In Progress", value: stats.inProgress ?? 0, color: "#f59e0b" },
    { name: "Completed", value: stats.completed ?? 0, color: "#22c55e" },
  ].filter((d) => d.value > 0) : [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Manufacturing</h1>
        <p className="text-sm text-muted-foreground">Production orders, BOMs, work orders, and work centers.</p>
      </div>

      <Tabs value={tab} onValueChange={(t) => { setTab(t); if (t !== "orders") setSelectedMO(null); }}>
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="dashboard" className="cursor-pointer">Dashboard</TabsTrigger>
            <TabsTrigger value="orders" className="cursor-pointer">MO List</TabsTrigger>
            <TabsTrigger value="workorders" className="cursor-pointer">Work Orders</TabsTrigger>
            <TabsTrigger value="bom" className="cursor-pointer">BOMs</TabsTrigger>
            <TabsTrigger value="workcenters" className="cursor-pointer">Work Centers</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {tab === "orders" && !selectedMO && (
              <Button size="sm" onClick={() => setShowNewMO(true)} className="cursor-pointer gap-1 h-8 rounded-full px-4">
                <Plus size={14} />New MO
              </Button>
            )}
            {tab === "bom" && (
              <Button size="sm" onClick={() => setShowNewBOM(true)} className="cursor-pointer gap-1 h-8 rounded-full px-4">
                <Plus size={14} />New BOM
              </Button>
            )}
            {tab === "workcenters" && (
              <Button size="sm" onClick={() => setShowNewWC(true)} className="cursor-pointer gap-1 h-8 rounded-full px-4">
                <Plus size={14} />New Work Center
              </Button>
            )}
          </div>
        </div>

        {/* ── Dashboard ── */}
        <TabsContent value="dashboard" className="mt-4 space-y-4">
          {!stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total MOs", value: stats.totalMOs ?? 0, sub: `${stats.inProgress ?? 0} active`, icon: Factory, iconColor: "text-primary" },
                  { label: "Completed", value: stats.completed ?? 0, sub: `${(Number(stats.totalProduced) || 0).toLocaleString()} units produced`, icon: CheckCircle2, iconColor: "text-emerald-500" },
                  { label: "Efficiency", value: `${stats.efficiency ?? 0}%`, sub: "Production yield", icon: TrendingUp, iconColor: "text-blue-500" },
                  { label: "Work Orders", value: (stats.pendingWOs ?? 0) + (stats.inProgressWOs ?? 0), sub: `${stats.inProgressWOs ?? 0} in progress`, icon: Hammer, iconColor: "text-amber-500" },
                ].map((k) => (
                  <Card key={k.label} className="h-full">
                    <CardContent className="pt-4 pb-4 h-full flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{k.label}</p>
                        <p className="text-xl font-bold">{k.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/95 dark:bg-muted border border-border shadow-sm shrink-0">
                        <k.icon size={18} className={k.iconColor} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pieData.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">MO Status Distribution</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }: any) => `${name}: ${value}`}>
                            {pieData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Active Manufacturing Orders</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {mos?.filter((m: any) => m.status === "in_progress" || m.status === "confirmed").slice(0, 5).map((mo: any) => (
                        <div key={mo._id} className="flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => { setSelectedMO(mo._id); setTab("orders"); }}>
                          <div>
                            <p className="font-medium">{mo.moNumber}</p>
                            <p className="text-xs text-muted-foreground">{mo.productName ?? mo.product?.name ?? "—"} · Qty: {mo.quantity}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", STATUS_COLORS[mo.status])}>{mo.status?.replace(/_/g, " ")}</Badge>
                            <ChevronRight size={14} className="text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                      {(!mos || mos.filter((m: any) => m.status === "in_progress" || m.status === "confirmed").length === 0) && (
                        <p className="px-4 py-8 text-center text-muted-foreground text-sm">No active manufacturing orders</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── MO List / Detail ── */}
        <TabsContent value="orders" className="mt-4">
          {selectedMO ? (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setSelectedMO(null)} className="cursor-pointer -ml-2 text-xs">
                ← Back to MO List
              </Button>
              {!moDetail ? <Skeleton className="h-64 rounded-xl" /> : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="md:col-span-2">
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <p className="text-lg font-bold">{moDetail.moNumber}</p>
                            <p className="text-muted-foreground text-sm">{moDetail.productName ?? moDetail.product?.name ?? "—"} · Qty: {moDetail.quantity} {moDetail.product?.unitOfMeasure}</p>
                          </div>
                          <Badge variant="outline" className={cn("text-xs font-bold uppercase px-3 py-1", STATUS_COLORS[moDetail.status])}>{moDetail.status?.replace(/_/g, " ")}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><p className="text-xs text-muted-foreground">Scheduled Start</p><p className="font-medium">{moDetail.scheduledStart}</p></div>
                          <div><p className="text-xs text-muted-foreground">Scheduled End</p><p className="font-medium">{moDetail.scheduledEnd}</p></div>
                          {moDetail.actualStart && <div><p className="text-xs text-muted-foreground">Actual Start</p><p className="font-medium">{new Date(moDetail.actualStart).toLocaleDateString()}</p></div>}
                          {moDetail.actualEnd && <div><p className="text-xs text-muted-foreground">Actual End</p><p className="font-medium">{new Date(moDetail.actualEnd).toLocaleDateString()}</p></div>}
                          {moDetail.producedQuantity > 0 && (
                            <div><p className="text-xs text-muted-foreground">Produced</p><p className="font-medium text-green-600">{moDetail.producedQuantity}</p></div>
                          )}
                          {moDetail.scrapQuantity > 0 && (
                            <div><p className="text-xs text-muted-foreground">Scrap</p><p className="font-medium text-red-600">{moDetail.scrapQuantity}</p></div>
                          )}
                        </div>
                        {STATUS_NEXT[moDetail.status] && (
                          <Button size="sm" onClick={() => handleProgressMO(moDetail._id, moDetail.status)} className="cursor-pointer h-8 rounded-full px-4">
                            {STATUS_LABEL[moDetail.status]}
                          </Button>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Material Requirements</CardTitle></CardHeader>
                      <CardContent className="p-0">
                        {!materialReqs ? <Skeleton className="h-24 m-4" /> : materialReqs.length === 0 ? (
                          <p className="px-4 py-4 text-sm text-muted-foreground">No BOM linked</p>
                        ) : (
                          <div className="divide-y divide-border/50">
                            {materialReqs.map((m: any) => (
                              <div key={m.componentId} className="px-4 py-2.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium truncate">{m.componentName}</p>
                                  {m.sufficient
                                    ? <CheckCircle2 size={13} className="text-green-500 shrink-0 ml-1" />
                                    : <AlertCircle size={13} className="text-red-500 shrink-0 ml-1" />}
                                </div>
                                <p className="text-muted-foreground">
                                  Need: {(Number(m.required) || 0).toFixed(1)} · Have: {m.available ?? 0}
                                  {!m.sufficient && <span className="text-red-600 font-medium"> (short {(Number(m.shortage) || 0).toFixed(1)})</span>}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Work Orders for this MO */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">Work Orders</CardTitle>
                        {moDetail.status !== "completed" && moDetail.status !== "cancelled" && (
                          <Button size="sm" variant="outline" onClick={() => setShowAddWO(true)} className="cursor-pointer h-7 text-xs gap-1 rounded-full px-3 bg-transparent">
                            <Plus size={13} />Add
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {(!moDetail.workOrders || moDetail.workOrders.length === 0) ? (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">No work orders yet</p>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {[...moDetail.workOrders].sort((a: any, b: any) => a.sequence - b.sequence).map((wo: any) => (
                            <div key={wo._id} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground text-xs font-mono w-5">{wo.sequence}</span>
                                <div>
                                  <p className="font-medium">{wo.operationName}</p>
                                  <p className="text-xs text-muted-foreground">{wo.workCenter?.name ?? "—"} · {wo.plannedDuration} min</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", WO_STATUS_COLORS[wo.status])}>{wo.status?.replace(/_/g, " ")}</Badge>
                                {wo.status === "pending" && (
                                  <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs" onClick={() => { updateWOStatus.mutate({ id: wo._id, status: "in_progress" }); toast.success("Work order started"); }}>Start</Button>
                                )}
                                {wo.status === "in_progress" && (
                                  <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs" onClick={() => { updateWOStatus.mutate({ id: wo._id, status: "completed" }); toast.success("Work order completed"); }}>Done</Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          ) : (
            /* MO List */
            <div className="space-y-3">
              {!mos ? <Skeleton className="h-64 rounded-xl" /> : (
                <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b">
                      <tr>
                        <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">MO #</th>
                        <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Product</th>
                        <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Qty</th>
                        <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">Schedule</th>
                        <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">Work Orders</th>
                        <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Status</th>
                        <th className="text-right px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {mos.map((mo: any) => (
                        <tr key={mo._id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3">
                            <button className="font-medium text-primary hover:underline cursor-pointer text-sm" onClick={() => setSelectedMO(mo._id)}>
                              {mo.moNumber}
                            </button>
                          </td>
                          <td className="px-5 py-3 text-sm">{mo.productName ?? mo.product?.name ?? "—"}</td>
                          <td className="px-5 py-3 font-semibold text-sm">{mo.quantity}</td>
                          <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">
                            {mo.scheduledStart} → {mo.scheduledEnd}
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">{mo.completedWOCount ?? 0}/{mo.workOrderCount ?? 0} done</span>
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", STATUS_COLORS[mo.status])}>{mo.status?.replace(/_/g, " ")}</Badge>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {STATUS_NEXT[mo.status] && (
                                <Button size="sm" variant="outline" className="cursor-pointer h-7 text-xs rounded-full px-3 bg-transparent"
                                  onClick={() => handleProgressMO(mo._id, mo.status)}>
                                  {STATUS_LABEL[mo.status]}
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="cursor-pointer h-7 w-7 p-0 rounded-full" onClick={() => setSelectedMO(mo._id)}>
                                <List size={12} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {mos.length === 0 && (
                        <tr><td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">
                          <Factory size={32} className="mx-auto mb-3 opacity-20" />
                          No manufacturing orders yet
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Work Orders ── */}
        <TabsContent value="workorders" className="mt-4">
          {!workOrders ? <Skeleton className="h-[400px] rounded-xl" /> : (
            <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Operation</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">MO #</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Work Center</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">Planned</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">Actual</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Status</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {workOrders.map((wo: any) => (
                    <tr key={wo._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-sm">{wo.operationName}</p>
                        <p className="text-xs text-muted-foreground">Seq: {wo.sequence}</p>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">
                        {wo.mo?.moNumber ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-sm">{wo.workCenter?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">
                        <span className="flex items-center gap-1 text-xs"><Clock size={12} />{wo.plannedDuration}m</span>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">
                        {wo.actualDuration ? `${wo.actualDuration}m` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", WO_STATUS_COLORS[wo.status])}>{wo.status?.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          {wo.status === "pending" && (
                            <Button size="sm" variant="outline" className="cursor-pointer h-7 text-xs rounded-full px-3 bg-transparent"
                              onClick={() => { updateWOStatus.mutate({ id: wo._id, status: "in_progress" }); toast.success("Started"); }}>
                              Start
                            </Button>
                          )}
                          {wo.status === "in_progress" && (
                            <Button size="sm" variant="outline" className="cursor-pointer h-7 text-xs rounded-full px-3 bg-transparent"
                              onClick={() => { updateWOStatus.mutate({ id: wo._id, status: "completed" }); toast.success("Completed"); }}>
                              Done
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {workOrders.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">
                      <Hammer size={32} className="mx-auto mb-3 opacity-20" />
                      No work orders yet
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Bill of Materials ── */}
        <TabsContent value="bom" className="mt-4">
          {!boms ? <Skeleton className="h-64 rounded-xl" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {boms.map((bom: any) => (
                <Card key={bom._id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{bom.product?.name ?? "—"}</CardTitle>
                        <p className="text-xs text-muted-foreground">v{bom.version} · Yield: {bom.yieldQuantity} {bom.product?.unitOfMeasure}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", bom.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200")}>
                        {bom.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Components ({bom.components?.length ?? 0})</p>
                      <div className="space-y-1">
                        {bom.components?.map((c: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm bg-muted/30 rounded px-2 py-1">
                            <span>{c.productName}</span>
                            <span className="text-muted-foreground">{c.quantity} {c.unitOfMeasure}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {bom.operations?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Operations ({bom.operations.length})</p>
                        <div className="space-y-1">
                          {[...bom.operations].sort((a: any, b: any) => a.sequence - b.sequence).map((op: any, i: number) => (
                            <div key={i} className="flex justify-between text-sm bg-muted/30 rounded px-2 py-1">
                              <span>{op.sequence}. {op.name}</span>
                              <span className="text-muted-foreground">{op.duration}m</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {boms.length === 0 && (
                <div className="col-span-full text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <Package size={36} className="mx-auto mb-3 opacity-20" />
                  <p>No BOMs configured yet</p>
                  <p className="text-sm mt-1 text-muted-foreground">Create a BOM to link components and operations to products</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Work Centers ── */}
        <TabsContent value="workcenters" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {workCenters?.map((wc: any) => {
              const activeWOs = workOrders?.filter((wo: any) => wo.workCenter?._id === wc._id && wo.status === "in_progress").length ?? 0;
              return (
                <Card key={wc._id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <Settings size={18} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{wc.name}</p>
                        <p className="text-xs text-muted-foreground">{wc.code}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><p className="text-xs text-muted-foreground">Capacity</p><p className="font-medium">{wc.capacity}h/day</p></div>
                      {wc.costPerHour && <div><p className="text-xs text-muted-foreground">Cost</p><p className="font-medium">₹{wc.costPerHour}/hr</p></div>}
                      <div><p className="text-xs text-muted-foreground">Active WOs</p><p className={cn("font-medium", activeWOs > 0 ? "text-amber-600" : "")}>{activeWOs}</p></div>
                    </div>
                    <Badge variant="outline" className={cn("mt-3 text-[10px] font-bold uppercase", wc.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200")}>
                      {wc.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
            {workCenters?.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <Settings size={36} className="mx-auto mb-3 opacity-20" />
                <p>No work centers yet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── New MO Dialog ── */}
      <Dialog open={showNewMO} onOpenChange={setShowNewMO}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Manufacturing Order</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Product *</Label>
              <Select value={moForm.productId} onValueChange={(v) => setMoForm({ ...moForm, productId: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select manufactured product" /></SelectTrigger>
                <SelectContent>
                  {products?.filter((p: any) => p.isManufactured).map((p: any) => (
                    <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {moForm.productId && boms?.some((b: any) => (b.productId?._id ?? b.productId) === moForm.productId && b.isActive) && (
                <p className="text-xs text-green-600 mt-1">✓ BOM found — components will be auto-consumed on completion</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Quantity *</Label><Input type="number" min={1} value={moForm.quantity} onChange={(e) => setMoForm({ ...moForm, quantity: e.target.value })} className="h-8 text-xs" /></div>
              <div className="space-y-1">
                <Label className="text-xs">Warehouse *</Label>
                <Select value={moForm.warehouseId} onValueChange={(v) => setMoForm({ ...moForm, warehouseId: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{warehouses?.map((w: any) => <SelectItem key={w._id} value={w._id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Start Date</Label><Input type="date" value={moForm.scheduledStart} onChange={(e) => setMoForm({ ...moForm, scheduledStart: e.target.value })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs">End Date</Label><Input type="date" value={moForm.scheduledEnd} onChange={(e) => setMoForm({ ...moForm, scheduledEnd: e.target.value })} className="h-8 text-xs" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Notes</Label><Input value={moForm.notes} onChange={(e) => setMoForm({ ...moForm, notes: e.target.value })} placeholder="Optional" className="h-8 text-xs" /></div>
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="ghost" className="flex-1 cursor-pointer h-8 text-xs" onClick={() => setShowNewMO(false)}>Cancel</Button>
              <Button className="flex-1 cursor-pointer h-8 text-xs" onClick={handleCreateMO} disabled={createMO.isPending}>Create MO</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── New BOM Dialog ── */}
      <Dialog open={showNewBOM} onOpenChange={setShowNewBOM}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Bill of Materials</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Product *</Label>
                <Select value={bomProductId} onValueChange={setBomProductId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{products?.filter((p: any) => p.isManufactured).map((p: any) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Version</Label><Input value={bomVersion} onChange={(e) => setBomVersion(e.target.value)} placeholder="1.0" className="h-8 text-xs" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Yield Quantity</Label><Input type="number" value={bomYield} onChange={(e) => setBomYield(e.target.value)} placeholder="1" className="h-8 text-xs" /></div>

            {/* Components */}
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Components</p>
              {bomComponents.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-background rounded px-2.5 py-1.5 border border-border/50">
                  <span className="font-medium">{c.productName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{c.quantity} {c.unitOfMeasure}</span>
                    <button className="text-red-500 hover:text-red-700 cursor-pointer font-bold" onClick={() => setBomComponents(bomComponents.filter((_, j) => j !== i))}>×</button>
                  </div>
                </div>
              ))}
              <div className="flex gap-1.5 mt-1">
                <Select value={newComp.productId} onValueChange={(v) => setNewComp({ ...newComp, productId: v })}>
                  <SelectTrigger className="flex-1 h-7 text-xs"><SelectValue placeholder="Component" /></SelectTrigger>
                  <SelectContent>{products?.map((p: any) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" className="w-16 h-7 text-xs" value={newComp.quantity} onChange={(e) => setNewComp({ ...newComp, quantity: e.target.value })} placeholder="Qty" />
                <Input className="w-16 h-7 text-xs" value={newComp.unitOfMeasure} onChange={(e) => setNewComp({ ...newComp, unitOfMeasure: e.target.value })} placeholder="Unit" />
                <Button size="sm" variant="secondary" onClick={handleAddComponent} className="cursor-pointer h-7 w-7 p-0"><Plus size={13} /></Button>
              </div>
            </div>

            {/* Operations */}
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operations</p>
              {bomOperations.map((op, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-background rounded px-2.5 py-1.5 border border-border/50">
                  <span className="font-medium">{op.sequence}. {op.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{op.duration}m</span>
                    <button className="text-red-500 hover:text-red-700 cursor-pointer font-bold" onClick={() => setBomOperations(bomOperations.filter((_, j) => j !== i))}>×</button>
                  </div>
                </div>
              ))}
              <div className="flex gap-1.5 mt-1">
                <Input className="flex-1 h-7 text-xs" value={newOp.name} onChange={(e) => setNewOp({ ...newOp, name: e.target.value })} placeholder="Operation name" />
                <Select value={newOp.workCenterId} onValueChange={(v) => setNewOp({ ...newOp, workCenterId: v })}>
                  <SelectTrigger className="w-28 h-7 text-xs"><SelectValue placeholder="Work Ctr" /></SelectTrigger>
                  <SelectContent>{workCenters?.map((wc: any) => <SelectItem key={wc._id} value={wc._id}>{wc.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" className="w-16 h-7 text-xs" value={newOp.duration} onChange={(e) => setNewOp({ ...newOp, duration: e.target.value })} placeholder="Min" />
                <Button size="sm" variant="secondary" onClick={handleAddOperation} className="cursor-pointer h-7 w-7 p-0"><Plus size={13} /></Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button variant="ghost" className="flex-1 cursor-pointer h-8 text-xs" onClick={() => setShowNewBOM(false)}>Cancel</Button>
              <Button className="flex-1 cursor-pointer h-8 text-xs" onClick={handleCreateBOM} disabled={createBOM.isPending}>Create BOM</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── New Work Center Dialog ── */}
      <Dialog open={showNewWC} onOpenChange={setShowNewWC}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Work Center</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={wcForm.name} onChange={(e) => setWcForm({ ...wcForm, name: e.target.value })} placeholder="e.g. Assembly Line 1" className="h-8 text-xs" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Code</Label><Input value={wcForm.code} onChange={(e) => setWcForm({ ...wcForm, code: e.target.value })} placeholder="WC-01" className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs">Capacity (h/day)</Label><Input type="number" value={wcForm.capacity} onChange={(e) => setWcForm({ ...wcForm, capacity: e.target.value })} className="h-8 text-xs" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Cost per Hour (₹)</Label><Input type="number" value={wcForm.costPerHour} onChange={(e) => setWcForm({ ...wcForm, costPerHour: e.target.value })} placeholder="Optional" className="h-8 text-xs" /></div>
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="ghost" className="flex-1 cursor-pointer h-8 text-xs" onClick={() => setShowNewWC(false)}>Cancel</Button>
              <Button className="flex-1 cursor-pointer h-8 text-xs" onClick={handleCreateWC} disabled={createWC.isPending}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Work Order Dialog ── */}
      <Dialog open={showAddWO} onOpenChange={setShowAddWO}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Work Order</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1"><Label className="text-xs">Operation Name *</Label><Input value={woForm.operationName} onChange={(e) => setWoForm({ ...woForm, operationName: e.target.value })} placeholder="e.g. Welding" className="h-8 text-xs" /></div>
            <div className="space-y-1">
              <Label className="text-xs">Work Center *</Label>
              <Select value={woForm.workCenterId} onValueChange={(v) => setWoForm({ ...woForm, workCenterId: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{workCenters?.map((wc: any) => <SelectItem key={wc._id} value={wc._id}>{wc.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Sequence</Label><Input type="number" value={woForm.sequence} onChange={(e) => setWoForm({ ...woForm, sequence: e.target.value })} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs">Duration (min)</Label><Input type="number" value={woForm.plannedDuration} onChange={(e) => setWoForm({ ...woForm, plannedDuration: e.target.value })} className="h-8 text-xs" /></div>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="ghost" className="flex-1 cursor-pointer h-8 text-xs" onClick={() => setShowAddWO(false)}>Cancel</Button>
              <Button className="flex-1 cursor-pointer h-8 text-xs" onClick={handleCreateWO} disabled={createWO.isPending}>Add Work Order</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Mark Complete Dialog ── */}
      <Dialog open={showComplete} onOpenChange={(o) => { setShowComplete(o); if (!o) setCompletingMO(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical size={18} className="text-green-600" />
              Complete Manufacturing Order
            </DialogTitle>
          </DialogHeader>
          {completingDetail && (
            <div className="space-y-4 pt-2">
              <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm border border-border/50">
                <p className="font-semibold">{completingDetail.moNumber} — {completingDetail.productName ?? completingDetail.product?.name}</p>
                <p className="text-muted-foreground">Planned qty: <span className="font-medium text-foreground">{completingDetail.quantity}</span></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Produced Qty</Label>
                  <Input type="number" placeholder={String(completingDetail.quantity)} value={completionProduced} onChange={(e) => setCompletionProduced(e.target.value)} className="h-8 text-xs" />
                  <p className="text-[10px] text-muted-foreground">Leave blank to use planned qty</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Scrap Qty</Label>
                  <Input type="number" min="0" value={completionScrap} onChange={(e) => setCompletionScrap(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>

              {completingMaterialReqs && completingMaterialReqs.length > 0 && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FlaskConical size={12} />
                    Actual Consumption
                    <span className="normal-case font-normal">(override BOM if different)</span>
                  </p>
                  <div className="space-y-2">
                    {completingMaterialReqs.map((m: any) => {
                      const stdQty = Number(m.required) || 0;
                      const actualVal = completionConsumption[m.componentId] ?? "";
                      const isOverridden = actualVal !== "" && parseFloat(actualVal) !== stdQty;
                      return (
                        <div key={m.componentId} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{m.componentName}</p>
                            <p className="text-[10px] text-muted-foreground">BOM std: {stdQty.toFixed(2)} {m.unitOfMeasure} · Avail: {m.available ?? 0}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Input
                              type="number"
                              className={cn("w-24 h-7 text-xs", isOverridden && "border-amber-400 text-amber-700")}
                              placeholder={stdQty.toFixed(2)}
                              value={actualVal}
                              onChange={(e) => setCompletionConsumption((prev) => ({ ...prev, [m.componentId]: e.target.value }))}
                            />
                            {isOverridden && (
                              <button
                                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                onClick={() => setCompletionConsumption((prev) => { const n = { ...prev }; delete n[m.componentId]; return n; })}
                                title="Reset to BOM standard"
                              >↺</button>
                            )}
                            {!m.sufficient && (
                              <AlertCircle size={13} className="text-red-500 shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="ghost" className="flex-1 cursor-pointer h-8 text-xs" onClick={() => setShowComplete(false)}>Cancel</Button>
                <Button className="flex-1 cursor-pointer h-8 text-xs gap-1" onClick={handleCompleteMO} disabled={updateMOStatus.isPending}>
                  <CheckCircle2 size={14} />Mark Complete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
