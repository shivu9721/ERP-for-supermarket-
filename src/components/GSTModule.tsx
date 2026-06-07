import { useState, useEffect } from "react";
import { fetchBills, fetchPurchases } from "../utils/api";
import { Bill, Purchase } from "../types";
import { 
  Percent, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileSpreadsheet, 
  Tags, 
  Compass, 
  Info,
  Calendar
} from "lucide-react";

export default function GSTModule() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  // Period filtering
  const [taxMonth, setTaxMonth] = useState("2026-06");

  const loadData = async () => {
    try {
      const b = await fetchBills();
      setBills(b.filter(x => x.status === "Completed"));
      const p = await fetchPurchases();
      setPurchases(p);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute stats based on the selected month
  const filteredBills = bills.filter(b => b.date.startsWith(taxMonth));
  const filteredPurchases = purchases.filter(p => p.purchaseDate.startsWith(taxMonth));

  // Compute Outward Tax Liability (Collected on Sales)
  let salesExemptValue = 0; // 0%
  let salesTaxableValue = 0; // Items with tax base
  let totalCGSTSold = 0;
  let totalSGSTSold = 0;

  filteredBills.forEach(b => {
    b.items.forEach(itm => {
      const isExempt = itm.gstPercentage === 0;
      const baseValue = itm.netAmount / (1 + (itm.gstPercentage / 100));
      const totalTax = itm.netAmount - baseValue;

      if (isExempt) {
        salesExemptValue += itm.netAmount;
      } else {
        salesTaxableValue += baseValue;
        totalCGSTSold += totalTax / 2;
        totalSGSTSold += totalTax / 2;
      }
    });
  });

  // Compute Input Tax Credit (ITC) (Paid on Purchases)
  let purchaseExemptValue = 0;
  let purchaseTaxableValue = 0;
  let totalCGSTPurchased = 0;
  let totalSGSTPurchased = 0;

  filteredPurchases.forEach(p => {
    p.items.forEach(itm => {
      const isExempt = itm.gstPercentage === 0;
      const baseValue = itm.netAmount / (1 + (itm.gstPercentage / 100));
      const totalTax = itm.netAmount - baseValue;

      if (isExempt) {
        purchaseExemptValue += itm.netAmount;
      } else {
        purchaseTaxableValue += baseValue;
        totalCGSTPurchased += totalTax / 2;
        totalSGSTPurchased += totalTax / 2;
      }
    });
  });

  // HSN Summarization logic
  const hsnSummary: { [key: string]: { hsn: string; description: string; qty: number; value: number; cgst: number; sgst: number } } = {};
  filteredBills.forEach(b => {
    b.items.forEach(itm => {
      const hsn = itm.hsnCode || "SAC-9968";
      if (!hsnSummary[hsn]) {
        hsnSummary[hsn] = { hsn, description: hsn === "SAC-9968" ? "General Groceries" : "Product SKU Goods", qty: 0, value: 0, cgst: 0, sgst: 0 };
      }
      const baseValue = itm.netAmount / (1 + (itm.gstPercentage / 100));
      const tax = itm.netAmount - baseValue;

      hsnSummary[hsn].qty += itm.quantity;
      hsnSummary[hsn].value += baseValue;
      hsnSummary[hsn].cgst += tax / 2;
      hsnSummary[hsn].sgst += tax / 2;
    });
  });

  const netCGSTPayable = Math.max(0, totalCGSTSold - totalCGSTPurchased);
  const netSGSTPayable = Math.max(0, totalSGSTSold - totalSGSTPurchased);

  return (
    <div className="space-y-4 animate-in fade-in duration-100" id="gst-module">
      {/* Top filter header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 font-sans">
            <Percent className="h-4.5 w-4.5 text-indigo-500" />
            GST Compliance Ledger & returns
          </h2>
          <p className="text-xs text-slate-400">CGST/SGST tax liabilities, input tax credits (ITC), and HSN summaries</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Period Month:
          </label>
          <input 
            type="month" 
            className="bg-white border rounded p-1.5 text-xs font-mono font-bold outline-none cursor-pointer"
            value={taxMonth}
            onChange={(e) => setTaxMonth(e.target.value)}
          />
        </div>
      </div>

      {/* Tax distribution counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Outward liability collected */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Outward collected tax (Sales)</span>
            <div className="p-2 bg-red-50 text-red-600 rounded">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-red-600">
              ₹{(totalCGSTSold + totalSGSTSold).toFixed(1)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              CGST: ₹{totalCGSTSold.toFixed(1)} | SGST: ₹{totalSGSTSold.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Input Tax Credit (ITC) */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Input Tax Credit ITC (Purchases)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-emerald-600">
              ₹{(totalCGSTPurchased + totalSGSTPurchased).toFixed(1)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              CGST: ₹{totalCGSTPurchased.toFixed(1)} | SGST: ₹{totalSGSTPurchased.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Net GST liability */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Net GST Liability (GSTR-3B)</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
              <Compass className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-indigo-700">
              ₹{(netCGSTPayable + netSGSTPayable).toFixed(1)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Net Payable CGST: ₹{netCGSTPayable.toFixed(1)} | SGST: ₹{netSGSTPayable.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales / Purchases VAT matrices */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sale & Purchase Tax Base Values</h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border rounded-lg space-y-1.5">
              <h4 className="font-bold text-slate-700 flex justify-between">
                <span>Taxable Sales Values</span>
                <span className="font-mono text-red-600">₹{salesTaxableValue.toFixed(1)}</span>
              </h4>
              <p className="text-[10px] text-slate-500">Includes all goods matching tax slabs: 5%, 12%, 18%, 28%.</p>
            </div>
            <div className="p-3 bg-slate-50 border rounded-lg space-y-1.5">
              <h4 className="font-bold text-slate-700 flex justify-between">
                <span>Exempt / Zero VAT Sales</span>
                <span className="font-mono text-slate-600">₹{salesExemptValue.toFixed(1)}</span>
              </h4>
              <p className="text-[10px] text-slate-500">Essential grocery items with 0% GST liability (Tata Salt, staples, etc.)</p>
            </div>
            <div className="p-3 bg-slate-50 border rounded-lg space-y-1.5">
              <h4 className="font-bold text-slate-700 flex justify-between">
                <span>Wholesale purchases taxable base</span>
                <span className="font-mono text-emerald-600">₹{purchaseTaxableValue.toFixed(1)}</span>
              </h4>
              <p className="text-[10px] text-slate-500">Original wholesale base costs received from registered suppliers.</p>
            </div>
          </div>
        </div>

        {/* GSTR-1 HSN summarizes table */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4 overflow-hidden">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">GSTR-1 HSN Summary</h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold font-mono py-0.5 px-2 rounded">HSN Codes</span>
          </div>

          <div className="overflow-x-auto max-h-[220px] overflow-y-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] uppercase text-slate-400 font-bold bg-slate-50/50 sticky top-0">
                  <th className="p-2">HSN code</th>
                  <th className="p-2 text-center">Billed Qty</th>
                  <th className="p-2 text-right">Taxable Worth (₹)</th>
                  <th className="p-2 text-right">CGST (₹)</th>
                  <th className="p-2 text-right">SGST (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.values(hsnSummary).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400 text-xs text-medium">
                      No GSTR-1 records found in GSTR database
                    </td>
                  </tr>
                ) : (
                  Object.values(hsnSummary).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 text-slate-600">
                      <td className="p-2">
                        <p className="font-bold text-slate-800 font-mono">{row.hsn}</p>
                        <p className="text-[9px] text-slate-400">{row.description}</p>
                      </td>
                      <td className="p-2 text-center font-bold font-mono">{row.qty}</td>
                      <td className="p-2 text-right font-semibold font-mono">₹{row.value.toFixed(1)}</td>
                      <td className="p-2 text-right font-semibold font-mono text-red-600">₹{row.cgst.toFixed(1)}</td>
                      <td className="p-2 text-right font-semibold font-mono text-red-600">₹{row.sgst.toFixed(1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
