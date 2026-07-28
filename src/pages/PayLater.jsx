import React, { useState, useEffect } from 'react';
import { getCustomers, updateCustomerStatus } from '../store/db';
import { Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';

export default function PayLater() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await getCustomers();
    setCustomers(data);
  };

  const handleMarkPaid = async (id) => {
    if (window.confirm("Mark this as paid?")) {
      await updateCustomerStatus(id, 'paid');
      loadCustomers();
    }
  };

  const handleRemind = (mobile, amount) => {
    const message = `Hello! This is a gentle reminder that you have a pending payment of ₹${amount} at our shop. Please clear it at your earliest convenience. Thank you!`;
    const url = `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const pendingCustomers = customers.filter(c => c.status === 'pending');
  const paidCustomers = customers.filter(c => c.status === 'paid');

  return (
    <div className="paylater-container">
      <h2 className="text-2xl font-bold mb-4">Pay Later Accounts</h2>

      <div className="mb-4">
        <h3 className="mb-2 text-xl">Pending Payments</h3>
        {pendingCustomers.length === 0 ? (
          <div className="card text-center text-secondary">No pending payments! 🎉</div>
        ) : (
          pendingCustomers.map(customer => {
            const dueDate = new Date(customer.dueDate);
            const overdue = isPast(dueDate);
            const daysDiff = Math.abs(differenceInDays(new Date(), dueDate));
            
            return (
              <div key={customer.id} className={`card ${overdue ? 'border-danger' : ''}`} style={overdue ? { border: '1px solid var(--danger-color)' } : {}}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold text-lg">{customer.name}</div>
                    <div className="text-secondary flex items-center gap-2 text-sm mt-1">
                      <Phone size={14} /> {customer.mobile}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-danger">₹{parseFloat(customer.amount).toFixed(2)}</div>
                    {overdue ? (
                      <div className="text-danger flex items-center gap-1 text-sm mt-1 justify-end">
                        <AlertCircle size={14} /> Overdue by {daysDiff} days
                      </div>
                    ) : (
                      <div className="text-secondary text-sm mt-1">
                        Due: {format(dueDate, 'dd MMM yyyy')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <button className="btn btn-outline" style={{ flex: 1, color: 'var(--accent-color)' }} onClick={() => handleRemind(customer.mobile, customer.amount)}>
                    Remind
                  </button>
                  <button className="btn btn-success" style={{ flex: 1 }} onClick={() => handleMarkPaid(customer.id)}>
                    <CheckCircle2 size={18} /> Mark Paid
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8">
        <h3 className="mb-2 text-xl">Recently Paid</h3>
        {paidCustomers.slice(0, 5).map(customer => (
          <div key={customer.id} className="card flex justify-between items-center opacity-70">
            <div>
              <div className="font-bold">{customer.name}</div>
              <div className="text-sm text-secondary">Paid ₹{customer.amount}</div>
            </div>
            <div className="text-success flex items-center gap-1">
              <CheckCircle2 size={18} /> Paid
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
