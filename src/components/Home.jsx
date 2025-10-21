import React from "react";
import "../views/home/HomeStyle.css";
import { Link } from "react-router-dom";
import ChatBot from "../pages/home/ChatBot";

export default function Home() {
  return (
    <>
      {/* ===== Top Header / Navbar ===== */}
      <header className="topbar">
        <div className="container">
          <div className="brand-wrap">
            <img src="/assets/jasaraharja.png" alt="Jasa Raharja" className="jr-logo" />
          </div>

          <nav className="top-actions">
            <Link className="btn ghost small" to="/login">Login</Link>
          </nav>
        </div>
      </header>

      {/* ===== Centered Content ===== */}
      <main className="home kawaii">
        {/* background clouds */}
        <div className="bg sky" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={`cloud-${i}`} className={`cloud c${i + 1}`} />
          ))}
        </div>

        {/* soft kawaii blobs */}
        <div className="bg blobs" aria-hidden>
          <span className="blob yellow"></span>
          <span className="blob blue"></span>
        </div>

        <section className="center-wrap">
          <header className="hero">
            <div className="panel left">
              <h1 className="title">
                Selamat datang di <span className="brand">MOVEON</span>
              </h1>
              <p className="subtitle">
                Sistem digital modern untuk mengelola data dengan cepat, aman, dan interaktif.
              </p>

              {/* ===== Feature Cards - rapi & responsif ===== */}
              <nav className="cards" aria-label="Fitur utama">
                {/* ke form CRM publik */}
                <Link className="card" to="/crm">
                  <div className="icon bubble car-ico" aria-hidden>🚘</div>
                  <div className="info">
                    <h3 className="card-title">Form CRM</h3>
                    <p className="card-desc">Input & kelola data kendaraan</p>
                  </div>
                </Link>

                {/* ke Form Manifest (yang kamu routing ke dashboard/admin/manifest/data) */}
                <Link className="card" to="/manifest">
                  <div className="icon bubble ship-ico" aria-hidden>⛴️</div>
                  <div className="info">
                    <h3 className="card-title">Form Manifest</h3>
                    <p className="card-desc">Isi data manifest kapal</p>
                  </div>
                </Link>

                <Link className="card" to="/notifikasiteriminal">
                  <div className="icon bubble bell-ico" aria-hidden>🚌</div>
                  <div className="info">
                    <h3 className="card-title">Notifikasi Terminal</h3>
                    <p className="card-desc">Lihat & kelola notifikasi terminal</p>
                  </div>
                </Link>

                <Link className="card" to="/notifikasi-berkas">
                  <div className="icon bubble bell-ico" aria-hidden>📋</div>
                  <div className="info">
                    <h3 className="card-title">Notifikasi Berkas</h3>
                    <p className="card-desc">Lihat & kelola notifikasi berkas</p>
                  </div>
                </Link>
              </nav>
            </div>

            <div className="panel right">
              {/* Sparkles (class tetap "rainbow-arc") */}
              <span className="rainbow-arc" aria-hidden />

              <div className="mascot" aria-hidden>
                {/* kawaii bus */}
                <svg viewBox="0 0 180 140" className="bus-svg" aria-hidden="true">
                  <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="6" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="lightblur" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" />
                    </filter>
                  </defs>

                  {/* body */}
                  <rect x="18" y="32" rx="22" ry="22" width="144" height="70" fill="#fff" filter="url(#glow)" />
                  <rect x="28" y="40" rx="16" ry="16" width="124" height="50" fill="#d8ecff" />

                  {/* windows */}
                  <rect x="40" y="46" width="32" height="28" rx="10" fill="#fff" />
                  <rect x="74" y="46" width="32" height="28" rx="10" fill="#fff" />
                  <rect x="108" y="46" width="32" height="28" rx="10" fill="#fff" />

                  {/* face */}
                  <circle className="eye" cx="56" cy="60" r="6" fill="#2d2d2d" />
                  <circle className="eye" cx="124" cy="60" r="6" fill="#2d2d2d" />
                  <path d="M90 64 q6 6 12 0" stroke="#2d2d2d" strokeWidth="4" fill="none" strokeLinecap="round" />

                  {/* headlights */}
                  <circle className="light l-left"  cx="28"  cy="82" r="5" fill="#ffd977" filter="url(#lightblur)" />
                  <circle className="light l-right" cx="152" cy="82" r="5" fill="#ffd977" filter="url(#lightblur)" />

                  {/* road */}
                  <path className="road" d="M18 98 C 48 115, 98 84, 144 96 S 170 110, 170 110"
                        stroke="#ffd977" strokeWidth="6" fill="none" strokeLinecap="round" />

                  {/* wheels */}
                  <g className="wheel w1" transform="translate(66,96)">
                    <circle r="12" fill="#2d2d2d" />
                    <circle r="5" fill="#7fc4ff" />
                  </g>
                  <g className="wheel w2" transform="translate(130,96)">
                    <circle r="12" fill="#2d2d2d" />
                    <circle r="5" fill="#7fc4ff" />
                  </g>
                </svg>
              </div>

              <h2 className="logo">MOVEON</h2>
              <p className="tagline">Mobility Operation and Voyage Engagement Network</p>

              <div className="cta">
                <Link className="btn ghost" to="/login">Login</Link>
                <Link className="btn solid" to="/register">Register</Link>
              </div>
            </div>
          </header>
        </section>
        <div className="chatbot-float">
          <ChatBot />
        </div>
      </main>
    </>
  );
}
