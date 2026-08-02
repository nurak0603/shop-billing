import React, { useState, useEffect } from 'react';
import { getSales, getInvestments, getExpenses } from '../store/db';
import { isToday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const [sales, setSales] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await getSales();
    const i = await getInvestments();
    const e = await getExpenses();
    setSales(s);
    setInvestments(i);
    setExpenses(e);
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

  const calcInvExpenseTotal = (investments, expenses, filterFn) => {
    const invSum = investments
      .filter(item => filterFn(new Date(item.timestamp)))
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const expSum = expenses
      .filter(item => filterFn(new Date(item.timestamp)))
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    return invSum + expSum;
  };

  const salesMonth = calcSalesTotal(sales, isThisMonth);
  const realizedMonth = calcRealizedTotal(sales, isThisMonth);
  const invExpenseMonth = calcInvExpenseTotal(investments, expenses, isThisMonth);
  const profitMonth = calcTotalProfit(sales, isThisMonth);

  const salesToday = calcSalesTotal(sales, isToday);
  const profitToday = calcTotalProfit(sales, isToday);

  return (
    <div className="dashboard-container">
      <div className="header-container">
        <div>
          <h2 className="text-2xl font-bold uppercase">Executive <span className="text-primary">Pulse</span></h2>
        </div>
        <div className="btn-icon" style={{ backgroundColor: 'var(--surface-color)' }}>
          <TrendingUp size={20} className="text-primary" />
        </div>
      </div>

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
          <span className="text-secondary">Expenses & Investments</span>
          <span className="font-bold text-danger">- ₹{invExpenseMonth.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <span className="text-secondary">Net Realized Profit (Cash/UPI)</span>
          <span className="font-bold text-primary">₹{(realizedMonth - invExpenseMonth).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-xl font-bold">
          <span>Overall Business Growth</span>
          <span className={(profitMonth - invExpenseMonth) >= 0 ? 'text-success' : 'text-danger'}>
            ₹{(profitMonth - invExpenseMonth).toFixed(2)}
          </span>
        </div>
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
                        import('localforage').then(lf => lf.createInstance({ name: 'shopBilling', storeName: 'investments' }).clear()),
                        import('localforage').then(lf => lf.createInstance({ name: 'shopBilling', storeName: 'expenses' }).clear())
                    ]);
                    window.location.reload();
                }
            }}>Reset All Data</button>
        </div>
      </div>
    </div>
  );
}
