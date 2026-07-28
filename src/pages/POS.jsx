import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { addProduct, getProducts, getProductByBarcode, addSale } from '../store/db';
import { ScanLine, Search, Plus, Trash2, CreditCard, Wallet, Banknote, Clock } from 'lucide-react';

export default function POS() {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const fileInputRef = useRef(null);

  // Custom Product State
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  // Quick Add Modal State
  const [quickAddModal, setQuickAddModal] = useState(null); // { barcode, name, price, costPrice }

  const [payMethod, setPayMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [dueDateDays, setDueDateDays] = useState('7');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const prods = await getProducts();
    setProducts(prods);
  };

  const addToCart = (product, quantity = 1) => {
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

  // Scanner Logic
  const startScanner = () => {
    setScanning(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner('reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0] // Camera only for the scanner
      }, false);
      scanner.render(async (decodedText) => {
        scanner.clear();
        setScanning(false);
        const product = await getProductByBarcode(decodedText);
        if (product) {
          addToCart(product);
        } else {
          setQuickAddModal({ barcode: decodedText, name: '', price: '', costPrice: '' });
        }
      }, (err) => {
        // ignore scan errors
      });
    }, 100);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const { Html5Qrcode } = await import('html5-qrcode');
    const html5QrCode = new Html5Qrcode("reader-hidden");
    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      const product = await getProductByBarcode(decodedText);
      if (product) {
        addToCart(product);
      } else {
        setQuickAddModal({ barcode: decodedText, name: '', price: '', costPrice: '' });
      }
    } catch (err) {
      alert("Could not recognize QR code from image.");
    }
  };

  const handleManualAdd = () => {
    if (customName && customPrice) {
      addToCart({
        id: 'custom-' + Date.now(),
        name: customName,
        price: customPrice,
        isCustom: true
      });
      setCustomName('');
      setCustomPrice('');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.keyword && p.keyword.toLowerCase().includes(searchQuery.toLowerCase()))
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

    await addSale({
      items: cart,
      total: cartTotal,
      method: payMethod,
      timestamp: Date.now()
    });

    setCart([]);
    setShowCheckout(false);
    alert('Sale completed successfully!');
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddModal.name || !quickAddModal.price) return;

    const newProd = {
      name: quickAddModal.name,
      price: parseFloat(quickAddModal.price),
      costPrice: parseFloat(quickAddModal.costPrice || 0),
      barcode: quickAddModal.barcode
    };

    const added = await addProduct(newProd);
    addToCart(added);
    setQuickAddModal(null);
    loadProducts();
  };

  return (
    <div className="pos-container">
      <h2 className="text-2xl font-bold mb-4">Point of Sale</h2>

      {/* Top Actions: Scanner & Search */}
      <div className="flex gap-2 mb-4">
        <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-secondary)' }} size={20} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search by name or keyword..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={startScanner} title="Scan using Camera">
          <ScanLine />
        </button>
        <button className="btn btn-outline" onClick={() => fileInputRef.current.click()} title="Upload QR Image">
          <Plus />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleFileUpload}
        />
      </div>

      <div id="reader-hidden" style={{ display: 'none' }}></div>

      {scanning && (
        <div className="card mb-4">
          <div id="reader" width="100%"></div>
          <button className="btn btn-outline w-full mt-4" onClick={() => setScanning(false)}>Cancel Scan</button>
        </div>
      )}

      {/* Manual Entry */}
      <div className="card mb-4 flex gap-2 items-center">
        <input 
          type="text" 
          className="input" 
          placeholder="Custom Item" 
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
        />
        <input 
          type="number" 
          className="input" 
          placeholder="Price" 
          style={{ width: '100px' }}
          value={customPrice}
          onChange={(e) => setCustomPrice(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleManualAdd}>
          <Plus />
        </button>
      </div>

      {/* Product List (if searching) */}
      {searchQuery && (
        <div className="card mb-4">
          <h3 className="mb-2">Search Results</h3>
          {filteredProducts.map(p => (
            <div key={p.id} className="flex justify-between items-center mb-2" style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div>{p.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>₹{p.price}</div>
              </div>
              <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} onClick={() => addToCart(p)}>Add</button>
            </div>
          ))}
          {filteredProducts.length === 0 && <div className="text-secondary text-center">No products found</div>}
        </div>
      )}

      {/* Cart Display */}
      <div className="card">
        <h3 className="mb-4">Current Cart</h3>
        {cart.length === 0 ? (
          <div className="text-center text-secondary py-4">Cart is empty</div>
        ) : (
          <div>
            {cart.map(item => (
              <div key={item.cartId} className="flex justify-between items-center mb-3">
                <div className="flex-1">
                  <div className="font-bold">{item.name}</div>
                  <div className="text-secondary text-sm">₹{item.price}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <button className="btn btn-outline" style={{ padding: '2px 8px' }} onClick={() => updateQty(item.cartId, -1)}>-</button>
                    <input
                      type="number"
                      className="input"
                      style={{ width: '60px', padding: '2px 5px', textAlign: 'center', height: '30px' }}
                      value={item.qty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setCart(prev => prev.map(i => i.cartId === item.cartId ? { ...i, qty: Math.max(1, val) } : i));
                      }}
                    />
                    <button className="btn btn-outline" style={{ padding: '2px 8px' }} onClick={() => updateQty(item.cartId, 1)}>+</button>
                  </div>
                </div>
                <div className="font-bold mr-4">₹{(parseFloat(item.price) * item.qty).toFixed(2)}</div>
                <button className="btn btn-outline" style={{ color: 'var(--danger-color)', padding: '0.5rem' }} onClick={() => removeFromCart(item.cartId)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <div className="flex justify-between items-center mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <div className="text-xl font-bold">Total:</div>
              <div className="text-2xl font-bold text-success">₹{cartTotal.toFixed(2)}</div>
            </div>
            <button className="btn btn-success w-full mt-4" onClick={() => setShowCheckout(true)}>
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>

      {/* Quick Add Modal */}
      {quickAddModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '400px' }}>
            <h3 className="text-xl mb-4">New Product Detected</h3>
            <p className="mb-4 text-secondary text-sm">Barcode: {quickAddModal.barcode}</p>
            <form onSubmit={handleQuickAdd}>
              <div className="input-group">
                <label>Product Name</label>
                <input required type="text" className="input" value={quickAddModal.name} onChange={e => setQuickAddModal({...quickAddModal, name: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <div className="input-group flex-1">
                    <label>Selling Price</label>
                    <input required type="number" step="0.01" className="input" value={quickAddModal.price} onChange={e => setQuickAddModal({...quickAddModal, price: e.target.value})} />
                </div>
                <div className="input-group flex-1">
                    <label>Cost Price</label>
                    <input type="number" step="0.01" className="input" value={quickAddModal.costPrice} onChange={e => setQuickAddModal({...quickAddModal, costPrice: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" className="btn btn-outline flex-1" onClick={() => setQuickAddModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Add & Add to Cart</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: '90%', maxWidth: '400px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-xl mb-4">Checkout (Total: ₹{cartTotal.toFixed(2)})</h3>
            
            <div className="input-group">
              <label>Payment Method</label>
              <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="gpay">Google Pay / UPI</option>
                <option value="card">Credit/Debit Card</option>
                <option value="paylater">Pay Later</option>
              </select>
            </div>

            {payMethod === 'paylater' && (
              <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                <div className="input-group">
                  <label>Customer Name</label>
                  <input type="text" className="input" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Mobile Number</label>
                  <input type="tel" className="input" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Due in (Days)</label>
                  <input type="number" className="input" value={dueDateDays} onChange={e => setDueDateDays(e.target.value)} />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowCheckout(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCheckout}>Complete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
