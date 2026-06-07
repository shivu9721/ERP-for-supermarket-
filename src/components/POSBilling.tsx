import React, { useState, useEffect, useRef } from "react";
import { 
  fetchProducts, 
  createBill, 
  searchCustomerMobile, 
  createCustomer, 
  fetchHeldBills, 
  deleteHeldBill,
  createSalesReturn,
  fetchSettings 
} from "../utils/api";
import { Product, BillItem, Customer, SystemSettings, Bill } from "../types";
import { 
  Barcode, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  Pause, 
  Play, 
  TrendingDown, 
  User, 
  Printer, 
  DollarSign, 
  Undo2, 
  CreditCard, 
  Smartphone,
  Keyboard,
  Info
} from "lucide-react";

export default function POSBilling() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<BillItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  
  // Customer
  const [customerMobile, setCustomerMobile] = useState("9999999999");
  const [customer, setCustomer] = useState<Customer | null>({
    id: "cust_walkin", name: "Walk-in Customer", mobile: "9999999999", loyaltyPoints: 0
  });
  const [customerNameInput, setCustomerNameInput] = useState("");
  const [customerRegError, setCustomerRegError] = useState("");

  // Discounts
  const [globalDiscount, setGlobalDiscount] = useState(0); // absolute rupees
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Card" | "Credit">("Cash");
  
  // Held and Resume Bills
  const [heldBills, setHeldBills] = useState<any[]>([]);
  const [heldNote, setHeldNote] = useState("");

  // Modals / Receipts
  const [activeBill, setActiveBill] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [storeSettings, setStoreSettings] = useState<SystemSettings | null>(null);

  // Sale Return Screen
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnBillNumber, setReturnBillNumber] = useState("");
  const [returnBillData, setReturnBillData] = useState<any | null>(null);
  const [returnedQty, setReturnedQty] = useState<{ [key: string]: number }>({});
  const [returnReason, setReturnReason] = useState("");

  // Refs
  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync state helpers
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "">("");

  const displayStatus = (msg: string, type: "success" | "error") => {
    setStatusMessage(msg);
    setStatusType(type);
    setTimeout(() => {
      setStatusMessage("");
      setStatusType("");
    }, 4000);
  };

  // Load products & holdings on mount
  const initPOS = async () => {
    try {
      const prods = await fetchProducts();
      setProducts(prods);
      const held = await fetchHeldBills();
      setHeldBills(held);
      const settings = await fetchSettings();
      setStoreSettings(settings);
    } catch (err) {
      console.error("Error loading products/settings", err);
    }
  };

  useEffect(() => {
    initPOS();
    // Auto-focus barcode scanner input
    setTimeout(() => {
      barcodeRef.current?.focus();
    }, 200);

    // Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        barcodeRef.current?.focus();
      } else if (e.key === "F7") {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === "F8") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "F9") {
        e.preventDefault();
        handleCheckout();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setCart([]);
        barcodeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync search query changes
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const filtered = products.filter(
      p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setSearchResults(filtered.slice(0, 10)); // limit 10 hits
  }, [searchQuery, products]);

  // Fast Barcode scanning simulation
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput) return;

    const matched = products.find(p => p.barcode === barcodeInput && p.status === "Active");
    if (matched) {
      addToCart(matched);
      setBarcodeInput("");
      barcodeRef.current?.focus();
    } else {
      displayStatus(`Product barcode not found: ${barcodeInput}`, "error");
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.productId === product.id);
      if (idx !== -1) {
        const updated = [...prev];
        const newQty = updated[idx].quantity + 1;
        updated[idx].quantity = newQty;
        updated[idx].netAmount = calculateItemTotal(updated[idx].saleRate, newQty, updated[idx].discount || 0);
        return updated;
      } else {
        const newItem: BillItem = {
          productId: product.id,
          productName: product.name,
          barcode: product.barcode,
          quantity: 1,
          mrp: product.mrp,
          saleRate: product.saleRate,
          gstPercentage: product.gstPercentage,
          hsnCode: product.hsnCode,
          discount: 0,
          netAmount: product.saleRate
        };
        return [...prev, newItem];
      }
    });
    // Visual sound or flash mock
    barcodeRef.current?.focus();
  };

  const calculateItemTotal = (rate: number, qty: number, discountPerUnit: number) => {
    return parseFloat(((rate - discountPerUnit) * qty).toFixed(2));
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(itm => {
        if (itm.productId === productId) {
          const newQty = Math.max(1, itm.quantity + delta);
          return {
            ...itm,
            quantity: newQty,
            netAmount: calculateItemTotal(itm.saleRate, newQty, itm.discount)
          };
        }
        return itm;
      }).filter(itm => itm.quantity > 0);
    });
  };

  const updateItemDiscount = (productId: string, discAmt: number) => {
    setCart(prev => {
      return prev.map(itm => {
        if (itm.productId === productId) {
          const fixedDisc = Math.min(itm.saleRate, Math.max(0, discAmt));
          return {
            ...itm,
            discount: fixedDisc,
            netAmount: calculateItemTotal(itm.saleRate, itm.quantity, fixedDisc)
          };
        }
        return itm;
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(itm => itm.productId !== productId));
  };

  // Mobile customer lookup
  const lookupCustomer = async () => {
    if (!customerMobile) return;
    try {
      const cust = await searchCustomerMobile(customerMobile);
      setCustomer(cust);
      setCustomerNameInput("");
      setCustomerRegError("");
      displayStatus(`Customer matched: ${cust.name}`, "success");
    } catch (err) {
      // Not registered
      setCustomer(null);
      setCustomerNameInput("");
      setCustomerRegError("Unregistered Number. Enter name to add customer.");
    }
  };

  // Quick Customer Registration
  const handleRegisterCustomer = async () => {
    if (!customerMobile || !customerNameInput) return;
    try {
      const newCust = await createCustomer({ name: customerNameInput, mobile: customerMobile });
      setCustomer(newCust);
      setCustomerRegError("");
      displayStatus(`Successfully registered customer: ${newCust.name}`, "success");
    } catch (err: any) {
      setCustomerRegError(err.message);
    }
  };

  // Math totals
  const computeSubTotal = () => cart.reduce((sum, item) => sum + (item.saleRate * item.quantity), 0);
  const computeItemDiscounts = () => cart.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
  
  // Tax distribution
  const computeTaxDistributions = () => {
    let cgst = 0;
    let sgst = 0;
    
    cart.forEach(itm => {
      const rateWithoutDiscount = itm.saleRate - itm.discount;
      const baseValue = (rateWithoutDiscount * itm.quantity) / (1 + (itm.gstPercentage / 100));
      const taxValue = (rateWithoutDiscount * itm.quantity) - baseValue;
      
      cgst += taxValue / 2;
      sgst += taxValue / 2;
    });

    return {
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      totalTax: parseFloat((cgst + sgst).toFixed(2))
    };
  };

  const getNetTotal = () => {
    const rawSub = computeSubTotal();
    const discountsItem = computeItemDiscounts();
    const finalAmount = Math.max(0, rawSub - discountsItem - globalDiscount);
    return Math.round(finalAmount); 
  };

  // Hold current transaction
  const handleHoldBill = async () => {
    if (cart.length === 0) {
      displayStatus("Cannot hold an empty cart.", "error");
      return;
    }
    const note = prompt("Enter a brief note for holding bill:", "Counter Hold");
    if (note === null) return; // cancelled

    const { cgst, sgst, totalTax } = computeTaxDistributions();
    const payload = {
      customerId: customer?.id || "cust_walkin",
      customerName: customer?.name || "Walk-in Customer",
      customerMobile: customerMobile,
      items: cart,
      subTotal: computeSubTotal(),
      discountTotal: computeItemDiscounts() + globalDiscount,
      cgstTotal: cgst,
      sgstTotal: sgst,
      gstTotal: totalTax,
      netAmount: getNetTotal(),
      paymentMode,
      holdBill: true,
      heldNote: note || "Custom hold"
    };

    try {
      await createBill(payload);
      setCart([]);
      setGlobalDiscount(0);
      setCustomerMobile("9999999999");
      setCustomer({ id: "cust_walkin", name: "Walk-in Customer", mobile: "9999999999", loyaltyPoints: 0 });
      displayStatus("Transaction saved to on-hold ledger", "success");
      // reload hold bills
      const held = await fetchHeldBills();
      setHeldBills(held);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Resume suspended bill
  const resumeHeldBill = (held: any) => {
    setCart(held.items);
    setGlobalDiscount(0); 
    setCustomerMobile(held.customerMobile || "9999999999");
    setCustomer({
      id: held.customerId,
      name: held.customerName,
      mobile: held.customerMobile,
      loyaltyPoints: 0
    });
    // Remove the held bill
    deleteHeldBill(held.id)
      .then(() => fetchHeldBills())
      .then(res => setHeldBills(res))
      .catch(console.error);

    displayStatus(`Resumed hold ticket: ${held.billNumber}`, "success");
    barcodeRef.current?.focus();
  };

  // Print/Final checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      displayStatus("POS Cart is empty. Please barcode scan to generate.", "error");
      return;
    }

    const { cgst, sgst, totalTax } = computeTaxDistributions();
    const payload = {
      customerId: customer?.id || "cust_walkin",
      customerName: customer?.name || "Walk-in Customer",
      customerMobile: customerMobile,
      items: cart,
      subTotal: computeSubTotal(),
      discountTotal: computeItemDiscounts() + globalDiscount,
      cgstTotal: cgst,
      sgstTotal: sgst,
      gstTotal: totalTax,
      netAmount: getNetTotal(),
      paymentMode,
      cashierId: "cashier_mgr_01",
      cashierName: "Vishwa K. (Store Manager)"
    };

    try {
      const response = await createBill(payload);
      setActiveBill(response.bill);
      setShowReceipt(true);
      
      // Clear pos cart
      setCart([]);
      setGlobalDiscount(0);
      setCustomerMobile("9999999999");
      setCustomer({ id: "cust_walkin", name: "Walk-in Customer", mobile: "9999999999", loyaltyPoints: 0 });
      displayStatus("POS Bill Invoiced successfully!", "success");
      barcodeRef.current?.focus();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Lookup Sales Return
  const lookupBillForReturn = async () => {
    if (!returnBillNumber) return;
    try {
      const res = await fetch("/api/bills");
      const list: Bill[] = await res.json();
      const matched = list.find(b => b.billNumber === returnBillNumber && b.status === "Completed");

      if (matched) {
        setReturnBillData(matched);
        const qtys: { [key: string]: number } = {};
        matched.items.forEach(itm => {
          qtys[itm.productId] = 1; // Default return quantity 1
        });
        setReturnedQty(qtys);
      } else {
        alert("Active completed invoice number not found.");
        setReturnBillData(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Execute Refund Return
  const handlePostReturn = async () => {
    if (!returnBillData) return;
    
    // items to return
    const itemsToReturn = returnBillData.items.map((itm: any) => ({
      productId: itm.productId,
      productName: itm.productName,
      barcode: itm.barcode,
      quantity: returnedQty[itm.productId] || 0
    })).filter((itm: any) => itm.quantity > 0);

    if (itemsToReturn.length === 0) {
      alert("No quantities selected for returns");
      return;
    }

    // refund calculations
    let calculatedRefund = 0;
    itemsToReturn.forEach((rItm: any) => {
      const baseItm = returnBillData.items.find((i: any) => i.productId === rItm.productId);
      if (baseItm) {
        calculatedRefund += baseItm.saleRate * rItm.quantity;
      }
    });

    try {
      const payload = {
        billNumber: returnBillData.billNumber,
        returnedItems: itemsToReturn,
        returnReason,
        refundAmount: calculatedRefund,
        cashierName: "Vishwa K. (Store Manager)"
      };
      await createSalesReturn(payload);
      alert(`Sales Refund Completed. Return Receipt Generated. Refund Amount: ₹${calculatedRefund}`);
      setShowReturnModal(false);
      setReturnBillNumber("");
      setReturnBillData(null);
      setReturnReason("");
      initPOS();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const { cgst, sgst, totalTax } = computeTaxDistributions();

  return (
    <div className="space-y-4" id="pos-billing-module">
      {/* Short quick bar alerts */}
      {statusMessage && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-xs font-semibold ${statusType === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          <Info className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* POS Top Section: Barcode scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Large Barcode Scanner input & Product Text searcher */}
        <div className="lg:col-span-2 bg-indigo-900 p-4 rounded-xl shadow-md text-white space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
              <span className="absolute left-3 top-2.5 text-indigo-300">
                <Barcode className="h-5 w-5" />
              </span>
              <input 
                ref={barcodeRef}
                type="text" 
                id="pos-barcode-input"
                placeholder="PRO TIP: Continuously scan barcodes directly... (F2)" 
                className="w-full bg-indigo-950 text-white rounded-lg pl-11 pr-4 py-2.5 outline-none border border-indigo-700 focus:border-emerald-500 font-mono text-sm tracking-wide placeholder-slate-200/50"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
              />
              <button type="submit" className="hidden" />
            </form>

            <div className="relative max-w-xs w-full">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Search className="h-4.5 w-4.5" />
              </span>
              <input 
                ref={searchRef}
                type="text" 
                placeholder="Type item name... (F8)" 
                className="w-full bg-slate-50 text-slate-800 rounded-lg pl-10 pr-3 py-2.5 outline-none border border-slate-200 focus:border-indigo-400 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {/* Dropdown text search helper */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl text-slate-700 text-xs py-1.5 z-50 max-h-[190px] overflow-y-auto">
                  {searchResults.map(prod => (
                    <button 
                      key={prod.id}
                      onClick={() => {
                        addToCart(prod);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b border-slate-100 last:border-0 flex justify-between font-medium"
                    >
                      <span>{prod.name}</span>
                      <span className="text-indigo-600 font-bold">₹{prod.saleRate}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-indigo-200 font-medium font-mono">
            <span>F2: Focus Barcode</span>
            <span>•</span>
            <span>F8: Text Search</span>
            <span>•</span>
            <span>F7: Hold Bill</span>
            <span>•</span>
            <span>F9: Process checkout & Quick print</span>
            <span>•</span>
            <span className="text-amber-300">Esc: Clear POS Cart</span>
          </div>
        </div>

        {/* Customer lookup panel */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
            <span>CUSTOMER & LOYALTY PROFILE</span>
            <button 
              onClick={() => setShowReturnModal(true)} 
              className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              <Undo2 className="h-3.5 w-3.5" /> Sales Return
            </button>
          </div>

          <div className="flex gap-1">
            <div className="relative flex-1">
              <User className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="10-Digit Mobile" 
                maxLength={10}
                className="w-full bg-slate-50 text-xs text-slate-700 p-1.5 pl-8 rounded-lg outline-none border border-slate-200 text-center font-mono"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button 
              onClick={lookupCustomer}
              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold text-xs px-2 rounded-lg"
            >
              Find
            </button>
          </div>

          {customer ? (
            <div className="bg-indigo-50/50 p-2 rounded-lg flex items-center justify-between text-xs border border-indigo-50">
              <div>
                <p className="font-bold text-slate-800">{customer.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">Points Accumulated: {customer.loyaltyPoints} pts</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                Active
              </span>
            </div>
          ) : (
            <div className="p-2 bg-amber-50 rounded-lg text-xs border border-amber-100 space-y-1">
              <p className="text-amber-800 font-medium text-[11px]">{customerRegError}</p>
              <div className="flex gap-1">
                <input 
                  type="text" 
                  placeholder="Customer Full Name" 
                  className="flex-1 bg-white border border-amber-200 p-1 rounded text-xs"
                  value={customerNameInput}
                  onChange={(e) => setCustomerNameInput(e.target.value)}
                />
                <button 
                  onClick={handleRegisterCustomer}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded text-[11px]"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* POS Body Section: Cart table & payment drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continuous list of cart items */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase">Cart Items ({cart.length})</span>
              <button 
                onClick={() => setCart([])} 
                className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-0.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear All Table
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50">
                    <th className="p-3">SN</th>
                    <th className="p-3">Item Details</th>
                    <th className="p-3 text-center">MRP/Rate</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-center">Unit Disc. (₹)</th>
                    <th className="p-3 text-right">Net Amount</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-slate-400">
                        <Barcode className="h-12 w-12 mx-auto mb-2 opacity-25" />
                        <p className="font-medium text-sm">Scan barcode or search products using keyboard</p>
                        <p className="text-[10px] mt-1 opacity-70">Pre-loaded barcodes: 8901030752109, 8901058002316, 1001, etc.</p>
                      </td>
                    </tr>
                  ) : (
                    cart.map((itm, index) => (
                      <tr key={itm.productId} className="hover:bg-slate-50/50 items-center">
                        <td className="p-3 text-slate-400 font-mono font-bold">{index + 1}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800">{itm.productName}</p>
                          <div className="flex gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>Barcode: {itm.barcode}</span>
                            <span>•</span>
                            <span>GST: {itm.gstPercentage}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <p className="font-semibold text-slate-500 line-through text-[10px]">₹{itm.mrp}</p>
                          <p className="font-bold text-slate-800">₹{itm.saleRate}</p>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1.5 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                            <button 
                              onClick={() => updateCartQuantity(itm.productId, -1)}
                              className="p-1 hover:bg-white rounded transition-colors"
                            >
                              <Minus className="h-3 w-3 text-slate-600" />
                            </button>
                            <span className="w-6 font-semibold font-mono text-xs">{itm.quantity}</span>
                            <button 
                              onClick={() => updateCartQuantity(itm.productId, 1)}
                              className="p-1 hover:bg-white rounded transition-colors"
                            >
                              <Plus className="h-3 w-3 text-slate-600" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <input 
                            type="number" 
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 outline-none p-1 rounded font-mono text-center text-xs w-16"
                            value={itm.discount === 0 ? "" : itm.discount}
                            placeholder="0"
                            onChange={(e) => updateItemDiscount(itm.productId, parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-indigo-700 font-mono">
                          ₹{itm.netAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-center">
                          <button 
                            onClick={() => removeFromCart(itm.productId)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium">
            <div className="bg-white p-2 rounded border border-slate-100 text-center">
              <span className="text-slate-400 text-[10px] uppercase">Original Total</span>
              <p className="text-sm font-bold text-slate-700 mt-0.5">₹{computeSubTotal()}</p>
            </div>
            <div className="bg-white p-2 rounded border border-slate-100 text-center">
              <span className="text-slate-400 text-[10px] uppercase">Taxes (CGST + SGST)</span>
              <p className="text-sm font-bold text-slate-700 mt-0.5">₹{cgst + sgst} ({cgst} + {sgst})</p>
            </div>
            <div className="bg-white p-2 rounded border border-slate-100 text-center">
              <span className="text-slate-400 text-[10px] uppercase">Item Disc. Saved</span>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">₹{computeItemDiscounts()}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-2 rounded text-center text-emerald-800">
              <span className="text-[10px] uppercase font-bold text-emerald-600">Net Discount Total</span>
              <p className="text-sm font-bold mt-0.5">₹{computeItemDiscounts() + globalDiscount}</p>
            </div>
          </div>
        </div>

        {/* Right drawer of payment / holds */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Checkout Summary</h3>

          {/* Checkout pricing box */}
          <div className="bg-slate-900 text-white p-5 rounded-xl space-y-3 shadow">
            <span className="text-xs font-medium uppercase text-slate-400">Total Payable Amount</span>
            <div className="text-4xl font-extrabold text-white tracking-tight font-mono">
              ₹{getNetTotal().toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-indigo-200 mt-1 uppercase font-semibold">
              Roundoff Included
            </div>
          </div>

          {/* Quick extra custom discount input box */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
            <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
              <span>Overall Bill Discount (₹)</span>
              <span className="text-[10px] text-slate-400">Apply flat price cut</span>
            </label>
            <input 
              type="number" 
              className="w-full bg-white border border-slate-200 rounded p-2 text-xs font-mono font-bold"
              placeholder="0 (₹)"
              value={globalDiscount === 0 ? "" : globalDiscount}
              onChange={(e) => setGlobalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
            />
          </div>

          {/* Payment Gateway triggers */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase">Payment Option</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setPaymentMode("Cash")}
                className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${paymentMode === "Cash" ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
              >
                <DollarSign className="h-4 w-4" />
                Cash
              </button>
              <button 
                onClick={() => setPaymentMode("UPI")}
                className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${paymentMode === "UPI" ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
              >
                <Smartphone className="h-4 w-4" />
                UPI Mobile
              </button>
              <button 
                onClick={() => setPaymentMode("Card")}
                className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${paymentMode === "Card" ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
              >
                <CreditCard className="h-4 w-4" />
                POS Card
              </button>
              <button 
                type="button" 
                id="payment-mode-credit"
                onClick={() => setPaymentMode("Credit")}
                className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${paymentMode === "Credit" ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"}`}
              >
                <TrendingDown className="h-4 w-4" />
                Credit Led
              </button>
            </div>
          </div>

          {/* Submit / Print and hold actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button 
              id="btn-bill-hold"
              onClick={handleHoldBill}
              className="p-3 bg-amber-50 border border-amber-200 text-amber-800 font-bold rounded-lg text-xs hover:bg-amber-100 flex items-center justify-center gap-1.5 transition-all"
            >
              <Pause className="h-4 w-4" />
              Hold Bill (F7)
            </button>
            <button 
              id="btn-bill-checkout"
              onClick={handleCheckout}
              className="p-3 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-md transition-all uppercase"
            >
              <Printer className="h-4 w-4" />
              Bill Print (F9)
            </button>
          </div>

          {/* Suspended bills roster queue */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
              <span>Held Bills Pending ({heldBills.length})</span>
            </div>

            {heldBills.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">No held bills currently in queue.</p>
            ) : (
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {heldBills.map(hb => (
                  <div key={hb.id} className="flex justify-between items-center p-2 bg-amber-50/50 rounded border border-amber-100 text-xs">
                    <div>
                      <p className="font-bold text-slate-700">Ticket: {hb.billNumber}</p>
                      <p className="text-[9px] text-slate-400 font-mono italic">Note: {hb.heldNote || "Hold"}</p>
                    </div>
                    <button 
                      onClick={() => resumeHeldBill(hb)}
                      className="p-1 bg-amber-600 text-white font-bold rounded text-[10px] hover:bg-amber-700 flex items-center gap-0.5"
                    >
                      <Play className="h-3 w-3" /> Resume
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Realist printed retail GST receipt */}
      {showReceipt && activeBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Printer className="h-4 w-4" /> Retail Tax Invoiced Receipt
              </span>
              <button 
                onClick={() => setShowReceipt(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-200/50 hover:bg-slate-200 p-1 rounded-full w-6 h-6 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* Thermal Print simulation sheet wrapper */}
            <div className="bg-[#FAFBF9] p-4 max-h-[460px] overflow-y-auto">
              <div 
                className={`mx-auto bg-white p-3 border border-slate-200 shadow-sm font-mono text-[11px] leading-relaxed select-all text-slate-800 ${storeSettings?.printer.type === "58mm" ? "max-w-[220px]" : "max-w-[280px]"}`}
                id="thermal-invoice-sheet"
              >
                {/* Store Profile */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                  <h3 className="font-extrabold text-sm uppercase text-slate-900">
                    {storeSettings?.store.name || "SHIVA SUPER MARKET"}
                  </h3>
                  <p className="text-[9px] text-slate-500 text-center">
                    {storeSettings?.store.address || "Main Road Near Bus Stand, Puducherry"}
                  </p>
                  <p className="text-[9px] text-slate-500 font-bold mb-1">
                    GSTIN: {storeSettings?.store.gstIn || "34AABCS4512D1ZX"}
                  </p>
                  <p className="text-[9px] text-slate-500">Ph: {storeSettings?.store.mobile || "9443212000"}</p>
                </div>

                {/* Bill details metadata */}
                <div className="py-2 border-b border-dashed border-slate-300 space-y-0.5 text-[9px] text-slate-600">
                  <p>BILL NO: {activeBill.billNumber}</p>
                  <p>DATE: {new Date(activeBill.date).toLocaleString()}</p>
                  <p>CASHIER: {activeBill.cashierName}</p>
                  <p>CUSTOMER: {activeBill.customerName} ({activeBill.customerMobile})</p>
                </div>

                {/* Items detailed ledger */}
                <table className="w-full text-left text-[9px] my-2 border-b border-dashed border-slate-300">
                  <thead>
                    <tr className="border-b border-dashed border-slate-200 font-bold">
                      <th className="py-1">Particulars</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-center">Rate</th>
                      <th className="py-1 text-right">Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBill.items.map((itm: any, idx: number) => (
                      <tr key={idx} className="align-top">
                        <td className="py-1">
                          <p className="font-bold">{itm.productName}</p>
                          <p className="text-[8px] text-slate-400">HSN:{itm.hsnCode || "-"} GST:{itm.gstPercentage}%</p>
                        </td>
                        <td className="py-1 text-center font-mono">{itm.quantity}</td>
                        <td className="py-1 text-center font-mono">{itm.saleRate}</td>
                        <td className="py-1 text-right font-mono font-bold">{(itm.netAmount).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mathematical calculation matrix card */}
                <div className="space-y-1 align-top text-[10px] text-slate-800">
                  <div className="flex justify-between">
                    <span>ITEM SUB-TOTAL:</span>
                    <span>₹{activeBill.subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>TOTAL DISCOUNT:</span>
                    <span>-₹{activeBill.discountTotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST LIABILITY (9%):</span>
                    <span>₹{activeBill.cgstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST LIABILITY (9%):</span>
                    <span>₹{activeBill.sgstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-extrabold border-t border-dashed border-slate-300 pt-1.5 text-slate-900 font-mono">
                    <span>NET GRAND PAY:</span>
                    <span>₹{activeBill.netAmount.toFixed(1)}</span>
                  </div>
                </div>

                {/* Printer policy note footer */}
                <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-500 font-medium">
                  <p>{storeSettings?.printer.footerNote || "VISIT AGAIN!"}</p>
                  <p className="mt-1">POS LAN Billing Engine 5.0</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button 
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="h-4 w-4" /> Core Device Print
              </button>
              <button 
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg text-xs hover:bg-slate-300 transition-colors"
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Credit Return Refund handler page */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in duration-150">
            <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
              <span className="text-sm font-bold flex items-center gap-1.5">
                <Undo2 className="h-4 w-4" /> POS Sales Return ledger
              </span>
              <button 
                onClick={() => setShowReturnModal(false)}
                className="text-white/60 hover:text-white font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">Insert Sales Invoice ID</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. S-TXN-20260605-101" 
                      className="flex-1 bg-slate-50 border border-slate-200 outline-none p-2 rounded text-xs font-mono"
                      value={returnBillNumber}
                      onChange={(e) => setReturnBillNumber(e.target.value)}
                    />
                    <button 
                      onClick={lookupBillForReturn}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded text-xs"
                    >
                      Audit
                    </button>
                  </div>
                </div>
              </div>

              {returnBillData ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-xs font-medium border-b border-slate-200 pb-2">
                    <span>Invoice Date: {new Date(returnBillData.date).toDateString()}</span>
                    <span>Receipt Net: ₹{returnBillData.netAmount}</span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-600 uppercase">Items purchased</label>
                    {returnBillData.items.map((itm: any) => (
                      <div key={itm.productId} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 text-xs">
                        <div>
                          <p className="font-bold">{itm.productName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Billed Qty: {itm.quantity} | Total paid: ₹{itm.netAmount}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500">Return Qty:</span>
                          <input 
                            type="number" 
                            min="0" 
                            max={itm.quantity}
                            className="bg-slate-50 border border-slate-200 p-1 w-14 rounded text-center text-xs font-bold font-mono"
                            value={returnedQty[itm.productId] || 0}
                            onChange={(e) => {
                              const val = Math.min(itm.quantity, Math.max(0, parseInt(e.target.value) || 0));
                              setReturnedQty(prev => ({ ...prev, [itm.productId]: val }));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Reason for refund request</label>
                    <textarea 
                      rows={2}
                      placeholder="e.g. Broken seal, expired batch, client exchange"
                      className="w-full bg-white border border-slate-200 rounded p-2 text-xs"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">Enter a valid completed invoice number to show item lists.</p>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 justify-end">
              <button 
                onClick={() => setShowReturnModal(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs"
              >
                Close
              </button>
              {returnBillData && (
                <button 
                  onClick={handlePostReturn}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs"
                >
                  Confirm Return Refund
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
