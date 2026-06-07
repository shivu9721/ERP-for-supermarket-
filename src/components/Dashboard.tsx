import { useState, useEffect } from "react";
import { fetchSummary } from "../utils/api";
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  ArrowRight, 
  Activity, 
  Award,
  RefreshCw,
  FolderMinus,
  BrainCircuit
} from "lucide-react";

interface SummaryData {
  metrics: {
    todaySales: number;
    todayBillCount: number;
    todayProfit: number;
    inventoryValuation: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  topSelling: Array<{
    name: string;
    barcode: string;
    qty: number;
    revenue: number;
  }>;
  lowStockProducts: Array<{
    id: string;
    barcode: string;
    name: string;
    currentStock: number;
    minimumStockLevel: number;
    location?: string;
  }>;
  recentPurchases: Array<{
    id: string;
    supplierName: string;
    invoiceNumber: string;
    purchaseDate: string;
    netAmount: number;
  }>;
  charts: {
    salesChart: Array<{
      date: string;
      sales: number;
      profit: number;
    }>;
  };
}

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiDocs, setAiDocs] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await fetchSummary();
      setData(summary);

      // Fetch pending AI documents
      try {
        const aiRes = await fetch("/api/ai-document-center/documents");
        if (aiRes.ok) {
          const docs = await aiRes.json();
          setAiDocs(docs.filter((d: any) => d.status === "Pending"));
        }
      } catch (e) {
        console.warn("Failed to load AI docs in dashboard preview", e);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard parameters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]" id="db-loader">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-2" />
        <p className="text-slate-500 font-medium">Computing ERP statistics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl" id="db-error">
        <h2 className="font-bold flex items-center mb-2">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Dashboard Sync Failed
        </h2>
        <p>{error || "Please verify backend port connection integrity"}</p>
        <button onClick={loadData} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors">
          Retry Sync
        </button>
      </div>
    );
  }

  const { metrics, topSelling, lowStockProducts, recentPurchases, charts } = data;

  // Compute maximum chart value to scale the bars nicely
  const maxSaleValue = Math.max(...charts.salesChart.map(day => day.sales), 100);

  return (
    <div className="space-y-6" id="dashboard-module">
      {/* Upper action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Enterprise Overview</h1>
          <p className="text-xs text-slate-500">Real-time LAN counter activity logging & inventory auditing</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            id="btn-pos-quick"
            onClick={() => onNavigate("pos-billing")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-all"
          >
            <ShoppingBag className="h-4 w-4" />
            Launch POS Counter
          </button>
          <button 
            onClick={loadData}
            className="flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg font-medium text-sm transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Sync ERP
          </button>
        </div>
      </div>

      {/* Grid of core metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="metrics-grid">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's Sales</span>
            <div className="text-2xl font-bold text-slate-800">₹{metrics.todaySales.toLocaleString("en-IN")}</div>
            <p className="text-[11px] text-slate-500">{metrics.todayBillCount} completed bills today</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* Today's Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Profit (Est)</span>
            <div className="text-2xl font-bold text-indigo-700">₹{metrics.todayProfit.toLocaleString("en-IN")}</div>
            <p className="text-[11px] text-slate-500">Excludes GST liabilities</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Current Stock Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Inventory Value</span>
            <div className="text-2xl font-bold text-slate-800">₹{metrics.inventoryValuation.toLocaleString("en-IN")}</div>
            <p className="text-[11px] text-slate-500">Calculated at purchase prices</p>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-lg">
            <Package className="h-5 w-5" />
          </div>
        </div>

        {/* Low / Out of Stock alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Stock Alerts</span>
            <div className="text-2xl font-bold text-amber-600 flex items-center gap-2">
              <span>{metrics.lowStockCount} Low</span>
              <span className="text-sm font-normal text-slate-300">|</span>
              <span className="text-red-600">{metrics.outOfStockCount} Out</span>
            </div>
            <p className="text-[11px] text-slate-500">Requires immediate reorder placement</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Charts and top selling row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart (d3/svg style custom design bar) */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800">Sales & Margin Trends</h3>
              <p className="text-xs text-slate-400">Daily LAN counter transactions over last 7 days</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-3 w-3 rounded bg-emerald-500 inline-block"></span> Sales
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-3 w-3 rounded bg-indigo-500 inline-block"></span> Est Profit
              </span>
            </div>
          </div>

          <div className="h-[240px] flex items-end gap-x-2 sm:gap-x-4 pt-6 pb-2 px-1 relative">
            {/* Background gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-[10px] text-slate-300 border-b border-dashed border-slate-100">
              <div className="border-b border-dashed border-slate-100 w-full h-[50px]"></div>
              <div className="border-b border-dashed border-slate-100 w-full h-[50px]"></div>
              <div className="border-b border-dashed border-slate-100 w-full h-[50px]"></div>
            </div>

            {charts.salesChart.map((day, i) => {
              const salePercent = (day.sales / maxSaleValue) * 85; 
              const profitPercent = (day.profit / maxSaleValue) * 85; 
              return (
                <div key={i} className="flex-1 flex flex-col items-center h-full group relative z-10">
                  <div className="w-full flex justify-center gap-1 h-[85%] items-end">
                    {/* Sales Column */}
                    <div 
                      className="w-1/3 min-h-[4px] bg-emerald-500 rounded-t-sm hover:bg-emerald-600 transition-all cursor-pointer relative"
                      style={{ height: `${Math.max(4, salePercent)}%` }}
                    >
                      {/* Tooltip */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] py-0.5 px-2 rounded whitespace-nowrap z-50 shadow font-mono">
                        Sales: ₹{day.sales}
                      </span>
                    </div>
                    {/* Profit Column */}
                    <div 
                      className="w-1/3 min-h-[4px] bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-all cursor-pointer relative"
                      style={{ height: `${Math.max(4, profitPercent)}%` }}
                    >
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[10px] py-0.5 px-2 rounded whitespace-nowrap z-50 shadow font-mono">
                        Profit: ₹{day.profit}
                      </span>
                    </div>
                  </div>
                  <div className="h-[15%] flex items-center justify-center">
                    <span className="text-[10px] font-medium text-slate-500 truncate max-w-[60px]">{day.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top selling products */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Award className="h-4.5 w-4.5 text-indigo-500" />
              Fast Moving Products
            </h3>
            <p className="text-xs text-slate-400">Top contributors by quantity sold</p>
          </div>

          <div className="space-y-3">
            {topSelling.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-slate-400 text-xs">
                <Activity className="h-8 w-8 mb-1 opacity-50" />
                No sales logs computed today
              </div>
            ) : (
              topSelling.map((prod, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100/50">
                  <div className="truncate max-w-[140px] sm:max-w-xs md:max-w-[170px]">
                    <p className="text-xs font-semibold text-slate-700 truncate">{prod.name}</p>
                    <p className="text-[10px] font-mono text-slate-400">Barcode: {prod.barcode}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="inline-block bg-indigo-50 text-indigo-700 font-bold text-xs px-2 py-0.5 rounded-full">
                      {prod.qty} sold
                    </span>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">₹{prod.revenue}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Document Queue Dashboard Widget */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden" id="ai-dashboard-banner">
        {/* Decorative ambient glowing lines */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
        <div className="space-y-1.5 z-10 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1 font-mono">
              <BrainCircuit className="h-3 w-3" />
              AI Intelligent Inward Agent
            </span>
            {aiDocs.length > 0 && (
              <span className="bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse font-mono">
                {aiDocs.length} Pending
              </span>
            )}
          </div>
          <h2 className="text-base font-black tracking-tight text-white">AI Document Center Verification</h2>
          <p className="text-xs text-slate-400 select-text leading-relaxed">
            {aiDocs.length > 0 
              ? `You have ${aiDocs.length} supplier invoices awaiting matching and approval. Streamline inventory stocking process via one-click ocr matching.` 
              : "No supplier invoices are pending manager review. Drag and drop purchase bills inside the AI center to instantly digitalize stock entries."}
          </p>
        </div>
        <button 
          onClick={() => onNavigate("ai-document-center")}
          className="z-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-md transition-all flex items-center gap-1 w-full md:w-auto justify-center select-none cursor-pointer"
        >
          <span>Open Document Portal</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Low stock indicators and recent purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Out of Stock and Low Stock Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800">Critical Stock Auditing</h3>
              <p className="text-xs text-slate-400">Items below or close to minimum levels</p>
            </div>
            <button 
              onClick={() => onNavigate("inventory-management")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              Manage Stock
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase text-slate-400 font-semibold">
                  <th className="py-2.5">Product Name</th>
                  <th className="py-2.5 text-center">In Stock</th>
                  <th className="py-2.5 text-center">Safety Level</th>
                  <th className="py-2.5">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-xs text-slate-400 font-medium">
                      ✓ All product stock is within safety margins.
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map((p) => (
                    <tr key={p.id} className="text-xs hover:bg-slate-50 transition-all">
                      <td className="py-3 font-semibold text-slate-700 truncate max-w-[150px]">{p.name}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${p.currentStock === 0 ? "bg-red-100 text-red-700 animate-pulse" : "bg-amber-100 text-amber-700"}`}>
                          {p.currentStock}
                        </span>
                      </td>
                      <td className="py-3 text-center font-mono text-slate-500">{p.minimumStockLevel}</td>
                      <td className="py-3 text-slate-500 text-[11px] truncate max-w-[100px]">{p.location || "Main Isle"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Purchases Inward Ledger Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800">Recent Stock Receipts</h3>
              <p className="text-xs text-slate-400">Supplier invoices created recently</p>
            </div>
            <button 
              onClick={() => onNavigate("purchase-module")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              New Inward Book
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            {recentPurchases.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-xs text-center">
                <FolderMinus className="h-8 w-8 mb-1 opacity-50" />
                No supplier receipt records found. Create purchase inward transactions to fill.
              </div>
            ) : (
              recentPurchases.map((pur) => (
                <div key={pur.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50 transition-all">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">{pur.supplierName}</h4>
                    <div className="flex gap-2 items-center text-[10px] text-slate-400 mt-1">
                      <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Invoice: {pur.invoiceNumber}</span>
                      <span>•</span>
                      <span>{pur.purchaseDate}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-700">₹{pur.netAmount.toLocaleString("en-IN")}</span>
                    <p className="text-[10px] text-emerald-600 font-medium">Inward Auto Stocked</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
