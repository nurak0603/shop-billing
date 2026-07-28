import React, { useState, useEffect } from 'react';
import { getSales, getInvestments, addInvestment } from '../store/db';
import { isToday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Plus } from 'lucide-react';

export default function Dashboard() {
  const [sales, setSales] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [invTitle, setInvTitle] = useState('');
  const [invAmount, setInvAmount] = useState('');

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
  const calcTotal = (items, filterFn) => {
    return items.filter(item => filterFn(new Date(item.timestamp))).reduce((sum, item) => sum + (parseFloat(item.total || item.amount) || 0), 0);
  };

  const salesToday = calcTotal(sales, isToday);
  const salesWeek = calcTotal(sales, isThisWeek);
  const salesMonth = calcTotal(sales, isThisMonth);
  const salesYear = calcTotal(sales, isThisYear);

  const invToday = calcTotal(investments, isToday);
  const invMonth = calcTotal(investments, isThisMonth);
  const invYear = calcTotal(investments, isThisYear);

  return (
    <div className="dashboard-container">
      <h2 className="text-2xl font-bold mb-6">Business Dashboard</h2>

      <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card text-center" style={{ padding: '1rem' }}>
          <div className="text-secondary text-sm mb-1">Today's Sales</div>
          <div className="text-2xl font-bold text-success flex items-center justify-center gap-1">
            <TrendingUp size={20} /> ₹{salesToday.toFixed(0)}
          </div>
        </div>
        <div className="card text-center" style={{ padding: '1rem' }}>
          <div className="text-secondary text-sm mb-1">This Week</div>
          <div className="text-xl font-bold">₹{salesWeek.toFixed(0)}</div>
        </div>
        <div className="card text-center" style={{ padding: '1rem' }}>
          <div className="text-secondary text-sm mb-1">This Month</div>
          <div className="text-xl font-bold">₹{salesMonth.toFixed(0)}</div>
        </div>
        <div className="card text-center" style={{ padding: '1rem' }}>
          <div className="text-secondary text-sm mb-1">This Year</div>
          <div className="text-xl font-bold">₹{salesYear.toFixed(0)}</div>
        </div>
      </div>

      <div className="card mb-6" style={{ background: 'linear-gradient(135deg, var(--surface-color), rgba(59,130,246,0.1))' }}>
        <h3 className="mb-4">Profit Overview (This Month)</h3>
        <div className="flex justify-between items-center mb-2">
          <span className="text-secondary">Total Sales</span>
          <span className="font-bold text-success">+ ₹{salesMonth.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <span className="text-secondary">Total Investments/Expenses</span>
          <span className="font-bold text-danger">- ₹{invMonth.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-xl font-bold">
          <span>Net Profit</span>
          <span className={(salesMonth - invMonth) >= 0 ? 'text-success' : 'text-danger'}>
            ₹{(salesMonth - invMonth).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="mb-4">Add Product to Inventory</h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const { addProduct } = await import('../store/db');
          const target = e.target;
          await addProduct({
            name: target.name.value,
            price: target.price.value,
            keyword: target.keyword.value,
            barcode: target.barcode.value
          });
          target.reset();
          alert('Product added to inventory!');
        }}>
          <div className="input-group">
            <label>Product Name</label>
            <input type="text" name="name" className="input" required />
          </div>
          <div className="grid-2-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label>Price (₹)</label>
              <input type="number" name="price" className="input" required />
            </div>
            <div className="input-group">
              <label>Keyword</label>
              <input type="text" name="keyword" className="input" />
            </div>
          </div>
          <div className="input-group">
            <label>Barcode ID (Optional)</label>
            <input type="text" name="barcode" className="input" />
          </div>
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
    </div>
  );
}
