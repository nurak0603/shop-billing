import React, { useState, useEffect } from 'react';
import { getSales, getInvestments } from '../store/db';
import { format } from 'date-fns';
import { Download, FileText, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export default function HistoryPage() {
  const [sales, setSales] = useState([]);
  const [investments, setInvestments] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await getSales();
    const i = await getInvestments();
    setSales(s);
    setInvestments(i);
  };

  const handleExport = async () => {
    try {
      const { getProducts, getCustomers } = await import('../store/db');
      const wb = XLSX.utils.book_new();

      // 1. Format Sales Data
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
      const wsSales = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(wb, wsSales, "Sales History");

      // 2. Format Inventory Data
      const products = await getProducts();
      const inventoryData = products.map(p => ({
        Name: p.name,
        'Selling Price': p.price,
        'Cost Price': p.costPrice || 0,
        'Profit per Unit': (p.price - (p.costPrice || 0)).toFixed(2),
        Barcode: p.barcode || 'N/A',
        Keyword: p.keyword || ''
      }));
      const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
      XLSX.utils.book_append_sheet(wb, wsInventory, "Inventory");

      // 3. Format Customer/PayLater Data
      const customers = await getCustomers();
      const customerData = customers.map(c => ({
        Name: c.name,
        Mobile: c.mobile,
        Amount: c.amount,
        'Due Date': format(new Date(c.dueDate), 'yyyy-MM-dd'),
        Status: c.status
      }));
      const wsCustomers = XLSX.utils.json_to_sheet(customerData);
      XLSX.utils.book_append_sheet(wb, wsCustomers, "Customers");

      // 4. Format Investments Data
      const invData = investments.map(i => ({
        Date: format(new Date(i.timestamp), 'yyyy-MM-dd HH:mm'),
        'Description': i.title,
        'Amount': i.amount
      }));
      const wsInv = XLSX.utils.json_to_sheet(invData);
      XLSX.utils.book_append_sheet(wb, wsInv, "Investments");

      const fileName = `Shop_Full_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      if (Capacitor.isNativePlatform()) {
        // Native Export using Filesystem and Share
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

        const result = await Filesystem.writeFile({
          path: fileName,
          data: excelBuffer,
          directory: Directory.Cache // Use Cache for temporary sharing
        });

        await Share.share({
          title: 'Shop Report',
          text: 'Exported Shop Billing Report',
          url: result.uri,
          dialogTitle: 'Share Report'
        });
      } else {
        // Web Export
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
      console.error('Export failed', err);
      alert('Failed to export file: ' + err.message);
    }
  };

  // Combine and sort for the unified history feed
  const historyFeed = [
    ...sales.map(s => ({ ...s, _type: 'sale' })),
    ...investments.map(i => ({ ...i, _type: 'investment' }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="history-container">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">History</h2>
        <button className="btn btn-primary" onClick={handleExport}>
          <Download size={18} /> Export Excel
        </button>
      </div>

      <div className="history-list">
        {historyFeed.length === 0 ? (
          <div className="text-center text-secondary py-8">No records found.</div>
        ) : (
          historyFeed.map(item => (
            <div key={item.id} className="card mb-3 flex items-center gap-4" style={{ padding: '1rem' }}>
              <div className={`p-3 rounded-full ${item._type === 'sale' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`} style={{ backgroundColor: 'var(--surface-color)' }}>
                {item._type === 'sale' ? <ArrowDownRight size={24} /> : <ArrowUpRight size={24} />}
              </div>
              
              <div className="flex-1">
                <div className="font-bold">
                  {item._type === 'sale' ? `Sale (${item.method})` : 'Investment'}
                </div>
                <div className="text-sm text-secondary truncate">
                  {item._type === 'sale' 
                    ? item.items.map(i => i.name).join(', ')
                    : item.title}
                </div>
                <div className="text-xs text-secondary mt-1">
                  {format(new Date(item.timestamp), 'dd MMM yyyy, hh:mm a')}
                </div>
              </div>

              <div className={`font-bold ${item._type === 'sale' ? 'text-success' : 'text-danger'}`}>
                {item._type === 'sale' ? '+' : '-'} ₹{parseFloat(item.total || item.amount).toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
