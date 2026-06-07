import React, { useState, useEffect } from "react";
import { fetchProducts, fetchCategories, createProduct, updateProduct, deleteProduct, bulkImportProducts } from "../utils/api";
import { Product, Category } from "../types";
import { 
  Package, 
  Search, 
  PlusCircle, 
  Edit, 
  Trash2, 
  FileSpreadsheet, 
  Printer, 
  Tag, 
  CheckCircle, 
  X,
  AlertCircle
} from "lucide-react";

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Filtering states
  const [search, setSearch] = useState("");
  const [selCategory, setSelCategory] = useState("");
  const [selStatus, setSelStatus] = useState("");

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    barcode: "",
    name: "",
    categoryId: "",
    subcategory: "",
    brand: "",
    unit: "Pcs",
    hsnCode: "",
    gstPercentage: 18,
    purchaseRate: 0,
    mrp: 0,
    saleRate: 0,
    currentStock: 0,
    minimumStockLevel: 10,
    maximumStockLevel: 200,
    location: "Aisle 1",
    status: "Active"
  });
  const [errorText, setErrorText] = useState("");

  // Barcode sheet generator state
  const [showPrintLabel, setShowPrintLabel] = useState(false);
  const [printProduct, setPrintProduct] = useState<Product | null>(null);
  const [labelCopies, setLabelCopies] = useState(12);

  const syncData = async () => {
    try {
      const p = await fetchProducts();
      setProducts(p);
      const c = await fetchCategories();
      setCategories(c);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    syncData();
  }, []);

  const openAddForm = () => {
    setEditId(null);
    setFormData({
      barcode: "",
      name: "",
      categoryId: categories[0]?.id || "",
      subcategory: "",
      brand: "",
      unit: "Pcs",
      hsnCode: "",
      gstPercentage: 18,
      purchaseRate: 0,
      mrp: 0,
      saleRate: 0,
      currentStock: 0,
      minimumStockLevel: 5,
      maximumStockLevel: 100,
      location: "Aisle A",
      status: "Active"
    });
    setErrorText("");
    setShowModal(true);
  };

  const openEditForm = (prod: Product) => {
    setEditId(prod.id);
    setFormData(prod);
    setErrorText("");
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.barcode || !formData.categoryId || !formData.saleRate) {
      setErrorText("Required fields missing");
      return;
    }

    try {
      if (editId) {
        await updateProduct(editId, {
          ...formData,
          adjustmentReason: "Manual Details Revision",
          updatedByUser: "admin"
        });
      } else {
        await createProduct(formData);
      }
      setShowModal(false);
      setEditId(null);
      syncData();
    } catch (err: any) {
      setErrorText(err.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this item?")) {
      await deleteProduct(id);
      syncData();
    }
  };

  // Bulk Excel import simulation
  const triggerBulkImport = async () => {
    const demoRows = [
      { barcode: "8902030112444", name: "Dettol Liquid Antiseptic 500ml", category: "Personal Care", subcategory: "Soaps & Handwash", brand: "Dettol", unit: "Pcs", hsnCode: "38089400", gstPercentage: 18, purchaseRate: 185.0, saleRate: 210.0, mrp: 220.0, currentStock: 25 },
      { barcode: "8901235111100", name: "Lipton Green Tea Honey 25s", category: "Beverages & Drinks", subcategory: "Tea & Coffee", brand: "Lipton", unit: "Pcs", hsnCode: "09021000", gstPercentage: 5, purchaseRate: 120.0, saleRate: 145.0, mrp: 155.0, currentStock: 30 },
      { barcode: "8901058850122", name: "Tata Salt Lite 1kg", category: "Groceries & Staples", subcategory: "Rice & Flours", brand: "Tata", unit: "Pcs", hsnCode: "25010021", gstPercentage: 0, purchaseRate: 31.0, saleRate: 38.0, mrp: 40.0, currentStock: 40 }
    ];

    try {
      const summary = await bulkImportProducts(demoRows);
      alert(`Bulk Import Complete.\nImported: ${summary.addedCount} items successfully.\nSkipped (Duplicates): ${summary.skippedCount} items.`);
      syncData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrintTrigger = (prod: Product) => {
    setPrintProduct(prod);
    setLabelCopies(12);
    setShowPrintLabel(true);
  };

  // Filtered Products List
  const filteredProducts = products.filter(p => {
    const sTerm = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(sTerm) || 
                       p.barcode.includes(sTerm) || 
                       (p.brand && p.brand.toLowerCase().includes(sTerm)) ||
                       (p.hsnCode && p.hsnCode.includes(sTerm));
    const matchCat = selCategory === "" || p.categoryId === selCategory;
    const matchStat = selStatus === "" || p.status === selStatus;
    return matchSearch && matchCat && matchStat;
  });

  return (
    <div className="space-y-4" id="product-management-module">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-500" />
            Supermarket Product Catalog
          </h1>
          <p className="text-xs text-slate-500">Track barcodes, HSN, tax configurations, and stock margins</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button 
            id="btn-bulk-import"
            onClick={triggerBulkImport}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg font-medium text-xs transition-all"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Bulk Excel Import
          </button>
          <button 
            id="btn-add-product"
            onClick={openAddForm}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-xs transition-all shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            Add New Item
          </button>
        </div>
      </div>

      {/* Advanced search panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search products by Barcode, Name, Brand, HSN..." 
            className="w-full bg-slate-50 text-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs border border-slate-200 focus:border-indigo-400 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 md:flex gap-2">
          <select 
            className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-600 min-w-[140px] outline-none"
            value={selCategory}
            onChange={(e) => setSelCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select 
            className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-600 min-w-[120px] outline-none"
            value={selStatus}
            onChange={(e) => setSelStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Product List table card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50">
                <th className="p-3">Barcode</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-center">Unit</th>
                <th className="p-3 text-right">Purchase Rate</th>
                <th className="p-3 text-right">MRP</th>
                <th className="p-3 text-right">Sale Rate</th>
                <th className="p-3 text-center">Avail Stock</th>
                <th className="p-3 text-center">Location</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400 font-medium">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-slate-700">{p.barcode}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400">Brand: {p.brand || "-"} | HSN: {p.hsnCode || "-"}</p>
                    </td>
                    <td className="p-3 text-slate-500 font-medium">{p.categoryName}</td>
                    <td className="p-3 text-center text-slate-500">{p.unit}</td>
                    <td className="p-3 text-right font-semibold text-slate-600">₹{p.purchaseRate}</td>
                    <td className="p-3 text-right font-semibold text-slate-400 line-through">₹{p.mrp}</td>
                    <td className="p-3 text-right font-bold text-indigo-700">₹{p.saleRate}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${p.currentStock === 0 ? "bg-red-100 text-red-600" : p.currentStock <= p.minimumStockLevel ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {p.currentStock} {p.unit}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-400 font-medium text-[11px]">{p.location || "Aisle -"}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded-md font-bold text-[9px] ${p.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center items-center gap-1.5">
                        <button 
                          title="Print Barcode Tag"
                          onClick={() => handlePrintTrigger(p)}
                          className="p-1 px-1.5 border border-slate-100 rounded bg-slate-50 text-slate-500 hover:bg-slate-200"
                        >
                          <Printer className="h-3 w-3" />
                        </button>
                        <button 
                          onClick={() => openEditForm(p)}
                          className="p-1 border border-slate-100 rounded text-indigo-600 hover:bg-indigo-50"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-1 border border-slate-100 rounded text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL: Add / Edit Product */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-indigo-950 text-white flex justify-between items-center">
              <span className="text-sm font-bold flex items-center gap-1.5">
                <Tag className="h-4.5 w-4.5" />
                {editId ? "Update Supermarket Product Detail" : "Introduce New Supermarket Product"}
              </span>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-red-400 font-bold text-lg">
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              {errorText && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4.5 w-4.5" />
                  {errorText}
                </div>
              )}

              {/* Grid block 1: General Core Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-indigo-700 bg-indigo-50/50 p-2.5 rounded-lg">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">Barcode Identifier <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="Insert standard UPC / EAN e.g. 8901030752109" 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono font-bold"
                      value={formData.barcode}
                      onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">Product Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="e.g. Fortune Mustard Oil 1L" 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">Primary Category <span className="text-red-500">*</span></label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                      value={formData.categoryId}
                      onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">Sub Category</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Edible Oils" 
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                      value={formData.subcategory}
                      onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">Brand Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Fortune" 
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">Base Unit <span className="text-red-500">*</span></label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    >
                      <option value="Pcs">Pcs (Pieces)</option>
                      <option value="Kg">Kg (Kilograms)</option>
                      <option value="Litre">Litre (Litres)</option>
                      <option value="Gms">Gms (Grams)</option>
                      <option value="Box">Box</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Grid block 2: Taxes & Codes */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-indigo-700 bg-indigo-50/50 p-2.5 rounded-lg">GST & Taxation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">HSN Tariff Line Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 15079010" 
                      maxLength={8}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono"
                      value={formData.hsnCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, hsnCode: e.target.value.replace(/\D/g, "") }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">GST Percentage Slab (%)</label>
                    <select 
                      className="w-full bg-slate-100 border border-slate-200 rounded p-2 text-xs"
                      value={formData.gstPercentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, gstPercentage: parseFloat(e.target.value) }))}
                    >
                      <option value="0">0% (Exempted)</option>
                      <option value="5">5% GST (Essentials)</option>
                      <option value="12">12% GST (Standard 1)</option>
                      <option value="18">18% GST (Standard 2)</option>
                      <option value="28">28% GST (Luxury Items)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Grid block 3: Stock Pricing & Thresholds */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-indigo-700 bg-indigo-50/50 p-2.5 rounded-lg">Pricing & Stock Audits</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 font-mono">Purchase Rate (₹)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      placeholder="0.0"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-bold"
                      value={formData.purchaseRate === 0 ? "" : formData.purchaseRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, purchaseRate: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-400 line-through">MRP Catalog Cost (₹)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      placeholder="0.0"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                      value={formData.mrp === 0 ? "" : formData.mrp}
                      onChange={(e) => setFormData(prev => ({ ...prev, mrp: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-indigo-600 font-bold">POS Retail Sale Rate (₹) <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      placeholder="0.0"
                      className="w-full bg-indigo-50 border border-indigo-200 rounded p-2 text-xs font-bold text-indigo-700"
                      value={formData.saleRate === 0 ? "" : formData.saleRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, saleRate: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">Initial Physical Stock</label>
                    <input 
                      type="number" 
                      required
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono"
                      value={formData.currentStock}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentStock: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">Reorder Safety Level</label>
                    <input 
                      type="number" 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono"
                      value={formData.minimumStockLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimumStockLevel: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500">Store location (Aisle)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Aisle 3 B (Soaps)" 
                      className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Status Row */}
              <div className="flex gap-4 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-xs font-bold text-slate-600">Product Line Status:</span>
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <input 
                    type="radio" 
                    name="modal_status" 
                    checked={formData.status === "Active"}
                    onChange={() => setFormData(prev => ({ ...prev, status: "Active" }))} 
                  /> Active (In POS scan matching)
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                  <input 
                    type="radio" 
                    name="modal_status" 
                    checked={formData.status === "Inactive"}
                    onChange={() => setFormData(prev => ({ ...prev, status: "Inactive" }))} 
                  /> Suspend Inactive
                </label>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-lg text-xs"
                >
                  Save Product Line
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARCODE GENERATOR POPUP SHEET */}
      {showPrintLabel && printProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-indigo-950 text-white flex justify-between items-center">
              <span className="text-sm font-bold flex items-center gap-1.5">
                <Printer className="h-4.5 w-4.5" /> Thermal Barcode Label Generation
              </span>
              <button onClick={() => setShowPrintLabel(false)} className="text-white hover:text-red-400 font-bold text-lg">
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-200 text-xs text-slate-700">
                <div>
                  <p className="font-bold text-slate-900">{printProduct.name}</p>
                  <p className="font-mono mt-0.5">Barcode: {printProduct.barcode} | MRP: ₹{printProduct.mrp}</p>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 text-right">No of Tags</label>
                  <input 
                    type="number" 
                    className="w-16 bg-white border border-slate-300 rounded p-1.5 font-bold text-center"
                    value={labelCopies}
                    min={1}
                    max={64}
                    onChange={(e) => setLabelCopies(Math.min(64, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                </div>
              </div>

              {/* Simulation grid showing the barcodes on thermal stickers */}
              <div className="bg-slate-100 p-4 rounded-xl max-h-[220px] overflow-y-auto grid grid-cols-3 gap-2">
                {Array.from({ length: labelCopies }).map((_, i) => (
                  <div key={i} className="bg-white p-2 border border-slate-200 text-center space-y-1 max-w-[124px] mx-auto select-all hover:border-indigo-400">
                    <p className="text-[8px] font-extrabold truncate text-slate-800">SHIVA SUPER MARKET</p>
                    {/* Mock barcode block */}
                    <div className="py-0.5 bg-slate-900 text-white flex flex-col justify-center select-none rounded h-7">
                      <div className="w-11/12 mx-auto flex h-full justify-between items-stretch">
                        {Array.from({ length: 14 }).map((_, b) => (
                          <span 
                            key={b} 
                            style={{ 
                              width: b % 3 === 0 ? "1.5px" : "3px", 
                              backgroundColor: b % 2 === 0 ? "#111" : "#fff" 
                            }} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[7.5px] font-mono leading-none tracking-widest text-slate-600">{printProduct.barcode}</p>
                    <p className="text-[8.5px] font-bold text-slate-800 font-mono">MRP: ₹{printProduct.mrp}.0</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 justify-end">
              <button 
                onClick={() => setShowPrintLabel(false)}
                className="bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs"
              >
                Close Sheets
              </button>
              <button 
                onClick={() => {
                  window.print();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-lg text-xs flex items-center gap-1"
              >
                <Printer className="h-4 w-4" /> Spool Paper Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
