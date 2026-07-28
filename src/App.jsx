import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { ShoppingCart, Clock, LayoutDashboard, History } from 'lucide-react';

// Placeholders for Pages
import POS from './pages/POS';
import PayLater from './pages/PayLater';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <div className="main-content">
          <Routes>
            <Route path="/" element={<POS />} />
            <Route path="/paylater" element={<PayLater />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </div>
        
        <nav className="bottom-nav glass">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ShoppingCart />
            <span>POS</span>
          </NavLink>
          <NavLink to="/paylater" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Clock />
            <span>Pay Later</span>
          </NavLink>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <History />
            <span>History</span>
          </NavLink>
        </nav>
      </div>
    </Router>
  );
}

export default App;
