import React, { useState, useEffect } from "react";
import { fetchCustomers, createCustomer, updateCustomer } from "../utils/api";
import { Customer } from "../types";
import { 
  UserSquare, 
  UserPlus, 
  CheckCircle, 
  Edit, 
  MapPin, 
  Award, 
  Search, 
  Gift
} from "lucide-react";

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Customer>>({
    name: "",
    mobile: "",
    address: "",
    gstIn: "",
    loyaltyPoints: 0
  });

  const loadData = async () => {
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAdd = () => {
    setEditId(null);
    setFormData({ name: "", mobile: "", address: "", gstIn: "", loyaltyPoints: 0 });
    setShowModal(true);
  };

  const openEdit = (cust: Customer) => {
    setEditId(cust.id);
    setFormData(cust);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) return;
    try {
      if (editId) {
        await updateCustomer(editId, formData);
      } else {
        await createCustomer(formData);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Operation failed due to existing contact numbers");
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.mobile.includes(search) || 
    (c.gstIn && c.gstIn.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4" id="customer-management-module">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <UserSquare className="h-4.5 w-4.5 text-indigo-500" />
            Loyalty Customer Base
          </h2>
          <p className="text-xs text-slate-400">Total {customers.length} members eligible for loyalty reward points</p>
        </div>
        <button 
          onClick={openAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all"
        >
          <UserPlus className="h-4 w-4" /> Add Member
        </button>
      </div>

      {/* Searching Customers */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Lookup members by Name, Mobile number, or GSTIN number..." 
          className="w-full bg-white border border-slate-200 p-2 pl-10 rounded-xl text-xs outline-none focus:border-indigo-400 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Customer table Grid */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-bold bg-slate-50/50">
                <th className="p-3">Client details</th>
                <th className="p-3 font-mono">Mobile Contact</th>
                <th className="p-3">Member GSTIN</th>
                <th className="p-3">Primary Residence Address</th>
                <th className="p-3 text-center">Reward Balance</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="p-3">
                    <p className="font-bold text-slate-800">{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">ID: {c.id}</p>
                  </td>
                  <td className="p-3 font-mono text-slate-700 font-semibold">{c.mobile}</td>
                  <td className="p-3 text-slate-500 font-mono">{c.gstIn || "-"}</td>
                  <td className="p-3">
                    {c.address ? (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[200px]">{c.address}</span>
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-bold font-mono text-[11px] border border-amber-200 px-2.5 py-0.5 rounded-full shadow-sm">
                      <Gift className="h-3.5 w-3.5 inline text-amber-500" />
                      {c.loyaltyPoints} pts
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button 
                      onClick={() => openEdit(c)}
                      className="p-1 border rounded text-slate-600 hover:bg-slate-50"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL WINDOW */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 bg-indigo-950 text-white flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider">
                {editId ? "Update Member Profile" : "Register Loyalty Account"}
              </span>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-red-400 font-bold text-lg">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500">Customer Full Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ramesh Kumar" 
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
                    required
                    maxLength={10}
                    placeholder="10-Digit Mobile" 
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-mono font-bold"
                    value={formData.mobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, "") }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">GSTIN number (B2B Client)</label>
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
                <label className="block text-xs font-bold text-slate-500">Customer Address Details</label>
                <textarea 
                  rows={2}
                  placeholder="e.g. 15, Gandhi Street, Puducherry" 
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              {editId && (
                <div className="space-y-1.5 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <label className="block text-xs font-bold text-amber-800 flex items-center gap-1">
                    <Award className="h-4 w-4" /> Edit Points Balance
                  </label>
                  <input 
                    type="number" 
                    className="w-full bg-white border border-amber-200 rounded p-1.5 text-xs text-amber-800 font-bold font-mono"
                    placeholder="0"
                    value={formData.loyaltyPoints}
                    onChange={(e) => setFormData(prev => ({ ...prev, loyaltyPoints: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              )}

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs">
                  Cancel
                </button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-lg text-xs">
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
