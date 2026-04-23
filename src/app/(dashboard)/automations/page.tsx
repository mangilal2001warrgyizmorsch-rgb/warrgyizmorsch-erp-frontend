"use client";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Zap, Plus, Play, Trash2, CheckCircle2, XCircle, Clock,
  Activity, BarChart3, Settings, Filter, Bell, RefreshCw, AlertCircle,
} from "lucide-react";
/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULES = ["sales", "purchase", "crm", "inventory", "hr", "manufacturing", "quality", "delivery"] as const;

const MODULE_EVENTS: Record<string, { value: string; label: string }[]> = {
  sales: [
    { value: "order_confirmed", label: "Sales Order Confirmed" },
    { value: "order_delivered", label: "Sales Order Delivered" },
    { value: "quotation_created", label: "Quotation Created" },
  ],
  purchase: [
    { value: "po_approved", label: "PO Approved" },
    { value: "goods_received", label: "Goods Received" },
    { value: "po_sent_to_vendor", label: "PO Sent to Vendor" },
  ],
  crm: [
    { value: "lead_created", label: "New Lead Created" },
    { value: "lead_converted", label: "Lead Converted" },
    { value: "followup_overdue", label: "Follow-up Overdue" },
    { value: "indiaMart_lead_sync", label: "IndiaMART Lead Synced" },
  ],
  inventory: [
    { value: "stock_low", label: "Stock Level Low" },
    { value: "stock_transfer", label: "Stock Transfer Completed" },
    { value: "stock_adjustment", label: "Stock Adjustment Done" },
  ],
  hr: [
    { value: "leave_requested", label: "Leave Request Submitted" },
    { value: "leave_approved", label: "Leave Approved" },
    { value: "employee_joining", label: "New Employee Joined" },
  ],
  manufacturing: [
    { value: "mo_started", label: "Manufacturing Order Started" },
    { value: "mo_completed", label: "Manufacturing Order Completed" },
    { value: "mo_delayed", label: "Manufacturing Order Delayed" },
  ],
  quality: [
    { value: "inspection_failed", label: "Quality Inspection Failed" },
    { value: "inspection_passed", label: "Quality Inspection Passed" },
  ],
  delivery: [
    { value: "do_dispatched", label: "Delivery Dispatched" },
    { value: "do_delivered", label: "Delivery Completed" },
  ],
};

const ACTION_TYPES = [
  { value: "notify", label: "Send In-App Notification" },
  { value: "create_task", label: "Create Follow-up Task" },
  { value: "update_field", label: "Update Record Field" },
  { value: "send_email", label: "Send Email Alert" },
];

const OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "contains", label: "contains" },
];

const STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-gray-100 text-gray-500",
};

