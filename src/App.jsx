import React from "react";
import { Routes, Route, Navigate, HashRouter } from "react-router-dom";

/* === Halaman umum === */
import Home from "./components/Home";
import CRMForm from "./pages/home/FormCrm.jsx"; // tetap ada untuk rute /crm
import Register from "./pages/home/Register.jsx";
import Login from "./pages/home/Login.jsx";

/* === Dashboard & Proteksi === */
import AdminDashboard from "./components/dashboard/AdminDashboard";
import ProtectedRoute from "./components/dashboard/ProtectedRoute.jsx";

/* === Halaman dashboard === */
import Analitik from "./pages/dashboard/Analitik.jsx";
import Iwkbu from "./pages/dashboard/Iwkbu.jsx";
import Iwkl from "./pages/dashboard/Iwkl.jsx";
import Rekap from "./pages/dashboard/Rekap.jsx";
import DataForm from "./pages/dashboard/DataFormCrm.jsx";
import DataFormManifest from "./pages/dashboard/DataFormManifest.jsx";
import FormManifest from "./pages/home/FormManifest.jsx";
import RkJadwal from "./pages/dashboard/RkJadwal.jsx";
import Settings from "./pages/dashboard/Settings.jsx";

/* === Terminal Dashboard (NEW) === */
import Terminal from "./components/dashboard/terminal.jsx";
import NotifikasiTerminal from "./components/dashboard/NotifikasiTerminal.jsx";
import NotifikasiBerkas from "./components/dashboard/NotifikasiBerkas.jsx";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* === Root → Home === */}
        <Route path="/" element={<Home />} />

        {/* === Auth === */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* === CRM Publik === */}
        <Route path="/crm" element={<CRMForm />} />
        {/* === MANIFEST === */}
        <Route path="/manifest" element={<FormManifest />} />
        <Route path="notifikasi-berkas" element={<NotifikasiBerkas />} />
        <Route path="/notifikasiteriminal" element={<NotifikasiTerminal />} />

        {/* === Area Admin (hanya email esga) === */}
        <Route element={<ProtectedRoute allowEmails={["esga@gmail.com"]} />}>
          <Route path="/dashboard/admin" element={<AdminDashboard />}>
            {/* Default index dashboard */}
            <Route index element={<Analitik />} />

            {/* === DATA & INFORMASI === */}
            <Route path="iwkbu" element={<Iwkbu />} />
            <Route path="iwkl" element={<Iwkl />} />
            <Route path="rkcrm" element={<Rekap />} />

            {/* CRM / DTD */}
            <Route path="crm-dtd" element={<DataForm />} />
            {/* === MANIFEST === */}
            <Route path="manifest/data" element={<DataFormManifest />} />

            {/* === PERENCANAAN EVALUASI === */}
            <Route path="rk-jadwal" element={<RkJadwal />} />

            {/* === PENGATURAN === */}
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowEmails={["terminal@gmail.com"]} />}>
          <Route path="/dashboard/terminal" element={<Terminal />} />
        </Route>

        {/* === Fallback 404 → Home === */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
