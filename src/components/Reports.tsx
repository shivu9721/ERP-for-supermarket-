import { useState, useEffect } from "react";
import { fetchBills, fetchProducts } from "../utils/api";
import { Bill, Product } from "../types";
import { 
  FileCheck, 
  BarChart, 
  TrendingUp, 
  Calendar, 
  Download, 
  Search, 
  Info,
  DollarSign
} from "lucide-react";

export default function Reports() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Filters
  const [filterType, setFilterType] = useState<"Day" | "Month" | "Category">("Day");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchInvoice, setSearchInvoice] = useState("");

  const loadData = async () => {
    try {
      const b = await fetchBills();
      setBills(b);
      const p = await fetchProducts();
      setProducts(p);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute stats on filtered subset
  const filteredBills = bills.filter(b => {
    // invoice match
    const bNo = b.billNumber || "";
    const matchInvoice = bNo.toLowerCase().includes(searchInvoice.toLowerCase()) || 
                         (b.customerMobile && b.customerMobile.includes(searchInvoice));
    
    // date match
    let matchDate = true;
    if (filterType === "Day") {
      matchDate = b.date.startsWith(startDate);
    }

    return matchInvoice && matchDate;
  });

  const totalSales = filteredBills.filter(b=>b.status === "Completed").reduce((sum, b) => sum + b.netAmount, 0);
  const discountTotal = filteredBills.filter(b=>b.status === "Completed").reduce((sum, b) => sum + b.discountTotal, 0);
  
  // Profit calculations
  let costOfGoods = 0;
  filteredBills.filter(b=>b.status === "Completed").forEach(b => {
    b.items.forEach(itm => {
      const liveProd = products.find(p => p.id === itm.productId);
      const pr = liveProd ? liveProd.purchaseRate : (itm.saleRate * 0.7);
      costOfGoods += (pr * itm.quantity);
    });
  });
  const taxLiabilities = filteredBills.filter(b=>b.status === "Completed").reduce((sum, b) => sum + b.gstTotal, 0);
  const estimatedProfit = Math.max(0, totalSales - costOfGoods - taxLiabilities);

  // Simulated XLS PDF downloads
  const triggerDownloadSim = (format: "Excel" | "PDF") => {
    alert(`Generating Shiva Super Market system report...\nFormat: ${format}\nDate query: ${startDate}\nTotal rows: ${filteredBills.length} txns.\nFile downloaded: shiva_market_report_${startDate}.${format === "Excel" ? "xlsx" : "pdf"}`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-100" id="reports-module">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 font-sans">
            <BarChart className="h-4.5 w-4.5 text-indigo-500" />
            Financial Sales Audits & Revenue Ledgers
          </h2>
          <p className="text-xs text-slate-400">Query detailed invoice histories, gross revenues, and margins</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button 
            id="btn-export-pdf"
            onClick={() => triggerDownloadSim("PDF")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3.5 py-2 rounded-lg font-medium text-xs transition-all"
          >
            <Download className="h-4 w-4 text-red-500" /> Export PDF Ledger
          </button>
          <button 
            id="btn-export-excel"
            onClick={() => triggerDownloadSim("Excel")}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3.5 py-2 rounded-lg font-medium text-xs transition-all"
          >
            <Download className="h-4 w-4 text-emerald-500" /> Export Excel Sheets
          </button>
        </div>
      </div>

      {/* Dynamic parameters filters panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search report by Invoice key, customer mobile..." 
            className="w-full bg-slate-50 text-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs border border-slate-200 focus:border-indigo-400 outline-none"
            value={searchInvoice}
            onChange={(e) => setSearchInvoice(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
            <Calendar className="h-4 w-4" /> Date Filter:
          </label>
          <input 
            type="date" 
            className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold outline-none cursor-pointer"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>

      {/* Statistics calculation boxes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sales Transactions count</span>
          <p className="text-xl font-bold text-slate-700 mt-1 font-mono">{filteredBills.length} completed</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Sales Value</span>
          <p className="text-xl font-bold text-indigo-700 mt-1 font-mono">₹{totalSales.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Discounts Outgoing</span>
          <p className="text-xl font-bold text-emerald-600 mt-1 font-mono">₹{discountTotal.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 font-bold">Estimated Net Profit</span>
          <p className="text-xl font-bold text-amber-650 text-amber-600 mt-1 font-mono">
            ₹{estimatedProfit.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Invoice audits sheet */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50 sticky top-0">
                <th className="p-3">Receipt Invoices</th>
                <th className="p-3">Cashier counter</th>
                <th className="p-3">Customer membership</th>
                <th className="p-3 text-center">Settlement</th>
                <th className="p-3 text-right">Items count</th>
                <th className="p-3 text-right">Bill Cost (₹)</th>
                <th className="p-3 text-center">Receipt Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBills.map(b => (
                <tr key={b.id} className="hover:bg-slate-50/50 text-slate-600">
                  <td className="p-3">
                    <p className="font-bold text-slate-800 font-mono">{b.billNumber}</p>
                    <p className="text-[9px] text-slate-400">{new Date(b.date).toLocaleString()}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-semibold text-slate-700">{b.cashierName}</p>
                    <p className="text-[9px] text-slate-400">{b.counterId || "Counter-1"}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-medium text-slate-600">{b.customerName || "Walk-in Cost"}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{b.customerMobile}</p>
                  </td>
                  <td className="p-3 text-center">
                    <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                      {b.paymentMode}
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold font-mono">{b.items.reduce((sum,i)=>sum+i.quantity,0)}</td>
                  <td className="p-3 text-right font-bold text-slate-800 font-mono">₹{b.netAmount}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${b.status === "Completed" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