// ─── Sample preset rules ──────────────────────────────────────────────────────
const PRESET_RULES = [
  {
    name: "Notify on Low Stock",
    description: "Alert team when product stock falls below minimum level",
    trigger: { module: "inventory", event: "stock_low", conditions: [] },
    actions: [{ type: "notify", config: { title: "Low Stock Alert", message: "A product has fallen below minimum stock level", notificationType: "warning" } }],
  },
  {
    name: "Follow-up Overdue Alert",
    description: "Notify when a CRM follow-up task becomes overdue",
    trigger: { module: "crm", event: "followup_overdue", conditions: [] },
    actions: [{ type: "notify", config: { title: "Follow-up Overdue", message: "You have overdue follow-up tasks in CRM", notificationType: "error" } }],
  },
  {
    name: "New IndiaMART Lead Alert",
    description: "Notify sales team when new leads are synced from IndiaMART",
    trigger: { module: "crm", event: "indiaMart_lead_sync", conditions: [] },
    actions: [{ type: "notify", config: { title: "New IndiaMART Lead", message: "New leads have been synced from IndiaMART", notificationType: "info" } }],
  },
  {
    name: "Quality Failure Alert",
    description: "Immediately notify QC manager when inspection fails",
    trigger: { module: "quality", event: "inspection_failed", conditions: [] },
    actions: [{ type: "notify", config: { title: "Quality Inspection Failed", message: "A product has failed quality inspection — review required", notificationType: "error" } }],
  },
  {
    name: "PO Approved Notification",
    description: "Notify purchase team when a purchase order is approved",
    trigger: { module: "purchase", event: "po_approved", conditions: [] },
    actions: [{ type: "notify", config: { title: "Purchase Order Approved", message: "A purchase order has been approved and sent to vendor", notificationType: "success" } }],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AutomationsPage() {
  const [tab, setTab] = useState("rules");

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap size={22} className="text-primary" />Workflow Automations</h1>
          <p className="text-sm text-muted-foreground">Build rules that trigger actions across all ERP modules</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="logs">Activity Log</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="rules"><RulesTab /></TabsContent>
        <TabsContent value="logs"><LogsTab /></TabsContent>
        <TabsContent value="presets"><PresetsTab /></TabsContent>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: stats } = useQuery({ queryKey: ["automations", "stats"], queryFn: () => api.get<any>("/automations/stats") });
  const { data: logs } = useQuery({ queryKey: ["automations", "logs"], queryFn: () => api.get<any[]>("/automations/logs") });

  const kpis = [
    { label: "Total Rules", value: stats?.totalRules ?? 0, icon: <Settings size={16} />, color: "text-primary" },
    { label: "Active Rules", value: stats?.activeRules ?? 0, icon: <Zap size={16} />, color: "text-green-500" },
    { label: "Total Runs", value: stats?.totalRuns ?? 0, icon: <Activity size={16} />, color: "text-blue-500" },
    { label: "Successful", value: stats?.successRuns ?? 0, icon: <CheckCircle2 size={16} />, color: "text-emerald-500" },
    { label: "Failed", value: stats?.failedRuns ?? 0, icon: <XCircle size={16} />, color: "text-red-500" },
    { label: "Last Run", value: stats?.lastRunAt ? new Date(stats.lastRunAt).toLocaleTimeString() : "—", icon: <Clock size={16} />, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3">
              <div className={`mb-1 ${k.color}`}>{k.icon}</div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Activity</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!logs ? <Skeleton className="h-32 w-full" /> : logs.slice(0, 10).map((l) => (
            <div key={l._id} className="flex items-start justify-between p-2 rounded-lg hover:bg-muted/40 transition">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${l.status === "success" ? "bg-green-500" : l.status === "failed" ? "bg-red-500" : "bg-gray-400"}`} />
                <div>
                  <p className="text-sm font-medium">{l.ruleName}</p>
                  <p className="text-xs text-muted-foreground">{l.details}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <Badge className={`text-xs ${STATUS_COLORS[l.status] ?? ""}`}>{l.status}</Badge>
                <p className="text-xs text-muted-foreground mt-1">{new Date(l.triggeredAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {logs?.length === 0 && <p className="text-sm text-center text-muted-foreground py-6">No automation runs yet</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────
function RulesTab() {
  const qc = useQueryClient();
  const { data: rules } = useQuery({ queryKey: ["automations", "rules"], queryFn: () => api.get<any[]>("/automations/rules") });
  const toggleRule = useMutation({ mutationFn: ({ id, isActive }: any) => api.put(`/automations/rules/${id}/toggle`, { isActive }), onSuccess: () => qc.invalidateQueries({ queryKey: ["automations", "rules"] }) });
  const deleteRule = useMutation({ mutationFn: ({ id }: any) => api.delete(`/automations/rules/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["automations", "rules"] }) });
  const manualTrigger = useMutation({ mutationFn: ({ ruleId }: any) => api.post(`/automations/rules/${ruleId}/trigger`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["automations", "logs"] }) });
  const [showCreate, setShowCreate] = useState(false);
  const [editRule, setEditRule] = useState<any | null>(null);

  const handleToggle = async (id: string, current: boolean) => {
    await toggleRule.mutateAsync({ id, isActive: !current });
    toast.success(`Rule ${!current ? "enabled" : "disabled"}`);
  };

  const handleDelete = async (id: string) => {
    await deleteRule.mutateAsync({ id });
    toast.success("Rule deleted");
  };

  const handleTrigger = async (id: string) => {
    await manualTrigger.mutateAsync({ ruleId: id });
    toast.success("Rule triggered manually");
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)} className="cursor-pointer">
          <Plus size={15} className="mr-2" />New Rule
        </Button>
      </div>

      {!rules ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule: any) => (
            <Card key={rule._id} className={`transition-all ${!rule.isActive ? "opacity-60" : ""}`}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm truncate">{rule.name}</p>
                      <Badge className={`text-xs shrink-0 ${rule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {rule.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    {rule.description && <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                        <Filter size={10} />
                        {rule.trigger.module} · {rule.trigger.event.replace(/_/g, " ")}
                      </span>
                      {rule.actions.map((a: any, i: number) => (
                        <span key={i} className="flex items-center gap-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                          <Bell size={10} />{a.type.replace(/_/g, " ")}
                        </span>
                      ))}
                      {rule.runCount > 0 && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Activity size={10} /> Ran {rule.runCount}×
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={rule.isActive} onCheckedChange={() => handleToggle(rule._id, rule.isActive)} className="cursor-pointer" />
                    <Button variant="ghost" size="sm" onClick={() => handleTrigger(rule._id)} className="cursor-pointer h-8 w-8 p-0" title="Test run">
                      <Play size={13} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditRule(rule)} className="cursor-pointer h-8 w-8 p-0">
                      <Settings size={13} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(rule._id)} className="cursor-pointer h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {rules.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Zap size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium mb-1">No automation rules yet</p>
              <p className="text-xs">Create a rule or use a preset to get started</p>
            </div>
          )}
        </div>
      )}

      {(showCreate || editRule) && (
        <RuleFormDialog
          existing={editRule}
          onClose={() => { setShowCreate(false); setEditRule(null); }}
        />
      )}
    </div>
  );
}

// ─── Rule Form Dialog ─────────────────────────────────────────────────────────
type ActionForm = { type: string; config: Record<string, string> };
type ConditionForm = { field: string; operator: string; value: string };

function RuleFormDialog({
  existing,
  onClose,
  prefill,
}: {
  existing?: any | null;
  onClose: () => void;
  prefill?: Partial<{ name: string; description: string; trigger: { module: string; event: string }; actions: ActionForm[] }>;
}) {
  const qc = useQueryClient();
  const createRule = useMutation({ mutationFn: (d: any) => api.post("/automations/rules", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["automations", "rules"] }) });
  const updateRule = useMutation({ mutationFn: ({ id, ...d }: any) => api.put(`/automations/rules/${id}`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["automations", "rules"] }) });

  const [name, setName] = useState(existing?.name ?? prefill?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? prefill?.description ?? "");
  const [module_, setModule] = useState(existing?.trigger.module ?? prefill?.trigger?.module ?? "sales");
  const [event, setEvent] = useState(existing?.trigger.event ?? prefill?.trigger?.event ?? "");
  const [conditions, setConditions] = useState<ConditionForm[]>(existing?.trigger.conditions ?? []);
  const [actions, setActions] = useState<ActionForm[]>(
    existing?.actions.map((a: any) => ({ type: a.type, config: { ...a.config } })) ??
    prefill?.actions ??
    [{ type: "notify", config: { title: "", message: "", notificationType: "info" } }]
  );

  const moduleEvents = MODULE_EVENTS[module_] ?? [];

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Rule name required"); return; }
    if (!event) { toast.error("Select a trigger event"); return; }
    const payload = {
      name,
      description: description || undefined,
      trigger: { module: module_, event, conditions: conditions.length > 0 ? conditions : undefined },
      actions,
    };
    if (existing) {
      await updateRule.mutateAsync({ id: existing._id, ...payload });
      toast.success("Rule updated");
    } else {
      await createRule.mutateAsync(payload);
      toast.success("Rule created");
    }
    onClose();
  };

  const addCondition = () => setConditions([...conditions, { field: "", operator: "eq", value: "" }]);
  const removeCondition = (i: number) => setConditions(conditions.filter((_, idx) => idx !== i));
  const updateCondition = (i: number, key: keyof ConditionForm, val: string) => {
    const updated = [...conditions];
    updated[i] = { ...updated[i], [key]: val };
    setConditions(updated);
  };

  const addAction = () => setActions([...actions, { type: "notify", config: { title: "", message: "", notificationType: "info" } }]);
  const removeAction = (i: number) => setActions(actions.filter((_, idx) => idx !== i));
  const updateActionType = (i: number, type: string) => {
    const updated = [...actions];
    updated[i] = { type, config: { title: "", message: "", notificationType: "info" } };
    setActions(updated);
  };
  const updateActionConfig = (i: number, key: string, val: string) => {
    const updated = [...actions];
    updated[i] = { ...updated[i], config: { ...updated[i].config, [key]: val } };
    setActions(updated);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap size={16} />{existing ? "Edit Rule" : "New Automation Rule"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Rule Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Low Stock Alert" /></div>
            <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this rule does" /></div>
          </div>

          {/* Trigger */}
          <div className="space-y-3 border rounded-lg p-4">
            <p className="text-sm font-semibold flex items-center gap-1 text-blue-600"><Filter size={13} />Trigger — When this happens</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Module</Label>
                <Select value={module_} onValueChange={(v) => { setModule(v); setEvent(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODULES.map((m) => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Event</Label>
                <Select value={event} onValueChange={setEvent}>
                  <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                  <SelectContent>{moduleEvents.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">Conditions (optional)</Label>
                <Button variant="ghost" size="sm" onClick={addCondition} className="cursor-pointer h-6 text-xs"><Plus size={11} className="mr-1" />Add</Button>
              </div>
              {conditions.map((cond, i) => (
                <div key={i} className="flex gap-2 items-center mb-2">
                  <Input className="flex-1" value={cond.field} onChange={(e) => updateCondition(i, "field", e.target.value)} placeholder="field (e.g. quantity)" />
                  <Select value={cond.operator} onValueChange={(v) => updateCondition(i, "operator", v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{OPERATORS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="flex-1" value={cond.value} onChange={(e) => updateCondition(i, "value", e.target.value)} placeholder="value" />
                  <Button variant="ghost" size="sm" onClick={() => removeCondition(i)} className="cursor-pointer h-8 w-8 p-0 text-muted-foreground hover:text-destructive">×</Button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-1 text-purple-600"><Bell size={13} />Actions — Then do this</p>
              <Button variant="ghost" size="sm" onClick={addAction} className="cursor-pointer h-7 text-xs"><Plus size={11} className="mr-1" />Add Action</Button>
            </div>
            {actions.map((action, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Select value={action.type} onValueChange={(v) => updateActionType(i, v)}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{ACTION_TYPES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {actions.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeAction(i)} className="cursor-pointer h-8 w-8 p-0 text-muted-foreground hover:text-destructive">×</Button>
                  )}
                </div>
                {action.type === "notify" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Title</Label><Input value={action.config.title ?? ""} onChange={(e) => updateActionConfig(i, "title", e.target.value)} placeholder="Notification title" /></div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select value={action.config.notificationType ?? "info"} onValueChange={(v) => updateActionConfig(i, "notificationType", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="success">Success</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label className="text-xs">Message</Label><Textarea value={action.config.message ?? ""} onChange={(e) => updateActionConfig(i, "message", e.target.value)} placeholder="Notification message body" rows={2} /></div>
                  </div>
                )}
                {action.type === "send_email" && (
                  <div className="space-y-2">
                    <div><Label className="text-xs">Recipient Email</Label><Input value={action.config.email ?? ""} onChange={(e) => updateActionConfig(i, "email", e.target.value)} placeholder="example@gmail.com" /></div>
                    <div><Label className="text-xs">Subject</Label><Input value={action.config.subject ?? ""} onChange={(e) => updateActionConfig(i, "subject", e.target.value)} placeholder="Email subject" /></div>
                  </div>
                )}
                {action.type === "create_task" && (
                  <div className="space-y-2">
                    <div><Label className="text-xs">Task Title</Label><Input value={action.config.taskTitle ?? ""} onChange={(e) => updateActionConfig(i, "taskTitle", e.target.value)} placeholder="Follow-up task title" /></div>
                    <div><Label className="text-xs">Due in (days)</Label><Input type="number" value={action.config.dueDays ?? "1"} onChange={(e) => updateActionConfig(i, "dueDays", e.target.value)} /></div>
                  </div>
                )}
                {action.type === "update_field" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Field</Label><Input value={action.config.field ?? ""} onChange={(e) => updateActionConfig(i, "field", e.target.value)} placeholder="e.g. status" /></div>
                    <div><Label className="text-xs">New Value</Label><Input value={action.config.newValue ?? ""} onChange={(e) => updateActionConfig(i, "newValue", e.target.value)} placeholder="e.g. closed" /></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button onClick={handleSave} className="w-full cursor-pointer">
            <Zap size={14} className="mr-2" />{existing ? "Save Changes" : "Create Rule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────
function LogsTab() {
  const { data: logs } = useQuery({ queryKey: ["automations", "logs"], queryFn: () => api.get<any[]>("/automations/logs") });

  return (
    <div className="space-y-4 mt-4">
      {!logs ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{logs.length} log entries</p>
          <div className="space-y-2">
            {logs.map((l: any) => (
              <div key={l._id} className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/30 transition">
                <div className="flex items-start gap-3">
                  {l.status === "success" ? <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                    : l.status === "failed" ? <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      : <AlertCircle size={16} className="text-gray-400 mt-0.5 shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">{l.ruleName}</p>
                    <p className="text-xs text-muted-foreground">{l.details}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <Badge className={`text-xs ${STATUS_COLORS[l.status] ?? ""}`}>{l.status}</Badge>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(l.triggeredAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 size={36} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No automation runs yet</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Presets Tab ──────────────────────────────────────────────────────────────
function PresetsTab() {
  const qc = useQueryClient();
  const createRule = useMutation({ mutationFn: (d: any) => api.post("/automations/rules", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["automations", "rules"] }) });

  const handleInstall = async (preset: typeof PRESET_RULES[number]) => {
    await createRule.mutateAsync({
      name: preset.name,
      description: preset.description,
      trigger: preset.trigger,
      actions: preset.actions,
    });
    toast.success(`"${preset.name}" installed`);
  };

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-muted-foreground">Click "Install" to add a preset rule to your automation library. You can customize it afterwards.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRESET_RULES.map((p) => (
          <Card key={p.name} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                </div>
                <Button size="sm" onClick={() => handleInstall(p)} className="cursor-pointer shrink-0">
                  <RefreshCw size={12} className="mr-1" />Install
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs mt-2">
                <span className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  {p.trigger.module} · {p.trigger.event.replace(/_/g, " ")}
                </span>
                {p.actions.map((a, i) => (
                  <span key={i} className="bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                    {a.type.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
