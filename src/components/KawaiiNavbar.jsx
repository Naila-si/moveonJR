import React from "react";
import { NavLink } from "react-router-dom"; // jika tidak pakai React Router, lihat catatan di bawah
import "./KawaiiNavbar.css"; // opsional, atau tempel CSS-nya ke FormCrm.css

const cls = (...a) => a.filter(Boolean).join(" ");

export default function KawaiiNavbar({ active = "Form CRM" }) {
  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // fallback kalau user datang langsung ke halaman ini
      window.location.href = "/";
    }
  };

  const links = [
    { to: "/", label: "Home", icon: "🏠" },
    { to: "/form-crm", label: "Form CRM", icon: "📋" },
    { to: "/form-dtd", label: "Form DTD", icon: "📝" },
    { to: "/login", label: "Login", icon: "🔐" },
  ];

  return (
    <header className="kb-nav-wrap">
      <div className="kb-nav glassy">
        <button
          type="button"
          className="kb-back"
          onClick={goBack}
          aria-label="Kembali ke halaman sebelumnya"
          title="Kembali"
        >
          ←
        </button>

        <div className="kb-brand">
          <span className="sparkle">✨</span>
          <strong>Workspace Lady Pier</strong>
        </div>

        <nav className="kb-links" aria-label="Navigasi utama">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cls("kb-link", (isActive || active === l.label) && "active")
              }
              title={l.label}
            >
              <span className="i">{l.icon}</span>
              <span className="t">{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* bayangan lembut untuk nuansa kawaii */}
      <div className="kb-underline" aria-hidden />
    </header>
  );
}
