import React, { useState, useEffect } from 'react';
import { getProducts, addProduct, updateProductStock } from '../store/db';
import { Package, Plus, Search, Download, Trash2, ArrowUpCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { format } from 'date-fns';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', costPrice: '', barcode: '', keyword: '', stock: '0' });

  // Stock update modal state
  const [stockModal, setStockModal] = useState(null); // holds product object
  const [addStockAmount, setAddStockAmount] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    await addProduct({
      ...newProduct,
      price: parseFloat(newProduct.price),
      costPrice: parseFloat(newProduct.costPrice || 0),
      stock: parseInt(newProduct.stock || 0)
    });
    setNewProduct({ name: '', price: '', costPrice: '', barcode: '', keyword: '', stock: '0' });
    setShowAddModal(false);
    loadProducts();
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!stockModal || !addStockAmount) return;

    await updateProductStock(stockModal.id, parseInt(addStockAmount));
    setStockModal(null);
    setAddStockAmount('');
    loadProducts();
  };

  const exportInventory = async () => {
    const fileName = `Inventory_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    const data = products.map(p => ({
      Name: p.name,
      'Selling Price': p.price,
      'Cost Price': p.costPrice || 0,
      'Stock': p.stock || 0,
      'Profit per Unit': (p.price - (p.costPrice || 0)).toFixed(2),
      Barcode: p.barcode || 'N/A',
      Keyword: p.keyword || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");

    if (Capacitor.isNativePlatform()) {
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      const result = await Filesystem.writeFile({
        path: fileName,
        data: excelBuffer,
        directory: Directory.Cache
      });
      await Share.share({ title: 'Inventory Export', url: result.uri });
    } else {
      XLSX.writeFile(wb, fileName);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchQuery))
  );

  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0);
  const totalPotentialProfit = products.reduce((sum, p) => sum + (((p.price || 0) - (p.costPrice || 0)) * (p.stock || 0)), 0);

  return (
    <div className="inventory-container">
      <div className="header-container">
        <div>
          <h2 className="text-2xl font-bold">Inventory <span className="text-primary">Portfolio</span></h2>
        </div>
        <div className="btn-icon" style={{ backgroundColor: 'var(--surface-color)', cursor: 'pointer' }} onClick={exportInventory}>
          <Download size={20} className="text-primary" />
        </div>
      </div>

      <div className="grid-2-col mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="card text-center flex flex-col justify-center gap-1" style={{ padding: '1.25rem', marginBottom: 0 }}>
              <div className="text-secondary text-xs font-semibold tracking-wider uppercase">Portfolio Value</div>
              <div className="text-2xl font-bold">₹{totalInventoryValue.toLocaleString()}</div>
          </div>
          <div className="card text-center flex flex-col justify-center gap-1" style={{ padding: '1.25rem', marginBottom: 0 }}>
              <div className="text-secondary text-xs font-semibold tracking-wider uppercase">Potential Profit</div>
              <div className="text-2xl font-bold text-warning">₹{totalPotentialProfit.toLocaleString()}</div>
          </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
            <input
              type="text"
              className="input"
              placeholder="Search portfolio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '3rem', borderRadius: '999px' }}
            />
          </div>
        </div>
        <button className="btn btn-success" style={{ borderRadius: '999px', padding: '0 1.5rem' }} onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Add
        </button>
      </div>

      {products.length === 0 ? (
        <div className="card text-center" style={{ padding: '3rem 1rem' }}>
          <div className="flex justify-center mb-4 text-secondary">
            <Package size={64} style={{ opacity: 0.5 }} />
          </div>
          <h3 className="text-xl mb-2">No inventory tracked yet</h3>
          <p className="text-sm">Start building your business portfolio by adding your first product. Track stock, costs, and profit margins in real-time.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredProducts.map(product => (
            <div key={product.id} className="card flex justify-between items-center" style={{ padding: '1rem 1.25rem', marginBottom: 0 }}>
              <div className="flex-1">
                <div className="font-bold text-lg">{product.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-secondary bg-gray-100 px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--bg-color)' }}>
                    Stock: <span className={product.stock > 0 ? "text-primary" : "text-danger"}>{product.stock || 0}</span>
                  </span>
                  <span className="text-xs text-secondary">Cost: ₹{product.costPrice || 0}</span>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                  <div className="text-xl font-bold">₹{product.price}</div>
                  <button 
                    className="btn btn-outline btn-sm mt-1 flex gap-1 items-center" 
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
                    onClick={() => setStockModal(product)}
                  >
                    <ArrowUpCircle size={14} /> Add Stock
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-xl mb-4 font-bold">Add New Product</h3>
            <form onSubmit={handleAddProduct}>
              <div className="input-group">
                <label>Product Name*</label>
                <input required type="text" className="input" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <div className="input-group flex-1">
                    <label>Selling Price (₹)*</label>
                    <input required type="number" step="0.01" className="input" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div className="input-group flex-1">
                    <label>Cost Price (₹)</label>
                    <input type="number" step="0.01" className="input" value={newProduct.costPrice} onChange={e => setNewProduct({...newProduct, costPrice: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="input-group flex-1">
                  <label>Initial Stock*</label>
                  <input required type="number" className="input" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
                </div>
                <div className="input-group flex-1">
                  <label>Barcode (Optional)</label>
                  <input type="text" className="input" value={newProduct.barcode} onChange={e => setNewProduct({...newProduct, barcode: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" className="btn btn-outline flex-1" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {stockModal && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '350px' }}>
            <h3 className="text-xl mb-2 font-bold">Add Stock</h3>
            <p className="text-secondary mb-4">Add new stock for <strong>{stockModal.name}</strong>. Current stock is {stockModal.stock || 0}.</p>
            <form onSubmit={handleUpdateStock}>
              <div className="input-group">
                <label>Amount to Add</label>
                <input 
                  required 
                  type="number" 
                  className="input" 
                  placeholder="e.g. 50" 
                  value={addStockAmount} 
                  onChange={e => setAddStockAmount(e.target.value)} 
                  autoFocus
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" className="btn btn-outline flex-1" onClick={() => { setStockModal(null); setAddStockAmount(''); }}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
