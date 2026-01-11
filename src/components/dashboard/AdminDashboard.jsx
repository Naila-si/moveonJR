import React, { useState, useMemo, useEffect } from "react";
import { NavLink, useNavigate, Outlet, useLocation } from "react-router-dom";
import { ProfileProvider, useProfile, initialsFrom } from "../../context/ProfileContext";

const JR_LOGO = "/assets/jasaraharja.png";
const SESSION_KEY = "session";

/* ================== Icons ================== */
const Icon = {
  dashboard: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M10 4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h6z"/>
    </svg>
  ),
  truckBus: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M3 7h10v8H3zM17 9h3l2 3v3h-5zM7 19a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4z"/>
    </svg>
  ),
  ship: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M20 12l-8-3-8 3 2 7h12l2-7zM12 3l4 6H8l4-6z"/>
    </svg>
  ),
  table: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M3 5h18v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2 2v4h14V7H5zm0 6v6h6v-6H5zm8 0v6h6v-6h-6z"/>
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M4 6h2v2H4V6zm0 5h2v2H4v-2zm0 5h2v2H4v-2zM8 6h12v2H8V6zm0 5h12v2H8v-2zm0 5h12v2H8v-2z"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a2 2 0 012 2v13a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h3V2zm13 8H4v9h16v-9z"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M19.1 12.9a7.4 7.4 0 000-1.8l2-1.6a.5.5 0 00.1-.6l-2-3.5a.5.5 0 00-.6-.2l-2.5 1a7.4 7.4 0 00-1.6-.9l-.4-2.6a.5.5 0 00-.5-.4h-2.4a.5.5 0 00-.5.4L9 4.6a7.4 7.4 0 00-1.6.9l-2.5-1a.5.5 0 00-.6.2l-2 3.5a.5.5 0 00.1.6l2 1.6a7.4 7.4 0 000 1.8l-2 1.6a.5.5 0 00-.1.6l2 3.5a.5.5 0 00.6.2l2.5-1a7.4 7.4 0 001.6.9l.4 2.6a.5.5 0 00.5.4h2.4a.5.5 0 00.5-.4l.4-2.6a7.4 7.4 0 001.6-.9l2.5 1a.5.5 0 00.6-.2l2-3.5a.5.5 0 00-.1-.6l-2-1.6zM12 15.5A3.5 3.5 0 1115.5 12 3.5 3.5 0 0112 15.5z"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 10-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zM10 15a5 5 0 110-10 5 5 0 010 10z"/>
    </svg>
  ),
  chevron: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <path fill="currentColor" d="M9 6l6 6-6 6"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M16 13v-2H7V8l-5 4 5 4v-3h9zm3-10H11a2 2 0 00-2 2v3h2V5h8v14h-8v-3H9v3a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2z"/>
    </svg>
  ),
};

