"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Download, CloudUpload, FileText, X, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ImportDialogProps {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => void;
  isPending: boolean;
  requiredColumns: string[];
  templateData: string;
  entityName: string;
}

export function ImportDialog({ 
  title,
  open, 
  onOpenChange, 
  onImport, 
  isPending,
  requiredColumns,
  templateData,
  entityName
}: ImportDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const handleDownloadTemplate = () => {
    const csvContent = requiredColumns.join(",") + "\n" + templateData;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entityName.toLowerCase().replace(/\s+/g, '_')}_template.csv`;
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
            <DialogTitle className="text-base font-bold">{title}</DialogTitle>
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
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full cursor-pointer" onClick={() => setSelectedFile(null)}>
                  <X size={14} />
                </Button>
              </div>

              <Button onClick={handleImport} className="w-full h-10 font-bold tracking-wide cursor-pointer" disabled={isPending}>
                {isPending ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Upload className="mr-2" size={16} />}
                Import {entityName} from File
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs cursor-pointer">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
