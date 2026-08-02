import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { addProduct, getProducts, getProductByBarcode, addSale } from '../store/db';
import { ScanLine, Search, Plus, Trash2, Bell, User, ShoppingCart, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function POS() {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Quick Add Modal State
  const [quickAddModal, setQuickAddModal] = useState(null);

  const [payMethod, setPayMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [dueDateDays, setDueDateDays] = useState('7');

  // Bill Sharing State
  const [showBillPrompt, setShowBillPrompt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [billMobile, setBillMobile] = useState('');

  // Quick Access Category
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', 'Electronics', 'Clothing', 'Grocery', 'Custom'];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const prods = await getProducts();
    setProducts(prods);
  };

  const addToCart = (product, quantity = 1) => {
    // Basic stock check (warn if out of stock, but allow sale for flexibility)
    if (product.stock !== undefined && product.stock <= 0) {
      if (!window.confirm(`${product.name} is currently out of stock. Add anyway?`)) {
        return;
      }
    }

    setCart((prev) => {
      const existing = prev.find(item => item.id === product.id || (product.isCustom && item.name === product.name));
      if (existing) {
        const newQty = Math.max(1, existing.qty + quantity);
        return prev.map(item => item.id === existing.id ? { ...item, qty: newQty } : item);
      }
      return [...prev, { ...product, qty: Math.max(1, quantity), cartId: Date.now() + Math.random() }];
    });
  };

  const updateQty = (cartId, delta) => {
    setCart(prev => prev.map(item =>
      item.cartId === cartId ? { ...item, qty: Math.max(1, item.qty + delta) } : item
    ));
  };

  const removeFromCart = (cartId) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);
  const tax = 0; // Placeholder for tax logic if needed
  const subtotal = cartTotal - tax;

  // Scanner Logic
  const startScanner = () => {
    setScanning(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner('reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0]
      }, false);
      scanner.render(async (decodedText) => {
        scanner.clear();
        setScanning(false);
        const product = await getProductByBarcode(decodedText);
        if (product) {
          addToCart(product);
        } else {
          setQuickAddModal({ barcode: decodedText, name: '', price: '', costPrice: '', stock: '0' });
        }
      }, (err) => {
        // ignore
      });
    }, 100);
  };

  const filteredProducts = products.filter(p => 
    (activeCategory === 'All' || p.keyword?.toLowerCase() === activeCategory.toLowerCase()) &&
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.keyword && p.keyword.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (payMethod === 'paylater') {
      if (!customerName || !customerMobile) {
        alert("Please enter customer details for Pay Later.");
        return;
      }
      const { addCustomer } = await import('../store/db');
      const due = Date.now() + (parseInt(dueDateDays) * 24 * 60 * 60 * 1000);
      await addCustomer({
        name: customerName,
        mobile: customerMobile,
        dueDate: due,
        amount: cartTotal
      });
    }

    const saleData = {
      items: cart,
      total: cartTotal,
      method: payMethod,
      timestamp: Date.now()
    };

    const savedSale = await addSale(saleData);

    setLastSale(savedSale);
    setBillMobile(customerMobile);
    setCart([]);
    setShowCheckout(false);
    setShowBillPrompt(true);
    loadProducts(); // Refresh stock
  };

  const sendWhatsAppBill = () => {
    if (!billMobile) return;
    let itemDetails = lastSale.items.map(item =>
      `${item.name} x${item.qty} = ₹${(item.price * item.qty).toFixed(2)}`
    ).join('\n');
    const message = `*Bill from Our Shop*\nDate: ${new Date(lastSale.timestamp).toLocaleString()}\n\n*Items:*\n${itemDetails}\n\n*Total: ₹${lastSale.total.toFixed(2)}*\nPayment: ${lastSale.method.toUpperCase()}\n\nThank you!`;
    window.open(`https://wa.me/${billMobile}?text=${encodeURIComponent(message)}`, '_blank');
    setShowBillPrompt(false);
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddModal.name || !quickAddModal.price) return;

    const newProd = {
      name: quickAddModal.name,
      price: parseFloat(quickAddModal.price),
      costPrice: parseFloat(quickAddModal.costPrice || 0),
      barcode: quickAddModal.barcode,
      stock: parseInt(quickAddModal.stock || 0)
    };

    const added = await addProduct(newProd);
    addToCart(added);
    setQuickAddModal(null);
    loadProducts();
  };

  return (
    <div className="pos-container">
      {/* Top Bar matching Retail Terminal design */}
      <div className="header-container">
        <div>
          <h2 className="text-2xl font-bold">Retail <span className="text-primary">Terminal</span></h2>
        </div>
        <div className="flex gap-3 items-center">
          <div className="btn-icon" style={{ backgroundColor: 'var(--surface-color)' }}>
            <Bell size={20} className="text-secondary" />
          </div>
          <div className="btn-icon" style={{ backgroundColor: 'var(--surface-color)', cursor: 'pointer' }} onClick={() => navigate('/admin')}>
            <UserCircle2 size={24} className="text-primary" />
          </div>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex gap-2 mb-4">
        <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '3rem', borderRadius: '999px' }}
            />
          </div>
        </div>
        <button className="btn btn-outline" style={{ borderRadius: '999px', padding: '0 1rem' }} onClick={startScanner} title="Scan">
          <ScanLine size={18} />
        </button>
        <button className="btn btn-primary" style={{ borderRadius: '999px', padding: '0 1rem' }} onClick={() => setQuickAddModal({ name: '', price: '', costPrice: '', barcode: '', stock: '0' })} title="Quick Add">
          <Plus size={18} />
        </button>
      </div>

      {scanning && (
        <div className="card mb-4">
          <div id="reader" width="100%"></div>
          <button className="btn btn-outline w-full mt-4" onClick={() => setScanning(false)}>Cancel Scan</button>
        </div>
      )}

      {/* Cart Area */}
      <div className="card flex flex-col" style={{ minHeight: '300px' }}>
        {cart.length === 0 && !searchQuery ? (
          <div className="flex flex-col items-center justify-center flex-1 text-secondary opacity-70">
            <ShoppingCart size={48} className="mb-4" />
            <h3 className="text-lg font-semibold">Cart is empty</h3>
            <p className="text-sm">Scan a barcode or search for items to begin a transaction.</p>
          </div>
        ) : searchQuery ? (
          <div className="flex-1 overflow-y-auto">
            <h4 className="mb-2 text-sm text-secondary uppercase tracking-wider font-semibold">Search Results</h4>
            {filteredProducts.map(p => (
              <div key={p.id} className="flex justify-between items-center mb-2" style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-secondary mt-1">₹{p.price} | Stock: {p.stock || 0}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => addToCart(p)}>Add</button>
              </div>
            ))}
            {filteredProducts.length === 0 && <div className="text-center text-sm py-4">No products found.</div>}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
             <div className="flex-1 overflow-y-auto mb-4">
               {cart.map(item => (
                 <div key={item.cartId} className="flex justify-between items-center mb-3" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                   <div className="flex-1">
                     <div className="font-semibold">{item.name}</div>
                     <div className="flex items-center gap-2 mt-2">
                       <button className="btn btn-outline" style={{ padding: '2px 8px', borderRadius: '8px' }} onClick={() => updateQty(item.cartId, -1)}>-</button>
                       <span className="font-semibold" style={{ width: '20px', textAlign: 'center' }}>{item.qty}</span>
                       <button className="btn btn-outline" style={{ padding: '2px 8px', borderRadius: '8px' }} onClick={() => updateQty(item.cartId, 1)}>+</button>
                     </div>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                     <div className="font-bold">₹{(parseFloat(item.price) * item.qty).toFixed(2)}</div>
                     <button className="text-danger" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => removeFromCart(item.cartId)}>
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </div>
               ))}
             </div>
             
             {/* Totals & Checkout button at the bottom of the card */}
             <div className="mt-auto pt-4" style={{ borderTop: '2px dashed var(--border-color)' }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-secondary text-sm font-semibold uppercase">Subtotal</div>
                  <div className="font-bold text-lg">₹{subtotal.toFixed(2)}</div>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-secondary text-sm font-semibold uppercase">Tax (0%)</div>
                  <div className="font-bold text-lg">₹{tax.toFixed(2)}</div>
                </div>
                <button className="btn btn-primary w-full" style={{ padding: '1rem', fontSize: '1.1rem' }} onClick={() => setShowCheckout(true)}>
                  Complete Checkout
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Quick Access */}
      {!searchQuery && (
        <div className="mb-4">
          <h4 className="text-xs text-secondary uppercase font-bold tracking-wider mb-3">Quick Access</h4>
          <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: '10px' }}>
            {categories.map(cat => (
              <div 
                key={cat} 
                className={`pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {quickAddModal && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '90%', maxWidth: '400px' }}>
            <h3 className="text-xl mb-4 font-bold">Quick Add Product</h3>
            {quickAddModal.barcode && <p className="mb-4 text-secondary text-sm">Scanned: {quickAddModal.barcode}</p>}
            <form onSubmit={handleQuickAdd}>
              <div className="input-group">
                <label>Product Name*</label>
                <input required type="text" className="input" value={quickAddModal.name} onChange={e => setQuickAddModal({...quickAddModal, name: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <div className="input-group flex-1">
                    <label>Price*</label>
                    <input required type="number" step="0.01" className="input" value={quickAddModal.price} onChange={e => setQuickAddModal({...quickAddModal, price: e.target.value})} />
                </div>
                <div className="input-group flex-1">
                    <label>Initial Stock</label>
                    <input type="number" className="input" value={quickAddModal.stock} onChange={e => setQuickAddModal({...quickAddModal, stock: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" className="btn btn-outline flex-1" onClick={() => setQuickAddModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Add & Select</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-2xl font-bold mb-6 text-center">Payment</h3>
            <div className="text-center mb-6">
              <div className="text-sm text-secondary uppercase font-semibold">Total Amount</div>
              <div className="text-4xl font-bold text-primary">₹{cartTotal.toFixed(2)}</div>
            </div>
            
            <div className="input-group mb-6">
              <label>Payment Method</label>
              <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="gpay">UPI / Wallet</option>
                <option value="card">Card</option>
                <option value="paylater">Pay Later (Credit)</option>
              </select>
            </div>

            {payMethod === 'paylater' && (
              <div className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                <div className="input-group">
                  <label>Customer Name*</label>
                  <input type="text" className="input" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Mobile Number*</label>
                  <input type="tel" className="input" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Due in (Days)</label>
                  <input type="number" className="input" value={dueDateDays} onChange={e => setDueDateDays(e.target.value)} />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button className="btn btn-outline flex-1" onClick={() => setShowCheckout(false)}>Cancel</button>
              <button className="btn btn-success flex-1" onClick={handleCheckout}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bill Prompt Modal */}
      {showBillPrompt && (
        <div className="modal-overlay">
          <div className="card text-center" style={{ width: '90%', maxWidth: '400px' }}>
            <div className="w-16 h-16 bg-green-100 text-success rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <ScanLine size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-2">Transaction Success!</h3>
            <p className="mb-6 text-secondary">Would you like to send a digital receipt via WhatsApp?</p>

            <div className="input-group text-left">
              <label>Customer Mobile Number</label>
              <input
                type="tel"
                className="input"
                placeholder="e.g. 9876543210"
                value={billMobile}
                onChange={e => setBillMobile(e.target.value)}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button className="btn btn-outline flex-1" onClick={() => setShowBillPrompt(false)}>Skip</button>
              <button className="btn btn-primary flex-1" onClick={sendWhatsAppBill}>Send Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
