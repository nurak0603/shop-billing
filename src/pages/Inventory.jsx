import React, { useState, useEffect } from 'react';
import { getProducts, addProduct } from '../store/db';
import { Package, Plus, Search, Download, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { format } from 'date-fns';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', costPrice: '', barcode: '', keyword: '' });

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
      costPrice: parseFloat(newProduct.costPrice || 0)
    });
    setNewProduct({ name: '', price: '', costPrice: '', barcode: '', keyword: '' });
    setShowAddModal(false);
    loadProducts();
  };

  const exportInventory = async () => {
    const fileName = `Inventory_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    const data = products.map(p => ({
      Name: p.name,
      'Selling Price': p.price,
      'Cost Price': p.costPrice || 0,
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

  const totalInventoryValue = products.reduce((sum, p) => sum + (p.price * 1), 0); // Assuming stock is 1 for now or adding a stock field
  const totalPotentialProfit = products.reduce((sum, p) => sum + ((p.price - (p.costPrice || 0)) * 1), 0);

  return (
    <div className="inventory-container">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Inventory</h2>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={exportInventory}>
            <Download size={18} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      <div className="grid-2-col mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="card text-center" style={{ padding: '0.75rem' }}>
              <div className="text-secondary text-xs uppercase">Total Value</div>
              <div className="text-lg font-bold">₹{totalInventoryValue.toFixed(0)}</div>
          </div>
          <div className="card text-center" style={{ padding: '0.75rem' }}>
              <div className="text-secondary text-xs uppercase">Potential Profit</div>
              <div className="text-lg font-bold text-success">₹{totalPotentialProfit.toFixed(0)}</div>
          </div>
      </div>

      <div className="input-group mb-4">
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-secondary)' }} size={20} />
          <input
            type="text"
            className="input"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="card flex justify-between items-center">
            <div>
              <div className="font-bold text-lg">{product.name}</div>
              <div className="text-secondary text-sm">
                Barcode: {product.barcode || 'None'} | Cost: ₹{product.costPrice || 0}
              </div>
            </div>
            <div className="text-right">
                <div className="text-xl font-bold text-success">₹{product.price}</div>
                <div className="text-xs text-secondary">Profit: ₹{(product.price - (product.costPrice || 0)).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '400px' }}>
            <h3 className="text-xl mb-4">Add New Product</h3>
            <form onSubmit={handleAddProduct}>
              <div className="input-group">
                <label>Product Name*</label>
                <input required type="text" className="input" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <div className="input-group flex-1">
                    <label>Selling Price*</label>
                    <input required type="number" step="0.01" className="input" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div className="input-group flex-1">
                    <label>Cost Price</label>
                    <input type="number" step="0.01" className="input" value={newProduct.costPrice} onChange={e => setNewProduct({...newProduct, costPrice: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label>Barcode (Optional)</label>
                <input type="text" className="input" value={newProduct.barcode} onChange={e => setNewProduct({...newProduct, barcode: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Search Keyword (Optional)</label>
                <input type="text" className="input" value={newProduct.keyword} onChange={e => setNewProduct({...newProduct, keyword: e.target.value})} />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" className="btn btn-outline flex-1" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
