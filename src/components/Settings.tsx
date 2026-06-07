import { useState, useEffect } from "react";
import { fetchSettings, saveSettings, fetchBackupPoints, triggerManualBackup, restoreFromBackup } from "../utils/api";
import { SystemSettings, StoreInfo } from "../types";
import { 
  Settings2, 
  Store, 
  Printer, 
  Database, 
  RefreshCw, 
  Save, 
  ShieldAlert, 
  FileJson,
  CheckCircle2,
  HardDriveUpload
} from "lucide-react";

export default function Settings() {
  const [storeSettings, setStoreSettings] = useState<SystemSettings | null>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("");

  const syncSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchSettings();
      setStoreSettings(data);
      const points = await fetchBackupPoints();
      setBackups(points);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncSettings();
  }, []);

  const handleUpdateStore = (storeData: Partial<StoreInfo>) => {
    if (!storeSettings) return;
    setStoreSettings({
      ...storeSettings,
      store: { ...storeSettings.store, ...storeData }
    });
  };

  const handleUpdatePrinterSetting = (printerData: any) => {
    if (!storeSettings) return;
    setStoreSettings({
      ...storeSettings,
      printer: { ...storeSettings.printer, ...printerData }
    });
  };

  const handleUpdateAutobackup = (backupData: any) => {
    if (!storeSettings) return;
    setStoreSettings({
      ...storeSettings,
      backup: { ...storeSettings.backup, ...backupData }
    });
  };

  const handleSaveAllSettings = async () => {
    if (!storeSettings) return;
    try {
      await saveSettings(storeSettings);
      setSaveStatus("Success");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (err) {
      alert("Settings update failed");
    }
  };

  const processManualBackup = async () => {
    try {
      const resp = await triggerManualBackup();
      alert(`Manual Database backup successfully archived:\nFile: ${resp.backupPoint.name}\nPath: ${resp.backupPoint.path}`);
      syncSettings();
    } catch (err) {
      alert("Backup failed");
    }
  };

  const processRestorePoint = async (id: string, name: string) => {
    if (confirm(`CRITICAL WARNING: Are you sure you want to restore the ERP database to the selected backup point?\nFile: ${name}\n\nAny transactions, billing, or items created after this backup date will be permanently overwritten!`)) {
      try {
        await restoreFromBackup(id);
        alert(`ERP Database successfully rolled back and restored to point: ${name}`);
        syncSettings();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  if (loading || !storeSettings) {
    return (
      <div className="flex justify-center items-center py-20">
        <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mr-2" />
        <span className="text-xs font-semibold text-slate-500">Syncing store parameters...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-100" id="settings-module">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 font-sans">
            <Settings2 className="h-4.5 w-4.5 text-indigo-500" />
            Supermarket Config & Automation Settings
          </h2>
          <p className="text-xs text-slate-400 font-medium">Control thermal print margins, stores metadata, and automated network database schedules</p>
        </div>
        <button 
          onClick={handleSaveAllSettings}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center gap-1 transition-all shadow-sm"
        >
          <Save className="h-4 w-4" /> Save Configurations {saveStatus === "Success" && "✓"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box 1: Store profile metadata details */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-50 pb-2">
            <Store className="h-4.5 w-4.5 text-indigo-500" />
            Corporate Store profile
          </h3>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="block font-bold text-slate-500">Supermarket Trading Name</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs outline-none"
                value={storeSettings.store.name}
                onChange={(e) => handleUpdateStore({ name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-500">Registered GSTIN Number</label>
                <input 
                  type="text" 
                  maxLength={15}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs outline-none font-mono uppercase font-bold"
                  value={storeSettings.store.gstIn}
                  onChange={(e) => handleUpdateStore({ gstIn: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1">
                <label className="block font-bold text-slate-500">Contact Number</label>
                <input 
                  type="text" 
                  maxLength={10}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs outline-none font-mono"
                  value={storeSettings.store.mobile}
                  onChange={(e) => handleUpdateStore({ mobile: e.target.value.replace(/\D/g, "") })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block font-bold text-slate-500">Street Business Address</label>
              <textarea 
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs outline-none"
                value={storeSettings.store.address}
                onChange={(e) => handleUpdateStore({ address: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="block font-bold text-slate-500">Terms & Policy notes in Receipt</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs outline-none italic text-slate-500"
                value={storeSettings.store.terms}
                onChange={(e) => handleUpdateStore({ terms: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Box 2: Thermal receipts and printer configuration specs */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-50 pb-2">
            <Printer className="h-4.5 w-4.5 text-indigo-500" />
            Thermal paper Receipt parameters
          </h3>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-500">Spool Paper Size Selection</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs"
                  value={storeSettings.printer.type}
                  onChange={(e) => handleUpdatePrinterSetting({ type: e.target.value })}
                >
                  <option value="58mm">58mm (Small Counter Spool)</option>
                  <option value="80mm">80mm (Standard Big POS Spool)</option>
                  <option value="Laser-A4">Laser A4 (B2B Invoice Sheets)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block font-bold text-slate-500">Horizontal Margins (mm)</label>
                <input 
                  type="number" 
                  min={0}
                  max={10}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs font-mono font-bold"
                  value={storeSettings.printer.margin}
                  onChange={(e) => handleUpdatePrinterSetting({ margin: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-500">Receipt Header Slogan</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs outline-none font-bold text-center"
                value={storeSettings.printer.headerNote}
                onChange={(e) => handleUpdatePrinterSetting({ headerNote: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-500">Receipt Footer Greeting Slogan</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs outline-none font-bold text-center"
                value={storeSettings.printer.footerNote}
                onChange={(e) => handleUpdatePrinterSetting({ footerNote: e.target.value })}
              />
            </div>

            <div className="p-3 bg-slate-50/50 rounded-lg flex items-center justify-between border">
              <div>
                <p className="font-bold text-slate-700">Immediate Print Spooling</p>
                <p className="text-[10px] text-slate-400">Trigger automatic system print trigger on F9 bill checkout</p>
              </div>
              <input 
                type="checkbox" 
                className="w-4 h-4 text-indigo-650"
                checked={storeSettings.printer.autoPrintReceipt}
                onChange={(e) => handleUpdatePrinterSetting({ autoPrintReceipt: e.target.checked })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Database local backup restore configurations */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
            <Database className="h-4.5 w-4.5 text-indigo-500" />
            Automatic Database Backups & Rollback Systems
          </h3>
          <button 
            id="btn-backup-now"
            onClick={processManualBackup}
            className="p-1 px-3 border border-indigo-200 rounded text-indigo-700 text-[11px] font-bold hover:bg-indigo-50 transition-colors flex items-center gap-1"
          >
            <HardDriveUpload className="h-3.5 w-3.5" /> Back Up Database Now
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-slate-600">
          <div className="space-y-3.5">
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border">
              <div>
                <p className="font-bold text-slate-700">Daily Automated Backup</p>
                <p className="text-[10px] text-slate-400">Automate schema backing on closing hours</p>
              </div>
              <input 
                type="checkbox" 
                checked={storeSettings.backup.autoBackup}
                onChange={(e) => handleUpdateAutobackup({ autoBackup: e.target.checked })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold text-slate-400 uppercase text-[9px]">Execution Time</label>
                <input 
                  type="text" 
                  placeholder="e.g. 23:00"
                  className="w-full bg-slate-50 border p-2 rounded text-xs font-mono font-bold text-center"
                  value={storeSettings.backup.backupTime}
                  onChange={(e) => handleUpdateAutobackup({ backupTime: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="block font-bold text-slate-400 uppercase text-[9px]">Retention Limits (Days)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border p-2 rounded text-xs font-mono font-bold text-center"
                  value={storeSettings.backup.retentionDays}
                  onChange={(e) => handleUpdateAutobackup({ retentionDays: parseInt(e.target.value) || 7 })}
                />
              </div>
            </div>
          </div>

          {/* Backup Restore Points list details */}
          <div className="lg:col-span-2 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Restore Points Log Queue ({backups.length})</h4>
            <div className="border rounded-lg overflow-hidden divide-y divide-slate-100 max-h-[160px] overflow-y-auto font-medium">
              {backups.map(b => (
                <div key={b.id} className="p-2 px-3 flex justify-between bg-slate-50/50 hover:bg-slate-50 text-xs items-center">
                  <div className="truncate max-w-[260px] sm:max-w-md">
                    <p className="font-bold text-slate-700 font-mono truncate">{b.name}</p>
                    <p className="text-[9px] text-slate-400">Created: {new Date(b.date).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => processRestorePoint(b.id, b.name)}
                    className="p-1 px-3 border bg-white rounded text-[10px] font-bold text-indigo-700 hover:bg-indigo-50"
                  >
                    Restore Database
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
