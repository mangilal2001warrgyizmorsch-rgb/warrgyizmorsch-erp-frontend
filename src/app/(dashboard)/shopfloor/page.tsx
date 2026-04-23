"use client"

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Factory, Wrench, AlertTriangle, CheckCircle2, Clock, Play,
  PauseCircle, Plus, Activity, ClipboardList, Gauge
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

const LOG_TYPE_STYLES: Record<string, string> = {
  production: "bg-green-100 text-green-700",
  scrap: "bg-red-100 text-red-700",
  downtime: "bg-orange-100 text-orange-700",
  issue: "bg-yellow-100 text-yellow-700",
  shift_start: "bg-blue-100 text-blue-700",
  shift_end: "bg-purple-100 text-purple-700",
};

const LOG_TYPE_ICONS: Record<string, React.ReactNode> = {
  production: <CheckCircle2 size={13} />,
  scrap: <AlertTriangle size={13} />,
  downtime: <PauseCircle size={13} />,
  issue: <AlertTriangle size={13} />,
  shift_start: <Play size={13} />,
  shift_end: <Clock size={13} />,
};

export default function ShopfloorPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("board");
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [showDowntimeDialog, setShowDowntimeDialog] = useState(false);

  const { data: liveBoard } = useQuery({ queryKey: ["shopfloor", "live"], queryFn: () => api.get<any[]>("/shopfloor/live"), refetchInterval: 30000 });
  const { data: wcBoard } = useQuery({ queryKey: ["shopfloor", "work-centers"], queryFn: () => api.get<any[]>("/shopfloor/work-centers"), refetchInterval: 30000 });
  const { data: productionLogs } = useQuery({ queryKey: ["shopfloor", "logs"], queryFn: () => api.get<any[]>("/shopfloor/logs?limit=80") });
  const { data: downtimes } = useQuery({ queryKey: ["shopfloor", "downtime"], queryFn: () => api.get<any[]>("/shopfloor/downtime") });
  const { data: shiftSummary } = useQuery({ queryKey: ["shopfloor", "shift-summary"], queryFn: () => api.get<any>("/shopfloor/shift-summary"), refetchInterval: 60000 });

  const logProduction = useMutation({ mutationFn: (data: any) => api.post("/shopfloor/log", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["shopfloor"] }) });
  const reportDowntime = useMutation({ mutationFn: (data: any) => api.post("/shopfloor/downtime", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["shopfloor"] }) });
  const resolveDowntime = useMutation({ mutationFn: ({ id }: any) => api.put(`/shopfloor/downtime/${id}/resolve`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["shopfloor"] }) });
  const updateWOStatus = useMutation({ mutationFn: ({ id, ...data }: any) => api.put(`/manufacturing/work-orders/${id}/status`, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["shopfloor"] }); qc.invalidateQueries({ queryKey: ["manufacturing"] }); } });

  const [logForm, setLogForm] = useState({
    moId: "",
    workCenterId: "",
    type: "production",
    quantity: "",
    description: "",
  });

  const [downtimeForm, setDowntimeForm] = useState({
    workCenterId: "",
    reason: "",
  });

  const workCentersFlat = wcBoard ?? [];

  const handleLog = async () => {
    if (!logForm.moId || !logForm.description) { toast.error("Select MO and enter description"); return; }
    try {
      await logProduction.mutateAsync({
        moId: logForm.moId,
        workCenterId: logForm.workCenterId || undefined,
        type: logForm.type,
        quantity: logForm.quantity ? parseInt(logForm.quantity) : undefined,
        description: logForm.description,
      });
      toast.success("Production entry logged");
      setShowLogDialog(false);
      setLogForm({ moId: "", workCenterId: "", type: "production", quantity: "", description: "" });
    } catch { toast.error("Failed to log entry"); }
  };

  const handleReportDowntime = async () => {
    if (!downtimeForm.workCenterId || !downtimeForm.reason) { toast.error("Select work center and enter reason"); return; }
    try {
      await reportDowntime.mutateAsync({
        workCenterId: downtimeForm.workCenterId,
        reason: downtimeForm.reason,
      });
      toast.success("Downtime reported");
      setShowDowntimeDialog(false);
      setDowntimeForm({ workCenterId: "", reason: "" });
    } catch { toast.error("Failed to report downtime"); }
  };

  const handleResolveDowntime = async (id: string) => {
    try {
      await resolveDowntime.mutateAsync({ id });
      toast.success("Downtime resolved");
    } catch { toast.error("Failed to resolve"); }
  };

  // Open-downtime count for banner
  const openDowntimeCount = downtimes?.filter((d) => !d.isResolved).length ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Open Downtime Banner */}
      {openDowntimeCount > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PauseCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              {openDowntimeCount} open downtime event{openDowntimeCount > 1 ? "s" : ""} — production affected
            </p>
          </div>
          <Button size="sm" variant="destructive" className="cursor-pointer h-7 text-xs" onClick={() => setTab("downtime")}>
            View
          </Button>
        </div>
      )}

      {/* Shift KPIs */}
      {!shiftSummary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-green-500 p-1.5 rounded"><CheckCircle2 size={14} className="text-white" /></div>
                <p className="text-xs text-muted-foreground">Produced Today</p>
              </div>
              <p className="text-2xl font-bold">{shiftSummary.totalProduced.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">units</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-red-500 p-1.5 rounded"><AlertTriangle size={14} className="text-white" /></div>
                <p className="text-xs text-muted-foreground">Scrap Today</p>
              </div>
              <p className="text-2xl font-bold">{shiftSummary.totalScrap.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">units scrapped</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-orange-500 p-1.5 rounded"><PauseCircle size={14} className="text-white" /></div>
                <p className="text-xs text-muted-foreground">Downtime</p>
              </div>
              <p className="text-2xl font-bold">{shiftSummary.totalDowntimeMinutes}</p>
              <p className="text-xs text-muted-foreground">minutes lost · {shiftSummary.openDowntime} open</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-yellow-500 p-1.5 rounded"><AlertTriangle size={14} className="text-white" /></div>
                <p className="text-xs text-muted-foreground">Issues Reported</p>
              </div>
              <p className="text-2xl font-bold">{shiftSummary.issuesReported}</p>
              <p className="text-xs text-muted-foreground">{shiftSummary.logCount} total log entries</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="board">Live Board</TabsTrigger>
            <TabsTrigger value="workcenters">Work Centers</TabsTrigger>
            <TabsTrigger value="logs">Production Log</TabsTrigger>
            <TabsTrigger value="downtime">
              Downtime
              {openDowntimeCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {openDowntimeCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowDowntimeDialog(true)} className="cursor-pointer">
              <PauseCircle size={14} className="mr-1" />Report Downtime
            </Button>
            <Button onClick={() => setShowLogDialog(true)} className="cursor-pointer">
              <Plus size={14} className="mr-1" />Log Entry
            </Button>
          </div>
        </div>

        {/* ── Live Production Board ──────────────────────────────────────── */}
        <TabsContent value="board" className="mt-4">
          {!liveBoard ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : liveBoard.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Factory size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">No active production orders</p>
              <p className="text-sm mt-1">Start a Manufacturing Order to see the live board</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveBoard.map((mo) => {
                const isOverdue = new Date(mo.scheduledEnd) < new Date() && mo.status === "in_progress";
                const completedWOs = mo.workOrders.filter((wo) => wo.status === "completed").length;
                const inProgressWOs = mo.workOrders.filter((wo) => wo.status === "in_progress");

                return (
                  <Card key={mo._id} className={`border-l-4 ${mo.status === "in_progress" ? "border-l-amber-400" : "border-l-blue-400"} ${isOverdue ? "border-red-300" : ""}`}>
                    <CardContent className="pt-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold">{mo.moNumber}</p>
                            {isOverdue && <Badge className="text-xs bg-red-100 text-red-700">Overdue</Badge>}
                            <Badge className={`text-xs ${mo.status === "in_progress" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                              {mo.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{mo.productName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">Target</p>
                          <p className="font-semibold">{mo.quantity} {mo.product?.unitOfMeasure}</p>
                        </div>
                      </div>

                      {/* Production Progress */}
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                          <span>Produced: <span className="font-semibold text-foreground">{mo.producedQuantity ?? 0}</span></span>
                          <span>Today: <span className="font-semibold text-green-600">+{mo.todayProduced}</span></span>
                        </div>
                        <Progress
                          value={Math.min(100, Math.round(((mo.producedQuantity ?? 0) / mo.quantity) * 100))}
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{Math.min(100, Math.round(((mo.producedQuantity ?? 0) / mo.quantity) * 100))}% complete</span>
                          <span>Due: {mo.scheduledEnd}</span>
                        </div>
                      </div>

                      {/* Work Order Progress */}
                      {mo.workOrders.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">
                            OPERATIONS: {completedWOs}/{mo.workOrders.length}
                          </p>
                          <div className="flex gap-1 flex-wrap">
                            {mo.workOrders.sort((a, b) => a.sequence - b.sequence).map((wo) => (
                              <div key={wo._id} className={`flex items-center gap-1 text-xs rounded px-2 py-0.5 ${
                                wo.status === "completed" ? "bg-green-100 text-green-700" :
                                wo.status === "in_progress" ? "bg-amber-100 text-amber-700" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {wo.status === "completed" ? <CheckCircle2 size={10} /> :
                                 wo.status === "in_progress" ? <Activity size={10} /> :
                                 <Clock size={10} />}
                                {wo.operationName}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Active Work Orders */}
                      {inProgressWOs.length > 0 && (
                        <div className="border-t pt-2">
                          {inProgressWOs.map((wo) => (
                            <div key={wo._id} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 text-amber-600">
                                <Activity size={11} />
                                <span className="font-medium">{wo.operationName}</span>
                                {wo.startedAt && (
                                  <span className="text-muted-foreground">
                                    · {Math.round((Date.now() - Date.parse(wo.startedAt)) / 60000)}m elapsed
                                  </span>
                                )}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="cursor-pointer h-6 text-xs"
                                onClick={() => {
                                  updateWOStatus.mutate({ id: wo._id, status: "completed" });
                                  toast.success(`${wo.operationName} completed`);
                                }}
                              >
                                Done
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Log quick entry */}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full cursor-pointer h-7 text-xs"
                        onClick={() => {
                          setLogForm({ ...logForm, moId: mo._id });
                          setShowLogDialog(true);
                        }}
                      >
                        <ClipboardList size={11} className="mr-1" />Log Entry
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Work Centers ─────────────────────────────────────────────────── */}
        <TabsContent value="workcenters" className="mt-4">
          {!wcBoard ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : wcBoard.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench size={40} className="mx-auto mb-3 opacity-20" />
              <p>No work centers configured.</p>
              <p className="text-sm">Add them in the Manufacturing module.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wcBoard.map((wc) => {
                const utilization = Math.min(100, Math.round((wc.activeWOs.length / Math.max(wc.capacity / 8, 1)) * 100));
                const statusColor = wc.hasDowntime ? "border-red-300 bg-red-50/30 dark:bg-red-900/10" :
                  wc.activeWOs.length > 0 ? "border-amber-300 bg-amber-50/30 dark:bg-amber-900/10" :
                  "border-green-300 bg-green-50/20 dark:bg-green-900/10";

                return (
                  <Card key={wc._id} className={`border-l-4 ${statusColor}`}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gauge size={18} className={wc.hasDowntime ? "text-red-500" : wc.activeWOs.length > 0 ? "text-amber-500" : "text-green-500"} />
                          <div>
                            <p className="font-semibold">{wc.name}</p>
                            <p className="text-xs text-muted-foreground">{wc.code}</p>
                          </div>
                        </div>
                        <Badge className={`text-xs ${
                          wc.hasDowntime ? "bg-red-100 text-red-700" :
                          wc.activeWOs.length > 0 ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {wc.hasDowntime ? "Down" : wc.activeWOs.length > 0 ? "Running" : "Idle"}
                        </Badge>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Utilization</span>
                          <span>{utilization}%</span>
                        </div>
                        <Progress value={utilization} className="h-1.5" />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-center">
                        <div className="bg-muted/40 rounded p-1.5">
                          <p className="font-bold text-base">{wc.activeWOs.length}</p>
                          <p className="text-muted-foreground">Active</p>
                        </div>
                        <div className="bg-muted/40 rounded p-1.5">
                          <p className="font-bold text-base">{wc.pendingCount}</p>
                          <p className="text-muted-foreground">Pending</p>
                        </div>
                        <div className="bg-muted/40 rounded p-1.5">
                          <p className="font-bold text-base">{wc.capacity}</p>
                          <p className="text-muted-foreground">h/day</p>
                        </div>
                      </div>

                      {wc.activeWOs.map((wo) => (
                        <div key={wo._id} className="text-xs bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1.5 flex items-center justify-between">
                          <span>
                            <span className="font-medium">{wo.operationName}</span>
                            <span className="text-muted-foreground"> — {wo.mo?.moNumber}</span>
                          </span>
                          {wo.startedAt && (
                            <span className="text-muted-foreground">{Math.round((Date.now() - Date.parse(wo.startedAt)) / 60000)}m</span>
                          )}
                        </div>
                      ))}

                      {wc.hasDowntime && (
                        <div className="text-xs bg-red-50 dark:bg-red-900/20 rounded px-2 py-1.5 flex items-center gap-1.5">
                          <PauseCircle size={12} className="text-red-500 shrink-0" />
                          <span className="text-red-700 dark:text-red-400 font-medium">
                            {wc.downtimeEvents[0]?.reason}
                          </span>
                        </div>
                      )}

                      {wc.hasDowntime && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full cursor-pointer h-7 text-xs"
                          onClick={() => {
                            const evt = wc.downtimeEvents[0];
                            if (evt) handleResolveDowntime(evt._id);
                          }}
                        >
                          Resolve Downtime
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Production Log ───────────────────────────────────────────────── */}
        <TabsContent value="logs" className="mt-4">
          {!productionLogs ? <Skeleton className="h-64" /> : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">MO #</th>
                    <th className="text-left px-4 py-3 font-medium">Description</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Qty</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Work Center</th>
                    <th className="text-left px-4 py-3 font-medium">Operator</th>
                    <th className="text-left px-4 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {productionLogs.map((log) => (
                    <tr key={log._id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Badge className={`text-xs flex items-center gap-1 w-fit ${LOG_TYPE_STYLES[log.type] ?? "bg-gray-100 text-gray-600"}`}>
                          {LOG_TYPE_ICONS[log.type]}
                          {log.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{log.moNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{log.description}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {log.quantity ? <span className={`font-medium ${log.type === "scrap" ? "text-red-600" : "text-green-600"}`}>{log.quantity}</span> : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{log.workCenterName ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{log.operatorName}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                  {productionLogs.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No production logs yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Downtime ─────────────────────────────────────────────────────── */}
        <TabsContent value="downtime" className="mt-4 space-y-3">
          {!downtimes ? <Skeleton className="h-48" /> : (
            <>
              {/* Open */}
              <h3 className="text-sm font-semibold text-red-600">Open Downtime Events</h3>
              {downtimes.filter((d) => !d.isResolved).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
                  <p>No open downtime — all systems running</p>
                </div>
              ) : (
                downtimes.filter((d) => !d.isResolved).map((d) => (
                  <Card key={d._id} className="border-red-200 dark:border-red-800">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-3">
                          <div className="bg-red-100 p-2 rounded-lg shrink-0"><PauseCircle size={18} className="text-red-600" /></div>
                          <div>
                            <p className="font-semibold">{d.workCenterName}</p>
                            <p className="text-sm text-muted-foreground">{d.reason}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Started: {new Date(d.startTime).toLocaleString()} · Reported by {d.reporterName}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => handleResolveDowntime(d._id)}
                        >
                          <CheckCircle2 size={13} className="mr-1" />Resolve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {/* Resolved history */}
              {downtimes.filter((d) => d.isResolved).length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-muted-foreground pt-2">Resolved History</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">Work Center</th>
                          <th className="text-left px-4 py-3 font-medium">Reason</th>
                          <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Duration</th>
                          <th className="text-left px-4 py-3 font-medium">Resolved</th>
                        </tr>
                      </thead>
                      <tbody>
                        {downtimes.filter((d) => d.isResolved).map((d) => (
                          <tr key={d._id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{d.workCenterName}</td>
                            <td className="px-4 py-3 text-muted-foreground">{d.reason}</td>
                            <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                              {d.durationMinutes != null ? `${d.durationMinutes} min` : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {d.endTime ? new Date(d.endTime).toLocaleString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Log Entry Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Production Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Manufacturing Order *</Label>
              <Select value={logForm.moId} onValueChange={(v) => setLogForm({ ...logForm, moId: v })}>
                <SelectTrigger><SelectValue placeholder="Select MO" /></SelectTrigger>
                <SelectContent>
                  {liveBoard?.map((mo: any) => (
                    <SelectItem key={mo._id} value={mo._id}>{mo.moNumber} — {mo.productName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Entry Type</Label>
                <Select value={logForm.type} onValueChange={(v) => setLogForm({ ...logForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="scrap">Scrap</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                    <SelectItem value="shift_start">Shift Start</SelectItem>
                    <SelectItem value="shift_end">Shift End</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Work Center</Label>
                <Select value={logForm.workCenterId} onValueChange={(v) => setLogForm({ ...logForm, workCenterId: v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {workCentersFlat.map((wc: any) => (
                      <SelectItem key={wc._id} value={wc._id}>{wc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(logForm.type === "production" || logForm.type === "scrap") && (
              <div><Label>Quantity</Label><Input type="number" min={1} value={logForm.quantity} onChange={(e) => setLogForm({ ...logForm, quantity: e.target.value })} placeholder="Units" /></div>
            )}
            <div>
              <Label>Description *</Label>
              <Textarea
                value={logForm.description}
                onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                placeholder={logForm.type === "production" ? "e.g. Batch #12 completed" : logForm.type === "issue" ? "Describe the issue..." : "Notes..."}
                rows={3}
              />
            </div>
            <Button onClick={handleLog} className="w-full cursor-pointer">Log Entry</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Report Downtime Dialog ────────────────────────────────────────── */}
      <Dialog open={showDowntimeDialog} onOpenChange={setShowDowntimeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Report Downtime</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Work Center *</Label>
              <Select value={downtimeForm.workCenterId} onValueChange={(v) => setDowntimeForm({ ...downtimeForm, workCenterId: v })}>
                <SelectTrigger><SelectValue placeholder="Select work center" /></SelectTrigger>
                <SelectContent>
                  {workCentersFlat.map((wc: any) => (
                    <SelectItem key={wc._id} value={wc._id}>{wc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea
                value={downtimeForm.reason}
                onChange={(e) => setDowntimeForm({ ...downtimeForm, reason: e.target.value })}
                placeholder="e.g. Machine breakdown, power outage, material shortage..."
                rows={3}
              />
            </div>
            <Button variant="destructive" onClick={handleReportDowntime} className="w-full cursor-pointer">
              <PauseCircle size={14} className="mr-1" />Report Downtime
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
