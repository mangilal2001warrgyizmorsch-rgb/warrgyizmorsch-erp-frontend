"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle, Plus, FileText,
  Building2, BookOpen, Receipt, CreditCard, BarChart3, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from "recharts";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: "bg-green-100 text-green-700 border-green-200",
    draft: "bg-gray-100 text-gray-600 border-gray-200",
    sent: "bg-blue-100 text-blue-700 border-blue-200",
    overdue: "bg-red-100 text-red-700 border-red-200",
    cancelled: "bg-red-100 text-red-500 border-red-200",
    posted: "bg-green-100 text-green-700 border-green-200",
    partial: "bg-yellow-100 text-yellow-700 border-yellow-200",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${colors[status] ?? ""}`}>
      {status}
    </Badge>
  );
}

function CreateInvoiceDialog({ type }: { type: "sales" | "purchase" }) {
  const [open, setOpen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partyGST, setPartyGST] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
  const qc = useQueryClient();
  const createInvoice = useMutation({ mutationFn: (d: any) => api.post("/finance/invoices", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "invoices"] }) });

  const calcAmounts = () => {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const taxAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.taxRate / 100), 0);
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  };

  const handleSubmit = async () => {
    if (!partyName || !dueDate) { toast.error("Fill all required fields"); return; }
    const { subtotal, taxAmount, total } = calcAmounts();
    try {
      await createInvoice.mutateAsync({
        type,
        partyId: partyName.toLowerCase().replace(/\s+/g, "-"),
        partyName,
        partyGST: partyGST || undefined,
        date,
        dueDate,
        items: items.map((i) => ({ ...i, amount: i.quantity * i.unitPrice * (1 + i.taxRate / 100) })),
        subtotal,
        taxAmount,
        total,
        notes: notes || undefined,
      });
      toast.success(`${type === "sales" ? "Invoice" : "Bill"} created`);
      setOpen(false);
      setPartyName(""); setPartyGST(""); setDueDate(""); setNotes("");
      setItems([{ description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
    } catch {
      toast.error("Failed to create invoice");
    }
  };

  const { subtotal, taxAmount, total } = calcAmounts();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="cursor-pointer gap-1">
          <Plus size={14} /> New {type === "sales" ? "Invoice" : "Bill"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create {type === "sales" ? "Sales Invoice" : "Purchase Bill"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{type === "sales" ? "Customer" : "Vendor"} Name *</Label>
              <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Party name" />
            </div>
            <div className="space-y-1">
              <Label>GSTIN</Label>
              <Input value={partyGST} onChange={(e) => setPartyGST(e.target.value)} placeholder="22AAAAA0000A1Z5" />
            </div>
            <div className="space-y-1">
              <Label>Invoice Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Due Date *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Line Items</Label>
              <Button
                type="button" size="sm" variant="ghost"
                className="cursor-pointer text-xs"
                onClick={() => setItems([...items, { description: "", quantity: 1, unitPrice: 0, taxRate: 18 }])}
              >
                <Plus size={12} className="mr-1" /> Add Line
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-left px-3 py-2 w-16">Qty</th>
                    <th className="text-left px-3 py-2 w-24">Unit Price</th>
                    <th className="text-left px-3 py-2 w-20">Tax %</th>
                    <th className="text-left px-3 py-2 w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-2 py-1">
                        <Input className="h-7 text-xs" value={item.description} onChange={(e) => {
                          const n = [...items]; n[idx].description = e.target.value; setItems(n);
                        }} placeholder="Description" />
                      </td>
                      <td className="px-2 py-1">
                        <Input className="h-7 text-xs" type="number" value={item.quantity} onChange={(e) => {
                          const n = [...items]; n[idx].quantity = Number(e.target.value); setItems(n);
                        }} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className="h-7 text-xs" type="number" value={item.unitPrice} onChange={(e) => {
                          const n = [...items]; n[idx].unitPrice = Number(e.target.value); setItems(n);
                        }} />
                      </td>
                      <td className="px-2 py-1">
                        <Input className="h-7 text-xs" type="number" value={item.taxRate} onChange={(e) => {
                          const n = [...items]; n[idx].taxRate = Number(e.target.value); setItems(n);
                        }} />
                      </td>
                      <td className="px-3 py-1 text-right font-medium">
                        ₹{(item.quantity * item.unitPrice * (1 + item.taxRate / 100)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-sm space-y-1 text-right">
              <div className="text-muted-foreground">Subtotal: ₹{subtotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
              <div className="text-muted-foreground">GST: ₹{taxAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
              <div className="font-bold text-base">Total: ₹{total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" className="cursor-pointer" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="cursor-pointer" onClick={handleSubmit}>Create</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateJournalEntryDialog() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const qc = useQueryClient();
  const { data: accounts } = useQuery({ queryKey: ["finance", "accounts"], queryFn: () => api.get<any[]>("/finance/accounts") });
  const createJE = useMutation({ mutationFn: (d: any) => api.post("/finance/journal-entries", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "journalEntries"] }) });
  const [lines, setLines] = useState([
    { accountId: "", debit: 0, credit: 0, description: "" },
    { accountId: "", debit: 0, credit: 0, description: "" },
  ]);
  type AccountId = typeof accounts extends Array<infer T> ? T extends { _id: infer I } ? I : never : never;

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async () => {
    if (!description) { toast.error("Description is required"); return; }
    if (!isBalanced) { toast.error("Entry is not balanced — debit and credit totals must match"); return; }
    const validLines = lines.filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) { toast.error("Add at least 2 lines"); return; }
    try {
      await createJE.mutateAsync({
        date, description,
        reference: reference || undefined,
        lines: validLines.map((l) => ({
          accountId: l.accountId as AccountId,
          debit: l.debit, credit: l.credit,
          description: l.description || undefined,
        })),
      });
      toast.success("Journal entry created");
      setOpen(false); setDescription(""); setReference("");
      setLines([{ accountId: "", debit: 0, credit: 0, description: "" }, { accountId: "", debit: 0, credit: 0, description: "" }]);
    } catch (e) {
      toast.error("Failed to create entry");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="cursor-pointer gap-1"><Plus size={14} /> New Entry</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Journal Entry</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Description *</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Journal entry description" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Invoice #, PO #, etc." />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-sm font-medium">Journal Lines</Label>
              <Button type="button" size="sm" variant="ghost" className="cursor-pointer text-xs"
                onClick={() => setLines([...lines, { accountId: "", debit: 0, credit: 0, description: "" }])}>
                <Plus size={12} className="mr-1" /> Add Line
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2">Account</th>
                    <th className="text-left px-3 py-2 w-28">Debit (₹)</th>
                    <th className="text-left px-3 py-2 w-28">Credit (₹)</th>
                    <th className="text-left px-3 py-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="px-2 py-1">
                        <Select value={line.accountId} onValueChange={(v) => { const n = [...lines]; n[idx].accountId = v; setLines(n); }}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
                          <SelectContent>
                            {accounts?.map((a) => <SelectItem key={a._id} value={a._id}>{a.code} - {a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1">
                        <Input className="h-7 text-xs" type="number" value={line.debit || ""} onChange={(e) => {
                          const n = [...lines]; n[idx].debit = Number(e.target.value); setLines(n);
                        }} placeholder="0" />
                      </td>
                      <td className="px-2 py-1">
                        <Input className="h-7 text-xs" type="number" value={line.credit || ""} onChange={(e) => {
                          const n = [...lines]; n[idx].credit = Number(e.target.value); setLines(n);
                        }} placeholder="0" />
                      </td>
                      <td className="px-2 py-1">
                        <Input className="h-7 text-xs" value={line.description} onChange={(e) => {
                          const n = [...lines]; n[idx].description = e.target.value; setLines(n);
                        }} placeholder="Note" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 border-t">
                  <tr>
                    <td className="px-3 py-2 font-medium">Total</td>
                    <td className={`px-3 py-2 font-bold ${isBalanced ? "text-green-600" : "text-red-500"}`}>
                      ₹{totalDebit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-3 py-2 font-bold ${isBalanced ? "text-green-600" : "text-red-500"}`}>
                      ₹{totalCredit.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {isBalanced ? <span className="text-green-600 font-medium">Balanced</span> : <span className="text-red-500">Not balanced</span>}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
            <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              <span className="font-semibold">⚠ Not balanced:</span>
              Debit ₹{totalDebit.toLocaleString("en-IN")} ≠ Credit ₹{totalCredit.toLocaleString("en-IN")} — difference of ₹{Math.abs(totalDebit - totalCredit).toLocaleString("en-IN")}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" className="cursor-pointer" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="cursor-pointer" disabled={createJE.isPending} onClick={handleSubmit}>
              {createJE.isPending ? "Posting..." : "Post Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateBankAccountDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [balance, setBalance] = useState(0);
  const qc = useQueryClient();
  const createBank = useMutation({ mutationFn: (d: any) => api.post("/finance/bank-accounts", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "bankAccounts"] }) });

  const handleSubmit = async () => {
    if (!name || !accountNumber || !bankName) { toast.error("Fill required fields"); return; }
    try {
      await createBank.mutateAsync({ name, accountNumber, bankName, balance, currency: "INR" });
      toast.success("Bank account added");
      setOpen(false); setName(""); setAccountNumber(""); setBankName(""); setBalance(0);
    } catch { toast.error("Failed to add bank account"); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="cursor-pointer gap-1"><Plus size={14} /> Add Bank Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1"><Label>Account Nickname *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Current Account" /></div>
          <div className="space-y-1"><Label>Account Number *</Label><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="123456789012" /></div>
          <div className="space-y-1"><Label>Bank Name *</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="HDFC Bank" /></div>
          <div className="space-y-1"><Label>Opening Balance (₹)</Label><Input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))} /></div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" className="cursor-pointer" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="cursor-pointer" onClick={handleSubmit}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateChartOfAccountDialog() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("asset");
  const qc = useQueryClient();
  const createAccount = useMutation({ mutationFn: (d: any) => api.post("/finance/accounts", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "accounts"] }) });

  const handleSubmit = async () => {
    if (!code || !name) { toast.error("Fill required fields"); return; }
    try {
      await createAccount.mutateAsync({ code, name, type });
      toast.success("Account created");
      setOpen(false); setCode(""); setName(""); setType("asset");
    } catch { toast.error("Account code may already exist"); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="cursor-pointer gap-1"><Plus size={14} /> New Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Account</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1"><Label>Account Code *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="1001" /></div>
          <div className="space-y-1"><Label>Account Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cash" /></div>
          <div className="space-y-1">
            <Label>Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["asset", "liability", "equity", "income", "expense"].map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" className="cursor-pointer" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="cursor-pointer" onClick={handleSubmit}>Create</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FinanceDashboard() {
  const { data: summary } = useQuery({ queryKey: ["finance", "summary"], queryFn: () => api.get<any>("/finance/summary") });
  const { data: bankAccounts } = useQuery({ queryKey: ["finance", "bankAccounts"], queryFn: () => api.get<any[]>("/finance/bank-accounts") });

  if (!summary) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
    </div>
  );

  const totalBankBalance = bankAccounts?.reduce((s, b) => s + b.balance, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: summary.totalRevenue, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", arrow: ArrowUpRight },
          { label: "Total Expenses", value: summary.totalExpenses, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50", arrow: ArrowDownRight },
          { label: "Net Profit", value: summary.netProfit, icon: DollarSign, color: summary.netProfit >= 0 ? "text-green-600" : "text-red-500", bg: summary.netProfit >= 0 ? "bg-green-50" : "bg-red-50", arrow: summary.netProfit >= 0 ? ArrowUpRight : ArrowDownRight },
          { label: "Bank Balance", value: totalBankBalance, icon: Building2, color: "text-blue-600", bg: "bg-blue-50", arrow: ArrowUpRight },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>₹{item.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                </div>
                <div className={`p-2 rounded-lg ${item.bg}`}>
                  <item.icon size={16} className={item.color} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Receivables</p>
                <p className="text-lg font-bold text-orange-600">₹{summary.receivables.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-50">
                <Receipt size={16} className="text-orange-600" />
              </div>
            </div>
            {summary.overdueCount > 0 && (
              <p className="text-xs text-red-500 mt-1">{summary.overdueCount} overdue</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Payables</p>
                <p className="text-lg font-bold text-purple-600">₹{summary.payables.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-50">
                <CreditCard size={16} className="text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">GST Collected</p>
                <p className="text-lg font-bold text-teal-600">₹{summary.gstCollected.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="p-2 rounded-lg bg-teal-50">
                <FileText size={16} className="text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">GST Payable</p>
                <p className={`text-lg font-bold ${summary.gstPayable >= 0 ? "text-red-600" : "text-green-600"}`}>
                  ₹{summary.gstPayable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-50">
                <AlertCircle size={16} className="text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Expenses Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 size={16} /> Revenue vs Expenses (Last 6 Months)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={summary.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} name="Revenue" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bank Accounts */}
      {bankAccounts && bankAccounts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Bank Accounts</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {bankAccounts.map((b) => (
              <Card key={b._id} className="border">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.bankName} • ****{b.accountNumber.slice(-4)}</p>
                    </div>
                    <Building2 size={16} className="text-muted-foreground mt-1" />
                  </div>
                  <p className="text-xl font-bold text-green-600 mt-2">₹{b.balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InvoicesTab({ type }: { type: "sales" | "purchase" }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const qc = useQueryClient();
  const { data: invoices } = useQuery({ queryKey: ["finance", "invoices", type, statusFilter], queryFn: () => api.get<any[]>(`/finance/invoices?type=${type}${statusFilter !== "all" ? `&status=${statusFilter}` : ""}`) });
  const updateStatus = useMutation({ mutationFn: ({ id, ...d }: any) => api.put(`/finance/invoices/${id}/status`, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "invoices"] }) });

  const statuses = type === "sales"
    ? ["all", "draft", "sent", "paid", "overdue", "cancelled"]
    : ["all", "draft", "sent", "paid", "cancelled"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {statuses.map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "ghost"}
              className="cursor-pointer h-7 text-xs capitalize" onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All" : s}
            </Button>
          ))}
        </div>
        <CreateInvoiceDialog type={type} />
      </div>

      {!invoices ? <Skeleton className="h-48" /> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">{type === "sales" ? "Invoice #" : "Bill #"}</th>
                <th className="text-left px-4 py-3 font-medium">{type === "sales" ? "Customer" : "Vendor"}</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Due Date</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-primary">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">{inv.partyName}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{inv.date}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{inv.dueDate}</td>
                  <td className="px-4 py-3 font-semibold">₹{inv.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {inv.status === "draft" && (
                        <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs"
                          onClick={() => { updateStatus.mutateAsync({ id: inv._id, status: "sent" }); toast.success("Marked as sent"); }}>
                          Send
                        </Button>
                      )}
                      {inv.status === "sent" && (
                        <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs text-green-600"
                          onClick={() => { updateStatus.mutateAsync({ id: inv._id, status: "paid" }); toast.success("Marked as paid"); }}>
                          Mark Paid
                        </Button>
                      )}
                      {["draft", "sent"].includes(inv.status) && (
                        <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs text-red-500"
                          onClick={() => { updateStatus.mutateAsync({ id: inv._id, status: "cancelled" }); toast.success("Cancelled"); }}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No {type === "sales" ? "invoices" : "bills"} found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function JournalEntriesTab() {
  const { data: journalEntries } = useQuery({ queryKey: ["finance", "journalEntries"], queryFn: () => api.get<any[]>("/finance/journal-entries") });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateJournalEntryDialog />
      </div>
      {!journalEntries ? <Skeleton className="h-48" /> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Entry #</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Reference</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Lines</th>
              </tr>
            </thead>
            <tbody>
              {journalEntries.map((je) => (
                <tr key={je._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-primary">{je.entryNumber}</td>
                  <td className="px-4 py-3">{je.description}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{je.date}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{je.reference ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={je.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{je.lines.length} lines</td>
                </tr>
              ))}
              {journalEntries.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No journal entries yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ChartOfAccountsTab() {
  const { data: accounts } = useQuery({ queryKey: ["finance", "accounts"], queryFn: () => api.get<any[]>("/finance/accounts") });
  const typeColors: Record<string, string> = {
    asset: "bg-blue-100 text-blue-700",
    liability: "bg-red-100 text-red-700",
    equity: "bg-purple-100 text-purple-700",
    income: "bg-green-100 text-green-700",
    expense: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateChartOfAccountDialog />
      </div>
      {!accounts ? <Skeleton className="h-48" /> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Code</th>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Balance (₹)</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium">{acc.code}</td>
                  <td className="px-4 py-3">{acc.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeColors[acc.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {acc.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${acc.balance >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {acc.balance < 0 ? "-" : ""}₹{Math.abs(acc.balance).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={acc.isActive ? "text-green-600 border-green-200" : "text-gray-400"}>
                      {acc.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No accounts in chart of accounts</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BankingTab() {
  const qc = useQueryClient();
  const { data: bankAccounts } = useQuery({ queryKey: ["finance", "bankAccounts"], queryFn: () => api.get<any[]>("/finance/bank-accounts") });
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const { data: transactions } = useQuery({ queryKey: ["finance", "bankTransactions", selectedBankId], queryFn: () => api.get<any[]>(`/finance/bank-transactions${selectedBankId ? `?bankAccountId=${selectedBankId}` : ""}`) });
  const createTxn = useMutation({ mutationFn: (d: any) => api.post("/finance/bank-transactions", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "bankTransactions"] }) });
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [txnDesc, setTxnDesc] = useState("");
  const [txnAmount, setTxnAmount] = useState(0);
  const [txnType, setTxnType] = useState("credit");
  const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0, 10));

  type BankAccountId = NonNullable<typeof bankAccounts>[number]["_id"];

  const handleTxn = async () => {
    if (!selectedBankId || !txnDesc || !txnAmount) { toast.error("Fill required fields"); return; }
    try {
      await createTxn.mutateAsync({ bankAccountId: selectedBankId as BankAccountId, date: txnDate, description: txnDesc, amount: txnAmount, type: txnType });
      toast.success("Transaction recorded");
      setShowTxnForm(false); setTxnDesc(""); setTxnAmount(0);
    } catch { toast.error("Failed to record transaction"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={!selectedBankId ? "default" : "ghost"}
            className="cursor-pointer h-7 text-xs" onClick={() => setSelectedBankId(null)}>
            All
          </Button>
          {bankAccounts?.map((b) => (
            <Button key={b._id} size="sm" variant={selectedBankId === b._id ? "default" : "ghost"}
              className="cursor-pointer h-7 text-xs" onClick={() => setSelectedBankId(b._id)}>
              {b.name}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {selectedBankId && <Button size="sm" variant="ghost" className="cursor-pointer gap-1" onClick={() => setShowTxnForm(!showTxnForm)}><Plus size={14} /> Add Transaction</Button>}
          <CreateBankAccountDialog />
        </div>
      </div>

      {showTxnForm && selectedBankId && (
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" className="h-8 text-xs" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Description *</Label>
                <Input className="h-8 text-xs" value={txnDesc} onChange={(e) => setTxnDesc(e.target.value)} placeholder="Transaction description" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Amount (₹) *</Label>
                <Input className="h-8 text-xs" type="number" value={txnAmount || ""} onChange={(e) => setTxnAmount(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={txnType} onValueChange={setTxnType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit (In)</SelectItem>
                    <SelectItem value="debit">Debit (Out)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <Button size="sm" variant="ghost" className="cursor-pointer" onClick={() => setShowTxnForm(false)}>Cancel</Button>
              <Button size="sm" className="cursor-pointer" onClick={handleTxn}>Record</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!transactions ? <Skeleton className="h-48" /> : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Reconciled</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{txn.date}</td>
                  <td className="px-4 py-3">{txn.description}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={txn.type === "credit" ? "text-green-600 border-green-200" : "text-red-500 border-red-200"}>
                      {txn.type === "credit" ? "Credit" : "Debit"}
                    </Badge>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${txn.type === "credit" ? "text-green-600" : "text-red-500"}`}>
                    {txn.type === "debit" ? "-" : "+"}₹{txn.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={txn.isReconciled ? "text-green-600" : "text-gray-400"}>
                      {txn.isReconciled ? "Yes" : "No"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No transactions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GSTReportTab() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["finance", "gst-summary"],
    queryFn: () => api.get<any>("/finance/summary"),
  });

  if (isLoading || !summary) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Output GST (Collected)</p>
            <p className="text-2xl font-bold text-green-600 mt-1">₹{(summary.gstCollected ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground mt-1">GST collected from customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Input GST (Paid)</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">₹{(summary.gstPaid ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground mt-1">GST paid to vendors (input credit)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Net GST Payable</p>
            <p className={`text-2xl font-bold mt-1 ${(summary.gstPayable ?? 0) >= 0 ? "text-red-600" : "text-green-600"}`}>
              ₹{(summary.gstPayable ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {(summary.gstPayable ?? 0) >= 0 ? "Amount to be paid to govt." : "Credit available"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Monthly GST Overview</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={summary.monthlyData ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" name="Purchases" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FinancePage() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <DollarSign size={20} className="text-primary" /> Accounting & Finance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage invoices, accounts, journals, and banking</p>
        </div>
      </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto gap-1 mb-6">
            <TabsTrigger value="dashboard" className="cursor-pointer">Dashboard</TabsTrigger>
            <TabsTrigger value="sales-invoices" className="cursor-pointer">Sales Invoices</TabsTrigger>
            <TabsTrigger value="purchase-bills" className="cursor-pointer">Purchase Bills</TabsTrigger>
            <TabsTrigger value="journal" className="cursor-pointer">Journal Entries</TabsTrigger>
            <TabsTrigger value="accounts" className="cursor-pointer">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="banking" className="cursor-pointer">Banking</TabsTrigger>
            <TabsTrigger value="gst" className="cursor-pointer">GST Report</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><FinanceDashboard /></TabsContent>
          <TabsContent value="sales-invoices"><InvoicesTab type="sales" /></TabsContent>
          <TabsContent value="purchase-bills"><InvoicesTab type="purchase" /></TabsContent>
          <TabsContent value="journal"><JournalEntriesTab /></TabsContent>
          <TabsContent value="accounts"><ChartOfAccountsTab /></TabsContent>
          <TabsContent value="banking"><BankingTab /></TabsContent>
          <TabsContent value="gst"><GSTReportTab /></TabsContent>
        </Tabs>
    </div>
  );
}
