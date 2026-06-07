import React, { useState, useEffect } from "react";
import { fetchSuppliers, createSupplier, updateSupplier, deleteSupplier } from "../utils/api";
import { Supplier } from "../types";
import { 
  Users, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign, 
  RefreshCw,
  Search
} from "lucide-react";

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: "",
    mobile: "",
    gstIn: "",
    address: "",
    email: "",
    outstandingBalance: 0
  });

  const loadData = async () => {
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setEditId(null);
    setFormData({ name: "", mobile: "", gstIn: "", address: "", email: "", outstandingBalance: 0 });
    setShowModal(true);
  };

  const openEdit = (sup: Supplier) => {
    setEditId(sup.id);
    setFormData(sup);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) return;
    try {
      if (editId) {
        await updateSupplier(editId, formData);
      } else {
        await createSupplier(formData);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert("Supplier operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this supplier?")) {
      await deleteSupplier(id);
      loadData();
    }
  };

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.mobile.includes(search) || 
    (s.gstIn && s.gstIn.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4" id="supplier-management-module">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Users className="h-4.5 w-4.5 text-indigo-500" />
            Supplier & Inbound Distributors
          </h2>
          <p className="text-xs text-slate-400">Total {suppliers.length} distributors registered in Shiva ERP</p>
        </div>
        <button 
          onClick={openAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all"
        >
          <PlusCircle className="h-4 w-4" /> Add Supplier
        </button>
      </div>

      {/* Searching Supplier */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Filter suppliers by Name, Mobile, or GST Number..." 
          className="w-full bg-white border border-slate-200 p-2 pl-10 rounded-xl text-xs outline-none focus:border-indigo-400 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Supplier Grid showing outstanding details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(sup => (
          <div key={sup.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3 relative group">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-slate-800 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[170px]">
                  {sup.name}
                </h4>
                <p className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded mt-1.5 inline-block">
                  GSTIN: {sup.gstIn || "URD (Unregistered)"}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(sup)} className="p-1 border rounded text-slate-500 hover:bg-slate-50">
                  <Edit className="h-3 w-3" />
                </button>
                <button onClick={() => handleDelete(sup.id)} className="p-1 border rounded text-red-500 hover:bg-red-50">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-slate-500 text-xs">
              <p className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{sup.mobile}</span>
              </p>
              {sup.email && (
                <p className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{sup.email}</span>
                </p>
              )}
              {sup.address && (
                <p className="flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span className="text-[11px] leading-snug line-clamp-2">{sup.address}</span>
                </p>
              )}
            </div>

            {/* Outstanding box */}
            <div className={`p-2.5 rounded-lg border flex justify-between items-center ${sup.outstandingBalance > 0 ? "bg-red-50 border-red-100 text-red-800" : "bg-emerald-50 border-emerald-100 text-emerald-800"}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider">Outstanding Bal</span>
              <span className="font-bold font-mono text-sm flex items-center">
                <DollarSign className="h-3.5 w-3.5 inline" />
                {sup.outstandingBalance}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* FORM MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-indigo-950 text-white flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wide">
                {editId ? "Edit Supplier Record" : "Register Supplier Details"}
              </span>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-red-400 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500">Supplier / Corporate Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g. Shiva Distributors Pvt Ltd" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">Mobile Phone <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="10-Digit Mobile" 
                    required
                    maxLength={10}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono"
                    value={formData.mobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, "") }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">GSTIN number</label>
                  <input 
                    type="text" 
                    placeholder="15-Char GSTIN" 
                    maxLength={15}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono uppercase"
                    value={formData.gstIn}
                    onChange={(e) => setFormData(prev => ({ ...prev, gstIn: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500">Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@distributor.com" 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500">Physical Address / Landmark</label>
                <textarea 
                  rows={2}
                  placeholder="Location address for freight delivery" 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400">Opening Outstanding Balance (₹)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono"
                  placeholder="0"
                  value={formData.outstandingBalance === 0 ? "" : formData.outstandingBalance}
                  onChange={(e) => setFormData(prev => ({ ...prev, outstandingBalance: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs">
                  Cancel
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-lg text-xs">
                  Save distributor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
