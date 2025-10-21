import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // <-- penting untuk HashRouter
import "../../views/home/Login.css";

/* === Dummy Admins (DEV ONLY) === */
const DEFAULT_ADMINS = [
  { name: "Esga",  email: "esga@gmail.com",    password: "moveonesga",  role: "admin" },
  { name: "Dumai", email: "dumaigo@gmail.com", password: "moveondumai", role: "admin" }, //wilayah
  { name: "Terminal", email: "terminal@gmail.com",  password: "moveonterminal",  role: "admin" },
];

// util kecil untuk ambil/simpan admin di localStorage
const ADMIN_KEY = "admins";
const SESSION_KEY = "session";

function seedAdmins() {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    if (!raw) {
      localStorage.setItem(ADMIN_KEY, JSON.stringify(DEFAULT_ADMINS));
      return;
    }
    // merge by email (tambahkan yang belum ada)
    const current = JSON.parse(raw);
    const byEmail = new Map(current.map(u => [u.email.toLowerCase(), u]));
    DEFAULT_ADMINS.forEach(u => {
      const key = u.email.toLowerCase();
      if (!byEmail.has(key)) byEmail.set(key, u);
    });
    localStorage.setItem(ADMIN_KEY, JSON.stringify(Array.from(byEmail.values())));
  } catch {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(DEFAULT_ADMINS));
  }
}

function getAdmins() {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? JSON.parse(raw) : [...DEFAULT_ADMINS];
  } catch {
    return [...DEFAULT_ADMINS];
  }
}

/* === Maskot Boat Bot (asli) === */
function Mascot() {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 110);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mascot-wrap">
      {/* sparkles */}
      <i className="sparkle s1">✦</i>
      <i className="sparkle s2">✧</i>
      <i className="sparkle s3">✦</i>

      <svg viewBox="0 0 360 240" className="mascot-svg" aria-hidden>
        {/* wave bg */}
        <path d="M0 190 Q70 168 140 190 T280 190 T360 190 V240 H0 Z" className="wave-bg"/>
        {/* boat deck */}
        <path d="M50 152 L310 152 L280 182 L80 182 Z" className="boat-top"/>
        <path d="M80 182 L280 182 L268 192 L92 192 Z" className="boat-bottom"/>
        {/* face */}
        <rect x="96" y="78" rx="34" ry="34" width="168" height="88" className="face"/>
        <rect x="112" y="94" rx="22" ry="22" width="136" height="56" className="face-inner"/>
        {/* eyes + highlights */}
        <g className="eyes">
          <g>
            <circle cx="156" cy="121" r={blink ? 2 : 11} className="eye"/>
            <circle cx="153" cy="117" r={blink ? 0 : 3.2} className="eye-hi"/>
          </g>
          <g>
            <circle cx="204" cy="121" r={blink ? 2 : 11} className="eye"/>
            <circle cx="201" cy="117" r={blink ? 0 : 3.2} className="eye-hi"/>
          </g>
        </g>
        {/* smile + blush */}
        <path d="M164 130 q16 14 32 0" className="smile"/>
        <ellipse cx="146" cy="132" rx="14" ry="8.5" className="blush"/>
        <ellipse cx="214" cy="132" rx="14" ry="8.5" className="blush"/>
        {/* tag */}
        <rect x="246" y="62" width="26" height="34" rx="10" className="tag"/>
        {/* wave fg */}
        <path d="M0 202 Q70 178 140 202 T280 202 T360 202" className="wave-fg"/>
      </svg>
    </div>
  );
}

function Input({ label, type = "text", name, value, onChange, placeholder }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
      />
    </label>
  );
}

