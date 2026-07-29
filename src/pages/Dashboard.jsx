import React, { useState, useEffect } from 'react';
import { getSales, getInvestments, addInvestment } from '../store/db';
import { isToday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Plus, ScanLine } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Dashboard() {
  const [sales, setSales] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [invTitle, setInvTitle] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [scanning, setScanning] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');

  const startScanner = () => {
    setScanning(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner('reader-dashboard', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0]
      }, false);
      scanner.render((decodedText) => {
        setBarcodeValue(decodedText);
        scanner.clear();
        setScanning(false);
      }, (err) => {
        // ignore
      });
    }, 100);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await getSales();
    const i = await getInvestments();
    setSales(s);
    setInvestments(i);
  };

  const handleAddInvestment = async (e) => {
    e.preventDefault();
    if (invTitle && invAmount) {
      await addInvestment({ title: invTitle, amount: parseFloat(invAmount), type: 'expense' });
      setInvTitle('');
      setInvAmount('');
      loadData();
    }
  };

  // Calculations
  const calcTotalProfit = (salesItems, filterFn) => {
    return salesItems
      .filter(sale => filterFn(new Date(sale.timestamp)))
      .reduce((sum, sale) => {
        const saleProfit = sale.items.reduce((p, item) => p + (parseFloat(item.price) - (parseFloat(item.costPrice) || 0)) * item.qty, 0);
        return sum + saleProfit;
      }, 0);
  };

  const calcSalesTotal = (items, filterFn) => {
    return items
      .filter(item => filterFn(new Date(item.timestamp)))
      .reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  };

  const calcRealizedTotal = (items, filterFn) => {
    return items
      .filter(item => filterFn(new Date(item.timestamp)))
      .filter(item => item.method !== 'paylater')
      .reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  };

  const calcPayLaterTotal = (items, filterFn) => {
    return items
      .filter(item => filterFn(new Date(item.timestamp)))
      .filter(item => item.method === 'paylater')
      .reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  };

  const calcInvTotal = (items, filterFn) => {
    return items
      .filter(item => filterFn(new Date(item.timestamp)))
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const salesMonth = calcSalesTotal(sales, isThisMonth);
  const realizedMonth = calcRealizedTotal(sales, isThisMonth);
  const payLaterMonth = calcPayLaterTotal(sales, isThisMonth);
  const invMonth = calcInvTotal(investments, isThisMonth);
  const profitMonth = calcTotalProfit(sales, isThisMonth);

  const salesToday = calcSalesTotal(sales, isToday);
  const salesWeek = calcSalesTotal(sales, isThisWeek);
  const salesYear = calcSalesTotal(sales, isThisYear);
  const profitToday = calcTotalProfit(sales, isToday);

  return (
    <div className="dashboard-container">
      <h2 className="text-2xl font-bold mb-6">Business Dashboard</h2>

      <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card text-center" style={{ padding: '1rem' }}>
          <div className="text-secondary text-sm mb-1">Today's Profit</div>
          <div className="text-2xl font-bold text-success flex items-center justify-center gap-1">
            <TrendingUp size={20} /> ₹{profitToday.toFixed(0)}
          </div>
        </div>
        <div className="card text-center" style={{ padding: '1rem' }}>
          <div className="text-secondary text-sm mb-1">Today's Sales</div>
          <div className="text-xl font-bold">₹{salesToday.toFixed(0)}</div>
        </div>
        <div className="card text-center" style={{ padding: '1rem' }}>
          <div className="text-secondary text-sm mb-1">Monthly Profit</div>
          <div className="text-xl font-bold">₹{profitMonth.toFixed(0)}</div>
        </div>
        <div className="card text-center" style={{ padding: '1rem' }}>
          <div className="text-secondary text-sm mb-1">Monthly Sales</div>
          <div className="text-xl font-bold">₹{salesMonth.toFixed(0)}</div>
        </div>
      </div>

      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, var(--surface-color), rgba(59,130,246,0.1))' }}>
        <h3 className="mb-4">Monthly Overview</h3>
        <div className="flex justify-between items-center mb-2">
          <span className="text-secondary">Sales Profit (Est.)</span>
          <span className="font-bold text-success">+ ₹{profitMonth.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-secondary">Other Investments/Expenses</span>
          <span className="font-bold text-danger">- ₹{invMonth.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <span className="text-secondary">Net Realized Profit (Cash/UPI)</span>
          <span className="font-bold text-primary">₹{(realizedMonth - invMonth).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-xl font-bold">
          <span>Overall Business Growth</span>
          <span className={(profitMonth - invMonth) >= 0 ? 'text-success' : 'text-danger'}>
            ₹{(profitMonth - invMonth).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="mb-4">Quick Add Product</h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const { addProduct } = await import('../store/db');
          const target = e.target;
          await addProduct({
            name: target.name.value,
            price: parseFloat(target.price.value),
            costPrice: parseFloat(target.costPrice.value || 0),
            keyword: target.keyword.value,
            barcode: target.barcode.value
          });
          setBarcodeValue('');
          target.reset();
          alert('Product added to inventory!');
          loadData();
        }}>
          <div className="input-group">
            <label>Product Name</label>
            <input type="text" name="name" className="input" required />
          </div>
          <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Selling Price (₹)</label>
              <input type="number" step="0.01" name="price" className="input" required />
            </div>
            <div className="input-group">
              <label>Cost Price (₹)</label>
              <input type="number" step="0.01" name="costPrice" className="input" />
            </div>
          </div>
          <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
                <label>Keyword</label>
                <input type="text" name="keyword" className="input" />
            </div>
            <div className="input-group">
                <label className="flex justify-between items-center">
                  Barcode ID
                  <button type="button" onClick={startScanner} className="text-primary" style={{ padding: '0 4px' }}>
                    <ScanLine size={16} />
                  </button>
                </label>
                <input
                  type="text"
                  name="barcode"
                  className="input"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                />
            </div>
          </div>
          {scanning && (
            <div className="mb-4">
              <div id="reader-dashboard" width="100%"></div>
              <button type="button" className="btn btn-outline w-full mt-2" onClick={() => setScanning(false)}>Cancel Scan</button>
            </div>
          )}
          <button type="submit" className="btn btn-primary w-full mt-2">
            <Plus size={18} /> Save Product
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="mb-4">Log Investment / Expense</h3>
        <form onSubmit={handleAddInvestment}>
          <div className="input-group">
            <label>Description (e.g., Shop Expand, Stock Buy)</label>
            <input type="text" className="input" value={invTitle} onChange={e => setInvTitle(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Amount</label>
            <input type="number" className="input" value={invAmount} onChange={e => setInvAmount(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-2">
            <Plus size={18} /> Add Record
          </button>
        </form>
      </div>

      <div className="card mt-6" style={{ border: '1px dashed var(--border-color)' }}>
        <h3 className="mb-4">System Diagnostics</h3>
        <div className="flex gap-2">
            <button className="btn btn-outline flex-1" onClick={async () => {
                const { runStressTest } = await import('../utils/stressTest');
                if (confirm('This will add 1000 products and 500 sales. Continue?')) {
                    const time = await runStressTest();
                    alert(`Test complete in ${time}s`);
                    loadData();
                }
            }}>Run Stress Test</button>
            <button className="btn btn-outline flex-1" style={{ color: 'var(--danger-color)' }} onClick={async () => {
                if (confirm('DANGER: This will delete ALL data. Are you sure?')) {
                    localStorage.clear();
                    await Promise.all([
                        import('localforage').then(lf => lf.createInstance({ name: 'shopBilling', storeName: 'products' }).clear()),
                        import('localforage').then(lf => lf.createInstance({ name: 'shopBilling', storeName: 'sales' }).clear()),
                        import('localforage').then(lf => lf.createInstance({ name: 'shopBilling', storeName: 'customers' }).clear()),
                        import('localforage').then(lf => lf.createInstance({ name: 'shopBilling', storeName: 'investments' }).clear())
                    ]);
                    window.location.reload();
                }
            }}>Reset All Data</button>
        </div>
      </div>
    </div>
  );
}
