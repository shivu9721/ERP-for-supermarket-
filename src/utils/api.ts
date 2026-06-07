// Client API helpers for Shiva Super Market ERP
import { Product, Category, Customer, Supplier, Purchase, Bill, SystemSettings } from "../types";

const API_BASE = ""; // Relative proxy resolves on same host/port

export async function fetchSummary() {
  const res = await fetch(`${API_BASE}/api/reports/summary`);
  if (!res.ok) throw new Error("Failed to fetch dashboard reports summary");
  return res.json();
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/api/products`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function createProduct(prod: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prod)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create product");
  }
  return res.json();
}

export async function updateProduct(id: string, prod: Partial<Product> & { adjustmentReason?: string, updatedByUser?: string }): Promise<Product> {
  const res = await fetch(`${API_BASE}/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prod)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update product");
  }
  return res.json();
}

export async function deleteProduct(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/products/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete product");
  return true;
}

export async function lookupBarcode(barcode: string): Promise<Product> {
  const res = await fetch(`${API_BASE}/api/products/search-barcode/${barcode}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Barcode not found");
  }
  return res.json();
}

export async function bulkImportProducts(products: Array<any>) {
  const res = await fetch(`${API_BASE}/api/products/bulk-import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ products })
  });
  if (!res.ok) throw new Error("Bulk import failed");
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/api/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function createCategory(cat: { name: string; subcategories: string[] }): Promise<Category> {
  const res = await fetch(`${API_BASE}/api/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cat)
  });
  if (!res.ok) throw new Error("Failed to create category");
  return res.json();
}

export async function deleteCategory(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/categories/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete category");
  return true;
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await fetch(`${API_BASE}/api/suppliers`);
  if (!res.ok) throw new Error("Failed to fetch suppliers");
  return res.json();
}

export async function createSupplier(sup: Partial<Supplier>): Promise<Supplier> {
  const res = await fetch(`${API_BASE}/api/suppliers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sup)
  });
  if (!res.ok) throw new Error("Failed to create supplier");
  return res.json();
}

export async function updateSupplier(id: string, sup: Partial<Supplier>): Promise<Supplier> {
  const res = await fetch(`${API_BASE}/api/suppliers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sup)
  });
  if (!res.ok) throw new Error("Failed to update supplier");
  return res.json();
}

export async function deleteSupplier(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/suppliers/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete supplier");
  return true;
}

export async function fetchCustomers(): Promise<Customer[]> {
  const res = await fetch(`${API_BASE}/api/customers`);
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
}

export async function createCustomer(cust: Partial<Customer>): Promise<Customer> {
  const res = await fetch(`${API_BASE}/api/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cust)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to register customer");
  }
  return res.json();
}

export async function updateCustomer(id: string, cust: Partial<Customer>): Promise<Customer> {
  const res = await fetch(`${API_BASE}/api/customers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cust)
  });
  if (!res.ok) throw new Error("Failed to update customer");
  return res.json();
}

export async function searchCustomerMobile(mobile: string): Promise<Customer> {
  const res = await fetch(`${API_BASE}/api/customers/search-mobile/${mobile}`);
  if (!res.ok) throw new Error("Customer not found");
  return res.json();
}

export async function fetchPurchases(): Promise<Purchase[]> {
  const res = await fetch(`${API_BASE}/api/purchases`);
  if (!res.ok) throw new Error("Failed to fetch purchases");
  return res.json();
}

export async function createPurchase(purchase: Partial<Purchase>): Promise<Purchase> {
  const res = await fetch(`${API_BASE}/api/purchases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(purchase)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to store purchase entry");
  }
  return res.json();
}

export async function fetchBills(): Promise<Bill[]> {
  const res = await fetch(`${API_BASE}/api/bills`);
  if (!res.ok) throw new Error("Failed to fetch bill records");
  return res.json();
}

export async function createBill(billData: any) {
  const res = await fetch(`${API_BASE}/api/bills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(billData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to process POS bill");
  }
  return res.json();
}

export async function createSalesReturn(returnData: any) {
  const res = await fetch(`${API_BASE}/api/bills/return`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(returnData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Sales return failed");
  }
  return res.json();
}

export async function fetchHeldBills(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/held-bills`);
  if (!res.ok) throw new Error("Failed to fetch held bills");
  return res.json();
}

export async function deleteHeldBill(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/held-bills/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to clear held bill");
  return true;
}

export async function fetchSettings(): Promise<SystemSettings> {
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export async function saveSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error("Failed to update system settings");
  return res.json();
}

export async function fetchBackupPoints() {
  const res = await fetch(`${API_BASE}/api/backup/restore-points`);
  if (!res.ok) throw new Error("Failed to fetch backups list");
  return res.json();
}

export async function triggerManualBackup() {
  const res = await fetch(`${API_BASE}/api/backup/trigger`, { method: "POST" });
  if (!res.ok) throw new Error("Backup operation failed");
  return res.json();
}

export async function restoreFromBackup(id: string) {
  const res = await fetch(`${API_BASE}/api/backup/restore/${id}`, { method: "POST" });
  if (!res.ok) throw new Error("Restore operation failed");
  return res.json();
}

export async function fetchStockLedger() {
  const res = await fetch(`${API_BASE}/api/stock-ledger`);
  if (!res.ok) throw new Error("Failed to fetch stock log");
  return res.json();
}

export async function loginUser(body: any) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Login failed");
  }
  return res.json();
}
