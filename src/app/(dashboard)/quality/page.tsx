"use client"

import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, CheckCircle2, XCircle, Clock, ShieldCheck,
  AlertTriangle, BarChart3, FileText, ChevronDown, ChevronUp
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

/* eslint-disable @typescript-eslint/no-explicit-any */

const RESULT_STYLES = {
  pass: "bg-green-100 text-green-700 border-green-200",
  fail: "bg-red-100 text-red-700 border-red-200",
  conditional: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const RESULT_ICONS = {
  pass: <CheckCircle2 size={13} />,
  fail: <XCircle size={13} />,
  conditional: <Clock size={13} />,
};

type QCParam = { name: string; expected: string; actual: string; passed: boolean };
type TemplateParam = { name: string; expected: string; unit?: string };

export default function QualityPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const [filterType, setFilterType] = useState<string | undefined>(undefined);
  const [filterResult, setFilterResult] = useState<string | undefined>(undefined);
  const [showNew, setShowNew] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  const { data: stats } = useQuery({ queryKey: ["quality", "stats"], queryFn: () => api.get<any>("/quality/stats") });
  const { data: checks } = useQuery({ queryKey: ["quality", "checks", filterType, filterResult], queryFn: () => api.get<any[]>(`/quality/checks?type=${filterType || ""}&result=${filterResult || ""}`) });
  const { data: templates } = useQuery({ queryKey: ["quality", "templates"], queryFn: () => api.get<any[]>("/quality/templates") });
  const { data: products } = useQuery({ queryKey: ["inventory", "products"], queryFn: () => api.get<any[]>("/inventory/products") });

  const createCheck = useMutation({ mutationFn: (data: any) => api.post("/quality/checks", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["quality"] }) });
  const createTemplate = useMutation({ mutationFn: (data: any) => api.post("/quality/templates", data), onSuccess: () => qc.invalidateQueries({ queryKey: ["quality"] }) });

  // New Check Form
  const [form, setForm] = useState({
    type: "incoming",
    referenceId: "",
    referenceType: "purchase",
    productId: "",
    quantity: "1",
    checkDate: new Date().toISOString().slice(0, 10),
    result: "pass",
    failReason: "",
    notes: "",
  });
  const [params, setParams] = useState<QCParam[]>([
    { name: "Visual Inspection", expected: "No defects", actual: "", passed: true },
    { name: "Dimensions", expected: "Within tolerance", actual: "", passed: true },
  ]);

  // Template Form
  const [templateForm, setTemplateForm] = useState({ name: "", type: "incoming", notes: "" });
  const [templateParams, setTemplateParams] = useState<TemplateParam[]>([
    { name: "", expected: "", unit: "" },
  ]);

  const handleLoadTemplate = (template: { parameters: TemplateParam[] }) => {
    setParams(template.parameters.map((p) => ({
      name: p.name,
      expected: p.expected,
      actual: "",
      passed: true,
    })));
    toast.success("Template loaded");
  };

  const handleCreate = async () => {
    if (!form.productId) { toast.error("Select a product"); return; }
    if (params.some((p) => !p.name)) { toast.error("All parameters need a name"); return; }
    const product = products?.find((p) => p._id === form.productId);
    // Auto-determine result based on parameters if not manually overridden
    const allPassed = params.every((p) => p.passed);
    const anyFailed = params.some((p) => !p.passed);
    const autoResult = allPassed ? "pass" : anyFailed ? "fail" : "conditional";
    const finalResult = form.result || autoResult;
    try {
      await createCheck.mutateAsync({
        type: form.type,
        referenceId: form.referenceId || `REF-${Date.now()}`,
        referenceType: form.referenceType,
        productId: form.productId,
        productName: product?.name ?? "",
        quantity: parseInt(form.quantity) || 1,
        checkDate: form.checkDate,
        parameters: params,
        result: finalResult,
        failReason: finalResult === "fail" ? (form.failReason || undefined) : undefined,
        notes: form.notes || undefined,
      });
      toast.success("Quality check recorded");
      setShowNew(false);
      setForm({ type: "incoming", referenceId: "", referenceType: "purchase", productId: "", quantity: "1", checkDate: new Date().toISOString().slice(0, 10), result: "pass", failReason: "", notes: "" });
      setParams([{ name: "Visual Inspection", expected: "No defects", actual: "", passed: true }, { name: "Dimensions", expected: "Within tolerance", actual: "", passed: true }]);
    } catch { toast.error("Failed to record check"); }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name || templateParams.some((p) => !p.name)) { toast.error("Fill in all fields"); return; }
    try {
      await createTemplate.mutateAsync({
        name: templateForm.name,
        type: templateForm.type,
        parameters: templateParams.filter((p) => p.name),
        notes: templateForm.notes || undefined,
      });
      toast.success("Template created");
      setShowTemplate(false);
      setTemplateForm({ name: "", type: "incoming", notes: "" });
      setTemplateParams([{ name: "", expected: "", unit: "" }]);
    } catch { toast.error("Failed to create template"); }
  };

  const updateParam = (i: number, field: keyof QCParam, value: string | boolean) => {
    setParams((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  };

  // Determine overall result color from params
  const computedResult = params.every((p) => p.passed) ? "pass" : params.some((p) => !p.passed) ? "fail" : "conditional";

  const pieData = stats ? [
    { name: "Pass", value: stats.passed, color: "#22c55e" },
    { name: "Fail", value: stats.failed, color: "#ef4444" },
    { name: "Conditional", value: stats.conditional, color: "#eab308" },
  ].filter((d) => d.value > 0) : [];

  const typeData = stats ? [
    { name: "Incoming", value: stats.incoming, color: "#3b82f6" },
    { name: "In-Process", value: stats.inProcess, color: "#8b5cf6" },
    { name: "Final", value: stats.final, color: "#10b981" },
  ] : [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="checks">Inspection Records</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {tab === "templates" && (
              <Button variant="secondary" onClick={() => setShowTemplate(true)} className="cursor-pointer">
                <Plus size={14} className="mr-1" />New Template
              </Button>
            )}
            <Button onClick={() => setShowNew(true)} className="cursor-pointer">
              <Plus size={14} className="mr-1" />New Inspection
            </Button>
          </div>
        </div>

        {/* ── Dashboard ─────────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="mt-4 space-y-4">
          {!stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">Total Inspections</p>
                      <FileText size={15} className="text-primary" />
                    </div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground mt-1">all time</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">Pass Rate</p>
                      <ShieldCheck size={15} className="text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{stats.passRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats.passed} passed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">Failed</p>
                      <XCircle size={15} className="text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats.conditional} conditional</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">By Stage</p>
                      <BarChart3 size={15} className="text-blue-500" />
                    </div>
                    <div className="text-xs space-y-0.5 mt-1">
                      <p><span className="text-muted-foreground">Incoming:</span> <span className="font-semibold">{stats.incoming}</span></p>
                      <p><span className="text-muted-foreground">In-Process:</span> <span className="font-semibold">{stats.inProcess}</span></p>
                      <p><span className="text-muted-foreground">Final:</span> <span className="font-semibold">{stats.final}</span></p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pieData.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Result Distribution</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}
                            label={({ name, percent }: { name: string; percent: number }) => `${name} ${Math.round(percent * 100)}%`}
                            labelLine={false}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 grid grid-cols-1 gap-2">
                        {pieData.map((entry) => (
                          <div key={entry.name} className="flex items-center justify-between rounded-lg border border-muted/60 px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                              <span>{entry.name}</span>
                            </div>
                            <span className="font-semibold">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {typeData.some((d) => d.value > 0) && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Checks by Stage</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={typeData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {typeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Top Failing Products */}
              {stats.topFailProducts.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Top Failing Products</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {stats.topFailProducts.map((p, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-sm w-5">{i + 1}.</span>
                            <p className="text-sm font-medium">{p.name}</p>
                          </div>
                          <Badge className="text-xs bg-red-100 text-red-700">{p.fails} {p.fails === 1 ? "failure" : "failures"}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Failures */}
              {stats.recentFails.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Recent Failures</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {stats.recentFails.map((c) => (
                        <div key={c._id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">{c.productName}</p>
                            <p className="text-xs text-muted-foreground">{c.type} · {c.checkDate}</p>
                            {c.failReason && <p className="text-xs text-red-600 mt-0.5">{c.failReason}</p>}
                          </div>
                          <Badge className="text-xs bg-red-100 text-red-700 flex items-center gap-1">
                            <XCircle size={11} /> Fail
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Inspection Records ───────────────────────────────────────────── */}
        <TabsContent value="checks" className="mt-4 space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1">
              {[undefined, "incoming", "in_process", "final"].map((t) => (
                <Button
                  key={t ?? "all"}
                  size="sm"
                  variant={filterType === t ? "default" : "secondary"}
                  className="cursor-pointer capitalize h-8 text-xs"
                  onClick={() => { setFilterType(t); setFilterResult(undefined); }}
                >
                  {t ? t.replace("_", "-") : "All Types"}
                </Button>
              ))}
            </div>
            <div className="flex gap-1 border-l pl-2">
              {[undefined, "pass", "fail", "conditional"].map((r) => (
                <Button
                  key={r ?? "all"}
                  size="sm"
                  variant={filterResult === r ? "default" : "secondary"}
                  className="cursor-pointer capitalize h-8 text-xs"
                  onClick={() => { setFilterResult(r); setFilterType(undefined); }}
                >
                  {r ?? "All Results"}
                </Button>
              ))}
            </div>
          </div>

          {!checks ? <Skeleton className="h-64" /> : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium w-8"></th>
                    <th className="text-left px-4 py-3 font-medium">Product</th>
                    <th className="text-left px-4 py-3 font-medium">Stage</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Reference</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Qty</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Parameters</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Inspector</th>
                    <th className="text-left px-4 py-3 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((c) => {
                    const isExpanded = expandedCheck === c._id;
                    return (
                      <Fragment key={c._id}>
                        <tr
                          className={`border-b hover:bg-muted/30 cursor-pointer ${isExpanded ? "bg-muted/20" : ""}`}
                          onClick={() => setExpandedCheck(isExpanded ? null : c._id)}
                        >
                          <td className="px-4 py-3 text-muted-foreground">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </td>
                          <td className="px-4 py-3 font-medium">{c.productName}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs capitalize">{c.type.replace("_", "-")}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{c.referenceId}</td>
                          <td className="px-4 py-3 hidden md:table-cell">{c.quantity}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                            {c.passedParams}/{c.totalParams} passed
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{c.checkDate}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{c.inspectorName}</td>
                          <td className="px-4 py-3">
                            <Badge className={`text-xs flex items-center gap-1 w-fit ${RESULT_STYLES[c.result as keyof typeof RESULT_STYLES] ?? ""}`}>
                              {RESULT_ICONS[c.result as keyof typeof RESULT_ICONS]}
                              {c.result}
                            </Badge>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${c._id}-expanded`} className="bg-muted/10 border-b">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Inspection Parameters</p>
                                  <div className="space-y-1.5">
                                    {c.parameters.map((p, i) => (
                                      <div key={i} className={`flex items-center justify-between text-xs rounded px-3 py-2 ${p.passed ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                                        <div>
                                          <span className="font-medium">{p.name}</span>
                                          <span className="text-muted-foreground ml-2">Expected: {p.expected}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className={p.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                                            Actual: {p.actual || "—"}
                                          </span>
                                          {p.passed
                                            ? <CheckCircle2 size={13} className="text-green-500" />
                                            : <XCircle size={13} className="text-red-500" />}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="text-sm space-y-2">
                                  {c.failReason && (
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded p-3">
                                      <p className="text-xs font-semibold text-red-700 mb-1">Fail Reason</p>
                                      <p className="text-xs text-red-600">{c.failReason}</p>
                                    </div>
                                  )}
                                  {c.notes && (
                                    <div className="bg-muted/40 rounded p-3">
                                      <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                                      <p className="text-xs">{c.notes}</p>
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    <p>Reference: {c.referenceType} — {c.referenceId}</p>
                                    <p>Inspector: {c.inspectorName}</p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {checks.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No quality checks found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Templates ────────────────────────────────────────────────────── */}
        <TabsContent value="templates" className="mt-4">
          {!templates ? <Skeleton className="h-48" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((t) => (
                <Card key={t._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold">{t.name}</p>
                        <Badge variant="outline" className="text-xs capitalize mt-1">{t.type.replace("_", "-")}</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="cursor-pointer shrink-0"
                        onClick={() => {
                          handleLoadTemplate(t);
                          setForm((f) => ({ ...f, type: t.type }));
                          setShowNew(true);
                        }}
                      >
                        Use Template
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">PARAMETERS ({t.parameters.length})</p>
                      {t.parameters.map((p, i) => (
                        <div key={i} className="flex justify-between text-xs bg-muted/40 rounded px-2 py-1.5">
                          <span>{p.name}</span>
                          <span className="text-muted-foreground">Expected: {p.expected} {p.unit ?? ""}</span>
                        </div>
                      ))}
                    </div>
                    {t.notes && <p className="text-xs text-muted-foreground mt-2">{t.notes}</p>}
                  </CardContent>
                </Card>
              ))}
              {templates.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <FileText size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No inspection templates yet</p>
                  <p className="text-sm mt-1">Create templates to speed up recurring inspections</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── New Inspection Dialog ──────────────────────────────────────────── */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Quality Inspection</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label>Stage *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incoming">Incoming</SelectItem>
                    <SelectItem value="in_process">In-Process</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference Type</Label>
                <Select value={form.referenceType} onValueChange={(v) => setForm({ ...form, referenceType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference #</Label>
                <Input value={form.referenceId} onChange={(e) => setForm({ ...form, referenceId: e.target.value })} placeholder="PO / MO number" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Product *</Label>
                <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{products?.map((p) => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>

            <div><Label>Inspection Date</Label><Input type="date" value={form.checkDate} onChange={(e) => setForm({ ...form, checkDate: e.target.value })} /></div>

            {/* Load template shortcut */}
            {templates && templates.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg px-3 py-2">
                <FileText size={13} />
                <span>Load a template:</span>
                {templates.filter((t) => t.type === form.type).map((t) => (
                  <button key={t._id} className="text-primary underline cursor-pointer" onClick={() => handleLoadTemplate(t)}>
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            {/* Parameters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Inspection Parameters</Label>
                <div className="flex items-center gap-1 text-xs">
                  <span className={`font-medium ${computedResult === "pass" ? "text-green-600" : computedResult === "fail" ? "text-red-600" : "text-yellow-600"}`}>
                    Auto-result: {computedResult}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {params.map((p, i) => (
                  <div key={i} className={`grid grid-cols-12 gap-2 items-center rounded-lg border px-3 py-2 ${p.passed ? "border-green-200 bg-green-50/50 dark:bg-green-900/10" : "border-red-200 bg-red-50/50 dark:bg-red-900/10"}`}>
                    <Input
                      className="col-span-3 h-8 text-xs"
                      value={p.name}
                      onChange={(e) => updateParam(i, "name", e.target.value)}
                      placeholder="Parameter"
                    />
                    <Input
                      className="col-span-3 h-8 text-xs"
                      value={p.expected}
                      onChange={(e) => updateParam(i, "expected", e.target.value)}
                      placeholder="Expected"
                    />
                    <Input
                      className="col-span-3 h-8 text-xs"
                      value={p.actual}
                      onChange={(e) => updateParam(i, "actual", e.target.value)}
                      placeholder="Actual value"
                    />
                    <div className="col-span-2 flex gap-1">
                      <Button
                        size="sm"
                        className={`cursor-pointer flex-1 h-8 text-xs ${p.passed ? "bg-green-500 hover:bg-green-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
                        onClick={() => updateParam(i, "passed", !p.passed)}
                      >
                        {p.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      </Button>
                    </div>
                    <button
                      className="col-span-1 text-muted-foreground hover:text-red-500 cursor-pointer text-center"
                      onClick={() => setParams((prev) => prev.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2 cursor-pointer"
                onClick={() => setParams((prev) => [...prev, { name: "", expected: "", actual: "", passed: true }])}
              >
                <Plus size={12} className="mr-1" />Add Parameter
              </Button>
            </div>

            {/* Override result */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Override Result</Label>
                <Select value={form.result || computedResult} onValueChange={(v) => setForm({ ...form, result: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="conditional">Conditional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(form.result === "fail" || computedResult === "fail") && (
                <div>
                  <Label>Fail Reason</Label>
                  <Input value={form.failReason} onChange={(e) => setForm({ ...form, failReason: e.target.value })} placeholder="Root cause..." />
                </div>
              )}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional observations..." rows={2} />
            </div>

            <Button onClick={handleCreate} className="w-full cursor-pointer">
              <ShieldCheck size={14} className="mr-1" />Record Inspection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── New Template Dialog ────────────────────────────────────────────── */}
      <Dialog open={showTemplate} onOpenChange={setShowTemplate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Inspection Template</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Template Name *</Label><Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="e.g. Raw Material Incoming Check" /></div>
            <div>
              <Label>Stage</Label>
              <Select value={templateForm.type} onValueChange={(v) => setTemplateForm({ ...templateForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Incoming</SelectItem>
                  <SelectItem value="in_process">In-Process</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parameters</Label>
              <div className="space-y-2 mt-1">
                {templateParams.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <Input className="flex-1 text-xs" value={p.name} onChange={(e) => setTemplateParams((prev) => prev.map((pp, j) => j === i ? { ...pp, name: e.target.value } : pp))} placeholder="Parameter name" />
                    <Input className="flex-1 text-xs" value={p.expected} onChange={(e) => setTemplateParams((prev) => prev.map((pp, j) => j === i ? { ...pp, expected: e.target.value } : pp))} placeholder="Expected value" />
                    <Input className="w-16 text-xs" value={p.unit ?? ""} onChange={(e) => setTemplateParams((prev) => prev.map((pp, j) => j === i ? { ...pp, unit: e.target.value } : pp))} placeholder="Unit" />
                    <button className="text-muted-foreground hover:text-red-500 cursor-pointer px-1" onClick={() => setTemplateParams((prev) => prev.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="secondary" className="mt-2 cursor-pointer" onClick={() => setTemplateParams((prev) => [...prev, { name: "", expected: "", unit: "" }])}>
                <Plus size={12} className="mr-1" />Add Parameter
              </Button>
            </div>
            <div><Label>Notes</Label><Textarea value={templateForm.notes} onChange={(e) => setTemplateForm({ ...templateForm, notes: e.target.value })} rows={2} placeholder="Template description..." /></div>
            <Button onClick={handleCreateTemplate} className="w-full cursor-pointer">Create Template</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
