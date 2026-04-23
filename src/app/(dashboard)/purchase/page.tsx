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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Search, ShoppingBag, Star, TrendingDown, Package,
  FileText, CheckCircle, X, Eye, ArrowRight, BarChart3, Truck,
  Calendar, LogIn, Pencil, Mail, Building2, Users, Upload, Download
} from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CHART_COLORS = ["#00AFA7", "#F05D5E", "#E7A977", "#FFE66D", "#6C5B7B", "#C06C84", "#F67280", "#F8B195"];
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PO_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  approved: "bg-blue-100 text-blue-700 border-blue-200",
  sent: "bg-yellow-100 text-yellow-700 border-yellow-200",
  partial: "bg-orange-100 text-orange-700 border-orange-200",
  received: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-500 border-red-200",
};

const RFQ_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  received: "bg-green-100 text-green-700 border-green-200",
  converted: "bg-purple-100 text-purple-700 border-purple-200",
  cancelled: "bg-red-100 text-red-500 border-red-200",
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={cn(
            "h-4 w-4 transition-colors",
            i < value ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground",
            onChange && "cursor-pointer hover:scale-110 active:scale-95"
          )}
          onClick={() => onChange?.(i + 1)}
        />
      ))}
    </div>
  );
}

function POForm({
  onSubmit,
  onClose,
  prefillVendorId,
}: {
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
  prefillVendorId?: string;
}) {
  const { data: vendors } = useQuery({ queryKey: ["purchase", "vendors"], queryFn: () => api.get<any[]>("/purchase/vendors") });
  const { data: products } = useQuery({ queryKey: ["inventory", "products"], queryFn: () => api.get<any[]>("/inventory/products") });

  const [vendorId, setVendorId] = useState<string>(prefillVendorId ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addProduct = (productId: string) => {
    const product = products?.find((p) => p._id === productId);
    if (!product) return;
    const existing = items.findIndex((i) => i.productId === productId);
    if (existing >= 0) {
      setItems((prev) => prev.map((it, idx) => idx === existing
        ? { ...it, quantity: it.quantity + 1, amount: (it.quantity + 1) * it.unitPrice * (1 + it.taxRate / 100) }
        : it));
    } else {
      setItems((prev) => [...prev, {
        productId,
        productName: product.name,
        quantity: 1,
        unitPrice: product.costPrice,
        taxRate: product.taxRate,
        amount: product.costPrice * (1 + product.taxRate / 100),
        receivedQuantity: 0,
      }]);
    }
  };

  const updateItem = (idx: number, field: "quantity" | "unitPrice", value: number) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      updated.amount = updated.quantity * updated.unitPrice * (1 + updated.taxRate / 100);
      return updated;
    }));
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.taxRate / 100), 0);
  const total = subtotal + taxAmount;

  const handleSubmit = async () => {
    if (!vendorId || items.length === 0) { toast.error("Select vendor and add items"); return; }
    setIsSubmitting(true);
    try {
      await onSubmit({ vendorId, date, deliveryDate, items, subtotal, taxAmount, total, notes });
    } catch {
      toast.error("Failed to create PO");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Vendor *</Label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent>{vendors?.map((v) => <SelectItem key={v._id} value={v._id}>{v.name} {v.city ? `(${v.city})` : ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Order Date *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Expected Delivery</Label>
          <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Add Product</Label>
        <Select onValueChange={addProduct}>
          <SelectTrigger className="h-8 text-xs bg-muted/30 border-dashed"><SelectValue placeholder="Search item to purchase..." /></SelectTrigger>
          <SelectContent>{products?.map((p: any, index: number) => <SelectItem key={p._id ?? `${p.name}-${index}`} value={p._id}>{p.name} — Cost ₹{p.costPrice || 0}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {items.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Product</th>
                <th className="text-center px-3 py-2 font-semibold w-16">Qty</th>
                <th className="text-right px-3 py-2 font-semibold w-24">Unit Price</th>
                <th className="text-right px-3 py-2 font-semibold w-24">Amount</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.productId ?? item.id ?? item.productName ?? i} className="border-b last:border-0 hover:bg-muted/10 bg-card">
                  <td className="px-3 py-1.5 font-medium">{item.productName}</td>
                  <td className="px-2 py-1.5">
                    <Input className="h-7 w-12 text-[11px] px-1.5 text-center" type="number" min={1} value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", Number(e.target.value) || 1)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input className="h-7 w-20 text-[11px] px-1.5 text-right" type="number" value={item.unitPrice}
                      onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold">₹{item.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
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
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms, shipping instructions, etc..." className="h-8 text-xs" />
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="ghost" className="cursor-pointer h-8 text-xs" onClick={onClose}>Cancel</Button>
        <Button className="cursor-pointer h-8 text-xs" disabled={isSubmitting} onClick={handleSubmit}>Create Order</Button>
      </div>
    </div>
  );
}

function ReceivePODialog({ po, onClose }: { po: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(po.items.map((i: any) => [i.productId, i.quantity - (i.receivedQuantity ?? 0)]))
  );
  const receivePO = useMutation({
    mutationFn: (data: any) => api.post(`/purchase/orders/${po._id}/receive`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Inventory updated successfully");
      onClose();
    },
    onError: () => toast.error("Failed to update stock receipt")
  });

  const handleReceive = async () => {
    const receivedItems = po.items.map((i: any) => ({
      productId: i.productId,
      receivedQuantity: quantities[i.productId] ?? 0,
    })).filter((i: any) => i.receivedQuantity > 0);
    if (receivedItems.length === 0) { toast.error("Enter received quantities"); return; }
    receivePO.mutate({ receivedItems });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3 items-center">
        <Package className="text-blue-600 shrink-0" size={20} />
        <p className="text-xs text-blue-700 font-medium">Confirming receipt will automatically update stock levels in the primary warehouse.</p>
      </div>
      <div className="border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase text-muted-foreground">Item</th>
              <th className="text-center px-4 py-2.5 font-semibold text-xs uppercase text-muted-foreground">Pending</th>
              <th className="text-center px-4 py-2.5 font-semibold text-xs uppercase text-muted-foreground">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {po.items.map((item: any) => (
              <tr key={item.productId} className="bg-card hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-sm">{item.productName}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Ordered: {item.quantity}</p>
                </td>
                <td className="px-4 py-2.5 text-center font-semibold text-orange-600">{item.quantity - (item.receivedQuantity ?? 0)}</td>
                <td className="px-4 py-2.5">
                  <Input
                    className="h-8 text-sm text-center font-semibold w-24 mx-auto"
                    type="number"
                    min={0}
                    max={item.quantity - (item.receivedQuantity ?? 0)}
                    value={quantities[item.productId] ?? 0}
                    onChange={(e) => setQuantities((prev) => ({ ...prev, [item.productId]: Number(e.target.value) }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="ghost" className="cursor-pointer h-8 text-xs" onClick={onClose}>Cancel</Button>
        <Button className="cursor-pointer h-8 text-xs gap-1.5" onClick={handleReceive} disabled={receivePO.isPending}>
          <LogIn size={13} className="rotate-90" /> Update Stock
        </Button>
      </div>
    </div>
  );
}

function VendorDialog({ vendor, onClose }: { vendor?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: vendor?.name ?? "",
    email: vendor?.email ?? "",
    phone: vendor?.phone ?? "",
    gstin: vendor?.gstin ?? "",
    city: vendor?.city ?? "",
    state: vendor?.state ?? "",
    paymentTerms: vendor?.paymentTerms ?? "net30",
    leadTime: String(vendor?.leadTime ?? ""),
    rating: vendor?.rating ?? 3,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => vendor ? api.put(`/purchase/vendors/${vendor._id}`, data) : api.post("/purchase/vendors", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "vendors"] });
      toast.success(vendor ? "Vendor updated" : "Vendor created");
      onClose();
    },
    onError: () => toast.error("Failed to save vendor")
  });

  const handleSubmit = async () => {
    if (!form.name) { toast.error("Company name required"); return; }
    mutation.mutate({ ...form, leadTime: form.leadTime ? Number(form.leadTime) : undefined });
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1"><Label className="text-xs">Company Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs" /></div>
        <div className="space-y-1"><Label className="text-xs">Email Address</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="supplier@corp.com" className="h-8 text-xs" /></div>
        <div className="space-y-1"><Label className="text-xs">Contact Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-8 text-xs" /></div>
        <div className="space-y-1"><Label className="text-xs">Tax ID / GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} className="h-8 text-xs" /></div>
        <div className="space-y-1">
          <Label className="text-xs">Payment Terms</Label>
          <Select value={form.paymentTerms} onValueChange={(v) => setForm({ ...form, paymentTerms: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate</SelectItem>
              <SelectItem value="net15">Net 15</SelectItem>
              <SelectItem value="net30">Net 30</SelectItem>
              <SelectItem value="net60">Net 60</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-8 text-xs" /></div>
        <div className="space-y-1"><Label className="text-xs">Lead Time (Days)</Label><Input type="number" value={form.leadTime} onChange={(e) => setForm({ ...form, leadTime: e.target.value })} className="h-8 text-xs" /></div>
        <div className="col-span-2 space-y-1 border-t pt-3">
          <Label className="text-xs">Vendor Rating</Label>
          <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border">
            <StarRating value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
            <span className="text-[10px] font-semibold text-muted-foreground">{form.rating}/5</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-3 border-t">
        <Button variant="ghost" className="cursor-pointer h-8 text-xs" onClick={onClose}>Cancel</Button>
        <Button className="cursor-pointer h-8 text-xs" onClick={handleSubmit} disabled={mutation.isPending}>Save Vendor</Button>
      </div>
    </div>
  );
}

function RFQForm({ onSubmit, onClose }: { onSubmit: (data: any) => Promise<void>; onClose: () => void }) {
  const { data: vendors } = useQuery({ queryKey: ["purchase", "vendors"], queryFn: () => api.get<any[]>("/purchase/vendors") });
  const { data: products } = useQuery({ queryKey: ["inventory", "products"], queryFn: () => api.get<any[]>("/inventory/products") });

  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addProduct = (productId: string) => {
    const product = products?.find((p) => p._id === productId);
    if (!product) return;
    setItems((prev) => [...prev, { productId, productName: product.name, quantity: 1 }]);
  };

  const handleSubmit = async () => {
    if (!vendorId || items.length === 0) { toast.error("Select vendor and add items"); return; }
    setIsSubmitting(true);
    try {
      await onSubmit({ vendorId, date, dueDate: dueDate || undefined, items, notes: notes || undefined });
    } catch {
      toast.error("Failed to create RFQ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Vendor *</Label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select vendor" /></SelectTrigger>
            <SelectContent>{vendors?.map((v) => <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs" /></div>
        <div className="space-y-1"><Label className="text-xs">Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-xs" /></div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Add Product</Label>
        <Select onValueChange={addProduct}>
          <SelectTrigger className="h-8 text-xs bg-muted/30 border-dashed"><SelectValue placeholder="Select product" /></SelectTrigger>
          <SelectContent>{products?.map((p: any, index: number) => <SelectItem key={p._id ?? `${p.name}-${index}`} value={p._id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {items.length > 0 && (
        <div className="border rounded-lg overflow-hidden text-xs">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/50 border-b"><tr><th className="text-left px-3 py-2 font-semibold">Product</th><th className="text-left px-3 py-2 font-semibold w-24">Qty</th><th className="w-8"></th></tr></thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b last:border-0 bg-card hover:bg-muted/10">
                  <td className="px-3 py-1.5 font-medium">{item.productName}</td>
                  <td className="px-2 py-1.5">
                    <Input className="h-7 w-20 text-[11px] text-center" type="number" min={1} value={item.quantity}
                      onChange={(e) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, quantity: Number(e.target.value) || 1 } : it))} />
                  </td>
                  <td className="px-2 py-1.5 text-center"><button className="text-red-400 hover:text-red-600 cursor-pointer p-1 rounded-sm hover:bg-red-50 transition-colors" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}><X size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="space-y-1"><Label className="text-xs">Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms or instructions" className="h-8 text-xs" /></div>
      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="ghost" className="cursor-pointer h-8 text-xs" onClick={onClose}>Cancel</Button>
        <Button className="cursor-pointer h-8 text-xs" onClick={handleSubmit} disabled={isSubmitting}>Create RFQ</Button>
      </div>
    </div>
  );
}

export default function PurchasePage() {
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
  const [orderSearch, setOrderSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [rfqSearch, setRfqSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [rfqFilter, setRfqFilter] = useState("all");
  const [showPOForm, setShowPOForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showRFQForm, setShowRFQForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [receivingPO, setReceivingPO] = useState<any | null>(null);
  const [editingVendor, setEditingVendor] = useState<any | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [convertRFQ, setConvertRFQ] = useState<any | null>(null);

  const { data: stats } = useQuery({ queryKey: ["purchase", "stats"], queryFn: () => api.get<any>("/purchase/stats") });
  const { data: orders } = useQuery({ queryKey: ["purchase", "orders"], queryFn: () => api.get<any[]>("/purchase/orders") });
  const { data: vendors } = useQuery({ queryKey: ["purchase", "vendors"], queryFn: () => api.get<any[]>("/purchase/vendors") });
  const { data: rfqs } = useQuery({ queryKey: ["purchase", "rfqs"], queryFn: () => api.get<any[]>("/purchase/rfqs") });

  const createPO = useMutation({
    mutationFn: (data: any) => api.post("/purchase/orders", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase"] }); toast.success("PO Created"); setShowPOForm(false); }
  });

  const createRFQ = useMutation({
    mutationFn: (data: any) => api.post("/purchase/rfqs", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase"] }); toast.success("RFQ created"); setShowRFQForm(false); }
  });

  const updatePOStatus = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/purchase/orders/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase"] }); qc.invalidateQueries({ queryKey: ["inventory"] }); toast.success("Order status updated"); },
    onError: (err: any) => toast.error(err?.message || "Failed to update status")
  });

  const updateRFQStatus = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/purchase/rfqs/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase"] }); toast.success("RFQ status updated"); }
  });

  const convertRFQtoPO = useMutation({
    mutationFn: ({ rfqId, items, deliveryDate }: any) => api.post(`/purchase/rfqs/${rfqId}/convert`, { items, deliveryDate }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["purchase"] }); toast.success("PO generated from RFQ"); setConvertRFQ(null); }
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post("/purchase/orders/import", formData);
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["purchase"] });
      toast.success(`Imported ${res.count} purchase orders`);
    },
    onError: (err: any) => toast.error(err.message || "Import failed"),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
  };

  const handleDownloadPO = (orderId: string, orderNumber: string) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/purchase/orders/${orderId}/pdf`;
    window.location.href = url;
  };

  const filteredOrders = orders?.filter((o) => {
    const matchesSearch = o.poNumber.toLowerCase().includes(orderSearch.toLowerCase()) || o.vendor?.name.toLowerCase().includes(orderSearch.toLowerCase());
    const statusMatch = orderFilter === "all" ? true : o.status === orderFilter;
    return matchesSearch && statusMatch;
  });

  const filteredRFQs = rfqs?.filter((r) => {
    const matchesSearch = r.rfqNumber?.toLowerCase().includes(rfqSearch.toLowerCase()) || r.vendor?.name?.toLowerCase().includes(rfqSearch.toLowerCase());
    const statusMatch = rfqFilter === "all" ? true : r.status === rfqFilter;
    return matchesSearch && statusMatch;
  });

  const filteredVendors = vendors?.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (v.city ?? "").toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (v.email ?? "").toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const selectedVendorData = vendors?.find((v) => v._id === selectedVendor);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Purchase Management</h1>
        <p className="text-sm text-muted-foreground">Vendors, RFQs, purchase orders, and goods receipt.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="dashboard" className="cursor-pointer">Dashboard</TabsTrigger>
          <TabsTrigger value="orders" className="cursor-pointer">Purchase Orders</TabsTrigger>
          <TabsTrigger value="rfqs" className="cursor-pointer">RFQs</TabsTrigger>
          <TabsTrigger value="vendors" className="cursor-pointer">Vendors</TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="mt-4 space-y-6">
          {!stats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: "Total Spend", value: `₹${(stats.totalSpend || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
                { label: "Total Orders", value: stats.totalOrders || 0, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Pending", value: stats.pending || 0, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Received", value: stats.received || 0, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Active Vendors", value: stats.totalVendors || 0, icon: Truck, color: "text-purple-600", bg: "bg-purple-50" },
              ].map((item) => (
                <Card key={item.label}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">{item.label}</p>
                        <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                      </div>
                      <div className={`p-1.5 rounded-md ${item.bg}`}><item.icon size={14} className={item.color} /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 size={16} />Monthly Purchase Spend (₹)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats?.monthly || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip cursor={{ fill: "transparent" }} formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                    <Bar dataKey="spend" radius={[3, 3, 0, 0]} name="Spend">
                      {stats?.monthly?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Package size={16} />Critical Receipts</CardTitle></CardHeader>
              <CardContent className="p-0 overflow-y-auto max-h-64">
                {!orders ? <Skeleton className="h-48 m-4" /> : (
                  <div className="divide-y divide-border/50">
                    {orders.filter((o) => ["approved", "sent", "partial"].includes(o.status)).map((o, i) => (
                      <div key={o._id || i} className="p-4 hover:bg-muted/30 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-sm text-primary">{o.poNumber}</p>
                          <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", PO_STATUS_COLORS[o.status])}>{o.status}</Badge>
                        </div>
                        <p className="text-xs font-medium truncate mb-3">{o.vendor?.name}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1"><Calendar size={10} /> Due {o.deliveryDate || "—"}</p>
                          <Button size="sm" variant="secondary" className="cursor-pointer h-7 text-[10px] font-semibold rounded-full" onClick={() => setReceivingPO(o)}>Receive</Button>
                        </div>
                      </div>
                    ))}
                    {orders.filter((o) => ["approved", "sent", "partial"].includes(o.status)).length === 0 && (
                      <div className="py-16 text-center px-6">
                        <CheckCircle size={28} className="mx-auto mb-3 text-emerald-500 opacity-40" />
                        <p className="text-xs text-muted-foreground">No pending receipts</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PURCHASE ORDERS */}
        <TabsContent value="orders" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-1.5 flex-wrap">
              {["all", "draft", "approved", "sent", "partial", "received", "cancelled"].map((s) => (
                <Button key={s} size="sm" variant={orderFilter === s ? "default" : "outline"}
                  className={cn("cursor-pointer h-7 text-[10px] font-bold uppercase tracking-wider rounded-full", orderFilter === s ? "shadow-sm" : "bg-transparent")}
                  onClick={() => setOrderFilter(s)}>
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search POs..." className="pl-8 h-8 text-xs w-48 rounded-full bg-muted/30" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" className="h-8 rounded-full relative cursor-pointer" disabled={importMutation.isPending}>
                <Upload size={14} className="mr-2" />
                {importMutation.isPending ? "..." : "Import"}
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".csv,.xlsx" onChange={handleFileUpload} />
              </Button>
              <Dialog open={showPOForm} onOpenChange={setShowPOForm}>
                <DialogTrigger asChild>
                  <Button size="sm" className="cursor-pointer gap-1 h-8 rounded-full px-4"><Plus size={14} /> New PO</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
                  <POForm onSubmit={(data) => createPO.mutateAsync(data)} onClose={() => setShowPOForm(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {!orders ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : (
            <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">PO #</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Vendor</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">Date</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden lg:table-cell">Delivery</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">Items</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Total</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(filteredOrders ?? []).map((o, i) => (
                    <tr key={o._id ?? `po-${i}`} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-5 py-3 font-medium text-primary text-xs">{o.poNumber}</td>
                      <td className="px-5 py-3 text-sm font-medium">{o.vendor?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell">{o.date}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground hidden lg:table-cell">{o.deliveryDate ?? "—"}</td>
                      <td className="px-5 py-3 text-[10px] text-muted-foreground hidden md:table-cell max-w-[150px] truncate">
                        {o.items?.map((i: any) => `${i.quantity}x ${i.productName || 'Product'}`).join(", ") || "No items"}
                      </td>
                      <td className="px-5 py-3 font-semibold text-sm">₹{o.total?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-tight h-5 px-2", PO_STATUS_COLORS[o.status] ?? "")}>
                          {o.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 items-center opacity-70 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-[10px] gap-1 rounded-full px-2" onClick={() => handleDownloadPO(o._id, o.poNumber)}>
                            <Download size={12} /> PDF
                          </Button>
                          <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs gap-1.5 font-medium rounded-full px-3" onClick={() => setSelectedPO(o)}>
                            <Eye size={12} /> View
                          </Button>
                          {o.status === "draft" && (
                            <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                              onClick={() => updatePOStatus.mutate({ id: o._id, status: "approved" })}>Approve</Button>
                          )}
                          {o.status === "approved" && (
                            <>
                              <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                                onClick={() => updatePOStatus.mutate({ id: o._id, status: "sent" })}>Mark Sent</Button>
                              <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs gap-1 font-semibold text-green-600 hover:bg-green-50"
                                onClick={() => setReceivingPO(o)}>
                                <Package size={12} /> Receive
                              </Button>
                            </>
                          )}
                          {["sent", "partial"].includes(o.status) && (
                            <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs gap-1 font-semibold text-green-600 hover:bg-green-50"
                              onClick={() => setReceivingPO(o)}>
                              <Package size={12} /> Receive
                            </Button>
                          )}
                          {o.status !== "cancelled" && o.status !== "received" && (
                            <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs font-semibold text-red-600 hover:bg-red-50"
                              onClick={() => updatePOStatus.mutate({ id: o._id, status: "cancelled" })}>
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(filteredOrders ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">
                        <ShoppingBag size={32} className="mx-auto mb-3 opacity-20" />
                        No purchase orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* RFQs */}
        <TabsContent value="rfqs" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-1.5 flex-wrap">
              {["all", "draft", "sent", "received", "converted", "cancelled"].map((s) => (
                <Button key={s} size="sm" variant={rfqFilter === s ? "default" : "outline"}
                  className={cn("cursor-pointer h-7 text-[10px] font-bold uppercase tracking-wider rounded-full", rfqFilter === s ? "shadow-sm" : "bg-transparent")}
                  onClick={() => setRfqFilter(s)}>
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search RFQs..." className="pl-8 h-8 text-xs w-48 rounded-full bg-muted/30" value={rfqSearch} onChange={(e) => setRfqSearch(e.target.value)} />
              </div>
              <Dialog open={showRFQForm} onOpenChange={setShowRFQForm}>
                <DialogTrigger asChild>
                  <Button size="sm" className="cursor-pointer gap-1 h-8 rounded-full px-4">
                    <Plus size={14} /> New RFQ
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>New Request for Quotation</DialogTitle></DialogHeader>
                  <RFQForm onSubmit={(data: any) => createRFQ.mutateAsync(data)} onClose={() => setShowRFQForm(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {!rfqs ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : (
            <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">RFQ #</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Vendor</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">Date</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">Due</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Items</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(filteredRFQs ?? []).map((r: any, i: number) => (
                    <tr key={r._id ?? `rfq-${i}`} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-5 py-3 font-medium text-primary text-xs">{r.rfqNumber}</td>
                      <td className="px-5 py-3 text-sm font-medium">{r.vendor?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell">{r.date}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground hidden md:table-cell">{r.dueDate ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{r.items?.length ?? 0} items</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-tight h-5 px-2", RFQ_STATUS_COLORS[r.status] ?? "")}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 items-center opacity-70 group-hover:opacity-100 transition-opacity">
                          {r.status === "draft" && (
                            <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                              onClick={() => updateRFQStatus.mutate({ id: r._id, status: "sent" })}>Send</Button>
                          )}
                          {r.status === "sent" && (
                            <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs font-semibold text-green-600 hover:bg-green-50"
                              onClick={() => updateRFQStatus.mutate({ id: r._id, status: "received" })}>Mark Received</Button>
                          )}
                          {r.status === "received" && (
                            <Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs gap-1 font-semibold text-emerald-600 hover:bg-emerald-50"
                              onClick={() => setConvertRFQ(r)}>
                              Convert <ArrowRight size={12} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(filteredRFQs ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">
                        <FileText size={32} className="mx-auto mb-3 opacity-20" />
                        No quotation requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* VENDORS */}
        <TabsContent value="vendors" className="mt-4 space-y-4">
          <div className="flex gap-2 items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search vendors..." className="pl-8 h-9 text-xs rounded-full bg-muted/30" value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} />
            </div>
            <Dialog open={showVendorForm || !!editingVendor} onOpenChange={(v) => { if (!v) { setShowVendorForm(false); setEditingVendor(null); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="cursor-pointer gap-1 h-9 rounded-full px-4" onClick={() => setShowVendorForm(true)}>
                  <Plus size={14} /> New Vendor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingVendor ? "Edit Vendor" : "New Vendor"}</DialogTitle></DialogHeader>
                <VendorDialog vendor={editingVendor} onClose={() => { setShowVendorForm(false); setEditingVendor(null); }} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-start">
            {/* Vendor List */}
            <div className="lg:col-span-5 border rounded-xl overflow-hidden shadow-sm bg-card flex flex-col h-[600px]">
              <div className="px-4 py-3 border-b bg-muted/20 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Directory ({filteredVendors?.length || 0})
              </div>
              {!vendors ? (
                <div className="flex-1 p-4"><Skeleton className="h-full w-full opacity-50" /></div>
              ) : (
                <div className="divide-y divide-border/50 overflow-y-auto flex-1">
                  {filteredVendors?.map((v, i) => (
                    <div
                      key={v._id || i}
                      className={cn("px-4 py-3.5 cursor-pointer transition-all border-l-2", selectedVendor === v._id ? "bg-primary/5 border-primary" : "border-transparent hover:bg-muted/30")}
                      onClick={() => setSelectedVendor(v._id)}
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-start justify-between">
                          <p className="font-bold text-sm leading-tight">{v.name}</p>
                          <button
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
                            onClick={(e) => { e.stopPropagation(); setEditingVendor(v); }}
                          >
                            <Pencil size={12} className="text-muted-foreground" />
                          </button>
                        </div>
                        <StarRating value={v.rating ?? 3} />
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Mail size={10} /> {v.email || "No email"}</p>
                          {(v.city || v.state) && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Building2 size={10} /> {[v.city, v.state].filter(Boolean).join(", ")}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredVendors?.length === 0 && (
                    <div className="px-4 py-16 text-center text-muted-foreground">
                      <Truck size={32} className="mx-auto mb-3 opacity-20" />
                      No vendors found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Vendor Detail Panel */}
            <div className="lg:col-span-7 h-full">
              {selectedVendor && selectedVendorData ? (
                <Card className="h-full border-primary/20 shadow-md bg-card/50 backdrop-blur-sm flex flex-col pt-2 animate-in fade-in slide-in-from-right-4">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Truck size={20} /></div>
                          {selectedVendorData.name}
                        </CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="cursor-pointer h-8 w-8 rounded-full" onClick={() => setEditingVendor(selectedVendorData)}>
                          <Pencil size={14} />
                        </Button>
                        <Button size="icon" variant="ghost" className="cursor-pointer h-8 w-8 rounded-full" onClick={() => setSelectedVendor(null)}>
                          <X size={16} />
                        </Button>
                      </div>
                    </div>
                    <StarRating value={selectedVendorData.rating ?? 3} />
                  </CardHeader>
                  <CardContent className="space-y-6 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-xl bg-muted/20 border border-border/50 text-sm">
                      {selectedVendorData.email && <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Email</p><p className="font-medium text-xs break-all">{selectedVendorData.email}</p></div>}
                      {selectedVendorData.phone && <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Phone</p><p className="font-medium text-xs">{selectedVendorData.phone}</p></div>}
                      {selectedVendorData.gstin && <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">GSTIN</p><p className="font-medium text-xs text-primary">{selectedVendorData.gstin}</p></div>}
                      {selectedVendorData.paymentTerms && <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Payment Terms</p><p className="font-medium text-xs capitalize">{selectedVendorData.paymentTerms}</p></div>}
                      {selectedVendorData.leadTime && <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Lead Time</p><p className="font-bold text-xs text-amber-600">{selectedVendorData.leadTime} days</p></div>}
                      {(selectedVendorData.city || selectedVendorData.state) && <div><p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Location</p><p className="font-medium text-xs">{[selectedVendorData.city, selectedVendorData.state].filter(Boolean).join(", ")}</p></div>}
                    </div>

                    <div>
                      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2"><ShoppingBag size={12} /> Recent Purchase Orders</h3>
                      <div className="space-y-2">
                        {orders?.filter((o) => o.vendor?._id === selectedVendor || o.vendorId === selectedVendor).slice(0, 5).map((o, i) => (
                          <div key={o._id || i} className="flex items-center justify-between text-xs p-3 rounded-lg border bg-card shadow-sm">
                            <span className="font-bold text-primary">{o.poNumber}</span>
                            <span className="text-muted-foreground"><Calendar size={10} className="inline mr-1" />{o.date}</span>
                            <span className="font-bold">₹{o.total?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold h-5 px-2", PO_STATUS_COLORS[o.status] ?? "")}>{o.status}</Badge>
                          </div>
                        ))}
                        {(!orders?.some((o) => o.vendor?._id === selectedVendor || o.vendorId === selectedVendor)) && (
                          <p className="text-xs text-muted-foreground text-center py-4">No orders for this vendor yet</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center h-full border rounded-xl bg-muted/10 border-dashed text-muted-foreground p-8" style={{ minHeight: 400 }}>
                  <Truck size={48} className="mx-auto mb-4 opacity-20 text-primary" />
                  <p className="font-medium text-sm text-foreground/70">Select a vendor to view details</p>
                  <p className="text-xs mt-1 text-center max-w-xs">Click on a vendor in the directory to view their profile, order history, and stats.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* PO Detail Dialog */}
      <Dialog open={!!selectedPO} onOpenChange={() => setSelectedPO(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center pr-6">
              <span>Order Detail — {selectedPO?.poNumber}</span>
              <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", PO_STATUS_COLORS[selectedPO?.status])}>{selectedPO?.status}</Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-muted/20 border text-xs">
                <div><p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Vendor</p><p className="font-semibold text-sm text-primary">{selectedPO.vendor?.name}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Created</p><p className="font-semibold">{selectedPO.date}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Delivery</p><p className="font-semibold text-amber-600">{selectedPO.deliveryDate || "—"}</p></div>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold uppercase text-muted-foreground">Product</th>
                      <th className="text-center px-4 py-2.5 font-semibold uppercase text-muted-foreground">Qty</th>
                      <th className="text-center px-4 py-2.5 font-semibold uppercase text-muted-foreground">Received</th>
                      <th className="text-right px-4 py-2.5 font-semibold uppercase text-muted-foreground">Unit</th>
                      <th className="text-right px-4 py-2.5 font-semibold uppercase text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {selectedPO.items.map((item: any, i: number) => (
                      <tr key={item.productId ?? item.id ?? item.productName ?? i} className="hover:bg-muted/10">
                        <td className="px-4 py-2.5 font-medium">{item.productName}</td>
                        <td className="px-4 py-2.5 text-center font-semibold">{item.quantity}</td>
                        <td className={cn("px-4 py-2.5 text-center font-semibold", (item.receivedQuantity || 0) >= item.quantity ? "text-emerald-500" : "text-amber-500")}>{item.receivedQuantity || 0}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">₹{item.unitPrice?.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">₹{item.amount?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/20 border-t">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-bold text-[11px] uppercase text-muted-foreground">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-primary">₹{selectedPO.total?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                {selectedPO.status === "draft" && <Button className="cursor-pointer h-8 text-xs" onClick={() => { updatePOStatus.mutate({ id: selectedPO._id, status: "approved" }); setSelectedPO(null); }}>Approve Order</Button>}
                {selectedPO.status === "approved" && (
                  <>
                    <Button variant="outline" className="cursor-pointer h-8 text-xs" onClick={() => { updatePOStatus.mutate({ id: selectedPO._id, status: "sent" }); setSelectedPO(null); }}>Mark Sent</Button>
                    <Button className="cursor-pointer h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => { setReceivingPO(selectedPO); setSelectedPO(null); }}>Receive Items</Button>
                  </>
                )}
                {["sent", "partial"].includes(selectedPO.status) && <Button className="cursor-pointer h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => { setReceivingPO(selectedPO); setSelectedPO(null); }}>Update Receipt</Button>}
                {selectedPO.status !== "cancelled" && selectedPO.status !== "received" && (
                  <Button variant="ghost" className="cursor-pointer h-8 text-xs text-red-600 hover:bg-red-50" onClick={() => { updatePOStatus.mutate({ id: selectedPO._id, status: "cancelled" }); setSelectedPO(null); }}>
                    Cancel Order
                  </Button>
                )}
                <Button variant="ghost" className="cursor-pointer h-8 text-xs" onClick={() => setSelectedPO(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receiving Dialog */}
      <Dialog open={!!receivingPO} onOpenChange={() => setReceivingPO(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Log Item Receipt — {receivingPO?.poNumber}</DialogTitle></DialogHeader>
          {receivingPO && <ReceivePODialog po={receivingPO} onClose={() => setReceivingPO(null)} />}
        </DialogContent>
      </Dialog>

      {/* Convert RFQ Dialog */}
      <Dialog open={!!convertRFQ} onOpenChange={() => setConvertRFQ(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Convert RFQ to Purchase Order</DialogTitle></DialogHeader>
          {convertRFQ && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border">Enter the final quoted unit prices from the vendor to generate the purchase order for <span className="text-primary font-semibold">{convertRFQ.rfqNumber}</span>.</p>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold uppercase text-muted-foreground">Item</th>
                      <th className="text-center px-4 py-2.5 font-semibold uppercase text-muted-foreground">Qty</th>
                      <th className="text-right px-4 py-2.5 font-semibold uppercase text-muted-foreground">Quote/Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {convertRFQ.items.map((item: any, i: number) => (
                      <tr key={item.productId ?? item.id ?? item.productName ?? i} className="bg-card">
                        <td className="px-4 py-2.5 font-medium">{item.productName}</td>
                        <td className="px-4 py-2.5 text-center font-semibold">{item.quantity}</td>
                        <td className="px-4 py-2.5">
                          <Input
                            type="number"
                            className="h-7 text-xs text-right w-28 ml-auto"
                            placeholder="Rate ₹"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const updatedItems = [...convertRFQ.items];
                              updatedItems[i].unitPrice = Number(e.target.value);
                              setConvertRFQ({ ...convertRFQ, items: updatedItems });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="ghost" className="cursor-pointer h-8 text-xs" onClick={() => setConvertRFQ(null)}>Cancel</Button>
                <Button className="cursor-pointer h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => convertRFQtoPO.mutate({
                    rfqId: convertRFQ._id,
                    items: convertRFQ.items.map((i: any) => ({ ...i, unitPrice: i.unitPrice || 0, taxRate: 18 })),
                    deliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
                  })}>
                  Generate PO
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}