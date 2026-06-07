import React, { useState, useEffect } from "react";
import { fetchCategories, createCategory, deleteCategory } from "../utils/api";
import { Category } from "../types";
import { FolderHeart, Plus, Trash2, X, Tag } from "lucide-react";

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [selectedSubList, setSelectedSubList] = useState<string[]>([]);

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddSubTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName) return;
    if (!selectedSubList.includes(newSubName)) {
      setSelectedSubList(prev => [...prev, newSubName]);
    }
    setNewSubName("");
  };

  const handleRemoveSubTag = (tag: string) => {
    setSelectedSubList(prev => prev.filter(t => t !== tag));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      await createCategory({
        name: newCatName,
        subcategories: selectedSubList
      });
      setNewCatName("");
      setSelectedSubList([]);
      loadCategories();
    } catch (err) {
      alert("Error adding category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this category? Products mapped to this will revert to 'Uncategorized'.")) {
      try {
        await deleteCategory(id);
        loadCategories();
      } catch (err) {
        alert("Deletion failed");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-100" id="category-module">
      {/* Category Creation Form */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4 max-h-[480px]">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
            <Plus className="h-4.5 w-4.5 text-indigo-500" />
            Add New Department
          </h2>
          <p className="text-xs text-slate-400">Classify products into custom shelf sections</p>
        </div>

        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500">Department Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              placeholder="e.g. Dairy & Frozen" 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-indigo-400"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            <label className="block text-xs font-bold text-slate-500">Add Sub-Classification Tag</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. Milk Products, Cheese, Icecream" 
                className="flex-1 bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
              />
              <button 
                onClick={handleAddSubTag}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1 rounded text-xs"
              >
                Add
              </button>
            </div>
            {/* Added Sub-category tags lists */}
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {selectedSubList.map(sub => (
                <span key={sub} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                  {sub}
                  <button type="button" onClick={() => handleRemoveSubTag(sub)}>
                    <X className="h-3 w-3 hover:text-red-600" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-xs tracking-wide"
          >
            Create Department
          </button>
        </form>
      </div>

      {/* Categories Department Listing Sheets */}
      <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-1.5">
            <FolderHeart className="h-4.5 w-4.5 text-indigo-500" />
            Supermarket Department Directories
          </h2>
          <p className="text-xs text-slate-400">Total {categories.length} departments mapped in ERP</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 relative group">
              <button 
                onClick={() => handleDeleteCategory(cat.id)}
                className="absolute top-3 right-3 text-slate-300 hover:text-red-600 focus:outline-none hidden group-hover:block transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-indigo-500" />
                {cat.name}
              </h4>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {cat.subcategories.length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic">No sub-department items mapped</span>
                ) : (
                  cat.subcategories.map(sub => (
                    <span key={sub} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 text-[10px]">
                      {sub}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
