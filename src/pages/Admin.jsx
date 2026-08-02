import React, { useState, useEffect, useRef } from 'react';
import { addExpense, getExpenses, exportFullDatabase, importFullDatabase } from '../store/db';
import { Lock, Coffee, Car, Home, Zap, Download, Trash2, ShieldCheck, Users, Upload, FileJson, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { format } from 'date-fns';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('food');
  const [upiId, setUpiId] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    const data = await getExpenses();
    setExpenses(data);
    
    // Dynamically import getSetting to avoid changing the top-level import for now
    const { getSetting } = await import('../store/db');
    const savedUpi = await getSetting('upiId');
    if (savedUpi) setUpiId(savedUpi);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password');
      setPassword('');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseAmount) return;

    await addExpense({
      category: expenseCategory,
      amount: parseFloat(expenseAmount),
      date: new Date().toISOString(),
      timestamp: Date.now()
    });

    setExpenseAmount('');
    loadData();
  };

  const handleSaveUpi = async (e) => {
    e.preventDefault();
    const { saveSetting } = await import('../store/db');
    await saveSetting('upiId', upiId);
    alert('UPI ID saved successfully!');
  };

  const handleExportBackup = async () => {
    try {
      const jsonString = await exportFullDatabase();
      const fileName = `ShopBackup_${format(new Date(), 'yyyy-MM-dd')}.json`;
      
      if (Capacitor.isNativePlatform()) {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: 'utf8'
        });
        await Share.share({
          title: 'Shop Database Backup',
          url: result.uri
        });
      } else {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Backup failed: ' + err.message);
    }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (window.confirm('WARNING: Importing a backup will OVERWRITE all your current data. Are you sure you want to proceed?')) {
      try {
        const text = await file.text();
        const success = await importFullDatabase(text);
        if (success) {
          alert('Backup restored successfully! The app will now reload.');
          window.location.reload();
        } else {
          alert('Failed to restore backup. Invalid format.');
        }
      } catch (err) {
        alert('Restore failed: ' + err.message);
      }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportExcel = async () => {
    try {
      const { getProducts, getCustomers, getSales, getInvestments } = await import('../store/db');
      const wb = XLSX.utils.book_new();

      // Sales
      const sales = await getSales();
      const salesData = sales.map(s => {
        const totalCost = s.items.reduce((sum, i) => sum + ((i.costPrice || 0) * i.qty), 0);
        return {
          Date: format(new Date(s.timestamp), 'yyyy-MM-dd HH:mm'),
          'Method': s.method,
          'Total Amount': s.total,
          'Total Cost': totalCost,
          'Profit': (s.total - totalCost).toFixed(2),
          'Items': s.items.map(i => `${i.name} (x${i.qty})`).join(', ')
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), "Sales History");

      // Inventory
      const products = await getProducts();
      const inventoryData = products.map(p => ({
        Name: p.name,
        'Selling Price': p.price,
        'Cost Price': p.costPrice || 0,
        'Profit per Unit': (p.price - (p.costPrice || 0)).toFixed(2),
        Barcode: p.barcode || 'N/A',
        Keyword: p.keyword || ''
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryData), "Inventory");

      // Customers
      const customers = await getCustomers();
      const customerData = customers.map(c => ({
        Name: c.name,
        Mobile: c.mobile,
        Amount: c.amount,
        'Due Date': format(new Date(c.dueDate), 'yyyy-MM-dd'),
        Status: c.status
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customerData), "Customers");

      // Investments
      const investments = await getInvestments();
      const invData = investments.map(i => ({
        Date: format(new Date(i.timestamp), 'yyyy-MM-dd HH:mm'),
        'Description': i.title,
        'Amount': i.amount
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invData), "Investments");

      const fileName = `Shop_Full_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      if (Capacitor.isNativePlatform()) {
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const result = await Filesystem.writeFile({
          path: fileName,
          data: excelBuffer,
          directory: Directory.Cache
        });
        await Share.share({ title: 'Shop Report', url: result.uri });
      } else {
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Failed to export Excel: ' + err.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="card text-center" style={{ maxWidth: '350px', width: '100%' }}>
          <div className="flex justify-center mb-4 text-primary">
            <Lock size={48} />
          </div>
          <h2 className="text-2xl mb-2">Admin Access</h2>
          <p className="mb-6">Please enter the master password to access system controls.</p>
          
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <input 
                type="password" 
                className="input" 
                placeholder="Enter password..." 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary w-full">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  const expenseCategories = [
    { id: 'food', icon: <Coffee />, label: 'Food' },
    { id: 'transport', icon: <Car />, label: 'Transport' },
    { id: 'utilities', icon: <Zap />, label: 'Utilities' },
    { id: 'rent', icon: <Home />, label: 'Rent' },
    { id: 'salary', icon: <Users />, label: 'Salary' },
  ];

  return (
    <div className="admin-container">
      <div className="header-container">
        <div>
          <h2 className="text-2xl font-bold">Admin & <span className="text-primary">Control</span></h2>
        </div>
        <div className="btn-icon" style={{ backgroundColor: 'var(--surface-color)' }}>
          <ShieldCheck className="text-success" />
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="mb-4 text-xl">Financial Logger</h3>
        
        <form onSubmit={handleAddExpense}>
          <div className="flex justify-between mb-4 gap-2" style={{ overflowX: 'auto', paddingBottom: '10px' }}>
            {expenseCategories.map(cat => (
              <div 
                key={cat.id}
                onClick={() => setExpenseCategory(cat.id)}
                className={`card text-center flex flex-col items-center justify-center gap-2`}
                style={{ 
                  margin: 0, 
                  minWidth: '80px', 
                  cursor: 'pointer',
                  border: expenseCategory === cat.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                  background: expenseCategory === cat.id ? 'rgba(37, 99, 235, 0.05)' : 'var(--surface-color)'
                }}
              >
                <div style={{ color: expenseCategory === cat.id ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                  {cat.icon}
                </div>
                <div className="text-xs font-semibold" style={{ color: expenseCategory === cat.id ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                  {cat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <input 
                type="number" 
                className="input" 
                placeholder="Amount (₹)" 
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem' }}>
              Add Record
            </button>
          </div>
        </form>
      </div>

      <div className="card mb-4">
        <h3 className="mb-4 text-xl">Payment Settings</h3>
        <form onSubmit={handleSaveUpi} className="flex gap-2">
          <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
            <input 
              type="text" 
              className="input" 
              placeholder="Enter UPI ID (e.g., store@ybl)" 
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-success" style={{ padding: '0 1.5rem' }}>
            Save
          </button>
        </form>
      </div>

      <div className="card mb-4">
        <h3 className="mb-4 text-xl">Data Management</h3>
        <p className="text-sm text-secondary mb-4">Export or import your complete shop database to safely migrate between devices or app versions. You can also export a full Excel report of all your data.</p>
        
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1 flex items-center justify-center gap-2" onClick={handleExportBackup}>
              <FileJson size={18} /> Export Backup (JSON)
            </button>
            <button className="btn btn-outline flex-1 flex items-center justify-center gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload size={18} /> Restore Backup
            </button>
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleImportBackup} 
            />
          </div>
          
          <button className="btn btn-success flex items-center justify-center gap-2 w-full mt-2" onClick={handleExportExcel}>
            <FileSpreadsheet size={18} /> Download Excel Report
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-xl">Recent Expenses</h3>
        {expenses.length === 0 ? (
          <div className="text-center text-secondary py-4">No expenses recorded yet.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {expenses.slice(0, 10).map((expense, idx) => (
              <div key={idx} className="flex justify-between items-center" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-3">
                  <div className="btn-icon" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-color)' }}>
                    {expenseCategories.find(c => c.id === expense.category)?.icon || <Coffee />}
                  </div>
                  <div>
                    <div className="font-semibold capitalize">{expense.category}</div>
                    <div className="text-xs text-secondary">{new Date(expense.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="font-bold text-danger">
                  -₹{expense.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
