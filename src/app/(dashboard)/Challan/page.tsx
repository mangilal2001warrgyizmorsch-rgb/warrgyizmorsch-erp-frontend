"use client";

import { useState, useRef } from "react";
import { 
  Upload, Plus, Trash2, ChevronLeft, ChevronRight, 
  RotateCcw, CheckCircle, FileText, Package, Truck, Receipt 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_URL = "https://challan-extractor.onrender.com/extract";

const emptyForm = () => ({
  challan_no: "",
  challan_date: "",
  date: "",
  firm: "",
  party: "",
  party_address: "",
  gstin_no: "",
  quality: "",
  hsn_code: "",
  item: "",
  taka: "",
  meter: "",
  fas_rate: "",
  amount: "",
  dyed_print: "",
  weaver: "",
  pu_bill_no: "",
  lr_no: "",
  lr_date: "",
  transpoter: "",
  remark: "",
  weight: "",
  chadhti: "",
  width: "",
  total: "",
  table: [] as { tn: number; meter: string }[],
});

export default function ChallanPageWrapper() {
  const [tab, setTab] = useState("entry");
  return (
    <div className="p-4 md:p-6 space-y-4 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Mill Challans</h1>
          <p className="text-sm text-muted-foreground">Manage and track delivery challans.</p>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-fit">
          <TabsTrigger value="entry">New Entry</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="entry" className="flex-1 min-h-0 data-[state=active]:flex flex-col mt-4">
          <ChallanEntry />
        </TabsContent>
        <TabsContent value="history" className="flex-1 min-h-0 data-[state=active]:flex flex-col mt-4 overflow-y-auto">
          <ChallanHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChallanEntry() {
  const qc = useQueryClient();
  const [challans, setChallans] = useState([emptyForm()]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- PDF Upload & Extract ---
  const handleFileUpload = async (file: File | null | undefined) => {
    if (!file || file.type !== "application/pdf") {
      toast.error("Please upload a valid PDF file.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(API_URL, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.challans && data.challans.length > 0) {
        const mapped = data.challans.map((c: any) => ({
          challan_no: c.challan_no || "",
          challan_date: formatDate(c.challan_date),
          date: formatDate(c.date),
          firm: c.firm || "",
          party: c.party || "",
          party_address: c.party_address || "",
          gstin_no: c.gstin_no || "",
          quality: c.quality || "",
          hsn_code: c.hsn_code || "",
          item: c.item || "",
          taka: c.taka || "",
          meter: c.meter || "",
          fas_rate: c.fas_rate || "",
          amount: c.amount || "",
          dyed_print: c.dyed_print || "",
          weaver: c.weaver || "",
          pu_bill_no: c.pu_bill_no || "",
          lr_no: c.lr_no || "",
          lr_date: formatDate(c.lr_date),
          transpoter: c.transpoter || "",
          remark: c.remark || "",
          weight: c.weight || "",
          chadhti: c.chadhti || "",
          width: c.width || "",
          total: c.total || "",
          table: c.table || [],
        }));
        setChallans(mapped);
        setCurrent(0);
        setShowPdfModal(false);
        toast.success(`Extracted ${mapped.length} challan(s) successfully!`);
      } else {
        toast.error("No challans found in PDF.");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to extract PDF.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    const parts = d.split("/");
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return d;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  // --- Field update ---
  const updateField = (field: string, value: string) => {
    setChallans((prev) =>
      prev.map((c, i) => (i === current ? { ...c, [field]: value } : c))
    );
  };

  const updateTableRow = (idx: number, value: string) => {
    setChallans((prev) =>
      prev.map((c, i) => {
        if (i !== current) return c;
        const table = [...c.table];
        table[idx] = { ...table[idx], meter: value };
        return { ...c, table };
      })
    );
  };

  const addRow = () => {
    setChallans((prev) =>
      prev.map((c, i) => {
        if (i !== current) return c;
        return {
          ...c,
          table: [...c.table, { tn: c.table.length + 1, meter: "" }],
        };
      })
    );
  };

  const removeRow = (idx: number) => {
    setChallans((prev) =>
      prev.map((c, i) => {
        if (i !== current) return c;
        const table = c.table
          .filter((_, ri) => ri !== idx)
          .map((r, ri) => ({ ...r, tn: ri + 1 }));
        return { ...c, table };
      })
    );
  };

  // --- Slide navigation ---
  const goTo = (n: number) => {
    const idx = Math.max(0, Math.min(challans.length - 1, n));
    setCurrent(idx);
  };

  const addNew = () => {
    setChallans((prev) => [...prev, emptyForm()]);
    setCurrent(challans.length);
  };

  // --- Reset ---
  const handleReset = () => {
    if (confirm("Are you sure you want to reset all data?")) {
      setChallans([emptyForm()]);
      setCurrent(0);
    }
  };

  // --- Submit ---
  const handleSubmit = async () => {
    try {
      setLoading(true);
      await api.post("/challan/batch", { challans });
      qc.invalidateQueries({ queryKey: ["challan"] });
      toast.success(`Successfully submitted ${challans.length} challan(s)!`);
      setChallans([emptyForm()]);
      setCurrent(0);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit challans");
    } finally {
      setLoading(false);
    }
  };

  const form = challans[current] || emptyForm();

  return (
    <div className="space-y-4 flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold">Entry Form</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="cursor-pointer bg-card h-9" onClick={() => setShowPdfModal(true)}>
            <Upload size={16} className="mr-2 text-primary" />
            Upload PDF
          </Button>
          <Button variant="outline" className="cursor-pointer h-9" onClick={handleReset}>
            <RotateCcw size={16} className="mr-2" />
            Reset All
          </Button>
          <Button className="cursor-pointer h-9 bg-primary text-primary-foreground hover:opacity-90" onClick={handleSubmit}>
            <CheckCircle size={16} className="mr-2" />
            Submit All ({challans.length})
          </Button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Form Container */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full bg-card border rounded-xl overflow-hidden shadow-sm">
          
          {/* Navigation Bar inside the form area */}
          <div className="flex items-center justify-between p-3 border-b bg-muted/20 shrink-0">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-8 w-8 cursor-pointer" onClick={() => goTo(current - 1)} disabled={current === 0}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-medium px-2">
                Challan {current + 1} of {challans.length}
                {form.challan_no ? ` — #${form.challan_no}` : ""}
              </span>
              <Button size="icon" variant="outline" className="h-8 w-8 cursor-pointer" onClick={() => goTo(current + 1)} disabled={current === challans.length - 1}>
                <ChevronRight size={16} />
              </Button>
            </div>
            
            <div className="flex items-center gap-1.5 overflow-x-auto px-2 max-w-[200px] sm:max-w-md no-scrollbar">
              {challans.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    "w-8 h-8 rounded-md text-xs font-semibold cursor-pointer shrink-0 transition-all border border-transparent",
                    i === current ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:border-border"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={addNew}
                className="w-8 h-8 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                title="Add Blank Challan"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Form Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
            
            {/* Section: Basic Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <FileText size={16} className="text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Basic Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Date <span className="text-red-500">*</span></Label>
                  <Input type="date" className="h-9" value={form.date} onChange={(e) => updateField("date", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Challan Date <span className="text-red-500">*</span></Label>
                  <Input type="date" className="h-9" value={form.challan_date} onChange={(e) => updateField("challan_date", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Challan No. <span className="text-red-500">*</span></Label>
                  <Input placeholder="e.g. 117" className="h-9" value={form.challan_no} onChange={(e) => updateField("challan_no", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Firm <span className="text-red-500">*</span></Label>
                  <Input placeholder="Firm name" className="h-9" value={form.firm} onChange={(e) => updateField("firm", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Party <span className="text-red-500">*</span></Label>
                  <Input placeholder="Party / Customer name" className="h-9" value={form.party} onChange={(e) => updateField("party", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">GSTIN No.</Label>
                  <Input placeholder="e.g. 24DOTPS..." className="h-9" value={form.gstin_no} onChange={(e) => updateField("gstin_no", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Party Address</Label>
                  <Input placeholder="Full address" className="h-9" value={form.party_address} onChange={(e) => updateField("party_address", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Section: Item & Quality */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Package size={16} className="text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Item & Quality</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Quality <span className="text-red-500">*</span></Label>
                  <Input placeholder='e.g. MAL CHANDERI 48"' className="h-9" value={form.quality} onChange={(e) => updateField("quality", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">HSN Code</Label>
                  <Input placeholder="e.g. 540710" className="h-9" value={form.hsn_code} onChange={(e) => updateField("hsn_code", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Item</Label>
                  <Input placeholder="Item description" className="h-9" value={form.item} onChange={(e) => updateField("item", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Taka <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="0" className="h-9" value={form.taka} onChange={(e) => updateField("taka", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Meter <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="0.00" className="h-9" value={form.meter} onChange={(e) => updateField("meter", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Dyed / Print</Label>
                  <Select value={form.dyed_print} onValueChange={(v) => updateField("dyed_print", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="-- Select --" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dyed">Dyed</SelectItem>
                      <SelectItem value="Print">Print</SelectItem>
                      <SelectItem value="Grey">Grey</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Weaver</Label>
                  <Input placeholder="Weaver name" className="h-9" value={form.weaver} onChange={(e) => updateField("weaver", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Section: Rates & Amounts */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Receipt size={16} className="text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Rates & Amounts</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">FAS Rate</Label>
                  <Input type="number" placeholder="0.00" className="h-9" value={form.fas_rate} onChange={(e) => updateField("fas_rate", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount</Label>
                  <Input type="number" placeholder="0.00" className="h-9" value={form.amount} onChange={(e) => updateField("amount", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Weight</Label>
                  <Input type="number" placeholder="0.000" className="h-9" value={form.weight} onChange={(e) => updateField("weight", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Total</Label>
                  <Input type="number" placeholder="0.000" className="h-9" value={form.total} onChange={(e) => updateField("total", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Chadhti</Label>
                  <Input type="number" placeholder="0.00" className="h-9" value={form.chadhti} onChange={(e) => updateField("chadhti", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Width</Label>
                  <Input type="number" placeholder="0.00" className="h-9" value={form.width} onChange={(e) => updateField("width", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">PU Bill No.</Label>
                  <Input placeholder="e.g. 159" className="h-9" value={form.pu_bill_no} onChange={(e) => updateField("pu_bill_no", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Section: LR Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2">
                <Truck size={16} className="text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Dispatch Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">LR No.</Label>
                  <Input placeholder="LR number" className="h-9" value={form.lr_no} onChange={(e) => updateField("lr_no", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">LR Date</Label>
                  <Input type="date" className="h-9" value={form.lr_date} onChange={(e) => updateField("lr_date", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Transporter</Label>
                  <Input placeholder="Transporter name" className="h-9" value={form.transpoter} onChange={(e) => updateField("transpoter", e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Remark</Label>
                <Input placeholder="Any remarks..." className="h-9" value={form.remark} onChange={(e) => updateField("remark", e.target.value)} />
              </div>
            </div>

            <div className="pb-8"></div> {/* Bottom spacer */}
          </div>
        </div>

        {/* Right Column: Taka Details Table (Independent Scroll) */}
        <div className="lg:col-span-4 xl:col-span-3 h-[400px] lg:h-full flex flex-col bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-3 border-b bg-muted/20 shrink-0">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Taka Details</h3>
            <Button size="sm" variant="secondary" className="h-7 text-xs px-3 cursor-pointer rounded-full font-semibold" onClick={addRow}>
              <Plus size={12} className="mr-1" /> Add Row
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 sticky top-0 z-10 border-b backdrop-blur-sm">
                <tr>
                  <th className="text-center px-4 py-2.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase w-16">TN</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Meter</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {form.table.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground text-xs">
                      No rows. Click "Add Row" or upload a PDF.
                    </td>
                  </tr>
                )}
                {form.table.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-2 text-center font-medium text-muted-foreground">{row.tn}</td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        className="h-8 text-sm bg-transparent border-transparent hover:border-border focus:border-primary transition-colors px-2"
                        value={row.meter}
                        onChange={(e) => updateTableRow(idx, e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => removeRow(idx)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {form.table.length > 0 && (
            <div className="p-3 border-t bg-muted/10 shrink-0 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Meter</span>
              <span className="text-sm font-bold text-primary">
                {form.table.reduce((s, r) => s + (parseFloat(r.meter) || 0), 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* PDF Upload Modal */}
      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Challan PDF</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div
              className={cn(
                "border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 group",
                dragging ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/30"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
              
              {loading ? (
                <>
                  <div className="w-12 h-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Extracting Data...</p>
                    <p className="text-xs text-muted-foreground">This might take a few seconds.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <FileText size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PDF files only (max 10MB)</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChallanHistory() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedChallan, setSelectedChallan] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["challan", page, search],
    queryFn: () => api.get<any>(`/challan?page=${page}&limit=20${search ? `&search=${search}` : ""}`),
  });

  const challans = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    approved: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex w-full sm:w-64 items-center">
          <Input 
            placeholder="Search challan, party, firm..." 
            className="h-9 w-full rounded-full bg-muted/30" 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
          />
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left px-5 py-3.5 font-semibold text-xs text-muted-foreground uppercase">Challan No</th>
              <th className="text-left px-5 py-3.5 font-semibold text-xs text-muted-foreground uppercase">Date</th>
              <th className="text-left px-5 py-3.5 font-semibold text-xs text-muted-foreground uppercase">Firm</th>
              <th className="text-left px-5 py-3.5 font-semibold text-xs text-muted-foreground uppercase">Party</th>
              <th className="text-right px-5 py-3.5 font-semibold text-xs text-muted-foreground uppercase">Total Amount</th>
              <th className="text-left px-5 py-3.5 font-semibold text-xs text-muted-foreground uppercase">Status</th>
              <th className="text-right px-5 py-3.5 font-semibold text-xs text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : challans.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No challans found</td></tr>
            ) : (
              challans.map((c: any) => (
                <tr key={c._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-primary text-xs">{c.challan_no}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(c.date).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-xs font-medium">{c.firm}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{c.party}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-right">₹{c.total?.toLocaleString() ?? 0}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-tight h-5 px-2", STATUS_COLORS[c.status || "draft"])}>
                      {c.status || "draft"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="sm" variant="ghost" className="h-7 text-xs font-medium rounded-full cursor-pointer" onClick={() => setSelectedChallan(c)}>
                      View Details
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 cursor-pointer">Previous</Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 cursor-pointer">Next</Button>
        </div>
      )}

      {selectedChallan && <ChallanDetailDialog challan={selectedChallan} onClose={() => setSelectedChallan(null)} />}
    </div>
  );
}

function ChallanDetailDialog({ challan, onClose }: { challan: any; onClose: () => void }) {
  const { data: fullChallan, isLoading } = useQuery({
    queryKey: ["challan", challan._id],
    queryFn: () => api.get<any>(`/challan/${challan._id}`),
  });

  const details = fullChallan || challan;

  return (
    <Dialog open={!!challan} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Challan Details: #{details.challan_no}</span>
            <Badge variant="outline" className="uppercase text-[10px]">{details.status || "draft"}</Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading details...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-xl text-sm border">
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Date</p><p className="font-semibold">{details.date ? new Date(details.date).toLocaleDateString() : "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Challan Date</p><p className="font-semibold">{details.challan_date ? new Date(details.challan_date).toLocaleDateString() : "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Firm</p><p className="font-semibold">{details.firm || "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Party</p><p className="font-semibold text-primary">{details.party || "—"}</p></div>
              <div className="col-span-2"><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Party Address</p><p className="font-medium text-xs">{details.party_address || "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">GSTIN</p><p className="font-semibold">{details.gstin_no || "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Total Amount</p><p className="font-bold text-green-600">₹{details.total?.toLocaleString() ?? "0"}</p></div>
              
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Quality</p><p className="font-medium">{details.quality || "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">HSN Code</p><p className="font-medium">{details.hsn_code || "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Transporter</p><p className="font-medium">{details.transpoter || "—"}</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">LR No</p><p className="font-medium">{details.lr_no || "—"}</p></div>
            </div>

            {details.table && details.table.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Taka Details ({details.table.length} entries)</h3>
                <div className="border rounded-xl overflow-hidden bg-card">
                  <div className="max-h-[300px] overflow-y-auto relative no-scrollbar">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0 border-b z-10 shadow-sm backdrop-blur-sm">
                        <tr>
                          <th className="text-center px-2 py-2 font-semibold w-16">T.N.</th>
                          <th className="text-right px-4 py-2 font-semibold">Meter</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {details.table.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-muted/10">
                            <td className="text-center px-2 py-2 font-medium text-muted-foreground">{row.tn}</td>
                            <td className="text-right px-4 py-2 font-semibold text-primary">{row.meter}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/20 sticky bottom-0 border-t z-10 backdrop-blur-sm">
                        <tr>
                          <td className="text-center px-2 py-2 font-bold uppercase text-muted-foreground">Total</td>
                          <td className="text-right px-4 py-2 font-bold text-primary text-sm">
                            {details.table.reduce((s: number, r: any) => s + (parseFloat(r.meter) || 0), 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button onClick={onClose} className="cursor-pointer h-9">Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}