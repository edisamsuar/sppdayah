import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Santri from './pages/Santri';
import Settings from './pages/Settings';
import Payment from './pages/Payment';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="santri" element={<Santri />} />
          <Route path="pembayaran" element={<Payment />} />
          <Route path="laporan" element={<Reports />} />
          <Route path="pengaturan" element={<Settings />} />
          <Route path="profil" element={<Profile />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
