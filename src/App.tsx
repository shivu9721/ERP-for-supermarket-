/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserRole } from "./types";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import POSBilling from "./components/POSBilling";
import ProductManagement from "./components/ProductManagement";
import CategoryManagement from "./components/CategoryManagement";
import SupplierManagement from "./components/SupplierManagement";
import CustomerManagement from "./components/CustomerManagement";
import PurchaseModule from "./components/PurchaseModule";
import AIDocumentCenter from "./components/AIDocumentCenter";
import InventoryManagement from "./components/InventoryManagement";
import GSTModule from "./components/GSTModule";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import { loginUser } from "./utils/api";
import { Shield, KeyRound, User, ChevronRight, Store } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; username: string; role: UserRole } | null>(null);

  // Authentication Fields
  const [usernameInput, setUsernameInput] = useState("admin");
  const [passwordInput, setPasswordInput] = useState("shiva123");
  const [selectedRole, setSelectedRole] = useState<UserRole>("Admin");
  const [loginError, setLoginError] = useState("");

  // Bypass sign-in during live previews to speed up operations
  useEffect(() => {
    // Auto login by default as Siva Administrator for instant playability
    setCurrentUser({
      name: "Siva R. (Administrator)",
      username: "admin",
      role: "Admin"
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || !passwordInput) {
      setLoginError("Please enter username and password");
      return;
    }

    try {
      setLoading(true);
      setLoginError("");
      const response = await loginUser({ 
        username: usernameInput, 
        password: passwordInput,
        selectedRole: selectedRole
      });
      setCurrentUser({
        name: response.user.name,
        username: response.user.username,
        role: response.user.role as UserRole
      });
      setActiveTab("dashboard");
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsernameInput("admin");
    setPasswordInput("shiva123");
  };

  const handleRoleChange = (role: UserRole) => {
    if (!currentUser) return;
    let name = "Siva R. (Administrator)";
    let username = "admin";

    if (role === "Cashier") {
      name = "Cashier Mohan";
      username = "cashier1";
    } else if (role === "Store Manager") {
      name = "Vishwa K. (Store Manager)";
      username = "vishwa";
    } else if (role === "Owner") {
      name = "Mr. Siva Shanmugam (Owner)";
      username = "shiva";
    }

    setCurrentUser({ name, username, role });
    // Redirect to POS if cashier and on forbidden tab
    if (role === "Cashier" && !["dashboard", "pos-billing", "customer-management"].includes(activeTab)) {
      setActiveTab("pos-billing");
    }
  };

  // If session is empty, show design-forward sign-in screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center p-4 font-sans select-none" id="login-screen">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col space-y-6 text-white animate-in zoom-in-95 duration-150">
          <div className="text-center space-y-1">
            <div className="mx-auto h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20">
              <Store className="h-6 w-6" />
            </div>
            <h1 className="text-base font-extrabold tracking-tight mt-3 text-white">Shiva Super Market ERP</h1>
            <p className="text-[11px] text-slate-500">Secure LAN Multi-counter checkout sign-in</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <p className="text-red-400 font-semibold text-[11px] bg-red-950/40 p-2.5 rounded border border-red-900/30 text-center">
                {loginError}
              </p>
            )}

            <div className="space-y-1 text-slate-400 text-xs">
              <label className="block font-bold">Counter role profile</label>
              <select 
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white font-semibold cursor-pointer text-xs"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              >
                <option value="Admin">System Administrator</option>
                <option value="Store Manager">Store Manager</option>
                <option value="Cashier">POS Billing Cashier</option>
                <option value="Owner">Business Owner</option>
              </select>
            </div>

            <div className="space-y-1 text-slate-400 text-xs">
              <label className="block font-bold">Username ID</label>
              <div className="relative">
                <User className="absolute left-2.5 top-2 h-4 w-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="admin / cashier1" 
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 pl-9 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1 text-slate-400 text-xs">
              <label className="block font-bold">LAN Access Security Pin</label>
              <div className="relative">
                <KeyRound className="absolute left-2.5 top-2 h-4 w-4 text-slate-500" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 pl-9 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2.5 rounded-lg text-xs tracking-wider uppercase transition-colors shadow-lg flex items-center justify-center gap-1"
            >
              <span>{loading ? "Authenticating pin..." : "Establish counter match"}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </form>

          <p className="text-[10px] text-slate-500 text-center font-mono select-text bg-slate-900/40 p-2 border border-slate-800/30 rounded leading-normal">
            SECURITY KEY PRE-SET: admin / shiva123
          </p>
        </div>
      </div>
    );
  }

  // Active module page selector
  const renderActiveScreen = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
      case "pos-billing":
        return <POSBilling />;
      case "product-management":
        return <ProductManagement />;
      case "category-management":
        return <CategoryManagement />;
      case "supplier-management":
        return <SupplierManagement />;
      case "customer-management":
        return <CustomerManagement />;
      case "purchase-module":
        return <PurchaseModule />;
      case "ai-document-center":
        return <AIDocumentCenter />;
      case "inventory-management":
        return <InventoryManagement />;
      case "gst-module":
        return <GSTModule />;
      case "reports":
        return <Reports />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      onNavigate={(tab) => setActiveTab(tab)} 
      currentUser={currentUser}
      onRoleChange={handleRoleChange}
    >
      {renderActiveScreen()}
    </Layout>
  );
}
