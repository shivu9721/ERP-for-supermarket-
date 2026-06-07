import React, { useState } from "react";
import { UserRole } from "../types";
import { 
  Menu, 
  User, 
  LogOut, 
  Signal, 
  Home, 
  ShoppingBag, 
  Package, 
  FolderMinus, 
  Users, 
  UserSquare, 
  Truck, 
  Clipboard, 
  Percent, 
  BarChart, 
  Settings,
  Shield,
  HelpCircle,
  BrainCircuit
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  currentUser: { name: string; username: string; role: UserRole };
  onRoleChange: (role: UserRole) => void;
}

export default function Layout({ 
  children, 
  activeTab, 
  onNavigate, 
  currentUser, 
  onRoleChange 
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Mapped permissions for visual cue
  // Admin: all
  // Store Manager: POS, Dashboard, Product, Category, Supplier, Customer, Purchase Inward, Inventory
  // Cashier: POS, Dashboard, Customer
  // Owner: Dashboard, Reports, GST, Settings, Customer
  const hasAccess = (tab: string, role: UserRole) => {
    if (role === "Admin") return true;
    if (role === "Store Manager") {
      return ["dashboard", "pos-billing", "product-management", "category-management", "supplier-management", "customer-management", "purchase-module", "inventory-management", "ai-document-center"].includes(tab);
    }
    if (role === "Cashier") {
      return ["dashboard", "pos-billing", "customer-management"].includes(tab);
    }
    if (role === "Owner") {
      return ["dashboard", "customer-management", "reports", "gst-module", "settings", "ai-document-center"].includes(tab);
    }
    return false;
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard overview", icon: Home },
    { id: "pos-billing", label: "Fast POS Counter", icon: ShoppingBag },
    { id: "product-management", label: "Product Catalogue", icon: Package },
    { id: "category-management", label: "Departments", icon: FolderMinus },
    { id: "supplier-management", label: "Supplier Index", icon: Users },
    { id: "customer-management", label: "Loyalty Scheme", icon: UserSquare },
    { id: "purchase-module", label: "Wholesale GRN", icon: Truck },
    { id: "ai-document-center", label: "AI Document Center", icon: BrainCircuit },
    { id: "inventory-management", label: "Inventory Valuation", icon: Clipboard },
    { id: "gst-module", label: "GST compliance", icon: Percent },
    { id: "reports", label: "Financial Audits", icon: BarChart },
    { id: "settings", label: "ERP Configurations", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="erp-layout">
      {/* Top Bar Header */}
      <header className="bg-slate-900 text-white h-14 flex items-center justify-between px-4 shrink-0 shadow-md border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button 
            id="btn-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-850 bg-slate-800 rounded transition-colors text-slate-200"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-white">SHIVA RETAIL ERP</span>
            <span className="text-[10px] uppercase font-bold text-indigo-400 font-mono tracking-widest hidden sm:inline">LAN Edition 5.0</span>
          </div>
        </div>

        {/* Network & Active counters diagnostic status */}
        <div className="flex items-center gap-3">
          {/* LAN deployment mock visual indicator */}
          <div className="bg-emerald-950/80 border border-emerald-800/80 rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 font-mono shadow-inner sm:flex">
            <Signal className="h-3 w-3 animate-pulse text-emerald-400" />
            <span>LAN SERVER: OK</span>
            <span className="text-emerald-700 font-normal">|</span>
            <span>192.168.1.100:3000</span>
          </div>

          {/* Core RBAC Role trigger testing block */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-white whitespace-nowrap">{currentUser.name}</p>
              <p className="text-[9px] text-slate-400 lowercase font-mono">ID: {currentUser.username}</p>
            </div>

            <div className="relative group flex items-center">
              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded bg-slate-800 border ${currentUser.role === "Admin" ? "text-indigo-400 border-indigo-900" : currentUser.role === "Store Manager" ? "text-amber-400 border-amber-900" : currentUser.role === "Owner" ? "text-sky-400 border-sky-900" : "text-emerald-400 border-emerald-900"}`}>
                <Shield className="h-3 w-3" />
                {currentUser.role}
              </span>
              
              {/* Easy quick mock access controls select switch directly inside header! */}
              <select 
                id="header-role-switcher"
                className="absolute inset-0 opacity-0 cursor-pointer text-xs"
                value={currentUser.role}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                title="Switch ERP tested authorization profiles instantly"
              >
                <option value="Admin">Administrator Profile</option>
                <option value="Store Manager">Store Manager Profile</option>
                <option value="Cashier">Cashier Profile</option>
                <option value="Owner">Owner Profile</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Framework Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Nav rail */}
        <aside 
          id="sidebar-nav"
          className={`bg-slate-900 text-slate-300 border-r border-slate-850 transition-all duration-200 shrink-0 select-none flex flex-col justify-between absolute z-30 lg:relative h-full ${sidebarOpen ? "w-56 translate-x-0" : "w-0 -translate-x-full lg:w-14 lg:translate-x-0"}`}
        >
          <div className="py-3 flex-1 overflow-y-auto">
            <nav className="space-y-1 px-2.5">
              {navItems.map(item => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                const allowed = hasAccess(item.id, currentUser.role);

                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    onClick={() => {
                      if (allowed) {
                        onNavigate(item.id);
                        if (window.innerWidth < 1024) setSidebarOpen(false); // Close mobile drawer
                      }
                    }}
                    className={`w-full flex items-center p-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${isSelected ? "bg-indigo-650 text-white shadow-md font-bold" : "hover:bg-slate-800 text-slate-400 hover:text-white"} ${!allowed ? "opacity-30 cursor-not-allowed bg-transparent" : "cursor-pointer"}`}
                    title={!allowed ? `Restricted access: ${currentUser.role} cannot view this module` : item.label}
                  >
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${isSelected ? "text-white" : "text-slate-400 group-hover:text-white"} ${sidebarOpen ? "mr-3" : "mx-auto"}`} />
                    {sidebarOpen && (
                      <span className="truncate flex-1 text-left flex justify-between items-center">
                        {item.label}
                        {!allowed && <span className="text-[8px] bg-slate-950 px-1 py-0.5 rounded text-red-500 font-bold">RBAC</span>}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Support note */}
          {sidebarOpen && (
            <div className="p-3 bg-slate-950 border-t border-slate-850 text-[10px] text-slate-500 text-center uppercase tracking-wider font-bold">
              <span>Shiva Market ERP v5.0</span>
            </div>
          )}
        </aside>

        {/* Content Viewer viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6" id="layout-viewport">
          {/* If the current user does not have permission, display an elegant screen lock blocker */}
          {hasAccess(activeTab, currentUser.role) ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[340px] bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto mt-12 text-center animate-in fade-in duration-150" id="rbac-screen-lock">
              <div className="p-4 bg-red-50 text-red-650 text-red-600 rounded-full">
                <Shield className="h-10 w-10 animate-bounce" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-800">RBAC Security Enforcement Lock</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Your active role <span className="font-bold text-red-650 text-red-600 uppercase">[{currentUser.role}]</span> does not possess cryptographic credentials or authorizations to view the <span className="italic font-bold text-slate-700">[{activeTab.replace(/-/g," ")}]</span> module.
                </p>
              </div>
              <div className="p-3 bg-sky-50 border border-sky-100 rounded-lg text-[10px] text-sky-700 font-medium">
                💡 TIP: Test different authorizations instantly by clicking the role tag in the top header and switching to "Administrator".
              </div>
              <button 
                onClick={() => onNavigate("dashboard")}
                className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-lg hover:bg-slate-950 transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
