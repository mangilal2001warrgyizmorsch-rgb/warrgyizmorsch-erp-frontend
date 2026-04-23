"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus, Search, User, Phone, Mail, Building2, TrendingUp, Activity,
  Calendar, CheckCircle2, Clock, AlertCircle, RefreshCw, Download,
  MessageSquare, PhoneCall, Users, BarChart3, IndentIncrease, FileText,
  X, ShoppingCart, Smartphone, Send, List, LayoutGrid, Upload,
  FileSpreadsheet, CloudUpload, Link,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  qualified: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"];

export default function CRMPage() {
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
        <h1 className="text-2xl font-bold">CRM</h1>
        <p className="text-sm text-muted-foreground">Leads, Pipeline & IndiaMART Integration</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="dashboard" className="cursor-pointer">Dashboard</TabsTrigger>
          <TabsTrigger value="leads" className="cursor-pointer">Leads</TabsTrigger>
          <TabsTrigger value="indiaMart" className="cursor-pointer">IndiaMART</TabsTrigger>
          <TabsTrigger value="followups" className="cursor-pointer">Follow-ups</TabsTrigger>
          <TabsTrigger value="customers" className="cursor-pointer">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="leads"><LeadsTab /></TabsContent>
        <TabsContent value="indiaMart"><IndiaMARTTab /></TabsContent>
        <TabsContent value="followups"><FollowUpsTab /></TabsContent>
        <TabsContent value="customers"><CustomersTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["crm", "stats"],
    queryFn: () => api.get<any>("/crm/stats"),
  });

  const { data: followUps } = useQuery({
    queryKey: ["crm", "follow-ups", "pending"],
    queryFn: () => api.get<any[]>("/crm/follow-ups?status=pending"),
  });

  if (isLoading || !stats) {
    return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
    </div>;
  }

  const kpis = [
    { label: "Total Leads", value: stats.total, icon: <Users size={18} />, color: "text-blue-500" },
    { label: "Converted", value: stats.converted, icon: <CheckCircle2 size={18} />, color: "text-green-500" },
    { label: "Pipeline Value", value: `₹${(stats.totalValue / 1000).toFixed(0)}K`, icon: <TrendingUp size={18} />, color: "text-purple-500" },
    { label: "IndiaMART Leads", value: stats.indiamart, icon: <Download size={18} />, color: "text-orange-500" },
    { label: "Pending Follow-ups", value: stats.pendingFollowUps, icon: <Clock size={18} />, color: "text-red-500" },
    { label: "Conversion Rate", value: stats.total ? `${((stats.converted / stats.total) * 100).toFixed(1)}%` : "0%", icon: <BarChart3 size={18} />, color: "text-teal-500" },
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

      <PipelineFunnel />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Upcoming Follow-ups</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!followUps ? <Skeleton className="h-20 w-full" /> :
            followUps.slice(0, 5).map((f) => (
              <div key={f._id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground">Due: {f.dueDate}</p>
                </div>
                <Badge className={cn("text-xs opacity-80", PRIORITY_COLORS[f.priority])}>{f.priority}</Badge>
              </div>
            ))
          }
          {followUps?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No pending follow-ups</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function PipelineFunnel() {
  const { data: leads } = useQuery({
    queryKey: ["crm", "leads"],
    queryFn: () => api.get<any[]>("/crm/leads"),
  });

  if (!leads) return <Skeleton className="h-48 w-full mt-4" />;

  const counts = LEAD_STATUSES.map((s) => ({ status: s, count: leads.filter((l) => l.status === s).length }));
  const max = Math.max(...counts.map((c) => c.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Pipeline Funnel</CardTitle></CardHeader>
      <CardContent className="space-y-3 pt-2">
        {counts.map(({ status, count }) => (
          <div key={status} className="flex items-center gap-3">
            <span className="w-20 text-xs text-muted-foreground capitalize text-right">{status}</span>
            <div className="flex-1 bg-muted rounded-full h-4 relative overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60 transition-all duration-500"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 text-xs font-semibold text-right">{count}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LeadsTab() {
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<string | undefined>(undefined);
  const [showNewLead, setShowNewLead] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [showImport, setShowImport] = useState(false);

  const qc = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["crm", "leads", activeStatus],
    queryFn: () => api.get<any[]>(`/crm/leads${activeStatus ? `?status=${activeStatus}` : ""}`),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post("/crm/leads/import", formData);
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["crm"] });
      toast.success(res.message || "Import successful");
    },
    onError: (err: any) => toast.error(err.message || "Import failed"),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      e.target.value = ""; // Reset
    }
  };

  const createLead = useMutation({
    mutationFn: (data: any) => api.post("/crm/leads", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Lead created");
      setShowNewLead(false);
    },
  });

  const filtered = leads?.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (l.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "", source: "direct",
    value: "", address: "", city: "", state: "", productInterest: "",
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2 flex-wrap">
        {["all", ...LEAD_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setActiveStatus(s === "all" ? undefined : s)}
            className={cn(
              "cursor-pointer px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all",
              (s === "all" && !activeStatus) || activeStatus === s
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search leads..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center border rounded-lg p-1 bg-muted/30">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-sm"
              onClick={() => setViewMode("table")}
            >
              <List size={14} />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-sm"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid size={14} />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="h-9 cursor-pointer" onClick={() => setShowImport(true)}>
            <Upload size={16} className="mr-2" /> Import
          </Button>
          <Button onClick={() => setShowNewLead(true)} size="sm" className="h-9 cursor-pointer">
            <Plus size={16} className="mr-2" /> New Lead
          </Button>
        </div>
      </div>

      <ImportLeadsDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImport={(file) => importMutation.mutate(file)}
        isPending={importMutation.isPending}
      />

      {isLoading ? (
        <div className={cn(viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-2")}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className={cn(viewMode === "grid" ? "h-40" : "h-12 w-full")} />)}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(filtered ?? []).map((lead, index) => (
            <Card key={lead._id ?? lead.email ?? index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedLeadId(lead._id)}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{lead.name}</p>
                      {lead.company && <p className="text-xs text-muted-foreground truncate">{lead.company}</p>}
                    </div>
                  </div>
                  <Badge className={cn("text-[10px] h-5 px-1.5 shrink-0", STATUS_COLORS[lead.status])}>{lead.status}</Badge>
                </div>
                <div className="space-y-1 mt-3">
                  {lead.email && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail size={11} className="shrink-0" />{lead.email}</p>}
                  {lead.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={11} className="shrink-0" />{lead.phone}</p>}
                  {lead.value && <p className="text-xs font-bold flex items-center gap-1 text-emerald-600 mt-1"><TrendingUp size={11} />₹{lead.value.toLocaleString()}</p>}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="outline" className={cn("text-[9px] h-4 uppercase font-bold", lead.source === "indiaMart" ? "border-orange-500 text-orange-500" : "")}>{lead.source}</Badge>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {lead.phone && <QuickSendButton type="whatsapp" to={lead.phone} name={lead.name} leadId={lead._id} />}
                    {lead.email && <QuickSendButton type="email" to={lead.email} name={lead.name} leadId={lead._id} />}
                    {lead.phone && <QuickSendButton type="sms" to={lead.phone} name={lead.name} leadId={lead._id} />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(filtered ?? []).map((lead) => (
                <TableRow key={lead._id} className="cursor-pointer" onClick={() => setSelectedLeadId(lead._id)}>
                  <TableCell>
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-[10px] text-muted-foreground">{lead.city || lead.state || ""}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs flex flex-col gap-0.5">
                      {lead.email && <div className="flex items-center gap-1"><Mail size={10} /> {lead.email}</div>}
                      {lead.phone && <div className="flex items-center gap-1"><Phone size={10} /> {lead.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 size={10} /> {lead.company || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[9px] uppercase font-bold", lead.source === "indiaMart" ? "border-orange-500 text-orange-500" : "")}>
                      {lead.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-emerald-600">
                    ₹{lead.value?.toLocaleString() || "0"}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("text-[9px] h-5 px-1.5", STATUS_COLORS[lead.status])}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      {lead.phone && <QuickSendButton type="whatsapp" to={lead.phone} name={lead.name} leadId={lead._id} />}
                      {lead.email && <QuickSendButton type="email" to={lead.email} name={lead.name} leadId={lead._id} />}
                      {lead.phone && <QuickSendButton type="sms" to={lead.phone} name={lead.name} leadId={lead._id} />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(filtered ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No leads found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* New Lead Dialog */}
      <Dialog open={showNewLead} onOpenChange={setShowNewLead}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" /></div>
              <div className="space-y-1"><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@gmail.com" /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
            </div>
            <div className="space-y-1"><Label>Product Interest</Label><Input value={form.productInterest} onChange={(e) => setForm({ ...form, productInterest: e.target.value })} placeholder="e.g. Steel Pipes, Valves" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Mumbai" /></div>
              <div className="space-y-1"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Maharashtra" /></div>
              <div className="space-y-1">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["direct", "indiaMart", "referral", "website", "exhibition"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Est. Value (₹)</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="50000" /></div>
            <Button onClick={() => { if (!form.name) return; createLead.mutate({ ...form, value: form.value ? parseFloat(form.value) : undefined }); }} className="w-full cursor-pointer h-10">Create Lead</Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedLeadId && (
        <LeadDetailDialog leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
      )}
    </div>
  );
}

function ImportLeadsDialog({ open, onOpenChange, onImport, isPending }: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => void;
  isPending: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const requiredColumns = ["name", "email", "phone", "company", "source", "value", "status", "city", "country", "notes"];

  const handleDownloadTemplate = () => {
    const csvContent = requiredColumns.join(",") + "\n" + 
      "John Doe,john@example.com,+919999988888,Acme Corp,direct,50000,new,Mumbai,India,Follow up soon";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (file: File) => {
    if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      setSelectedFile(file);
    } else {
      toast.error("Please upload a CSV or Excel file");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = () => {
    if (selectedFile) {
      onImport(selectedFile);
      setSelectedFile(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSelectedFile(null); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-primary" size={18} />
            <DialogTitle className="text-base font-bold">Import Leads</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {!selectedFile ? (
            <>
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">1. Download Template</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[10px] gap-1.5 rounded-full cursor-pointer"
                    onClick={handleDownloadTemplate}
                  >
                    <Download size={12} /> Template
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {requiredColumns.map(col => (
                    <Badge key={col} variant="secondary" className="text-[9px] font-mono font-normal px-1.5 py-0">
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">2. Upload File</h3>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('import-file-input')?.click()}
                  className={cn(
                    "relative cursor-pointer border border-dashed rounded-xl transition-all flex flex-col items-center justify-center p-8 gap-3 bg-muted/20",
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    isDragging ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    <CloudUpload size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">Drop Excel or CSV here</p>
                    <p className="text-[10px] text-muted-foreground">or click to browse local files</p>
                  </div>
                  <input 
                    id="import-file-input"
                    type="file" 
                    className="hidden" 
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl border bg-primary/5 border-primary/20">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{(selectedFile.size / 1024).toFixed(1)} KB · Ready to import</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedFile(null)}>
                  <X size={14} />
                </Button>
              </div>

              <Button onClick={handleImport} className="w-full h-10 font-bold tracking-wide" disabled={isPending}>
                {isPending ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Upload className="mr-2" size={16} />}
                Import Leads from File
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LeadDetailDialog({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const { data: lead } = useQuery({ queryKey: ["crm", "leads", leadId], queryFn: () => api.get<any>(`/crm/leads/${leadId}`) });
  const { data: activities } = useQuery({ queryKey: ["crm", "leads", leadId, "activities"], queryFn: () => api.get<any[]>(`/crm/leads/${leadId}/activities`) });
  const { data: followUps } = useQuery({ queryKey: ["crm", "follow-ups", { leadId }], queryFn: () => api.get<any[]>(`/crm/follow-ups?leadId=${leadId}`) });

  const qc = useQueryClient();
  const updateLead = useMutation({
    mutationFn: (data: any) => api.put(`/crm/leads/${leadId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm"] }); toast.success("Updated"); }
  });

  const addActivity = useMutation({
    mutationFn: (data: any) => api.post(`/crm/leads/${leadId}/activities`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm"] }); toast.success("Activity logged"); setActForm({ type: "call", description: "", outcome: "", nextFollowUp: "" }); }
  });

  const [actForm, setActForm] = useState({ type: "call", description: "", outcome: "", nextFollowUp: "" });

  if (!lead) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User size={20} className="text-primary" /></div>
            <div className="text-left">
              <DialogTitle className="text-lg">{lead.name}</DialogTitle>
              <p className="text-xs text-muted-foreground">{lead.company}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-2 gap-4 text-xs bg-muted/30 p-4 rounded-xl">
            <p><span className="text-muted-foreground mr-1">Email:</span> {lead.email || "—"}</p>
            <p><span className="text-muted-foreground mr-1">Phone:</span> {lead.phone || "—"}</p>
            <p><span className="text-muted-foreground mr-1">Value:</span> <span className="text-emerald-600 font-bold">₹{lead.value?.toLocaleString() || "0"}</span></p>
            <p><span className="text-muted-foreground mr-1">Source:</span> <Badge variant="outline" className="text-[9px] h-4 uppercase">{lead.source}</Badge></p>
          </div>

          <div className="flex items-center gap-3">
            <Label className="text-xs font-bold uppercase w-16">Stage</Label>
            <Select value={lead.status} onValueChange={(v) => updateLead.mutate({ status: v })}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-2 flex flex-row items-center gap-2"><Activity size={14} className="text-primary"/><CardTitle className="text-xs font-bold uppercase">Log Interaction</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
                  <Select value={actForm.type} onValueChange={(v) => setActForm({ ...actForm, type: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["call", "email", "meeting", "whatsapp", "note"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Follow-up Date</Label>
                  <Input type="date" className="h-8 text-xs" value={actForm.nextFollowUp} onChange={(e) => setActForm({ ...actForm, nextFollowUp: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Activity Description</Label>
                <Textarea placeholder="What was discussed?" className="text-xs min-h-[60px]" value={actForm.description} onChange={(e) => setActForm({ ...actForm, description: e.target.value })} />
              </div>
              <Button onClick={() => { if (!actForm.description) return; addActivity.mutate(actForm); }} size="sm" className="w-full h-8 text-xs">Log Interaction</Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5"><Activity size={12}/> Activity History</h3>
            <div className="space-y-3">
              {activities?.map((a: any) => (
                <div key={a._id} className="flex gap-3 p-3 rounded-lg bg-muted/20 border border-border/10">
                  <div className="w-6 h-6 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                    {a.type === "call" ? <Phone size={12} className="text-blue-500"/> : a.type === "email" ? <Mail size={12} className="text-purple-500"/> : <MessageSquare size={12} className="text-green-500"/>}
                  </div>
                  <div>
                    <p className="text-xs font-medium">{a.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(a.createdAt).toLocaleString()} · <span className="capitalize">{a.type}</span></p>
                  </div>
                </div>
              ))}
              {(!activities || activities.length === 0) && <p className="text-xs text-muted-foreground text-center py-4 italic">No activity logged yet.</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IndiaMARTTab() {
  const qc = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  // Get current IndiaMART settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["crm", "indiamart", "settings"],
    queryFn: () => api.get<any>("/crm/indiamart/settings"),
  });

  // Get IndiaMART leads
  const { data: leads } = useQuery({
    queryKey: ["crm", "leads", "indiaMart"],
    queryFn: () => api.get<any[]>("/crm/leads?source=indiaMart")
  });

  // Connect API key mutation
  const connectMutation = useMutation({
    mutationFn: (key: string) => api.post("/crm/indiamart/connect", { apiKey: key }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "indiamart"] });
      toast.success("IndiaMART connected successfully!");
      setShowConnectDialog(false);
      setApiKey("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to connect")
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => api.post("/crm/indiamart/disconnect"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "indiamart"] });
      toast.success("IndiaMART disconnected");
    },
    onError: (err: any) => toast.error(err.message || "Failed to disconnect")
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: () => api.post("/crm/indiamart/sync"),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["crm"] });
      toast.success(res.message || `Synced ${res.imported} new leads`);
    },
    onError: (err: any) => toast.error(err.message || "Sync failed")
  });

  const handleConnect = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your IndiaMART API key");
      return;
    }
    connectMutation.mutate(apiKey.trim());
  };

  const handleDisconnect = () => {
    if (confirm("Are you sure you want to disconnect IndiaMART? This will stop automatic lead syncing.")) {
      disconnectMutation.mutate();
    }
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Connection Status Card */}
      <Card className={cn("border shadow-sm", settings?.isConnected ? "border-green-500/20 bg-green-500/[0.02]" : "border-orange-500/20 bg-orange-500/[0.02]")}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 font-bold">
            <Download size={18} className={settings?.isConnected ? "text-green-500" : "text-orange-500"}/>
            IndiaMART Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsLoading ? (
            <Skeleton className="h-20" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Status: <Badge className={settings?.isConnected ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}>
                      {settings?.isConnected ? "Connected" : "Not Connected"}
                    </Badge>
                  </p>
                  {settings?.lastFetchedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last sync: {new Date(settings.lastFetchedAt).toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Total leads imported: {settings?.totalLeads || 0}
                  </p>
                </div>
                <div className="flex gap-2">
                  {settings?.isConnected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncMutation.mutate()}
                        disabled={syncMutation.isPending}
                        className="cursor-pointer"
                      >
                        <RefreshCw size={14} className={cn("mr-2", syncMutation.isPending && "animate-spin")} />
                        Sync Now
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnect}
                        disabled={disconnectMutation.isPending}
                        className="cursor-pointer text-red-600 hover:text-red-700"
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setShowConnectDialog(true)}
                      className="cursor-pointer bg-orange-600 hover:bg-orange-700"
                    >
                      <Download size={14} className="mr-2" />
                      Connect IndiaMART
                    </Button>
                  )}
                </div>
              </div>

              {settings?.isConnected && (
                <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 border border-dashed">
                  <p className="font-semibold text-foreground mb-1">🔄 Automatic Sync Active</p>
                  Leads are automatically fetched every 10 minutes. You can also manually sync using the "Sync Now" button above.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      {!settings?.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
              <p><strong>1.</strong> Login to your IndiaMART Seller Panel</p>
              <p><strong>2.</strong> Go to Settings → API Integration</p>
              <p><strong>3.</strong> Generate your CRM API Key</p>
              <p><strong>4.</strong> Copy and paste the key above to connect</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>🔒 Secure:</strong> Your API key is encrypted and stored securely. It&apos;s only used to fetch leads from IndiaMART.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Imported Leads */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase">
            Imported IndiaMART Leads ({leads?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
          {leads?.map((l: any, index: number) => (
            <div key={l._id ?? l.externalId ?? index} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/10 transition">
              <div>
                <p className="text-sm font-medium">{l.name}</p>
                <p className="text-xs text-muted-foreground">{l.company} · {l.phone}</p>
                {l.externalId && <p className="text-xs text-muted-foreground">ID: {l.externalId}</p>}
              </div>
              <Badge className={cn("text-[10px] font-bold uppercase tracking-tight", STATUS_COLORS[l.status])}>
                {l.status}
              </Badge>
            </div>
          ))}
          {(!leads || leads.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-8">
              {settings?.isConnected ? "No leads synced yet. Click 'Sync Now' to fetch recent leads." : "Connect your IndiaMART account to start importing leads."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect IndiaMART</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>IndiaMART CRM API Key</Label>
              <Input
                placeholder="Paste your API key here..."
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get this from your IndiaMART Seller Panel → Settings → API Integration
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleConnect}
                disabled={connectMutation.isPending || !apiKey.trim()}
                className="flex-1 cursor-pointer"
              >
                {connectMutation.isPending ? "Connecting..." : "Connect"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowConnectDialog(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FollowUpsTab() {
  const { data: followUps, isLoading } = useQuery({ queryKey: ["crm", "follow-ups"], queryFn: () => api.get<any[]>("/crm/follow-ups") });
  const qc = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/crm/follow-ups/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm"] }); toast.success("Task updated"); }
  });

  return (
    <div className="space-y-4 mt-4">
      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <div className="space-y-3">
          {followUps?.map((f: any) => (
            <div key={f._id} className="flex items-center justify-between p-4 rounded-xl border border-border/60 hover:border-primary/30 transition-all bg-card/50">
              <div className="flex items-center gap-3">
                <div className={cn("w-2 h-2 rounded-full", f.status === "done" ? "bg-green-500" : "bg-amber-500")} />
                <div>
                  <p className={cn("text-sm font-semibold", f.status === "done" && "line-through text-muted-foreground")}>{f.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar size={12}/> Due: {f.dueDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={cn("text-[10px] font-bold uppercase h-5", PRIORITY_COLORS[f.priority])}>{f.priority}</Badge>
                {f.status === "pending" && <Button onClick={() => updateStatus.mutate({ id: f._id, status: "done" })} size="sm" variant="outline" className="h-7 text-[10px] font-bold uppercase cursor-pointer">Mark Done</Button>}
              </div>
            </div>
          ))}
          {(!followUps || followUps.length === 0) && (
            <div className="text-center py-16 opacity-30">
              <Clock size={40} className="mx-auto mb-2" />
              <p className="text-sm">No pending follow-ups</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CustomersTab() {
  const { data: customers, isLoading } = useQuery({ queryKey: ["crm", "customers"], queryFn: () => api.get<any[]>("/crm/customers") });
  const [search, setSearch] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gstin: "",
    city: "",
    state: "",
    segment: "retail",
    paymentTerms: "net30",
    creditLimit: "",
  });

  const qc = useQueryClient();
  const createCustomer = useMutation({
    mutationFn: (data: any) => api.post("/crm/customers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm", "customers"] });
      toast.success("Customer added");
      setShowNewCustomer(false);
      setForm({ name: "", email: "", phone: "", gstin: "", city: "", state: "", segment: "retail", paymentTerms: "net30", creditLimit: "" });
    },
  });

  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const segmentColors: Record<string, string> = {
    enterprise: "bg-purple-100 text-purple-700 border-purple-200",
    sme: "bg-blue-100 text-blue-700 border-blue-200",
    retail: "bg-green-100 text-green-700 border-green-200",
    distributor: "bg-amber-100 text-amber-700 border-amber-200",
    government: "bg-red-100 text-red-700 border-red-200",
  };

  const filtered = customers?.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm h-9">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
          <DialogTrigger asChild>
            <Button className="h-9 w-full sm:w-auto">New Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Company name" className="h-8" /></div>
                <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@company.com" className="h-8" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98xxxx xxxx" className="h-8" /></div>
                <div className="space-y-1"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder="22AAAAA0000A1Z5" className="h-8" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Credit Limit</Label><Input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} placeholder="100000" className="h-8" /></div>
                <div className="space-y-1"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Mumbai" className="h-8" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="Maharashtra" className="h-8" /></div>
                <div className="space-y-1">
                  <Label>Payment Terms</Label>
                  <Select value={form.paymentTerms} onValueChange={(v) => setForm({ ...form, paymentTerms: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['immediate', 'net15', 'net30', 'net60'].map((term) => (
                        <SelectItem key={term} value={term}>{term}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Segment</Label>
                <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v })}>
                  <SelectTrigger className="h-8"><SelectValue placeholder="Select..."/></SelectTrigger>
                  <SelectContent>
                    {['enterprise', 'sme', 'retail', 'distributor', 'government'].map((segment) => (
                      <SelectItem key={segment} value={segment} className="capitalize">{segment}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="ghost" className="h-8" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
                <Button className="h-8" onClick={() => {
                  if (!form.name) {
                    toast.error("Customer name required");
                    return;
                  }
                  createCustomer.mutate({
                    name: form.name,
                    email: form.email || undefined,
                    phone: form.phone || undefined,
                    gstin: form.gstin || undefined,
                    city: form.city || undefined,
                    state: form.state || undefined,
                    segment: form.segment || undefined,
                    paymentTerms: form.paymentTerms || undefined,
                    creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
                  });
                }}>Create Customer</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 border rounded-xl overflow-hidden shadow-sm bg-card flex flex-col h-[600px]">
          <div className="px-4 py-3 border-b bg-muted/20 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Directory ({filtered?.length || 0})</span>
          </div>
          {!customers ? (
            <div className="flex-1 p-4"><Skeleton className="h-full w-full opacity-50" /></div>
          ) : (
            <div className="divide-y divide-border/50 overflow-y-auto flex-1">
              {filtered?.map((c: any) => (
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

        <div className="lg:col-span-7 h-full">
          {selectedCustomer ? (() => {
            const customerDetail = customers?.find((c: any) => c._id === selectedCustomer);
            if (!customerDetail) return null;
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
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2"><ShoppingCart size={12}/> Recent Activity</h3>
                    <div className="space-y-2">
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

// ─── Quick Send Button ────────────────────────────────────────────────────────
function QuickSendButton({ type, to, name, leadId }: { type: "whatsapp" | "email" | "sms", to: string, name: string, leadId: string }) {
  const [open, setOpen] = useState(false);
  
  const getIcon = () => {
    switch (type) {
      case "whatsapp": return <MessageSquare size={12} />;
      case "email": return <Mail size={12} />;
      case "sms": return <Smartphone size={12} />;
    }
  };

  const getColor = () => {
    switch (type) {
      case "whatsapp": return "text-green-600 bg-green-50 hover:bg-green-100 border-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 dark:border-green-800";
      case "email": return "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:border-blue-800";
      case "sms": return "text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 dark:border-purple-800";
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn("p-1.5 rounded-md border flex items-center justify-center transition-colors shadow-sm cursor-pointer", getColor())}
        title={`Send ${type}`}
      >
        {getIcon()}
      </button>
      {open && <SendMessageDialog type={type} to={to} name={name} leadId={leadId} onClose={() => setOpen(false)} />}
    </>
  );
}

// ─── Send Message Dialog ──────────────────────────────────────────────────────
function SendMessageDialog({ type, to, name, leadId, onClose }: { type: "whatsapp" | "email" | "sms", to: string, name: string, leadId: string, onClose: () => void }) {
  const qc = useQueryClient();
  const [subject, setSubject] = useState(`Following up – ${name}`);
  const [message, setMessage] = useState(
    type === "email" 
      ? `Dear ${name},\n\nThank you for your interest. We would like to follow up regarding your enquiry.\n\nPlease let us know a convenient time to connect.\n\nRegards`
      : `Hi ${name}, thanks for your interest. How can we assist you?`
  );

  const sendMutation = useMutation({
    mutationFn: (data: any) => api.post("/crm/send-message", data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["crm"] });
      toast.success(res.message);
      onClose();
    },
    onError: (err: any) => toast.error(err.message || "Failed to send")
  });

  const handleSend = () => {
    sendMutation.mutate({ type, to, name, leadId, message, subject });
  };

  const titles = { whatsapp: "Send WhatsApp", email: "Send Email", sms: "Send SMS" };
  const icons = {
    whatsapp: <MessageSquare size={16} className="text-green-600" />,
    email: <Mail size={16} className="text-blue-600" />,
    sms: <Smartphone size={16} className="text-purple-600" />,
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icons[type]} {titles[type]}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">To</Label>
            <div className="p-2 bg-muted/30 rounded border text-xs font-medium">{to} ({name})</div>
          </div>
          
          {type === "email" && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 text-xs" />
            </div>
          )}
          
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Message</Label>
            <Textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              className="min-h-[120px] text-xs leading-relaxed" 
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2 border-t mt-4">
            <Button variant="ghost" size="sm" onClick={onClose} className="cursor-pointer">Cancel</Button>
            <Button 
              onClick={handleSend} 
              disabled={sendMutation.isPending || !message.trim()} 
              size="sm" 
              className={cn(
                "cursor-pointer px-6",
                type === "whatsapp" ? "bg-green-600 hover:bg-green-700" :
                type === "email" ? "bg-blue-600 hover:bg-blue-700" :
                "bg-purple-600 hover:bg-purple-700"
              )}
            >
              {sendMutation.isPending ? <RefreshCw size={14} className="animate-spin mr-2" /> : <Send size={14} className="mr-2" />}
              Send {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
