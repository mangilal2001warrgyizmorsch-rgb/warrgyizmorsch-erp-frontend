"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Warehouse, Package, Hash, MapPin, Search } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function WarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [searchQuery, setSearchQuery] = useState("");

  const { data: warehouses, isLoading: isWarehouseLoading } = useQuery({
    queryKey: ["inventory", "warehouses"],
    queryFn: () => api.get<any[]>("/inventory/warehouses"),
  });

  const { data: stockLevels, isLoading: isStockLoading } = useQuery({
    queryKey: ["inventory", "stock", id],
    queryFn: () => api.get<any[]>(`/inventory/stock?warehouseId=${id}`),
    enabled: !!id,
  });

  const warehouse = warehouses?.find((w: any) => w._id === id);

  const filteredStock = stockLevels?.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.product?.name?.toLowerCase().includes(q) || s.product?.sku?.toLowerCase().includes(q);
  }) || [];

  if (isWarehouseLoading || isStockLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="p-10 text-center text-muted-foreground flex flex-col items-center">
        <Warehouse size={48} className="opacity-20 mb-4" />
        <p className="font-medium text-lg">Warehouse not found</p>
        <Button variant="outline" className="mt-4 cursor-pointer" onClick={() => router.push("/inventory#warehouses")}>
          Return to Inventory
        </Button>
      </div>
    );
  }

  const totalStockItems = stockLevels?.length || 0;
  const totalUnits = stockLevels?.reduce((acc, s) => acc + (s.quantity || 0), 0) || 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push("/inventory#warehouses")}
          className="rounded-full cursor-pointer h-8 w-8"
        >
          <ArrowLeft size={18} />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{warehouse.name}</h1>
            <Badge variant="outline" className={warehouse.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500"}>
              {warehouse.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Hash size={12} /> {warehouse.code}
            {warehouse.location && (
              <>
                <span className="mx-1">•</span>
                <MapPin size={12} /> {warehouse.location}
              </>
            )}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="bg-blue-100 p-3 rounded-full mb-3">
              <Package size={24} className="text-blue-600" />
            </div>
            <p className="text-3xl font-bold">{totalStockItems}</p>
            <p className="text-sm text-muted-foreground mt-1">Unique Products</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <div className="bg-purple-100 p-3 rounded-full mb-3">
              <Warehouse size={24} className="text-purple-600" />
            </div>
            <p className="text-3xl font-bold">{(totalUnits).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Unit Quantity</p>
          </CardContent>
        </Card>

        {warehouse.capacity && (
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <div className="bg-amber-100 p-3 rounded-full mb-3">
                <Hash size={24} className="text-amber-600" />
              </div>
              <p className="text-3xl font-bold">
                {Math.min(100, Math.round((totalUnits / warehouse.capacity) * 100))}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">Capacity Used ({warehouse.capacity} max)</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stock Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
          <CardTitle className="text-lg">Stock Inventory</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search stock..." 
              className="pl-9 h-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-y">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Quantity</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden sm:table-cell">Batch Number</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((stock) => (
                  <tr key={stock._id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-5 py-3">
                      <p className="font-medium text-primary">{stock.product?.name || "Unknown Product"}</p>
                      <p className="text-xs text-muted-foreground">{stock.product?.sku}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">
                      {stock.product?.category || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${stock.quantity === 0 ? "text-red-500" : stock.quantity < (stock.product?.minStockLevel || 10) ? "text-amber-500" : "text-green-600"}`}>
                          {(stock.quantity || 0).toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {stock.product?.unitOfMeasure}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">
                      {stock.batchNumber ? (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {stock.batchNumber}
                        </Badge>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
                {filteredStock.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                      No stock found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
