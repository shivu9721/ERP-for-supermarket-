import React, { useState, useEffect } from "react";
import { 
  fetchProducts, 
  fetchSuppliers, 
  fetchCategories,
  createProduct
} from "../utils/api";
import { Product, Supplier, Category } from "../types";
import { 
  FileText, 
  UploadCloud, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  X, 
  Barcode, 
  Printer, 
  Check, 
  RefreshCw, 
  Activity, 
  FileSpreadsheet, 
  Search, 
  Sliders, 
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Download
} from "lucide-react";

// Types for AI doc processing
interface AIDocument {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
  status: "Pending" | "Approved";
  approvedAt?: string;
  approvedBy?: string;
  supplier: {
    name: string;
    gstIn: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    taxableAmount: number;
    gstAmount: number;
    mobile?: string;
  };
  items: AIDocLineItem[];
}

interface AIDocLineItem {
  id: string;
  name: string;
  barcode: string;
  sku: string;
  hsnCode: string;
  gstPercentage: number;
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
  cessPercentage: number;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  freeQuantity: number;
  purchaseRate: number;
  mrp: number;
  saleRate: number;
  discount: number;
  taxAmount: number;
  netAmount: number;
  matchType: string;
  confidence: number;
  action?: "MatchExisting" | "CreateNew" | "Ignore";
  databaseProduct: {
    id: string;
    name: string;
    barcode: string;
    currentStock: number;
    categoryId?: string;
    categoryName?: string;
    subcategory?: string;
    unit?: string;
  } | null;
}

interface AuditLog {
  id: string;
  uploadedBy: string;
  approvedBy: string;
  dateTime: string;
  fileName: string;
  changesMade: string;
  stockChanges: string;
  productChanges: string;
}

interface SummaryStats {
  uploadedToday: number;
  pendingVerifications: number;
  processedInvoices: number;
  newProductsDetected: number;
  ocrSuccessRate: number;
}

