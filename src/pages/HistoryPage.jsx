import React, { useState, useEffect } from 'react';
import { getSales, getInvestments } from '../store/db';
import { format } from 'date-fns';
import { Download, FileText, ArrowDownRight, ArrowUpRight } from 'lucide-react';

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



  // Combine and sort for the unified history feed
  const historyFeed = [
    ...sales.map(s => ({ ...s, _type: 'sale' })),
    ...investments.map(i => ({ ...i, _type: 'investment' }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="history-container">
      <div className="header-container">
        <div>
          <h2 className="text-2xl font-bold">Transactions <span className="text-primary">History</span></h2>
        </div>
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
