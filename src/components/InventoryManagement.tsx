import React, { useState, useEffect } from "react";
import { fetchProducts, fetchStockLedger, updateProduct } from "../utils/api";
import { Product } from "../types";
import { 
  Clipboard, 
  Plus, 
  Minus, 
  AlertTriangle, 
  TrendingUp, 
  History, 
  ShieldAlert, 
  RefreshCw,
  Search
} from "lucide-react";

export default function InventoryManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLedger, setStockLedger] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // Adjustment state helper
  const [adjProductId, setAdjProductId] = useState("");
  const [adjType, setAdjType] = useState<"Addition" | "Reduction">("Addition");
  const [adjQty, setAdjQty] = useState(1);
  const [adjReason, setAdjReason] = useState("Annual Inventory Reconciliation");

  const syncLog = async () => {
    try {
      const p = await fetchProducts();
      setProducts(p);
      if (p.length > 0 && !adjProductId) {
        setAdjProductId(p[0].id);
      }
      const logs = await fetchStockLedger();
      setStockLedger(logs.reverse()); // latest log top
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    syncLog();
  }, []);

  const handleStockAdjOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProductId || adjQty <= 0) return;

    const matchedProd = products.find(p => p.id === adjProductId);
    if (!matchedProd) return;

    // Computed stock
    const currentStockLevel = matchedProd.currentStock;
    const finalStockLevel = adjType === "Addition" 
      ? currentStockLevel + adjQty 
      : Math.max(0, currentStockLevel - adjQty);

    try {
      await updateProduct(adjProductId, {
        currentStock: finalStockLevel,
        adjustmentReason: adjReason,
        updatedByUser: "vishwa_admin"
      });
      alert(`Manual Stock level override processed successfully.`);
      setAdjQty(1);
      setAdjReason("Annual Inventory Reconciliation");
      syncLog();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredProds = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.barcode.includes(search)
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-100" id="inventory-module">
      {/* Header action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Clipboard className="h-5.5 w-5.5 text-indigo-500" />
            Inventory Valuation & Audit Registers
          </h1>
          <p className="text-xs text-slate-500">View real-time physical shelf records, ledger audit files, and balance stock levels</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time manual stock overrides form */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4 max-h-[460px]">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Manual Stock Override Adjuster</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Authoritative adjustment updates stock values instantly</p>
          </div>

          <form onSubmit={handleStockAdjOverride} className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500">Pick catalog item</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded outline-none"
                value={adjProductId}
                onChange={(e) => setAdjProductId(e.target.value)}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (In-stock: {p.currentStock})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500">Action modifier direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => setAdjType("Addition")}
                  className={`p-2 rounded text:xs font-bold border transition-colors ${adjType === "Addition" ? "bg-emerald-600 border-emerald-600 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                >
                  <Plus className="h-3.5 w-3.5 inline mr-1" /> Stock Addition
                </button>
                <button 
                  type="button"
                  onClick={() => setAdjType("Reduction")}
                  className={`p-2 rounded text:xs font-bold border transition-colors ${adjType === "Reduction" ? "bg-red-650 border-red-650 bg-red-600 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                >
                  <Minus className="h-3.5 w-3.5 inline mr-1" /> Stock Reduction
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500 font-mono">Adjustment Qty Count</label>
              <input 
                type="number" 
                required
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded outline-none font-bold"
                value={adjQty}
                onChange={(e) => setAdjQty(Math.max(1, parseInt(e.target.value) || 0))}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500">Reason / Reference notes for auditors</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded outline-none"
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
              >
                <option value="Annual Inventory Reconciliation">Annual Inventory Reconciliation</option>
                <option value="Damaged Goods Write-off">Damaged Goods Write-off</option>
                <option value="Expiry Stock Clearance">Expiry Stock Clearance</option>
                <option value="Theft or Pilferage Correction">Theft or Pilferage Correction</option>
                <option value="Gift Promotion Sample Out">Gift Promotion Sample Out</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-xs mt-2 transition-all shadow-sm"
            >
              Apply stock level update
            </button>
          </form>
        </div>

        {/* Real-time active stock limits table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Real-time Stock limits ledger</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Quickly view physical shelf units</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Find in ledger..." 
                className="bg-slate-50 text-xs border p-1 rounded pl-8 outline-none focus:border-indigo-400 w-44"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-[340px] pr-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50">
                  <th className="p-2">Product particulars</th>
                  <th className="p-2 text-center">In Stock</th>
                  <th className="p-2 text-center">Safety lvl</th>
                  <th className="p-2 text-center">Shelf Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProds.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-2 font-bold text-slate-700">
                      <span>{p.name}</span>
                      <p className="text-[9px] text-slate-400 font-mono font-medium">Barcode: {p.barcode}</p>
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${p.currentStock === 0 ? "bg-red-100 text-red-700" : p.currentStock <= p.minimumStockLevel ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {p.currentStock} {p.unit}
                      </span>
                    </td>
                    <td className="p-2 text-center font-mono text-slate-500">{p.minimumStockLevel}</td>
                    <td className="p-2 text-center font-mono text-slate-500">{p.maximumStockLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stock Ledger History File Listings */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5 font-sans">
            <History className="h-4.5 w-4.5 text-indigo-500" />
            Historic Audit Log Registers (Stock Ledger)
          </h3>
          <p className="text-xs text-slate-400">Total {stockLedger.length} stock ledger transaction logs computed</p>
        </div>

        <div className="overflow-x-auto max-h-[220px] overflow-y-auto border border-slate-100 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50 sticky top-0">
                <th className="p-2.5">Date & Time</th>
                <th className="p-2.5">Product ID / Name</th>
                <th className="p-2.5 text-center">Type</th>
                <th className="p-2.5 text-center">Delta Qty</th>
                <th className="p-2.5">Notes Reason Reference</th>
                <th className="p-2.5">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {stockLedger.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 text-slate-600">
                  <td className="p-2.5 text-[11px] font-mono whitespace-nowrap">{new Date(log.date).toLocaleString()}</td>
                  <td className="p-2.5">
                    <p className="font-bold text-slate-800">{products.find(p=>p.id === log.productId)?.name || "Product "+log.productId}</p>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${log.type === "Addition" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="p-2.5 text-center font-bold font-mono">{log.quantity}</td>
                  <td className="p-2.5 text-slate-500 text-[11px] truncate max-w-[200px]">{log.reason}</td>
                  <td className="p-2.5 text-slate-400 text-[11px] font-mono">{log.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