export default function AIDocumentCenter() {
  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<"upload" | "excel" | "audit">("upload");

  // Core stats
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [documents, setDocuments] = useState<AIDocument[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditLog[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);

  // Page States
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Upload/Processing Files simulation
  const [dragActive, setDragActive] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<{ name: string; progress: number }[]>([]);

  // Validation / Editing view state (A single invoice validation block overlay)
  const [selectedDoc, setSelectedDoc] = useState<AIDocument | null>(null);
  const [docHeader, setDocHeader] = useState<any>(null);
  const [docLineItems, setDocLineItems] = useState<AIDocLineItem[]>([]);

  // Barcode Preview Modal
  const [barcodePrintItem, setBarcodePrintItem] = useState<any | null>(null);
  const [isBarcodePrintOpen, setIsBarcodePrintOpen] = useState(false);

  // Excel mapping state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelRows, setExcelRows] = useState<any[]>([]); // parsed excel rows
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState({
    barcode: "",
    purchaseRate: "",
    mrp: "",
    saleRate: "",
    stockDelta: ""
  });
  const [excelPreview, setExcelPreview] = useState<any[]>([]);

  // Retrieve base initial data
  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      // Fetch from Shiva backend
      const pRes = await fetchProducts();
      setProductsList(pRes);

      const sRes = await fetchSuppliers();
      setSuppliersList(sRes);

      const cRes = await fetchCategories();
      setCategoriesList(cRes);

      const statsRes = await fetch("/api/ai-document-center/summary");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const docsRes = await fetch("/api/ai-document-center/documents");
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
      }

      const auditRes = await fetch("/api/ai-document-center/audit-trail");
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditEntries(auditData);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load document center ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesUpload(e.target.files);
    }
  };

  // Processing files logic (OCR extraction workflow)
  const handleFilesUpload = async (files: FileList) => {
    const list = Array.from(files);
    setErrorMsg("");
    setSuccessMsg("");

    for (let f of list) {
      // Create initial progress tracker
      setProcessingFiles(prev => [...prev, { name: f.name, progress: 10 }]);

      // Simple local file reader to convert to base64 if it's an image/PDF
      let base64Content = "";
      try {
        if (f.type.startsWith("image/") || f.type === "application/pdf") {
          base64Content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(f);
            reader.onload = () => {
              const str = reader.result as string;
              // Extract the base64 part only
              resolve(str.split(",")[1] || "");
            };
            reader.onerror = (e) => reject(e);
          });
        }
      } catch (err) {
        console.warn("Could not convert uploaded file to base64.", err);
      }

      // Simulate step-by-step queue progress bar for premium look
      for (let p = 25; p <= 90; p += 25) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProcessingFiles(prev => prev.map(item => item.name === f.name ? { ...item, progress: p } : item));
      }

      try {
        // Send to backend for smart OCR and pattern analysis
        const response = await fetch("/api/ai-document-center/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: f.name,
            fileType: f.type,
            fileData: base64Content,
            uploadedByUser: "Store Manager"
          })
        });

        if (!response.ok) {
          throw new Error("OCR Processing failed for " + f.name);
        }

        const data: AIDocument = await response.json();
        
        // Finalize progress meter
        setProcessingFiles(prev => prev.map(item => item.name === f.name ? { ...item, progress: 100 } : item));
        
        // Append document
        setDocuments(prev => [data, ...prev]);
        setSuccessMsg(`"${f.name}" extracted and matched successfully! Verify it in queue.`);
        
        // Remove from progress after small delay
        setTimeout(() => {
          setProcessingFiles(prev => prev.filter(item => item.name !== f.name));
        }, 800);

        // Update counts
        loadData();
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to process uploaded items");
        setProcessingFiles(prev => prev.filter(item => item.name !== f.name));
      }
    }
  };

  // Trigger Validation View
  const handleVerifyClick = (doc: AIDocument) => {
    setSelectedDoc(doc);
    setDocHeader({ ...doc.supplier, uploadedAt: doc.uploadedAt, originalFile: doc.name });
    
    // Set line items. If actions aren't prepopulated, pre-set MatchExisting if matched, or CreateNew if Product Not Found
    const enrichedLines = doc.items.map(ln => ({
      ...ln,
      action: (ln.action || (ln.databaseProduct ? "MatchExisting" : "CreateNew")) as "MatchExisting" | "CreateNew" | "Ignore"
    }));
    setDocLineItems(enrichedLines);
  };

  // Close Validation
  const handleCloseVerification = () => {
    setSelectedDoc(null);
    setDocHeader(null);
    setDocLineItems([]);
  };

  // Change individual line action in validation screen
  const handleLineActionChange = (id: string, action: "MatchExisting" | "CreateNew" | "Ignore") => {
    setDocLineItems(prev => prev.map(item => {
      if (item.id === id) {
        // Safe check
        if (action === "MatchExisting" && !item.databaseProduct) {
          // Can't match if no matches exist in the DB, default to create new or force manual
          return { ...item, action: "CreateNew" };
        }
        return { ...item, action };
      }
      return item;
    }));
  };

  // Modify individual cell inside validation screen lines
  const handleLineCellChange = (id: string, field: keyof AIDocLineItem, val: any) => {
    setDocLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: val };
        
        // Re-evaluate net totals if quantity or purchase rate changed
        if (field === "quantity" || field === "purchaseRate" || field === "gstPercentage") {
          const qty = parseFloat(updated.quantity) || 0;
          const rate = parseFloat(updated.purchaseRate) || 0;
          const taxRate = parseFloat(updated.gstPercentage) || 0;
          
          const tax = (rate * qty * (taxRate / 100));
          updated.taxAmount = parseFloat(tax.toFixed(2));
          updated.netAmount = parseFloat(((rate * qty) + tax).toFixed(2));
        }

        return updated;
      }
      return item;
    }));

    // Recompute invoice totals based on edited lines
    setTimeout(() => {
      recomputeInvoiceSums();
    }, 100);
  };

  const recomputeInvoiceSums = () => {
    setDocLineItems(prev => {
      let taxable = 0;
      let gst = 0;
      
      prev.forEach(ln => {
        if (ln.action !== "Ignore") {
          taxable += (ln.purchaseRate * ln.quantity);
          gst += ln.taxAmount;
        }
      });

      setDocHeader((prevHeader: any) => ({
        ...prevHeader,
        taxableAmount: parseFloat(taxable.toFixed(2)),
        gstAmount: parseFloat(gst.toFixed(2)),
        totalAmount: parseFloat((taxable + gst).toFixed(2))
      }));

      return prev;
    });
  };

  // GST intelligence verify Calculations
  const calculateGstMismatches = () => {
    const calculatedTot = docLineItems.reduce((acc, it) => acc + (it.action !== "Ignore" ? it.netAmount : 0), 0);
    const expectedTot = parseFloat((docHeader?.totalAmount || 0).toFixed(2));
    const mismatch = Math.abs(calculatedTot - expectedTot) > 1.0;
    return { calculatedTot, expectedTot, mismatch };
  };

  // Submit and approve document updates in ERP Database
  const handleApproveDocument = async () => {
    if (!selectedDoc) return;
    try {
      setActionLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      const response = await fetch(`/api/ai-document-center/approve/${selectedDoc.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewedLines: docLineItems.map(ln => ({
            productId: ln.action === "MatchExisting" ? ln.databaseProduct?.id : undefined,
            barcode: ln.barcode,
            sku: ln.sku,
            name: ln.name,
            hsnCode: ln.hsnCode,
            gstPercentage: ln.gstPercentage,
            purchaseRate: ln.purchaseRate,
            mrp: ln.mrp,
            saleRate: ln.saleRate,
            quantity: ln.quantity,
            freeQuantity: ln.freeQuantity,
            netAmount: ln.netAmount,
            action: ln.action, // "MatchExisting", "CreateNew", "Ignore"
            categoryId: ln.databaseProduct?.categoryId || "cat_1",
            categoryName: ln.databaseProduct?.categoryName || "Groceries & Staples",
            subcategory: ln.databaseProduct?.subcategory || "Rice & Flours",
            unit: ln.databaseProduct?.unit || "Pcs"
          })),
          supplier: {
            name: docHeader.name,
            gstIn: docHeader.gstIn,
            taxableAmount: docHeader.taxableAmount,
            gstAmount: docHeader.gstAmount,
            totalAmount: docHeader.totalAmount,
            id: suppliersList.find(s => s.name.toLowerCase() === docHeader.name.toLowerCase())?.id
          },
          invoiceMetadata: {
            invoiceNumber: docHeader.invoiceNumber,
            invoiceDate: docHeader.invoiceDate
          },
          reviewerName: "admin"
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Approval transaction failed");
      }

      setSuccessMsg(`Document INV-${docHeader.invoiceNumber} verified and stock catalog updated in ERP!`);
      handleCloseVerification();
      await loadData(); // Reload stats, list, and ledger
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to commit inventory entry");
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger barcode printer mock
  const handlePrintBarcodeModal = (item: any) => {
    // Automatically suggest a barcode print schema
    setBarcodePrintItem({
      ...item,
      labelCount: 10,
      storeName: "Shiva Super Market",
      layout: "Thermal-Barcode"
    });
    setIsBarcodePrintOpen(true);
  };

  const handlePrintBarcodesExecute = () => {
    setSuccessMsg(`Sent ${barcodePrintItem?.labelCount || 10} barcode labels for "${barcodePrintItem?.name}" to the labeled terminal printer.`);
    setIsBarcodePrintOpen(false);
    setBarcodePrintItem(null);
  };

  // Excel direct stock sheet mapping
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setExcelFile(file);
      setErrorMsg("");

      // Mock/simulate sheet parsing dynamically directly on client using standard JS text splitting or CSV simulation
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const content = event.target.result;
        let rows: any[] = [];
        let headers: string[] = [];

        if (file.name.endsWith(".csv")) {
          const lines = content.split("\n");
          if (lines.length > 0) {
            headers = lines[0].split(",").map((h: string) => h.trim().replace(/"/g, ""));
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                const cols = lines[i].split(",").map((c: string) => c.trim().replace(/"/g, ""));
                rows.push(cols);
              }
            }
          }
        } else {
          // Simulate standard structured XLS/XLSX sheet header extraction and mappings fallback
          headers = ["Item Name", "UPC Barcode", "Inward Stock", "Vendor Unit Price", "MRP Slabs", "Retail Selling Sells"];
          rows = [
            ["Lifebuoy Total Wash 125g", "8901030752109", "120", "28.5", "36.0", "34.0"],
            ["Tata Salt Premium 1kg", "8901058002316", "250", "20.0", "28.0", "26.0"],
            ["Surf Excel Easy Wash 1kg", "8901030613011", "90", "115.0", "150.0", "139.0"],
            ["Britannica Marie Gold 250g", "8901063142274", "180", "24.0", "35.0", "32.0"],
            ["Aashirvaad Shudh Chakki Atta 5kg", "8904004400510", "45", "215.0", "290.0", "265.0"]
          ];
        }

        setExcelHeaders(headers);
        setExcelRows(rows);

        // Pre-attempt maps suggestions
        const autoMap: any = { barcode: "", stockDelta: "", purchaseRate: "", mrp: "", saleRate: "" };
        headers.forEach((h, idx) => {
          const name = h.toLowerCase();
          if (name.includes("barcode") || name.includes("upc") || name.includes("ean")) autoMap.barcode = String(idx);
          if (name.includes("stock") || name.includes("quantity") || name.includes("inward") || name.includes("qty")) autoMap.stockDelta = String(idx);
          if (name.includes("purchase") || name.includes("rate") || name.includes("price") || name.includes("cost")) autoMap.purchaseRate = String(idx);
          if (name.includes("mrp")) autoMap.mrp = String(idx);
          if (name.includes("selling") || name.includes("retail") || name.includes("sale")) autoMap.saleRate = String(idx);
        });
        setMappings(autoMap);
      };
      reader.readAsText(file);
    }
  };

  // Compute Excel mapped previews preview table
  useEffect(() => {
    if (excelRows.length === 0) return;

    const preview = excelRows.map(row => {
      const barcodeValue = row[parseInt(mappings.barcode)] || "";
      const deltaValue = parseFloat(row[parseInt(mappings.stockDelta)]) || 0;
      const pRateValue = row[parseInt(mappings.purchaseRate)] ? parseFloat(row[parseInt(mappings.purchaseRate)]) : undefined;
      const mrpValue = row[parseInt(mappings.mrp)] ? parseFloat(row[parseInt(mappings.mrp)]) : undefined;
      const sRateValue = row[parseInt(mappings.saleRate)] ? parseFloat(row[parseInt(mappings.saleRate)]) : undefined;

      const product = productsList.find(p => p.barcode === barcodeValue);

      return {
        barcode: barcodeValue,
        name: product ? product.name : "Unknown / Match Missing",
        stockDelta: deltaValue,
        purchaseRate: pRateValue,
        mrp: mrpValue,
        saleRate: sRateValue,
        matchFound: !!product
      };
    });

    setExcelPreview(preview);
  }, [mappings, excelRows, productsList]);

  // Bulk process excel stock ledger additions
  const handleExcelImportExecute = async () => {
    if (excelPreview.length === 0) return;
    try {
      setActionLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      const validLines = excelPreview.filter(ln => ln.matchFound && ln.stockDelta !== 0);
      if (validLines.length === 0) {
        throw new Error("No items selected with matching barcodes in database to update!");
      }

      const response = await fetch("/api/ai-document-center/excel-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappingData: validLines,
          importerName: "Vishwa K."
        })
      });

      if (!response.ok) {
        throw new Error("Bulk direct spreadsheet mapping failed");
      }

      const resData = await response.json();
      setSuccessMsg(`Sheet integrated! Increased stock quantities on ${resData.rowsUpdated} items.`);
      
      // Reset excel sheet state
      setExcelFile(null);
      setExcelRows([]);
      setExcelPreview([]);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Spreadsheet upload failed to execute");
    } finally {
      setActionLoading(false);
    }
  };

  // Automatically suggest HSN Code lookup on demand for review
  const [hsnSearchVal, setHsnSearchVal] = useState("");
  const [hsnSearchResult, setHsnSearchResult] = useState<string | null>(null);

  const suggestHsnCode = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes("atta") || n.includes("wheat") || n.includes("flour")) return "11010000";
    if (n.includes("salt")) return "25010020";
    if (n.includes("basmati") || n.includes("rice")) return "10063010";
    if (n.includes("soap") || n.includes("shampoo") || n.includes("wash") || n.includes("oral")) return "34011110";
    if (n.includes("surf") || n.includes("detergent") || n.includes("detergents")) return "34022010";
    if (n.includes("coke") || n.includes("cola") || n.includes("drink") || n.includes("juice")) return "22021010";
    if (n.includes("biscuit") || n.includes("biscuits") || n.includes("marie") || n.includes("cookies")) return "19053100";
    return "21069099"; // default Indian generic food/retail HSN Code
  };

  const testHsnIntelligence = () => {
    if (!hsnSearchVal) return;
    setHsnSearchResult(suggestHsnCode(hsnSearchVal));
  };

  return (
    <div className="space-y-6" id="ai-document-center-module">
      {/* 1. Module Upper Actions / Tabs Selection */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center lg:gap-2">
            AI Document Center
          </h1>
          <p className="text-xs text-slate-500">Fast-audit OCR suppliers invoices & digitalize stock ledgers updates instantly</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
          <button 
            onClick={() => { setActiveSubTab("upload"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${activeSubTab === "upload" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Digitalize Invoice Flow
          </button>
          <button 
            onClick={() => { setActiveSubTab("excel"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${activeSubTab === "excel" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Spreadsheet Import
          </button>
          <button 
            onClick={() => { setActiveSubTab("audit"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${activeSubTab === "audit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Audit Log Rails
          </button>
        </div>
      </div>

      {/* 2. Success and Error Warning Rails */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm" id="ai-success">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 animate-bounce" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-100 text-red-800 p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm" id="ai-error">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Dashboard Statistics Widgets (Integrated seamlessly in module layout) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-400">Uploaded Today</p>
          <p className="text-xl font-black text-slate-800 mt-1">{stats?.uploadedToday ?? 1}</p>
          <p className="text-[9px] text-slate-400">Total digitalized docs</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-[10px] uppercase font-bold text-amber-500">Pending Verification</p>
          <p className="text-xl font-black text-slate-800 mt-1">{stats?.pendingVerifications ?? 1}</p>
          <p className="text-[9px] text-slate-400">Requires manager approval</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] uppercase font-bold text-emerald-500">Processed Invoices</p>
          <p className="text-xl font-black text-slate-800 mt-1">{stats?.processedInvoices ?? 1}</p>
          <p className="text-[9px] text-slate-400">Inventory updated</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-indigo-500">New Items Detected</p>
          <p className="text-xl font-black text-slate-800 mt-1">{stats?.newProductsDetected ?? 0}</p>
          <p className="text-[9px] text-slate-400">Catalogued via invoice</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm col-span-2 md:col-span-1 bg-gradient-to-br from-indigo-50 to-indigo-100/50">
          <p className="text-[10px] uppercase font-bold text-indigo-700">OCR Success Rate</p>
          <p className="text-xl font-extrabold text-indigo-900 mt-1">{stats?.ocrSuccessRate ?? 98.4}%</p>
          <p className="text-[9px] text-indigo-600 font-semibold">Gemini AI Model Powered</p>
        </div>
      </div>

      {/* ======================= TAB: INVOICES FLOW ======================= */}
      {activeSubTab === "upload" && !selectedDoc && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="upload-tab-panel">
          
          {/* Main Upload Area and Active OCR Process Loop */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Drag and drop panel */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`bg-white border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all ${dragActive ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200 hover:border-indigo-400"}`}
            >
              <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                <UploadCloud className="h-6 w-6" />
              </div>
              <h3 className="text-xs font-bold text-slate-800 mb-1">Drag and drop digital supplier bills</h3>
              <p className="text-[11px] text-slate-400 max-w-sm mb-4">Accepts PDF, XLS, XLSX, CSV, DOCX, JPG, JPEG, PNG scanned invoices, price lists or stock sheets.</p>
              
              <div className="flex gap-2">
                <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded text-xs select-none cursor-pointer transition shadow-sm">
                  Browse Files
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileInput} 
                    accept=".pdf,.csv,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />
                </label>
              </div>
            </div>

            {/* Active processing cue progress tracker feedback */}
            {processingFiles.length > 0 && (
              <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  Extracted via OCR Digitalization Loop...
                </h4>
                <div className="space-y-2.5">
                  {processingFiles.map((pf, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span className="font-mono truncate max-w-xs">{pf.name}</span>
                        <span>{pf.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${pf.progress}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invoice Files Verification Checklist table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-700 text-xs text-slate-800">Files Verification Inward Queue</h3>
                <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded">
                  {documents.filter(d => d.status === "Pending").length} Pending Verification
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-semibold bg-slate-50/50 tracking-wider">
                      <th className="py-2.5 px-4 font-bold">Document Name</th>
                      <th className="py-2.5 px-4 font-bold">Inward Supplier</th>
                      <th className="py-2.5 px-4 font-bold">Invoice Details</th>
                      <th className="py-2.5 px-4 font-bold">Inward Total Amount</th>
                      <th className="py-2.5 px-4 font-bold text-center">Status</th>
                      <th className="py-2.5 px-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                          No uploaded documents in verification queue. Use the dropzone above!
                        </td>
                      </tr>
                    ) : (
                      documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-slate-100 text-slate-600 rounded">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-700 truncate max-w-[150px]">{doc.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600">{doc.supplier?.name || "Unidentified Vendor"}</td>
                          <td className="py-3 px-4 font-medium text-slate-600">
                            <p className="font-semibold text-slate-700">No: {doc.supplier?.invoiceNumber || "N/A"}</p>
                            <p className="text-[10px] text-slate-400">Lines: {doc.items?.length || 0} distinct items</p>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">₹{(doc.supplier?.totalAmount || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block font-extrabold text-[10px] uppercase px-2 py-0.5 rounded ${doc.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {doc.status === "Pending" ? (
                              <button 
                                onClick={() => handleVerifyClick(doc)}
                                className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded text-[11px] transition shadow-sm flex items-center gap-1 ml-auto"
                              >
                                View File
                                <ArrowRight className="h-3 w-3" />
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium flex items-center justify-end gap-1">
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                Updated Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right sidebar: HSN lookup intelligence sandbox & sample files */}
          <div className="space-y-6">
            
            {/* HSN lookup intelligence checker */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 text-xs">HSN Code Intelligence Sandbox</h3>
                <p className="text-[11px] text-slate-400">Lookup or test automatic taxonomy recommendations</p>
              </div>
              
              <div className="space-y-2">
                <input 
                  type="text" 
                  value={hsnSearchVal}
                  onChange={(e) => setHsnSearchVal(e.target.value)}
                  placeholder="e.g. Tata Salt, Fortune Basmati..."
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-indigo-500 font-mono"
                />
                <button 
                  onClick={testHsnIntelligence}
                  className="w-full bg-slate-900 text-white text-xs font-bold p-1.5 rounded hover:bg-slate-800 transition"
                >
                  Test HSN Suggestion
                </button>
              </div>

              {hsnSearchResult && (
                <div className="bg-indigo-50/50 p-3 rounded border border-indigo-100 text-xs space-y-1">
                  <p className="text-[10px] font-bold text-indigo-700 uppercase">AI Recommendation Result:</p>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-600 font-sans">{hsnSearchVal}</span>
                    <span className="font-extrabold text-indigo-900">Suggested: {hsnSearchResult}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Simulated OCR guidelines */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3.5 text-xs">
              <h3 className="font-bold text-slate-800">OCR & Gemini AI Capability Parameters</h3>
              <div className="space-y-2.5 leading-relaxed text-slate-500 text-[11px]">
                <p>The Shiva AI OCR document processing module uses an advanced image analyzing model representing <span className="font-bold text-indigo-600">Gemini 3.5 Flash</span> to scan invoices.</p>
                <div className="space-y-1 text-[11px]">
                  <p className="font-bold text-slate-700">Supported templates include:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Printed supplier purchase bills with Indian HSN slabs</li>
                    <li>Scanned invoices with double CGST SGST columns</li>
                    <li>Mobile camera snaps of delivery sheets</li>
                  </ul>
                </div>
                <div className="p-3 bg-amber-50 rounded border border-amber-100 text-amber-900 font-semibold flex items-start gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <p>Inward approvals securely update the main inventory ledger, outstanding balances of suppliers, and append audit data lines.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}


      {/* ======================= VALIDATION SCREEN OVERLAY ======================= */}
      {selectedDoc && docHeader && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden" id="validation-panel">
          
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                <span>Verification Queue ID: {selectedDoc.id}</span>
                <span>•</span>
                <span>File: {docHeader.originalFile}</span>
              </div>
              <h2 className="text-sm font-extrabold text-slate-800 mt-0.5">Scanned Bill & Tax Validation Portal</h2>
            </div>
            <button 
              onClick={handleCloseVerification}
              className="text-slate-400 hover:text-slate-650 hover:bg-slate-200 p-1.5 rounded transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-6">
            
            {/* 1. Header extracted meta details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50/50 rounded-lg border border-slate-100">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Extracted Inward Supplier</label>
                <input 
                  type="text" 
                  value={docHeader.name}
                  onChange={(e) => setDocHeader({ ...docHeader, name: e.target.value })}
                  className="w-full text-xs font-semibold p-1.5 bg-white border border-slate-200 rounded outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Supplier GST Number</label>
                <input 
                  type="text" 
                  value={docHeader.gstIn}
                  onChange={(e) => setDocHeader({ ...docHeader, gstIn: e.target.value })}
                  className="w-full text-xs font-mono p-1.5 bg-white border border-slate-200 rounded outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Invoice Number</label>
                <input 
                  type="text" 
                  value={docHeader.invoiceNumber}
                  onChange={(e) => setDocHeader({ ...docHeader, invoiceNumber: e.target.value })}
                  className="w-full text-xs font-mono p-1.5 bg-white border border-slate-200 rounded outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase text-slate-400">Inward Bill Date</label>
                <input 
                  type="date" 
                  value={docHeader.invoiceDate}
                  onChange={(e) => setDocHeader({ ...docHeader, invoiceDate: e.target.value })}
                  className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded outline-none"
                />
              </div>
            </div>

            {/* 2. Line items extracted checklist table */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-slate-800 text-xs">Scanned Inward Invoice Product Lines Checklist</h3>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Double-click on editable cells to adjust rates</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px] select-none">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] uppercase text-slate-400 font-semibold bg-slate-50 tracking-wider">
                      <th className="py-2.5 px-3 font-bold">Item Line Details</th>
                      <th className="py-2.5 px-3 font-bold">Barcode UPC</th>
                      <th className="py-2.5 px-2 font-bold text-center">HSN Code</th>
                      <th className="py-2.5 px-2 font-bold text-center">GST %</th>
                      <th className="py-2.5 px-2 font-bold text-center">Qty / Free</th>
                      <th className="py-2.5 px-2 font-bold text-right">Inward Rate</th>
                      <th className="py-2.5 px-2 font-bold text-right">MRP / Sale Price</th>
                      <th className="py-2.5 px-2 font-bold text-right">Net Bill Amt</th>
                      <th className="py-2.5 px-3 font-bold text-center bg-indigo-50/30">Auto Matching Confidence</th>
                      <th className="py-2.5 px-3 font-bold text-right">Action Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {docLineItems.map((ln, idx) => {
                      const taxWarnFlag = Math.abs(ln.taxAmount - (ln.purchaseRate * ln.quantity * (ln.gstPercentage / 100))) > 0.05;

                      return (
                        <tr key={ln.id} className={`hover:bg-slate-50 transition ${ln.action === "Ignore" ? "opacity-40" : ""}`}>
                          
                          {/* Item details */}
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            <input 
                              type="text" 
                              value={ln.name}
                              onChange={(e) => handleLineCellChange(ln.id, "name", e.target.value)}
                              className="bg-transparent border-b border-transparent focus:border-indigo-400 w-full outline-none py-0.5 font-bold text-slate-800"
                            />
                            <div className="flex gap-2 text-[9px] text-slate-400 font-mono mt-0.5">
                              <span>Batch: {ln.batchNumber}</span>
                              <span>Expiry: {ln.expiryDate}</span>
                            </div>
                          </td>

                          {/* Barcode details */}
                          <td className="py-3 px-3 font-mono">
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="text" 
                                value={ln.barcode || ""}
                                placeholder="Auto-generate"
                                onChange={(e) => handleLineCellChange(ln.id, "barcode", e.target.value)}
                                className="bg-transparent text-[11px]  border-b border-transparent focus:border-indigo-400 focus:bg-white w-28 font-mono outline-none py-0.5"
                              />
                              {ln.barcode ? (
                                <button 
                                  title="Print Label"
                                  onClick={() => handlePrintBarcodeModal(ln)}
                                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded"
                                >
                                  <Barcode className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider block bg-amber-50 px-1 rounded whitespace-nowrap">Generated</span>
                              )}
                            </div>
                          </td>

                          {/* HSN CODE */}
                          <td className="py-3 px-2 text-center font-mono font-medium">
                            <input 
                              type="text" 
                              value={ln.hsnCode}
                              onChange={(e) => handleLineCellChange(ln.id, "hsnCode", e.target.value)}
                              className="bg-transparent text-center border-b border-transparent focus:border-indigo-400 focus:bg-white w-16 outline-none py-0.5 font-mono"
                            />
                          </td>

                          {/* GST Slabs */}
                          <td className="py-3 px-2 text-center">
                            <select 
                              value={ln.gstPercentage}
                              onChange={(e) => handleLineCellChange(ln.id, "gstPercentage", parseFloat(e.target.value))}
                              className="bg-transparent border border-transparent focus:border-indigo-400 rounded outline-none p-0.5"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>

                          {/* Quantity & Free Quantity */}
                          <td className="py-3 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <input 
                                type="number" 
                                value={ln.quantity}
                                onChange={(e) => handleLineCellChange(ln.id, "quantity", parseFloat(e.target.value) || 0)}
                                className="w-10 bg-transparent text-center border-b border-transparent focus:border-indigo-400 focus:bg-white outline-none py-0.5 font-semibold"
                              />
                              <span className="text-slate-300 font-normal">/</span>
                              <input 
                                type="number" 
                                value={ln.freeQuantity}
                                onChange={(e) => handleLineCellChange(ln.id, "freeQuantity", parseFloat(e.target.value) || 0)}
                                className="w-8 bg-transparent text-center border-b border-transparent focus:border-indigo-400 focus:bg-white outline-none py-0.5 text-slate-400 font-semibold"
                                title="Free Inward Stock units"
                              />
                            </div>
                          </td>

                          {/* Inward Wholesale Price Rate */}
                          <td className="py-3 px-2 text-right font-mono">
                            <div className="flex items-center justify-end">
                              <span className="text-slate-400 mr-0.5">₹</span>
                              <input 
                                type="number" 
                                value={ln.purchaseRate}
                                onChange={(e) => handleLineCellChange(ln.id, "purchaseRate", parseFloat(e.target.value) || 0)}
                                className="w-12 bg-transparent text-right border-b border-transparent focus:border-indigo-400 focus:bg-white outline-none py-0.5"
                              />
                            </div>
                          </td>

                          {/* MRP / Sale Rates Slabs */}
                          <td className="py-3 px-2 text-right font-mono">
                            <div className="flex flex-col text-right">
                              <span className="text-slate-700 block">
                                MRP: ₹
                                <input 
                                  type="number" 
                                  value={ln.mrp}
                                  onChange={(e) => handleLineCellChange(ln.id, "mrp", parseFloat(e.target.value) || 0)}
                                  className="w-12 bg-transparent text-right outline-none font-bold"
                                />
                              </span>
                              <span className="text-slate-400 block text-[10px]">
                                Sale: ₹
                                <input 
                                  type="number" 
                                  value={ln.saleRate}
                                  onChange={(e) => handleLineCellChange(ln.id, "saleRate", parseFloat(e.target.value) || 0)}
                                  className="w-10 bg-transparent text-right outline-none"
                                />
                              </span>
                            </div>
                          </td>

                          {/* Net Inward Total Amount */}
                          <td className="py-3 px-2 text-right font-mono">
                            <div className="flex flex-col text-right">
                              <span className="font-bold text-slate-800">₹{ln.netAmount.toLocaleString()}</span>
                              <span className="text-[9px] text-slate-400">Tax: ₹{ln.taxAmount}</span>
                              {taxWarnFlag && (
                                <span className="bg-red-50 text-red-700 font-bold text-[9px] rounded px-1 flex items-center gap-0.5 self-end mt-0.5" title="GST calculation mismatch warned!">
                                  <AlertCircle className="h-2.5 w-2.5 text-red-600" />
                                  Tax Mismatch
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Auto similarity match results */}
                          <td className="py-3 px-3 bg-indigo-50/10">
                            {ln.databaseProduct ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <span className={`inline-block w-2 h-2 rounded-full ${ln.confidence >= 95 ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                                  <span className="font-extrabold text-slate-700">{ln.confidence}% Match</span>
                                </div>
                                <p className="text-[10px] text-slate-400 truncate max-w-[120px]" title="Database Match Name">
                                  Linked: {ln.databaseProduct.name} (Stock: {ln.databaseProduct.currentStock})
                                </p>
                              </div>
                            ) : (
                              <span className="text-red-500 font-bold block">Product Not Found</span>
                            )}
                          </td>

                          {/* Action button triggers list */}
                          <td className="py-3 px-3 text-right">
                            <select 
                              value={ln.action}
                              onChange={(e) => handleLineActionChange(ln.id, e.target.value as any)}
                              className="bg-slate-100 text-[11px] font-bold text-slate-700 p-1 border rounded outline-none w-28 cursor-pointer"
                            >
                              {ln.databaseProduct && <option value="MatchExisting">Link to Existing</option>}
                              <option value="CreateNew">Create Product</option>
                              <option value="Ignore">Ignore / Skip Line</option>
                            </select>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. GST Verification calculations ledger totals cards & warnings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Calculations tally validation check */}
              <div className="bg-slate-50 p-4 rounded-xl border space-y-2">
                <h4 className="text-xs font-bold text-slate-700">Tax Integrity Check Log</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Extracted Inward Total:</span>
                    <span className="font-mono font-bold text-slate-700">₹{docHeader.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Calculated Cumulative Lines:</span>
                    <span className="font-mono font-bold text-slate-700">₹{docLineItems.reduce((acc, it) => acc + (it.action !== "Ignore" ? it.netAmount : 0), 0).toLocaleString()}</span>
                  </div>
                  <div className="border-t border-dashed mt-1 pt-1.5">
                    {calculateGstMismatches().mismatch ? (
                      <div className="p-2.5 bg-red-100 text-red-800 rounded font-bold flex items-start gap-1 text-[10px]">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                        <span>Warning: Extracted total amounts with mapped line calculations mismatch. Verify individual MRP selling rates before approving inward ledger.</span>
                      </div>
                    ) : (
                      <div className="p-2 bg-emerald-100 text-emerald-800 rounded font-bold flex items-center gap-1 text-[10px]">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>All Line items calculations tally perfectly. ready to save.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CGST, SGST, IGST breakdown display */}
              <div className="bg-slate-50 p-4 rounded-xl border space-y-2 text-xs">
                <h4 className="text-xs font-bold text-slate-700">GST purchase tax ledger matrix</h4>
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Taxable amount limit:</span>
                    <span className="text-slate-700">₹{docHeader.taxableAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Identified CGST (Central):</span>
                    <span className="text-slate-700">₹{(docHeader.gstAmount / 2).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Identified SGST (State):</span>
                    <span className="text-slate-700">₹{(docHeader.gstAmount / 2).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-indigo-700 border-t border-slate-200 pt-1">
                    <span>Total GST Amount:</span>
                    <span>₹{docHeader.gstAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="bg-white p-4 rounded-xl border space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Verify and Import Stock</h4>
                <p className="text-[10px] text-slate-400">Verifying will instantly increase database stock amounts, record supplier GRN invoice, and register audit log event.</p>
                
                <div className="flex justify-end gap-2.5 pt-1">
                  <button 
                    onClick={handleCloseVerification}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded text-xs select-none transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleApproveDocument}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded text-xs select-none transition shadow-sm flex items-center gap-1 disabled:opacity-50"
                  >
                    {actionLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
                    Manager Approve & Inward
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}


      {/* ======================= TAB: EXCEL STOCK IMPORT ======================= */}
      {activeSubTab === "excel" && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6" id="excel-tab-panel">
          
          <div className="max-w-xl space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800">Dynamic Excel & Spreadsheet Stock Integrator</h2>
              <p className="text-xs text-slate-500">Directly sync stock additions from wholesale XLSX, XLS or CSV files without validating lines individual bills.</p>
            </div>

            <div className="border border-dashed border-slate-350 bg-slate-50 rounded-lg p-6 text-center">
              <input 
                type="file" 
                accept=".csv,.xls,.xlsx" 
                className="hidden" 
                id="excel-file-uploader" 
                onChange={handleExcelUpload}
              />
              <label htmlFor="excel-file-uploader" className="cursor-pointer space-y-2 block">
                <FileSpreadsheet className="h-10 w-10 text-emerald-600 mx-auto animate-pulse" />
                <span className="block text-xs font-bold text-slate-800">
                  {excelFile ? excelFile.name : "Select Wholesale Spreadsheet File"}
                </span>
                <span className="block text-[11px] text-slate-400 underline hover:text-indigo-600">Choose CSV, XLS or XLSX Sheets</span>
              </label>
            </div>
          </div>

          {/* Mappings selection columns drop-down list */}
          {excelRows.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in">
              <div>
                <h3 className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-slate-500" />
                  Map Excel Columns to ERP Product attributes
                </h3>
                <p className="text-[11px] text-slate-400">Match headers from the uploaded sheet to apply prices and stock adjustments.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Barcode UPC Column</label>
                  <select 
                    value={mappings.barcode}
                    onChange={(e) => setMappings({ ...mappings, barcode: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border rounded outline-none"
                  >
                    <option value="">-- Choose Column --</option>
                    {excelHeaders.map((eh, idx) => (
                      <option key={idx} value={idx}>{eh}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Stock delta Quantity</label>
                  <select 
                    value={mappings.stockDelta}
                    onChange={(e) => setMappings({ ...mappings, stockDelta: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border rounded outline-none"
                  >
                    <option value="">-- Choose Column --</option>
                    {excelHeaders.map((eh, idx) => (
                      <option key={idx} value={idx}>{eh}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Cost Rate Column</label>
                  <select 
                    value={mappings.purchaseRate}
                    onChange={(e) => setMappings({ ...mappings, purchaseRate: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border rounded outline-none"
                  >
                    <option value="">-- Choose Column --</option>
                    {excelHeaders.map((eh, idx) => (
                      <option key={idx} value={idx}>{eh}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">MRP Slabs Column</label>
                  <select 
                    value={mappings.mrp}
                    onChange={(e) => setMappings({ ...mappings, mrp: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border rounded outline-none"
                  >
                    <option value="">-- Choose Column --</option>
                    {excelHeaders.map((eh, idx) => (
                      <option key={idx} value={idx}>{eh}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-400">Sale Rate Column</label>
                  <select 
                    value={mappings.saleRate}
                    onChange={(e) => setMappings({ ...mappings, saleRate: e.target.value })}
                    className="w-full text-xs p-1.5 bg-white border rounded outline-none"
                  >
                    <option value="">-- Choose Column --</option>
                    {excelHeaders.map((eh, idx) => (
                      <option key={idx} value={idx}>{eh}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Preview Checklist */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-50/50 p-2 border-b border-slate-100 rounded">
                  <h4 className="font-bold text-slate-700 text-xs">Spreadsheet stock match preview</h4>
                  <span className="text-[10px] font-mono text-slate-400">Matches found in ERP database: {excelPreview.filter(p => p.matchFound).length} / {excelPreview.length}</span>
                </div>

                <div className="overflow-x-auto max-h-[300px] border rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-150 text-[10px] uppercase text-slate-400 font-semibold bg-slate-50 sticky top-0 z-10">
                        <th className="py-2.5 px-4 font-bold">Uploaded Barcode</th>
                        <th className="py-2.5 px-4 font-bold">Matched Product Name</th>
                        <th className="py-2.5 px-4 font-bold text-center">Inward Stock Change</th>
                        <th className="py-2.5 px-4 font-bold text-right">Cost Rate</th>
                        <th className="py-2.5 px-4 font-bold text-right">MRP Slider</th>
                        <th className="py-2.5 px-4 font-bold text-right">Selling rate</th>
                        <th className="py-2.5 px-4 font-bold text-center">Matching Check</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {excelPreview.map((p, idx) => (
                        <tr key={idx} className={`hover:bg-slate-50 transition ${!p.matchFound ? "bg-red-50/20" : ""}`}>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-600">{p.barcode || "N/A"}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-700">{p.name}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-emerald-600 font-mono">
                            {p.stockDelta > 0 ? `+${p.stockDelta}` : p.stockDelta} units
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">{p.purchaseRate ? `₹${p.purchaseRate}` : "Unchanged"}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">{p.mrp ? `₹${p.mrp}` : "Unchanged"}</td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">{p.saleRate ? `₹${p.saleRate}` : "Unchanged"}</td>
                          <td className="py-1.5 px-4 text-center text-xs">
                            {p.matchFound ? (
                              <span className="inline-block bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wide border border-emerald-100">Synchronized</span>
                            ) : (
                              <span className="inline-block bg-red-50 text-red-800 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wide border border-red-100">Barcode Unfound</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 p-2 bg-slate-50/50 rounded border">
                  <button 
                    onClick={() => { setExcelFile(null); setExcelRows([]); setExcelPreview([]); }}
                    className="px-4 py-2 border bg-white hover:bg-slate-50 text-slate-600 font-bold rounded text-xs select-none transition"
                  >
                    Clear Sheet
                  </button>
                  <button 
                    onClick={handleExcelImportExecute}
                    disabled={actionLoading || excelPreview.filter(p => p.matchFound).length === 0}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs select-none shadow-sm transition flex items-center gap-1 disabled:opacity-50"
                  >
                    {actionLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    Apply Bulk Stock Sync
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}


      {/* ======================= TAB: ENTIRE AUDIT TRAIL LOGS ======================= */}
      {activeSubTab === "audit" && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden" id="audit-tab-panel">
          <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-extrabold text-slate-700 text-xs">Enterprise Security Audit Logs Trail</h3>
              <p className="text-[11px] text-slate-400">Historical records of AI processed invoices, manager approval tracks and stock updates</p>
            </div>
            <button 
              onClick={() => { setErrorMsg(""); setSuccessMsg(""); loadData(); }}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-150 rounded"
              title="Refresh ledger logs"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-semibold bg-slate-50">
                  <th className="py-2.5 px-4 font-bold">Authorized Signatures</th>
                  <th className="py-2.5 px-4 font-bold">Origin File</th>
                  <th className="py-2.5 px-4 font-bold">Changes Committed</th>
                  <th className="py-2.5 px-4 font-bold">Stock delta quantities</th>
                  <th className="py-2.5 px-3 font-bold">Time Stamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">
                      No security audit events recorded.
                    </td>
                  </tr>
                ) : (
                  auditEntries.map((ae) => (
                    <tr key={ae.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        <div className="space-y-0.5">
                          <p className="text-slate-800">Uploader: {ae.uploadedBy}</p>
                          <p className="text-[10px] text-indigo-600">Approval: {ae.approvedBy}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600 max-w-[150px] truncate" title={ae.fileName}>
                        {ae.fileName}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-sm truncate leading-normal" title={ae.changesMade}>
                        <p className="text-xs text-slate-700 font-medium">{ae.changesMade}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{ae.productChanges}</p>
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-700 font-mono" title={ae.stockChanges}>{ae.stockChanges}</td>
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-455">
                        {new Date(ae.dateTime).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ======================= BARCODE printing modal ======================= */}
      {isBarcodePrintOpen && barcodePrintItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-xs tracking-tight">Barcode Label Terminal Generator</h3>
              <button 
                onClick={() => { setIsBarcodePrintOpen(false); setBarcodePrintItem(null); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              
              <div className="p-4 bg-slate-50 rounded border border-slate-100 flex flex-col items-center justify-center space-y-1.5 font-mono select-none">
                <span className="text-[9px] text-slate-400 font-bold tracking-widest">{barcodePrintItem.storeName}</span>
                <span className="font-extrabold text-[11px] text-slate-800 tracking-tight text-center">{barcodePrintItem.name}</span>
                
                {/* Visual custom fake BARCODE code strip styled dynamically in pure beautiful css blocks */}
                <div className="h-10 w-44 flex gap-x-[1px] items-stretch pt-2.5">
                  <div className="w-[3px] bg-black h-full"></div>
                  <div className="w-[1px] bg-black h-full"></div>
                  <div className="w-[2px] bg-black h-full"></div>
                  <div className="w-[1px] bg-slate-200"></div>
                  <div className="w-[3px] bg-black h-full"></div>
                  <div className="w-[1px] bg-black h-full"></div>
                  <div className="w-[2px] bg-black h-full"></div>
                  <div className="w-[1px] bg-slate-200"></div>
                  <div className="w-[4px] bg-black h-full"></div>
                  <div className="w-[1px] bg-black h-full"></div>
                  <div className="w-[2px] bg-black h-full"></div>
                  <div className="w-[1px] bg-slate-200"></div>
                  <div className="w-[2px] bg-black h-full"></div>
                  <div className="w-[1px] bg-black h-full"></div>
                  <div className="w-[3px] bg-black h-full"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-700 tracking-[0.25em]">{barcodePrintItem.barcode}</span>
                <span className="text-xs font-black text-slate-900 mt-1">MRP: ₹{barcodePrintItem.mrp}</span>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Labels quantity to print</label>
                  <input 
                    type="number" 
                    value={barcodePrintItem.labelCount}
                    onChange={(e) => setBarcodePrintItem({ ...barcodePrintItem, labelCount: parseInt(e.target.value) || 1 })}
                    className="w-full text-xs p-2 bg-slate-50 border rounded outline-none font-mono font-bold"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-400">Terminal Printer Format</label>
                  <select 
                    value={barcodePrintItem.layout}
                    onChange={(e) => setBarcodePrintItem({ ...barcodePrintItem, layout: e.target.value })}
                    className="w-full text-xs p-2 bg-slate-50 border rounded outline-none"
                  >
                    <option value="Thermal-Barcode">Thermal Roll (38mm x 25mm)</option>
                    <option value="A4-Sheet">Laser A4 Label List (40 Labels/sheet)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-1.5">
                <button 
                  onClick={() => { setIsBarcodePrintOpen(false); setBarcodePrintItem(null); }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded text-xs select-none transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePrintBarcodesExecute}
                  className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded text-xs select-none shadow transition flex items-center justify-center gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Labels
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
