import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile    from './pages/Profile';
import Connections    from './pages/Connections';
import AddATitle    from './pages/AddATitle';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/titles/add" element={<AddATitle />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