export default function Login() {
  const navigate = useNavigate(); // <-- gunakan ini untuk redirect
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  // seed dummy admins saat komponen mount (sekali saja)
  useEffect(() => {
    seedAdmins();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");

    // validasi dasar format & panjang
    const valid = /.+@.+\..+/.test(form.email) && form.password.length >= 6;
    if (!valid) return setError("Email/password tidak valid (min. 6 karakter)");

    // cek ke daftar admin lokal
    const admins = getAdmins();
    const admin = admins.find(
      (u) =>
        u.email.toLowerCase() === form.email.toLowerCase() &&
        u.password === form.password
    );

    if (!admin) {
      return setError("Kredensial salah atau bukan akun admin.");
    }

    // simpan sesi dummy (DEV)
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        email: admin.email,
        role: admin.role,
        name: admin.name,
        remember: form.remember,
        ts: Date.now(),
      })
    );

    alert(`Welcome Admin, ${admin.name || admin.email}!`);

    // redirect (HashRouter-friendly)
    const email = admin.email.toLowerCase();
    if (email === "esga@gmail.com") {
      navigate("/dashboard/admin", { replace: true });
    } else if (email === "dumaigo@gmail.com") {
      navigate("/dashboard/dumai", { replace: true });
    } else if (email === "terminal@gmail.com") {            // NEW
      navigate("/dashboard/terminal", { replace: true });    // sesuaikan rute yang kamu punya
    } else {
      navigate("/login", { replace: true });
    }
  };

  /* === Back handler === */
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="sky-login">
      {/* tombol BACK mengambang */}
      <button
        type="button"
        className="btn-back"
        onClick={handleBack}
        aria-label="Kembali"
        title="Kembali"
      >
        <span className="arrow">←</span>
        <span className="txt">Back</span>
      </button>

      {/* LAYERED SKY DECOR */}
      <div className="sun" aria-hidden />
      <div className="cloud c1" aria-hidden />
      <div className="cloud c2" aria-hidden />
      <div className="cloud c3" aria-hidden />
      <div className="stars" aria-hidden>
        {Array.from({length:18}).map((_,i)=>(<i key={i} style={{'--d':`${i*0.25}s`}} />))}
      </div>
      <div className="birds" aria-hidden>
        <span className="b b1">〰︎</span>
        <span className="b b2">〰︎</span>
        <span className="b b3">〰︎</span>
      </div>
      <div className="balloon bl1" aria-hidden>🎈</div>
      <div className="balloon bl2" aria-hidden>🎈</div>

      {/* GRID */}
      <div className="grid">
        {/* LEFT: hero sky + mascot */}
        <section className="left-hero">
          <span className="hero-badge">MOVEON</span>
          <Mascot />
          <h1 className="hero-title">Hai, selamat datang! ☀️</h1>
          <p className="hero-sub">
            Langit biru & sinar kuning untuk mood cerah. Yuk login dan berlayar bareng <b>Boat Bot</b>~
          </p>
        </section>

        {/* RIGHT: fluffy ticket card */}
        <section className="right-card">
          <div className="ticket">
            <div className="perforation" aria-hidden />
            <div className="ticket-head">
              <div className="ticket-tag">Masuk</div>
              <div className="ticket-dot" />
            </div>

            <form onSubmit={onSubmit} className="ticket-body" noValidate>
              <div className="card-head">
                <span className="avatar" aria-hidden>
                  <svg viewBox="0 0 24 24" className="avatar-face">
                    <circle cx="9" cy="10" r="2" />
                    <circle cx="15" cy="10" r="2" />
                    <path d="M8.8 13.6 q3.2 2.6 6.4 0" fill="none" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </span>
                <div>
                  <h2 className="card-title">Masuk Akun</h2>
                  <p className="card-sub">Langit cerah, semangat penuh! 💛💙</p>
                </div>
              </div>

              <div className="vstack">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="kamu@contoh.com"
                />
                <label className="field">
                  <span className="field-label">Password</span>
                  <div className="pw">
                    <input
                      className="pw-input"
                      type={showPw ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="pw-toggle"
                      aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPw ? "Sembunyi" : "Lihat"}
                    </button>
                  </div>
                </label>

                <div className="row between">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={form.remember}
                      onChange={handleChange}
                    />
                    <span>Ingat saya</span>
                  </label>
                  <button type="button" className="link">Lupa password?</button>
                </div>

                {error && <div className="alert">{error}</div>}

                <button type="submit" className="btn-primary">Masuk</button>

                <div className="divider"><span>atau</span></div>

                <div className="grid-2">
                  <button type="button" className="btn-alt">Google</button>
                  <button type="button" className="btn-alt">GitHub</button>
                </div>
              </div>

              <p className="foot">
                Belum punya akun? <a className="link" href="#/register">Daftar</a>
              </p>
            </form>

            <div className="ticket-foot">
              <span className="mini">✨ Pastel Sky — Blue × Yellow ✨</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
