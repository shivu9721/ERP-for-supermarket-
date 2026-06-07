import React, { useState, useEffect } from "react";
import { fetchSuppliers, fetchProducts, createPurchase, fetchCategories } from "../utils/api";
import { Supplier, Product, PurchaseItem } from "../types";
import { 
  Plus, 
  Trash2, 
  FileCheck, 
  RefreshCw, 
  ArrowLeft,
  Truck,
  Inbox
} from "lucide-react";

export default function PurchaseModule() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Master entry fields
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentStatus, setPaymentStatus] = useState<"Paid" | "Pending" | "Partial">("Paid");
  const [paidAmount, setPaidAmount] = useState(0);

  // Inward items cart
  const [items, setItems] = useState<any[]>([]);

  // Item form picker
  const [pickerProductId, setPickerProductId] = useState("");
  const [pickerQty, setPickerQty] = useState(10);
  const [pickerRate, setPickerRate] = useState(0);
  const [pickerGst, setPickerGst] = useState(18);

  const syncData = async () => {
    try {
      const sups = await fetchSuppliers();
      setSuppliers(sups);
      const prods = await fetchProducts();
      setProducts(prods);
      if (prods.length > 0) {
        setPickerProductId(prods[0].id);
        setPickerRate(prods[0].purchaseRate);
        setPickerGst(prods[0].gstPercentage);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    syncData();
  }, []);

  // Update rates when product picker changes
  const handleProductPickerChange = (id: string) => {
    setPickerProductId(id);
    const matched = products.find(p => p.id === id);
    if (matched) {
      setPickerRate(matched.purchaseRate);
      setPickerGst(matched.gstPercentage);
    }
  };

  const handleAddItemToReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickerProductId) return;

    const matched = products.find(p => p.id === pickerProductId);
    if (!matched) return;

    // Duplicates check
    const duplicateIdx = items.findIndex(itm => itm.productId === pickerProductId);

    const baseAmount = pickerQty * pickerRate;
    const gstValue = baseAmount * (pickerGst / 100);
    const netAmount = parseFloat((baseAmount + gstValue).toFixed(2));

    if (duplicateIdx !== -1) {
      const updated = [...items];
      updated[duplicateIdx].quantity += pickerQty;
      updated[duplicateIdx].netAmount = parseFloat((updated[duplicateIdx].quantity * updated[duplicateIdx].rate * (1 + updated[duplicateIdx].gstPercentage / 100)).toFixed(2));
      setItems(updated);
    } else {
      const newItem = {
        productId: pickerProductId,
        productName: matched.name,
        quantity: pickerQty,
        rate: pickerRate,
        gstPercentage: pickerGst,
        discount: 0,
        netAmount: netAmount
      };
      setItems(prev => [...prev, newItem]);
    }
  };

  const handleRemoveItem = (prodId: string) => {
    setItems(prev => prev.filter(itm => itm.productId !== prodId));
  };

  const computeSubtotal = () => items.reduce((sum, itm) => sum + (itm.quantity * itm.rate), 0);
  const computeGstTotal = () => items.reduce((sum, itm) => sum + (itm.quantity * itm.rate * (itm.gstPercentage / 100)), 0);
  const computeGrandTotal = () => computeSubtotal() + computeGstTotal();

  const handleClearForm = () => {
    setSupplierId("");
    setInvoiceNumber("");
    setItems([]);
  };

  const handleSavePurchaseReceipt = async () => {
    if (!supplierId || !invoiceNumber) {
      alert("Distributor details or Invoice Number is blank!");
      return;
    }
    if (items.length === 0) {
      alert("Wholesale items inward table is empty!");
      return;
    }

    const payload = {
      supplierId,
      invoiceNumber,
      purchaseDate,
      items,
      subTotal: computeSubtotal(),
      discountTotal: 0,
      gstTotal: computeGstTotal(),
      netAmount: computeGrandTotal(),
      paymentStatus,
      paidAmount,
      buyerUser: "Vishwa Manager"
    };

    try {
      await createPurchase(payload);
      alert(`Wholesale Inward successfully received and stock levels updated in real-time.`);
      handleClearForm();
      syncData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-100" id="purchase-module">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="h-5.5 w-5.5 text-indigo-500" />
            Wholesale Goods Receipt Notes (GRN)
          </h1>
          <p className="text-xs text-slate-500">Record freight boxes and immediately increase catalog stock counts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bulk Item Add Grid Form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between min-h-[460px]">
          <div className="p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Inward Box Placement</h3>

            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 space-y-1 w-full">
                <label className="block text-[11px] font-bold text-slate-500">Product lookup</label>
                <select 
                  className="w-full bg-white border border-slate-200 outline-none p-1.5 rounded text-xs"
                  value={pickerProductId}
                  onChange={(e) => handleProductPickerChange(e.target.value)}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Bulk Rate: ₹{p.purchaseRate})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                <div className="space-y-1 w-20">
                  <label className="block text-[11px] font-bold text-slate-500 text-center">Batch Qty</label>
                  <input 
                    type="number" 
                    className="w-full bg-white border border-slate-200 outline-none p-1.5 rounded text-xs text-center font-bold"
                    value={pickerQty}
                    onChange={(e) => setPickerQty(Math.max(1, parseInt(e.target.value) || 0))}
                  />
                </div>
                <div className="space-y-1 w-20">
                  <label className="block text-[11px] font-bold text-slate-500 text-center">Cost Rate (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full bg-white border border-slate-200 outline-none p-1.5 rounded text-xs text-center font-bold"
                    value={pickerRate}
                    onChange={(e) => setPickerRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1 w-20">
                  <label className="block text-[11px] font-bold text-slate-500 text-center">GST Slab (%)</label>
                  <select 
                    className="w-full bg-white border border-slate-200 outline-none p-1.5 rounded text-xs text-center font-bold"
                    value={pickerGst}
                    onChange={(e) => setPickerGst(parseInt(e.target.value) || 0)}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <button 
                  onClick={handleAddItemToReceipt}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8.5 px-3 rounded text-xs sm:self-end self-center mt-4 flex items-center justify-center gap-0.5"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>

            {/* List items to inward */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50">
                    <th className="p-2.5">Inbound Item details</th>
                    <th className="p-2.5 text-center">Cost rate</th>
                    <th className="p-2.5 text-center">Invoiced Qty</th>
                    <th className="p-2.5 text-center">GST Tax Sl</th>
                    <th className="p-2.5 text-right">Sum net</th>
                    <th className="p-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-20 text-slate-400">
                        <Inbox className="h-10 w-10 mx-auto mb-2 opacity-25" />
                        <p className="font-medium text-xs">GRN entry is currently empty</p>
                        <p className="text-[10px] mt-1 opacity-70">Pick catalog items above and click "Add" to stock-in</p>
                      </td>
                    </tr>
                  ) : (
                    items.map(itm => (
                      <tr key={itm.productId} className="hover:bg-slate-50/50">
                        <td className="p-2.5">
                          <p className="font-bold text-slate-800">{itm.productName}</p>
                        </td>
                        <td className="p-2.5 text-center font-semibold text-slate-600">₹{itm.rate}</td>
                        <td className="p-2.5 text-center font-bold text-slate-800">{itm.quantity}</td>
                        <td className="p-2.5 text-center text-slate-500 font-mono">{itm.gstPercentage}%</td>
                        <td className="p-2.5 text-right font-bold text-slate-700">₹{itm.netAmount}</td>
                        <td className="p-2.5 text-center">
                          <button onClick={() => handleRemoveItem(itm.productId)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Math calculations */}
          <div className="p-4 bg-slate-100 border-t border-slate-200 grid grid-cols-3 gap-4 text-xs font-medium text-center">
            <div>
              <span className="text-slate-400 text-[10px] uppercase">Base Cost Inflow</span>
              <p className="text-sm font-bold text-slate-700 mt-0.5">₹{computeSubtotal().toFixed(1)}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase">GST tax inflow input</span>
              <p className="text-sm font-bold text-slate-700 mt-0.5">₹{computeGstTotal().toFixed(1)}</p>
            </div>
            <div className="bg-white border p-1 rounded font-bold text-indigo-700">
              <span className="text-indigo-500 text-[9px] uppercase font-bold">Total GRN Payable</span>
              <p className="text-sm font-bold mt-0.5">₹{computeGrandTotal().toFixed(1)}</p>
            </div>
          </div>
        </div>

        {/* Invoice attributes & distributor details card */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4 max-h-[500px]">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Purchase Properties</h3>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500">Distributor / Supplier <span className="text-red-500">*</span></label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded outline-none"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Select registered partner</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (Ph: {s.mobile})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500">Supplier Invoice Number <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                placeholder="e.g. BILL-4512A" 
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded outline-none font-mono"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-500">Delivery Date</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded outline-none font-mono"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            <div className="pt-2 space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase">Settlement Condition</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button 
                  onClick={() => setPaymentStatus("Paid")}
                  className={`p-2 rounded text-[11px] font-bold border transition-colors ${paymentStatus === "Paid" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                >
                  Fully Paid
                </button>
                <button 
                  onClick={() => setPaymentStatus("Partial")}
                  className={`p-2 rounded text-[11px] font-bold border transition-colors ${paymentStatus === "Partial" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                >
                  Partial Pay
                </button>
                <button 
                  id="btn-status-pending"
                  onClick={() => setPaymentStatus("Pending")}
                  className={`p-2 rounded text-[11px] font-bold border transition-colors ${paymentStatus === "Pending" ? "bg-indigo-600 border-indigo-600 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                >
                  Pending Post
                </button>
              </div>
            </div>

            {paymentStatus === "Partial" && (
              <div className="p-2 border border-slate-100 bg-slate-50 rounded-lg space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">Paid amount upfront</label>
                <input 
                  type="number" 
                  className="w-full bg-white border border-slate-200 p-1.5 rounded text-xs"
                  placeholder="₹"
                  value={paidAmount === 0 ? "" : paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            )}
          </div>

          <div className="pt-3 flex gap-2">
            <button 
              onClick={handleClearForm}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-lg text-xs"
            >
              Clear Cart
            </button>
            <button 
              id="btn-save-purchase"
              onClick={handleSavePurchaseReceipt}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors"
            >
              Confirm Goods Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