/* ================== Sub-komponen sidebar ================== */
function Section({ title, collapsed }) {
  return <div className={`sb-section ${collapsed ? "hide" : ""}`}>{title}</div>;
}
function Item({ to = "#", icon, label, onClick, end, collapsed }) {
  const Comp = to ? NavLink : "button";
  const props = to
    ? { to, end, className: ({ isActive }) => `sb-item ${isActive ? "active" : ""}`, title: collapsed ? label : undefined }
    : { className: "sb-item", onClick, title: collapsed ? label : undefined };
  return (
    <Comp {...props}>
      <span className="sb-icon">{icon}</span>
      <span className={`sb-label ${collapsed ? "hide" : ""}`}>{label}</span>
    </Comp>
  );
}
function Folder({ label, children, defaultOpen = true, collapsed }) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (collapsed) setOpen(false);
  }, [collapsed]);
  
  return (
    <div className="sb-folder" title={collapsed ? label : undefined}>
      <button type="button" className="sb-item" onClick={() => setOpen(o => !o)}>
        <span className="sb-icon">{Icon.folder}</span>
        <span className={`sb-label ${collapsed ? "hide" : ""}`}>{label}</span>
        {!collapsed && <span className={`caret ${open ? "open" : ""}`}>{Icon.chevron}</span>}
      </button>
      <div className={`sb-sub ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
        {React.Children.map(children, child =>
          React.cloneElement(child, { collapsed })
        )}
      </div>
    </div>
  );
}

/* ========== Avatar header tersinkron dari ProfileContext ========== */
function HeaderAvatar() {
  const { profile } = useProfile();
  const ini = initialsFrom(profile.name);
  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={profile.name}
        style={{
          width: 36, height: 36, borderRadius: "999px",
          objectFit: "cover", border: "2px solid #a9cbee",
          boxShadow: "0 4px 10px rgba(15,33,79,.08)"
        }}
      />
    );
  }
  return (
    <div
      title={profile.name}
      style={{
        width: 36, height: 36, borderRadius: "999px",
        display: "grid", placeItems: "center",
        background: "linear-gradient(180deg,#edf4ff,#ffffff)",
        border: "2px solid #a9cbee", fontWeight: 900, color: "#1c3b5c"
      }}
    >
      {ini}
    </div>
  );
}

/* ================== Halaman ================== */
function DashboardInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sb_collapsed");
    return saved ? saved === "1" : false;
  });

  const titleMap = [
    { path: "/dashboard/admin/iwkbu", label: "Data IWKBU 🚍" },
    { path: "/dashboard/admin/iwkl", label: "Data IWKL 🚢" },
    { path: "/dashboard/admin/rkcrm", label: "RK CRM 📊" },
    { path: "/dashboard/admin/crm-dtd", label: "CRM/DTD 📑" },
    { path: "/dashboard/admin/manifest/data", label: "Manifest 🧾" },
    { path: "/dashboard/admin/rk-jadwal", label: "RK Jadwal 📅" },
    { path: "/dashboard/admin/settings", label: "Settings ⚙️" },
  ];

  const pageTitle =
    titleMap.find(t => location.pathname.startsWith(t.path))?.label || "Dasbor ✨";

  useEffect(() => {
    localStorage.setItem("sb_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // keyboard shortcut: Ctrl/Cmd + B
  useEffect(() => {
    const onKey = (e) => {
      const isMeta = e.ctrlKey || e.metaKey;
      if (isMeta && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    navigate("/login", { replace: true });
  };

  const content = useMemo(() => {
    if (!search) return (
      <div className="empty-state" role="status" aria-live="polite">
        <div className="mascot" aria-hidden>✨</div>
        <h2>Selamat Datang kembali!</h2>
        {/* <p>
          Pilih menu di kiri yaa. Kalau bingung, ketik aja di pencarian.
          Semoga harimu secerah langit Jasa Raharja ☁️💙
        </p> */}

        <div className="quick-actions" role="group" aria-label="Aksi cepat">
          <button onClick={() => navigate("iwkbu")} className="qa">
            <span>Ke IWKBU</span> <span aria-hidden>🚍</span>
          </button>
          <button onClick={() => navigate("rk-jadwal")} className="qa">
            <span>Lihat Jadwal</span> <span aria-hidden>📅</span>
          </button>
        </div>
      </div>
    );
    return (
      <div className="search-result" role="region" aria-label="Hasil pencarian">
        <h3>Hasil pencarian “{search}”</h3>
        <ul className="result-list">
          <li><span className="dot"/><b>Dashboard</b></li>
          <li><span className="dot"/><b>Data</b>: IWKBU, IWKL, RK CRM, CRM/DTD Data, Manifest</li>
          <li><span className="dot"/><b>RK Jadwal</b></li>
          <li><span className="dot"/><b>Settings</b></li>
        </ul>
      </div>
    );
  }, [search]);

  const isChildRouteActive = /\/dashboard\/admin\/.+/.test(location.pathname);

  return (
    <>
      {/* ===== CSS ===== */}
      <style>{`
:root{
  --primary:#C4DEF7;
  --p10:#f7fbff; --p25:#f0f7ff; --p50:#eaf4ff; --p100:#e1eeff; --p200:#d7e7fb; --p300:#cfe3f9; --p400:#c9dff7; --p500:#C4DEF7; --p600:#a9cbee;
  --ink:#0E2A43; --muted:#5b6e87;
  --glass: rgba(255,255,255,.9);
  --card: #fff;
  --ring: rgba(196,222,247,.36);
  --border:#e6f0fb;
  --shadow: 0 12px 34px rgba(15,33,79,.08);
}

*{box-sizing:border-box}

/* Layout grid */
.app-wrap{ min-height:100vh; display:grid; grid-template-columns: 292px 1fr; background:linear-gradient(180deg,var(--p25),#fff 60%,var(--p10)); }
.app-wrap.collapsed{ grid-template-columns: 84px 1fr }

/* Sidebar */
.sidebar{ position:sticky; top:0; height:100vh; overflow:auto; padding:14px; border-right:1px solid var(--border); background:linear-gradient(180deg, rgba(196,222,247,.55), rgba(196,222,247,.35)); }
/* ===== Brand / Logo area ===== */
.brand{
  display:flex; align-items:center; gap:12px;
  padding:12px;
  border-radius:18px;
  background: linear-gradient(180deg,#ffffff,#f6fbff);
  border:1px solid var(--border);
  box-shadow: 0 10px 22px rgba(15,33,79,.06);
  position: relative;
}

.logo-wrap{
  width:54px; height:54px;
  border-radius:16px;
  display:grid; place-items:center;
  background:#fff;
  border:1px solid #e5effb;
  position: relative;
  overflow: hidden;
}

.logo-ring{
  position:absolute; inset:-40%;
  background:
    radial-gradient(circle at 30% 30%, rgba(196,222,247,1) 0%, transparent 55%),
    radial-gradient(circle at 70% 70%, rgba(169,203,238,1) 0%, transparent 60%);
  opacity:.9;
  filter: blur(12px);
  animation: logoFloat 5s ease-in-out infinite alternate;
}

@keyframes logoFloat{
  from{ transform: translateY(2px); }
  to{ transform: translateY(-2px); }
}

.logo-img{
  width:40px; height:40px;
  object-fit: contain;
  z-index:1;
  filter: drop-shadow(0 4px 6px rgba(15,33,79,.12));
}

/* teks brand */
.brand-name{
  display:flex; flex-direction:column;
  line-height:1.05;
}
.brand-name strong{
  font-size:14px;
  letter-spacing:.3px;
  color:#0f2b4b;
  font-weight:900;
}
.brand-sub{
  font-size:11px;
  color:#5b6e87;
  font-weight:700;
  margin-top:2px;
}

/* saat collapsed: brand dipusatkan */
.app-wrap.collapsed .brand{
  justify-content:center;
  padding:10px;
}
.app-wrap.collapsed .brand-name{ display:none; }
.brand-name{ display:flex; flex-direction:column; line-height:1.05 }
.brand-name strong{ font-size:13px; letter-spacing:.25px }
.brand-sub{ font-size:11px; opacity:.8 }
.app-wrap.collapsed .brand-name{ display:none }

/* Sidebar items */
.sb-section{ margin:16px 10px 8px; font-size:12px; letter-spacing:.4px; font-weight:800; opacity:.95; color:#1f3b59 }
.sb-section.hide{ display:none }
.sb-item{
  width:100%; display:flex; align-items:center; gap:10px;
  padding:12px 12px; margin:6px 6px; border-radius:14px;
  color:#103252; background:#fff; border:1px solid var(--border);
  text-decoration:none; cursor:pointer;
  transition: background .15s, box-shadow .15s, transform .15s, border-color .15s;
  position: relative;
  overflow: hidden;
}
.sb-item::after{
  content:"";
  position:absolute; inset:-40%;
  background: radial-gradient(circle, rgba(196,222,247,.9) 0%, transparent 55%);
  opacity:0; transform: translateY(20px);
  transition: .25s ease;
}
.sb-item:hover{
  background:var(--card);
  transform:translateY(-2px);
  box-shadow:0 10px 18px rgba(15,33,79,.10);
  border-color:#dbeafe;
}
.sb-item:hover::after{
  opacity:.6; transform: translateY(0);
}

.sb-item.active{
  box-shadow:0 10px 22px rgba(15,33,79,.12);
  border-color:#fff;
  background: linear-gradient(180deg,#ffffff,#f6fbff);
}
.sb-icon{ display:grid; place-items:center; width:22px }
.sb-label.hide{ display:none }
.caret{ margin-left:auto; opacity:.85 }
.sb-sub{ max-height:0; overflow:hidden; transition:max-height .18s ease; margin-left:10px }
.sb-sub.open{ max-height:640px }
.sb-sub.collapsed{ margin-left:0 } /* biar rapat saat collapsed */
.app-wrap.collapsed .sb-label{ display:none }

/* Sidebar footer */
.logout{ width:calc(100% - 12px); margin:12px 6px 6px; display:flex; align-items:center; gap:10px; justify-content:center; padding:10px 12px; border-radius:12px; border:1px solid var(--border); background:#fff; color:#0f172a; font-weight:800 }
.app-wrap.collapsed .logout .sb-label{ display:none }

/* Content */
.content{ padding:16px }
.topbar{ display:flex; align-items:center; gap:12px; justify-content:space-between; padding:12px; border-radius:16px; background:var(--glass); border:1px solid var(--border); box-shadow: var(--shadow) }
.topbar-left{ display:flex; align-items:center; gap:14px }
.topbar h1{ margin:0; font-size:22px; color:#0f2b4b; font-weight:900 }
.search{ flex:1; display:flex; align-items:center; gap:10px; background:#fff; border:1px solid var(--border); border-radius:999px; padding:8px 12px; max-width:760px }
.search input{ flex:1; border:0; outline:none; background:transparent; color:#0f172a }
.search-icon{ color:#5b6b86; display:grid; place-items:center }
.topbar-right{ display:flex; align-items:center; gap:10px }

.page{ margin-top:14px; min-height: calc(100vh - 120px); background: var(--card); border:1px solid var(--border); border-radius:22px; padding:18px; box-shadow: var(--shadow) }

/* Empty / search states */
.empty-state{ text-align:center; padding:64px 12px; color:#334155 }
.search-result h3{ margin:6px 0 10px; color:#0f172a }
.result-list{ display:grid; gap:6px; padding-left:6px }
.result-list .dot{ width:8px; height:8px; border-radius:999px; background:var(--p600); display:inline-block; margin-right:8px }

/* Responsive */
@media (max-width: 980px){ .app-wrap{ grid-template-columns: 84px 1fr } .sb-label{ display:none } .brand-name{ display:none } }
@media (max-width: 640px){ .search{ max-width:none } .topbar{ flex-wrap: wrap; gap:10px } }

/* ===== Collapse toggle button ===== */
.collapse-btn{
  width:34px; height:34px; border:1px solid var(--border);
  border-radius:10px; background:#fff; display:inline-grid; place-items:center;
  box-shadow: var(--shadow); cursor:pointer; transition:transform .12s, background .12s;
}
.collapse-btn:hover{ transform: translateY(-1px); }
.collapse-btn .bar{
  width:16px; height:2px; background:#0f2b4b; border-radius:2px; display:block;
  position:relative;
}
.collapse-btn .bar + .bar{ margin-top:3px; }
.collapse-btn .bar.rot:nth-child(1){ transform:translateY(5px) rotate(45deg); }
.collapse-btn .bar.rot:nth-child(2){ opacity:0; }
.collapse-btn .bar.rot:nth-child(3){ transform:translateY(-5px) rotate(-45deg); }

.page-inner{
  max-width: 1100px;  /* ubah angka sesuai kebutuhan */
  width: 100%;
  margin: 0 auto;     /* supaya ketengah */
}
/* ===== Fun background blobs ===== */
.fun-bg{
  position: fixed;
  inset: -10% -10% auto auto;
  width: 520px;
  height: 520px;
  background: radial-gradient(circle at 30% 30%, #d8ecff 0%, transparent 55%),
              radial-gradient(circle at 70% 60%, #c4def7 0%, transparent 60%),
              radial-gradient(circle at 40% 70%, #e9f4ff 0%, transparent 55%);
  filter: blur(18px);
  opacity: .9;
  z-index: 0;
  pointer-events: none;
  animation: floaty 12s ease-in-out infinite alternate;
}

.fun-bg.fun-bg-2{
  inset: auto auto -12% -12%;
  width: 560px;
  height: 560px;
  opacity: .75;
  animation-duration: 16s;
}

@keyframes floaty{
  0%{ transform: translate(0,0) rotate(0deg); }
  100%{ transform: translate(-24px, 18px) rotate(8deg); }
}
  .chip{
  font-size:12px; font-weight:800; color:#0f2b4b;
  background: #fff;
  border:1px dashed #a9cbee;
  padding:6px 10px; border-radius:999px;
  box-shadow: 0 6px 14px rgba(15,33,79,.06);
}
.mascot{
  width:72px; height:72px; margin:0 auto 10px;
  display:grid; place-items:center;
  font-size:34px;
  background: radial-gradient(circle at 30% 30%, #fff, #eaf4ff);
  border:1px solid var(--border);
  border-radius:18px;
  box-shadow: var(--shadow);
  animation: pop 1.8s ease-in-out infinite;
}
@keyframes pop{
  0%,100%{ transform: translateY(0) rotate(0deg); }
  50%{ transform: translateY(-4px) rotate(4deg); }
}

.quick-actions{
  margin-top:14px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;
}
.qa{
  border:1px solid var(--border);
  background:#fff; padding:8px 12px; border-radius:999px;
  font-weight:800; cursor:pointer;
  box-shadow: 0 8px 16px rgba(15,33,79,.06);
  transition: .15s ease;
}
.qa:hover{ transform: translateY(-2px); background: var(--p25); }
.page-anim{
  animation: pageIn .22s ease;
}
@keyframes pageIn{
  from{ opacity:0; transform: translateY(6px); }
  to{ opacity:1; transform: translateY(0); }
}
.search:focus-within{
  box-shadow: 0 0 0 4px var(--ring);
  border-color:#cfe3f9;
}
.app-wrap.collapsed .sidebar:hover .brand{
  justify-content:flex-start;
  padding:12px;
}
  /* FIX: quick action text ga kelihatan */
.empty-state .quick-actions{
  margin-top:14px;
  display:flex;
  gap:10px;
  justify-content:center;
  flex-wrap:wrap;
}

.empty-state .quick-actions .qa{
  appearance: none;
  -webkit-appearance: none;
  border:1px solid var(--border);
  background:#fff;
  padding:10px 14px;
  border-radius:999px;

  /* ini yang penting */
  color:#0f2b4b !important;
  font-size:13px !important;
  font-weight:900 !important;
  line-height:1 !important;
  text-decoration:none !important;

  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;

  min-width:160px;
  box-shadow: 0 8px 16px rgba(15,33,79,.06);
  cursor:pointer;
  transition:.15s ease;
}

.empty-state .quick-actions .qa:hover{
  transform: translateY(-2px);
  background: var(--p25);
}
      `}</style>

      <div className={`app-wrap ${collapsed ? "collapsed" : ""}`}>
        {/* ===== Sidebar ===== */}
        <aside className="sidebar">
         <div className="brand" role="banner">
          <div className="logo-wrap">
            <div className="logo-ring" aria-hidden />
            <img
              src={JR_LOGO}
              alt="Logo Jasa Raharja"
              className="logo-img"
              loading="lazy"
            />
          </div>

          {/* teks brand cuma muncul kalau sidebar nggak collapsed */}
          {!collapsed && (
            <div className="brand-name">
              <strong>Jasa Raharja</strong>
              <span className="brand-sub">Dashboard Administrasi</span>
            </div>
          )}
        </div>

          <Item to="." end icon={Icon.dashboard} label="Dasbor" collapsed={collapsed} />

          <Section title="DATA & INFORMASI" collapsed={collapsed} />

          {/* Folder Data -> sub items */}
          <Folder label="Data" defaultOpen={false} collapsed={collapsed}>
            <Item to="iwkbu" icon={Icon.truckBus} label="Data IWKBU" collapsed={collapsed} />
            <Item to="iwkl"  icon={Icon.ship}     label="Data IWKL"  collapsed={collapsed} />
            {/* <Item to="rkcrm" icon={Icon.table}    label="Data RK CRM" collapsed={collapsed} /> */}
            <Item to="crm-dtd" icon={Icon.table}  label="CRM/DTD Data" collapsed={collapsed} />
            <Item to="manifest/data" icon={Icon.list}  label="Data Manifest" collapsed={collapsed} />
          </Folder>

          <Section title="PERENCANAAN EVALUASI" collapsed={collapsed} />
          <Item to="rk-jadwal" icon={Icon.calendar} label="RK Jadwal" collapsed={collapsed} />

          {/* <Section title="LAINNYA" collapsed={collapsed} />
          <Item to="settings" icon={Icon.settings} label="Settings" collapsed={collapsed} /> */}

          <button type="button" className="logout" onClick={onLogout} title="Keluar">
            {Icon.logout} <span className="sb-label">Keluar</span>
          </button>
        </aside>

        {/* ===== Content ===== */}
        <main className="content">
          <header className="topbar" role="navigation" aria-label="Navigasi atas">
            <div className="topbar-left">
              <button
                type="button"
                className="collapse-btn"
                aria-label={collapsed ? "Buka sidebar" : "Sembunyikan sidebar"}
                aria-pressed={collapsed}
                onClick={() => setCollapsed((v) => !v)}
                title={`${collapsed ? "Buka" : "Sembunyikan"} sidebar (Ctrl/Cmd + B)`}
              >
                {/* icon hamburger/chevron */}
                <span className={`bar ${collapsed ? "rot" : ""}`} />
                <span className={`bar ${collapsed ? "rot" : ""}`} />
                <span className={`bar ${collapsed ? "rot" : ""}`} />
              </button>
              <h1>{pageTitle}</h1>
              <span className="chip">Admin Mode</span>
            </div>
            {/* <div className="search" role="search">
              <span className="search-icon">{Icon.search}</span>
              <input
                type="text"
                placeholder="Cari menu… (contoh: manifest)"
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                aria-label="Cari menu"
              />
            </div> */}
            <div className="topbar-right">
              {/* Avatar header dari context (auto update setelah Simpan Profil) */}
              <HeaderAvatar />
            </div>
          </header>

          <section className="page">
            <div className="page-inner page-anim">
              <Outlet />
              {!isChildRouteActive && content}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

/* ===== Export utama: bungkus dengan ProfileProvider supaya header bisa sinkron ===== */
export default function AdminDashboard() {
  return (
    <ProfileProvider>
      <DashboardInner />
    </ProfileProvider>
  );
}
