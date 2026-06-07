export type UserRole = "Admin" | "Store Manager" | "Cashier" | "Owner";

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  status: "Active" | "Inactive";
}

export interface Category {
  id: string;
  name: string;
  subcategories: string[];
}

export interface Supplier {
  id: string;
  name: string;
  mobile: string;
  gstIn?: string;
  address?: string;
  email?: string;
  outstandingBalance: number;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  gstIn?: string;
  loyaltyPoints: number;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  categoryId: string;
  categoryName: string;
  subcategory?: string;
  brand?: string;
  unit: string; // e.g., "Pcs", "Kg", "Litre", "Gms"
  hsnCode?: string;
  gstPercentage: number; // e.g., 5, 12, 18, 28
  purchaseRate: number;
  mrp: number;
  saleRate: number;
  currentStock: number;
  minimumStockLevel: number;
  maximumStockLevel: number;
  location?: string; // aisle/shelf location e.g., "Aisle 3A"
  status: "Active" | "Inactive";
  imageUrl?: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  gstPercentage: number;
  discount: number; // absolute amount or percentage
  netAmount: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  purchaseDate: string;
  items: PurchaseItem[];
  subTotal: number;
  discountTotal: number;
  gstTotal: number;
  netAmount: number;
  paymentStatus: "Paid" | "Pending" | "Partial";
}

export interface BillItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  mrp: number;
  saleRate: number;
  gstPercentage: number;
  hsnCode?: string;
  discount: number; // discount per unit
  netAmount: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  date: string;
  counterId: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  customerMobile?: string;
  items: BillItem[];
  subTotal: number;
  discountTotal: number;
  cgstTotal: number; // SGST/CGST breakdown
  sgstTotal: number;
  gstTotal: number;
  netAmount: number;
  paymentMode: "Cash" | "UPI" | "Card" | "Credit";
  status: "Completed" | "Held" | "Returned";
  heldNote?: string;
}

export interface StoreInfo {
  name: string;
  address: string;
  mobile: string;
  gstIn: string;
  email?: string;
  terms?: string;
}

export interface PrinterSettings {
  type: "58mm" | "80mm" | "Laser-A4";
  margin: number;
  headerNote?: string;
  footerNote?: string;
  autoPrintReceipt: boolean;
}

export interface BarcodeSettings {
  printerType: "Thermal-Barcode" | "A4-Sheet";
  labelWidth: number; // in mm
  labelHeight: number; // in mm
  showPrice: boolean;
  showStoreName: boolean;
}

export interface BackupSettings {
  autoBackup: boolean;
  backupTime: string; // e.g. "23:00"
  backupLocation: string; // path or drive
  retentionDays: number;
}

export interface SystemSettings {
  store: StoreInfo;
  printer: PrinterSettings;
  barcode: BarcodeSettings;
  backup: BackupSettings;
}
