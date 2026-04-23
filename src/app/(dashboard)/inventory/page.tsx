"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus,
  Package,
  AlertTriangle,
  Warehouse,
  ArrowRightLeft,
  TrendingUp,
  BarChart3,
  Search,
  RefreshCw,
  Pencil,
  BookOpen,
} from "lucide-react";
type Id<T extends string> = string;
type Doc<T extends string> = any;
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

const CHART_COLORS = ["#00AFA7", "#F05D5E", "#E7A977", "#FFE66D", "#6C5B7B", "#C06C84", "#F67280", "#F8B195"];
import { cn } from "@/lib/utils";

// ── Edit Product Dialog ───────────────────────────────────────────
function EditProductDialog({
  product,
  open,
  onClose,
}: {
  product: Doc<"products"> | null;
  open: boolean;
  onClose: () => void;
}) {
  const updateProduct = useMutation({
    mutationFn: ({ id, ...data }: any) =>
      api.put(`/inventory/products/${id}`, data),
  });
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    sellingPrice: String(product?.sellingPrice ?? ""),
    costPrice: String(product?.costPrice ?? ""),
    taxRate: String(product?.taxRate ?? "18"),
    reorderPoint: String(product?.reorderPoint ?? ""),
    barcode: product?.barcode ?? "",
    isActive: product?.isActive ?? true,
  });

  const handleSave = async () => {
    if (!product) return;
    try {
      await updateProduct.mutateAsync({
        id: product._id,
        name: form.name || undefined,
        description: form.description || undefined,
        sellingPrice: form.sellingPrice
          ? parseFloat(form.sellingPrice)
          : undefined,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
        taxRate: form.taxRate ? parseFloat(form.taxRate) : undefined,
        reorderPoint: form.reorderPoint
          ? parseInt(form.reorderPoint)
          : undefined,
        barcode: form.barcode || undefined,
        isActive: form.isActive,
      });
      toast.success("Product updated");
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update product");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Product — {product?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Sell Price (₹)</Label>
              <Input
                type="number"
                value={form.sellingPrice}
                onChange={(e) =>
                  setForm({ ...form, sellingPrice: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cost Price (₹)</Label>
              <Input
                type="number"
                value={form.costPrice}
                onChange={(e) =>
                  setForm({ ...form, costPrice: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">GST %</Label>
              <Input
                type="number"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Reorder Point</Label>
              <Input
                type="number"
                value={form.reorderPoint}
                onChange={(e) =>
                  setForm({ ...form, reorderPoint: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Barcode</Label>
              <Input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="accent-primary"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Product is Active
          </label>
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              className="flex-1 cursor-pointer h-8 text-xs"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 cursor-pointer h-8 text-xs"
              onClick={handleSave}
              disabled={updateProduct.isPending}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InventoryPage() {
  const router = useRouter();
  const [tab, setTabState] = useState("dashboard");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && ["dashboard", "stock", "products", "movements", "valuation", "warehouses"].includes(hash)) {
      setTabState(hash);
    }
  }, []);

  const setTab = (newTab: string) => {
    setTabState(newTab);
    window.history.replaceState(null, "", `#${newTab}`);
  };
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] =
    useState<string>("all");
  const [editProduct, setEditProduct] = useState<Doc<"products"> | null>(null);

  const { data: stats } = useQuery({
    queryKey: ["inventory", "stats"],
    queryFn: () => api.get<any>("/inventory/stats"),
  });
  const { data: stockLevels } = useQuery({
    queryKey: ["inventory", "stock"],
    queryFn: () => api.get<any[]>("/inventory/stock"),
  });
  const { data: products } = useQuery({
    queryKey: ["inventory", "products", productSearch],
    queryFn: () =>
      api.get<any[]>(
        `/inventory/products${productSearch ? `?search=${productSearch}` : ""}`,
      ),
  });
  const { data: warehouses } = useQuery({
    queryKey: ["inventory", "warehouses"],
    queryFn: () => api.get<any[]>("/inventory/warehouses"),
  });
  const { data: lowStock } = useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: () => api.get<any[]>("/inventory/low-stock"),
  });
  const { data: movements } = useQuery({
    queryKey: ["inventory", "movements"],
    queryFn: () => api.get<any[]>("/inventory/movements"),
  });
  const { data: valuation } = useQuery({
    queryKey: ["inventory", "valuation"],
    queryFn: () => api.get<any[]>("/inventory/valuation"),
  });
  const { data: boms } = useQuery({
    queryKey: ["manufacturing", "boms"],
    queryFn: () => api.get<any[]>("/manufacturing/boms"),
  });

  const createProduct = useMutation({
    mutationFn: (data: any) => api.post("/inventory/products", data),
  });
  const adjustStock = useMutation({
    mutationFn: (data: any) => api.post("/inventory/adjust", data),
  });
  const createWarehouse = useMutation({
    mutationFn: (data: any) => api.post("/inventory/warehouses", data),
  });
  const transferStock = useMutation({
    mutationFn: (data: any) => api.post("/inventory/transfer", data),
  });

  const [productForm, setProductForm] = useState({
    name: "",
    category: "Finished Goods",
    unitOfMeasure: "Pcs",
    sellingPrice: "",
    costPrice: "",
    taxRate: "18",
    reorderPoint: "",
    isManufactured: true,
    isPurchased: false,
    isSold: true,
    description: "",
  });
  const [adjustForm, setAdjustForm] = useState({
    productId: "" as Id<"products"> | "",
    warehouseId: "" as Id<"warehouses"> | "",
    quantity: "1",
    type: "in",
    notes: "",
  });
  const [transferForm, setTransferForm] = useState({
    productId: "" as Id<"products"> | "",
    fromWarehouseId: "" as Id<"warehouses"> | "",
    toWarehouseId: "" as Id<"warehouses"> | "",
    quantity: "1",
    notes: "",
  });
  const [warehouseName, setWarehouseName] = useState("");
  const [warehouseCode, setWarehouseCode] = useState("");

  const handleCreateProduct = async () => {
    if (!productForm.name) {
      toast.error("Product name is required");
      return;
    }
    try {
      await createProduct.mutateAsync({
        name: productForm.name,
        description: productForm.description || undefined,
        category: productForm.category,
        unitOfMeasure: productForm.unitOfMeasure,
        sellingPrice: parseFloat(productForm.sellingPrice) || 0,
        costPrice: parseFloat(productForm.costPrice) || 0,
        taxRate: parseFloat(productForm.taxRate) || 18,
        reorderPoint: productForm.reorderPoint
          ? parseInt(productForm.reorderPoint)
          : undefined,
        isManufactured: productForm.isManufactured,
        isPurchased: productForm.isPurchased,
        isSold: productForm.isSold,
      });
      toast.success("Product created");
      setShowNewProduct(false);
      setProductForm({
        name: "",
        category: "Finished Goods",
        unitOfMeasure: "Pcs",
        sellingPrice: "",
        costPrice: "",
        taxRate: "18",
        reorderPoint: "",
        isManufactured: true,
        isPurchased: false,
        isSold: true,
        description: "",
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create product");
    }
  };

  const handleAdjust = async () => {
    if (!adjustForm.productId || !adjustForm.warehouseId) {
      toast.error("Select product and warehouse");
      return;
    }
    try {
      await adjustStock.mutateAsync({
        productId: adjustForm.productId as Id<"products">,
        warehouseId: adjustForm.warehouseId as Id<"warehouses">,
        quantity: parseInt(adjustForm.quantity) || 1,
        type: adjustForm.type,
        notes: adjustForm.notes || undefined,
      });
      toast.success("Stock adjusted");
      setShowAdjust(false);
      setAdjustForm({
        productId: "",
        warehouseId: "",
        quantity: "1",
        type: "in",
        notes: "",
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to adjust stock");
    }
  };

  const handleTransfer = async () => {
    if (
      !transferForm.productId ||
      !transferForm.fromWarehouseId ||
      !transferForm.toWarehouseId
    ) {
      toast.error("Fill in all fields");
      return;
    }
    if (transferForm.fromWarehouseId === transferForm.toWarehouseId) {
      toast.error("Source and destination must be different");
      return;
    }
    try {
      await transferStock.mutateAsync({
        productId: transferForm.productId as Id<"products">,
        fromWarehouseId: transferForm.fromWarehouseId as Id<"warehouses">,
        toWarehouseId: transferForm.toWarehouseId as Id<"warehouses">,
        quantity: parseInt(transferForm.quantity) || 1,
        notes: transferForm.notes || undefined,
      });
      toast.success("Stock transferred");
      setShowTransfer(false);
      setTransferForm({
        productId: "",
        fromWarehouseId: "",
        toWarehouseId: "",
        quantity: "1",
        notes: "",
      });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          (err instanceof Error ? err.message : "Transfer failed"),
      );
    }
  };

  const handleCreateWarehouse = async () => {
    if (!warehouseName || !warehouseCode) {
      toast.error("Name and code required");
      return;
    }
    try {
      await createWarehouse.mutateAsync({
        name: warehouseName,
        code: warehouseCode.toUpperCase(),
      });
      toast.success("Warehouse created");
      setWarehouseName("");
      setWarehouseCode("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create warehouse");
    }
  };

  const filteredStockLevels =
    stockLevels?.filter(
      (s) =>
        selectedWarehouseFilter === "all" ||
        s.warehouseId === selectedWarehouseFilter,
    ) ?? [];

  const categoryBreakdown = (() => {
    if (!Array.isArray(valuation)) return [];
    const map: Record<string, number> = {};
    for (const v of valuation) {
      const cat = v.category || "Uncategorised";
      map[cat] = (map[cat] ?? 0) + (Number(v.stockValue) || 0);
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  })();

  const hasBOM = (productId: string) =>
    boms?.some((b) => b.productId === productId && b.isActive) ?? false;

  const movTypeCls = (t: string) =>
    t === "in"
      ? "bg-green-100 text-green-700 border-green-200"
      : t === "out"
        ? "bg-red-100 text-red-700 border-red-200"
        : t === "transfer"
          ? "bg-blue-100 text-blue-700 border-blue-200"
          : "bg-orange-100 text-orange-700 border-orange-200";

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Products, stock levels, movements, and warehouse management.
        </p>
      </div>

      {/* Low Stock Banner */}
      {lowStock && lowStock.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-orange-500 shrink-0" />
            <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
              {lowStock.length} item{lowStock.length > 1 ? "s" : ""} below
              reorder point
            </p>
          </div>
          <button
            className="text-xs font-medium text-orange-600 underline-offset-2 hover:underline cursor-pointer"
            onClick={() => setTab("alerts")}
          >
            View Alerts
          </button>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        {/* ── Tab bar + actions ── */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
          <TabsList className="grid grid-cols-6 w-full max-w-2xl">
            <TabsTrigger value="dashboard" className="cursor-pointer">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="stock" className="cursor-pointer">
              Stock
            </TabsTrigger>
            <TabsTrigger value="products" className="cursor-pointer">
              Products
            </TabsTrigger>
            <TabsTrigger value="movements" className="cursor-pointer">
              Movements
            </TabsTrigger>
            <TabsTrigger value="valuation" className="cursor-pointer">
              Valuation
            </TabsTrigger>
            <TabsTrigger value="warehouses" className="cursor-pointer">
              Warehouses
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {tab === "products" && (
              <Button
                size="sm"
                onClick={() => setShowNewProduct(true)}
                className="cursor-pointer gap-1 h-8 rounded-full px-4"
              >
                <Plus size={14} /> New Product
              </Button>
            )}
            {tab === "stock" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTransfer(true)}
                  className="cursor-pointer h-8 rounded-full px-4 bg-transparent"
                >
                  <ArrowRightLeft size={14} className="mr-1.5" />
                  Transfer
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAdjust(true)}
                  className="cursor-pointer gap-1 h-8 rounded-full px-4"
                >
                  <RefreshCw size={14} />
                  Adjust
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Dashboard ── */}
        <TabsContent value="dashboard" className="mt-4 space-y-4">
          {!stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total Products",
                  value: stats.totalProducts ?? 0,
                  sub: "Active SKUs",
                  icon: Package,
                  iconColor: "text-primary",
                },
                {
                  label: "Stock Value",
                  value: `₹${(Number(stats.totalStockValue) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
                  sub: "At cost price",
                  icon: TrendingUp,
                  iconColor: "text-emerald-500",
                },
                {
                  label: "Total Units",
                  value: (Number(stats.totalUnits) || 0).toLocaleString(),
                  sub: "All warehouses",
                  icon: BarChart3,
                  iconColor: "text-blue-500",
                },
                {
                  label: "Low Stock",
                  value: stats.lowStockCount ?? 0,
                  sub: "Need reorder",
                  icon: AlertTriangle,
                  iconColor: "text-orange-500",
                },
              ].map((k) => (
                <Card key={k.label} className="h-full">
                  <CardContent className="pt-4 pb-4 h-full flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                        {k.label}
                      </p>
                      <p className="text-xl font-bold">{k.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {k.sub}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/95 dark:bg-muted border border-border shadow-sm shrink-0">
                      <k.icon size={18} className={k.iconColor} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {categoryBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Stock Value by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categoryBreakdown}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/50"
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) =>
                        `₹${(v / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      formatter={(v: number) => [
                        `₹${v.toLocaleString("en-IN")}`,
                        "Value",
                      ]}
                      contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                    />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      name="Value"
                    >
                      {categoryBreakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Recent Stock Movements
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!movements ? (
                <Skeleton className="h-24 m-4" />
              ) : (
                <div className="divide-y divide-border/50">
                  {movements.slice(0, 8).map((m, i) => (
                    <div
                      key={m._id || i}
                      className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded font-medium border",
                            movTypeCls(m.type),
                          )}
                        >
                          {m.type}
                        </span>
                        <div>
                          <p className="font-medium">{m.productName}</p>
                          <p className="text-xs text-muted-foreground hidden md:block">
                            {m.warehouseName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "font-semibold text-sm",
                            m.type === "out" || m.type === "scrap"
                              ? "text-red-600"
                              : "text-green-600",
                          )}
                        >
                          {m.type === "out" || m.type === "scrap" ? "-" : "+"}
                          {m.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {movements.length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      No movements yet
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Stock Levels ── */}
        <TabsContent value="stock" className="mt-4 space-y-3">
          <Select
            value={selectedWarehouseFilter}
            onValueChange={setSelectedWarehouseFilter}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses?.map((w, i) => (
                <SelectItem key={w._id || i} value={w._id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!stockLevels ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                      Product
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">
                      Warehouse
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                      On Hand
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">
                      Reserved
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden lg:table-cell">
                      Batch
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredStockLevels.map((s, i) => {
                    // product/warehouse may be null if Mongoose populate fails (deleted refs)
                    const prod = s.product ?? s.productId ?? null;
                    const wh = s.warehouse ?? s.warehouseId ?? null;
                    const reorder = prod?.reorderPoint;
                    const isLow =
                      reorder !== undefined && s.quantity <= reorder;
                    return (
                      <tr
                        key={s._id || i}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium text-sm">
                            {prod?.name ?? (
                              <span className="italic text-muted-foreground">
                                Unknown
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {prod?.sku ?? "—"}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground hidden md:table-cell">
                          {wh?.name ?? "—"}
                        </td>
                        <td className="px-5 py-3 font-semibold text-sm">
                          {s.quantity ?? 0}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {prod?.unitOfMeasure}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-sm hidden md:table-cell">
                          {s.reservedQuantity ?? 0}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                          {s.batchNumber ?? "—"}
                        </td>
                        <td className="px-5 py-3">
                          {isLow ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold uppercase bg-orange-50 text-orange-700 border-orange-200"
                            >
                              Low
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold uppercase bg-green-50 text-green-700 border-green-200"
                            >
                              Healthy
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStockLevels.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-16 text-center text-muted-foreground"
                      >
                        No stock records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Products ── */}
        <TabsContent value="products" className="mt-4 space-y-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search products by name or SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-8 h-9 text-xs rounded-full bg-muted/30"
            />
          </div>
          <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                    Product
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                    Sell Price
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">
                    Cost
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden lg:table-cell">
                    GST
                  </th>
                  <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                    Tags
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {products?.map((p, i) => (
                  <tr
                    key={p._id || i}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-5 py-3">
                      <p
                        className="font-medium text-primary cursor-pointer hover:underline text-sm"
                        onClick={() => setEditProduct(p)}
                      >
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      {p.category}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-sm">
                      ₹{(Number(p.sellingPrice) || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground text-sm hidden md:table-cell">
                      ₹{(Number(p.costPrice) || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground text-sm hidden lg:table-cell">
                      {p.taxRate}%
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {p.isManufactured && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200">
                            Mfg
                          </span>
                        )}
                        {p.isSold && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-green-100 text-green-700 border border-green-200">
                            Sold
                          </span>
                        )}
                        {p.isPurchased && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                            Buy
                          </span>
                        )}
                        {!p.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-red-100 text-red-700 border border-red-200">
                            Off
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        {p.isManufactured && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="cursor-pointer h-7 text-xs gap-1.5 font-semibold rounded-full px-3"
                            onClick={() => {
                              if (hasBOM(p._id)) {
                                router.push("/manufacturing#bom");
                              } else {
                                router.push(`/manufacturing?newBomFor=${p._id}#bom`);
                              }
                            }}
                          >
                            <BookOpen size={12} />{" "}
                            {hasBOM(p._id) ? "BOM" : "Add BOM"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer h-7 w-7 p-0 rounded-full"
                          onClick={() => setEditProduct(p)}
                        >
                          <Pencil size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products?.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center text-muted-foreground"
                    >
                      <Package size={32} className="mx-auto mb-3 opacity-20" />
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Movements ── */}
        <TabsContent value="movements" className="mt-4">
          {!movements ? (
            <Skeleton className="h-[400px] rounded-xl" />
          ) : (
            <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                      Type
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                      Product
                    </th>
                    <th className="text-right px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                      Qty
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">
                      Warehouse
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">
                      Reference
                    </th>
                    <th className="text-right px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {movements.map((m, i) => (
                    <tr
                      key={m._id || i}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border",
                            movTypeCls(m.type),
                          )}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-sm">
                        {m.productName}
                      </td>
                      <td
                        className={cn(
                          "px-5 py-3 text-right font-semibold text-sm",
                          m.type === "out" || m.type === "scrap"
                            ? "text-red-600"
                            : "text-green-600",
                        )}
                      >
                        {m.type === "out" || m.type === "scrap" ? "-" : "+"}
                        {m.quantity}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">
                        {m.warehouseName}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell italic">
                        {m.reference ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground text-xs">
                        {new Date(m.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-16 text-center text-muted-foreground"
                      >
                        No movements yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Valuation ── */}
        <TabsContent value="valuation" className="mt-4 space-y-4">
          {!Array.isArray(valuation) ? (
            <Skeleton className="h-[400px] rounded-xl" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const totalCost = valuation.reduce(
                    (s, v) => s + (Number(v.stockValue) || 0),
                    0,
                  );
                  const totalRetail = valuation.reduce(
                    (s, v) => s + (Number(v.retailValue) || 0),
                    0,
                  );
                  const margin = totalRetail - totalCost;
                  return [
                    {
                      label: "Total Cost Value",
                      value: totalCost,
                      colorClass: "text-blue-600",
                    },
                    {
                      label: "Total Retail Value",
                      value: totalRetail,
                      colorClass: "text-emerald-600",
                    },
                    {
                      label: "Potential Margin",
                      value: margin,
                      colorClass: "text-purple-600",
                    },
                  ].map((k) => (
                    <Card key={k.label}>
                      <CardContent className="pt-4 pb-4">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                          {k.label}
                        </p>
                        <p className={cn("text-2xl font-bold", k.colorClass)}>
                          ₹
                          {(Number(k.value) || 0).toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  ));
                })()}
              </div>
              <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                        Product
                      </th>
                      <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">
                        Category
                      </th>
                      <th className="text-right px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                        Qty
                      </th>
                      <th className="text-right px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden md:table-cell">
                        Cost/Unit
                      </th>
                      <th className="text-right px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                        Cost Value
                      </th>
                      <th className="text-right px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase hidden lg:table-cell">
                        Retail
                      </th>
                      <th className="text-left px-5 py-3.5 font-semibold text-xs tracking-wider text-muted-foreground uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {valuation.map((v, i) => (
                      <tr
                        key={v.productId || i}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <p className="font-medium text-sm">{v.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {v.sku}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">
                          {v.category}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-sm">
                          {v.quantity}{" "}
                          <span className="text-xs text-muted-foreground">
                            {v.unitOfMeasure}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-muted-foreground text-sm hidden md:table-cell">
                          ₹{v.costPrice.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-sm">
                          ₹
                          {v.stockValue.toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td className="px-5 py-3 text-right text-muted-foreground text-sm hidden lg:table-cell">
                          ₹
                          {v.retailValue.toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td className="px-5 py-3">
                          {v.isLow ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold uppercase bg-orange-50 text-orange-700 border-orange-200"
                            >
                              Low
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold uppercase bg-green-50 text-green-700 border-green-200"
                            >
                              OK
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Warehouses ── */}
        <TabsContent value="warehouses" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Add Warehouse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Warehouse name"
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  className="h-9 text-xs"
                />
                <Input
                  placeholder="Code (e.g. WH-01)"
                  value={warehouseCode}
                  onChange={(e) => setWarehouseCode(e.target.value)}
                  className="sm:w-40 h-9 text-xs"
                />
                <Button
                  onClick={handleCreateWarehouse}
                  className="cursor-pointer shrink-0 h-9 gap-1 rounded-full px-4 text-xs"
                >
                  <Plus size={14} />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {warehouses?.map((w: any, i: number) => {
              return (
                <Card
                  key={w._id || i}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Warehouse size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{w.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.code}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Products
                        </p>
                        <p className="font-semibold">{w.totalProducts ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total Units
                        </p>
                        <p className="font-semibold">{(Number(w.totalUnits) || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          w.isActive
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200",
                        )}
                      >
                        {w.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs cursor-pointer"
                        onClick={() => router.push(`/inventory/warehouse/${w._id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {warehouses?.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                <Warehouse size={36} className="mx-auto mb-3 opacity-20" />
                <p>No warehouses yet</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Low Stock Alerts ── */}
        <TabsContent value="alerts" className="mt-4 space-y-3">
          {lowStock?.map(({ product, totalStock, reorderPoint }, i) => (
            <Card
              key={product._id || i}
              className="border-orange-200 dark:border-orange-800"
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-50 p-2 rounded-lg">
                      <AlertTriangle size={16} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sku} · {product.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="font-bold text-orange-600">
                        {totalStock}{" "}
                        <span className="text-[11px] text-muted-foreground font-normal">
                          {product.unitOfMeasure}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Reorder at
                      </p>
                      <p className="font-semibold">
                        {reorderPoint}{" "}
                        <span className="text-[11px] text-muted-foreground font-normal">
                          {product.unitOfMeasure}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-orange-50 dark:bg-orange-900/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-orange-400 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (totalStock / reorderPoint) * 100)}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          {lowStock?.length === 0 && (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <Package size={36} className="mx-auto mb-3 opacity-20" />
              <p>All stock levels are healthy</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── New Product Dialog ── */}
      <Dialog open={showNewProduct} onOpenChange={setShowNewProduct}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
                placeholder="Product name"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                value={productForm.description}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    description: e.target.value,
                  })
                }
                placeholder="Optional"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select
                  value={productForm.category}
                  onValueChange={(v) =>
                    setProductForm({ ...productForm, category: v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Finished Goods">
                      Finished Goods
                    </SelectItem>
                    <SelectItem value="Raw Material">Raw Material</SelectItem>
                    <SelectItem value="Semi-Finished">Semi-Finished</SelectItem>
                    <SelectItem value="Consumable">Consumable</SelectItem>
                    <SelectItem value="Trading">Trading</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit of Measure</Label>
                <Select
                  value={productForm.unitOfMeasure}
                  onValueChange={(v) =>
                    setProductForm({ ...productForm, unitOfMeasure: v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Pcs", "Kg", "Ltr", "Mtr", "Box", "Set", "Nos"].map(
                      (u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Sell Price (₹)</Label>
                <Input
                  type="number"
                  value={productForm.sellingPrice}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      sellingPrice: e.target.value,
                    })
                  }
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cost Price (₹)</Label>
                <Input
                  type="number"
                  value={productForm.costPrice}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      costPrice: e.target.value,
                    })
                  }
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">GST %</Label>
                <Input
                  type="number"
                  value={productForm.taxRate}
                  onChange={(e) =>
                    setProductForm({ ...productForm, taxRate: e.target.value })
                  }
                  placeholder="18"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reorder Point</Label>
              <Input
                type="number"
                value={productForm.reorderPoint}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    reorderPoint: e.target.value,
                  })
                }
                placeholder="e.g. 50"
                className="h-8 text-xs"
              />
            </div>
            <div className="flex gap-4 text-sm p-3 bg-muted/30 rounded-lg border border-border/50">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={productForm.isManufactured}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      isManufactured: e.target.checked,
                    })
                  }
                />
                Manufactured
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={productForm.isPurchased}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      isPurchased: e.target.checked,
                    })
                  }
                />
                Purchased
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={productForm.isSold}
                  onChange={(e) =>
                    setProductForm({ ...productForm, isSold: e.target.checked })
                  }
                />
                Sold
              </label>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="ghost"
                className="flex-1 cursor-pointer h-8 text-xs"
                onClick={() => setShowNewProduct(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 cursor-pointer h-8 text-xs"
                onClick={handleCreateProduct}
                disabled={createProduct.isPending}
              >
                Create Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Adjust Stock Dialog ── */}
      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Product</Label>
              <Select
                value={adjustForm.productId}
                onValueChange={(v) =>
                  setAdjustForm({
                    ...adjustForm,
                    productId: v as Id<"products">,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((p, i) => (
                    <SelectItem key={p._id || i} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Warehouse</Label>
              <Select
                value={adjustForm.warehouseId}
                onValueChange={(v) =>
                  setAdjustForm({
                    ...adjustForm,
                    warehouseId: v as Id<"warehouses">,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w, i) => (
                    <SelectItem key={w._id || i} value={w._id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select
                  value={adjustForm.type}
                  onValueChange={(v) =>
                    setAdjustForm({ ...adjustForm, type: v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Stock In</SelectItem>
                    <SelectItem value="out">Stock Out</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="scrap">Scrap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={adjustForm.quantity}
                  onChange={(e) =>
                    setAdjustForm({ ...adjustForm, quantity: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input
                value={adjustForm.notes}
                onChange={(e) =>
                  setAdjustForm({ ...adjustForm, notes: e.target.value })
                }
                placeholder="Optional"
                className="h-8 text-xs"
              />
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="ghost"
                className="flex-1 cursor-pointer h-8 text-xs"
                onClick={() => setShowAdjust(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 cursor-pointer h-8 text-xs"
                onClick={handleAdjust}
                disabled={adjustStock.isPending}
              >
                Apply Adjustment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Transfer Stock Dialog ── */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Product</Label>
              <Select
                value={transferForm.productId}
                onValueChange={(v) =>
                  setTransferForm({
                    ...transferForm,
                    productId: v as Id<"products">,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((p, i) => (
                    <SelectItem key={p._id || i} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From Warehouse</Label>
                <Select
                  value={transferForm.fromWarehouseId}
                  onValueChange={(v) =>
                    setTransferForm({
                      ...transferForm,
                      fromWarehouseId: v as Id<"warehouses">,
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((w, i) => (
                      <SelectItem key={w._id || i} value={w._id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To Warehouse</Label>
                <Select
                  value={transferForm.toWarehouseId}
                  onValueChange={(v) =>
                    setTransferForm({
                      ...transferForm,
                      toWarehouseId: v as Id<"warehouses">,
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses?.map((w, i) => (
                      <SelectItem key={w._id || i} value={w._id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                min={1}
                value={transferForm.quantity}
                onChange={(e) =>
                  setTransferForm({ ...transferForm, quantity: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input
                value={transferForm.notes}
                onChange={(e) =>
                  setTransferForm({ ...transferForm, notes: e.target.value })
                }
                placeholder="Optional"
                className="h-8 text-xs"
              />
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="ghost"
                className="flex-1 cursor-pointer h-8 text-xs"
                onClick={() => setShowTransfer(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 cursor-pointer h-8 text-xs"
                onClick={handleTransfer}
                disabled={transferStock.isPending}
              >
                <ArrowRightLeft size={13} className="mr-1.5" />
                Process Transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Product Dialog ── */}
      {editProduct && (
        <EditProductDialog
          product={editProduct}
          open={!!editProduct}
          onClose={() => setEditProduct(null)}
        />
      )}
    </div>
  );
}
