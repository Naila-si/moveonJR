import React, { useState, useEffect } from "react";
import "../../views/home/Register.css";

/* === Mascot: Paper Plane v2 (lebih jelas bentuk pesawat) === */
function Mascot() {
  const [t, setT] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setT((v) => (v >= 360 ? 0 : v + 2)), 16);
    return () => clearInterval(id);
  }, []);

  // kecilkan ayunan + tilt halus
  const bobY = Math.sin((t / 180) * Math.PI) * 4; // -4..4
  const tilt = Math.sin((t / 180) * Math.PI) * 6; // -6..6

  return (
    <div className="mascot-wrap">
      {/* sparkles */}
      <i className="sparkle s1">✦</i>
      <i className="sparkle s2">✧</i>
      <i className="sparkle s3">✦</i>

      <svg viewBox="0 0 360 240" className="mascot-svg" aria-hidden>
        {/* gelombang latar */}
        <path d="M0 188 Q70 166 140 188 T280 188 T360 188 V240 H0 Z" className="wave-bg" />

        {/* jejak pesawat */}
        <path
          d="M28 160 C80 156, 110 140, 150 150 S240 180, 320 140"
          className="plane-trail"
        />

        {/* pesawat kertas */}
        <g
          className="plane"
          style={{
            transformOrigin: "220px 110px",
            transform: `translateY(${bobY}px) rotate(${tilt}deg)`,
          }}
        >
          {/* bayangan lembut */}
          <ellipse cx="238" cy="148" rx="30" ry="8" className="plane-shadow" />

          {/* badan (kertas dilipat) */}
          <path d="M190 94 L306 118 L206 132 Z" className="plane-body-top" />
          <path d="M206 132 L306 118 L230 152 Z" className="plane-body-bottom" />
          {/* lipatan tengah */}
          <path d="M190 94 L230 152" className="plane-fold" />

          {/* sayap atas */}
          <path d="M210 110 L266 100 L226 130 Z" className="plane-wing-top" />
          {/* sayap bawah (ekor kecil) */}
          <path d="M214 132 L236 150 L216 148 Z" className="plane-tail" />

          {/* jendela/face kecil supaya tetap cute */}
          <g className="plane-face" transform="translate(248,118)">
            <circle cx="0" cy="0" r="2.2" />
            <path d="M6 -0.4 q1.6 1.6 3.2 0" fill="none" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        </g>

        {/* tag kecil */}
        <rect x="246" y="52" width="26" height="34" rx="10" className="tag" />

        {/* gelombang depan */}
        <path d="M0 202 Q70 178 140 202 T280 202 T360 202" className="wave-fg" />
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

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    agree: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    if (form.name.trim().length < 2) return "Nama minimal 2 karakter.";
    if (!/.+@.+\..+/.test(form.email)) return "Format email tidak valid.";
    if (form.password.length < 6) return "Password minimal 6 karakter.";
    if (form.password !== form.confirm) return "Konfirmasi password tidak sama.";
    if (!form.agree) return "Kamu harus menyetujui Syarat & Kebijakan.";
    return "";
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);
    setError("");
    alert(`Akun untuk ${form.name} (${form.email}) berhasil dibuat!`);
  };

  const handleBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = "/";
  };

  // skor password sederhana (panjang)
  const pwScore = Math.min(100, form.password.length * 12.5);

  return (
    <div className="sky-login">
      {/* tombol BACK */}
      <button type="button" className="btn-back" onClick={handleBack} aria-label="Kembali" title="Kembali">
        <span className="arrow">←</span>
        <span className="txt">Back</span>
      </button>

      {/* dekor */}
      <div className="sun" aria-hidden />
      <div className="cloud c1" aria-hidden />
      <div className="cloud c2" aria-hidden />
      <div className="cloud c3" aria-hidden />
      <div className="stars" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <i key={i} style={{ "--d": `${i * 0.25}s` }} />
        ))}
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
        {/* LEFT */}
        <section className="left-hero">
          <span className="hero-badge">MOVEON</span>
          <Mascot />
          <h1 className="hero-title">Yuk, mulai perjalananmu! ✈️</h1>
          <p className="hero-sub">
            Langit pastel & pesawat kertas siap mengantar akun barumu. Saatnya
            <b> daftar</b> dan terbang tinggi bersama <b>Paper Plane Pal</b>~
          </p>
        </section>

        {/* RIGHT */}
        <section className="right-card">
          <div className="ticket">
            <div className="perforation" aria-hidden />
            <div className="ticket-head">
              <div className="ticket-tag">Daftar</div>
              <div className="ticket-dot" />
            </div>

            <form onSubmit={onSubmit} className="ticket-body" noValidate>
              <div className="card-head">
                <span className="avatar" aria-hidden>
                  <svg viewBox="0 0 24 24" className="avatar-face">
                    <circle cx="9" cy="10" r="2" />
                    <circle cx="15" cy="10" r="2" />
                    <path d="M8.8 13.6 q3.2 2.6 6.4 0" fill="none" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                <div>
                  <h2 className="card-title">Buat Akun</h2>
                  <p className="card-sub">Satu langkah kecil, terbang jauh 🚀</p>
                </div>
              </div>

              <div className="vstack">
                <Input label="Nama Lengkap" name="name" value={form.name} onChange={handleChange} placeholder="Alya Nur" />
                <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="kamu@contoh.com" />

                {/* Password */}
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
                  <div className="pw-meter" aria-hidden><span style={{ width: `${pwScore}%` }} /></div>
                  <small className="hint">Minimal 6 karakter</small>
                </label>

                {/* Confirm */}
                <label className="field">
                  <span className="field-label">Konfirmasi Password</span>
                  <div className="pw">
                    <input
                      className="pw-input"
                      type={showPw2 ? "text" : "password"}
                      name="confirm"
                      value={form.confirm}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw2((s) => !s)}
                      className="pw-toggle"
                      aria-label={showPw2 ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showPw2 ? "Sembunyi" : "Lihat"}
                    </button>
                  </div>
                </label>

                <label className="checkbox">
                  <input type="checkbox" name="agree" checked={form.agree} onChange={handleChange} />
                  <span>
                    Saya setuju dengan <a className="link" href="#">Syarat</a> & <a className="link" href="#">Kebijakan</a>.
                  </span>
                </label>

                {error && <div className="alert">{error}</div>}

                <button type="submit" className="btn-primary">Buat Akun</button>

                <div className="divider"><span>atau</span></div>

                <div className="grid-2">
                  <button type="button" className="btn-alt">Google</button>
                  <button type="button" className="btn-alt">GitHub</button>
                </div>
              </div>

              <p className="foot">Sudah punya akun? <a className="link" href="#">Masuk</a></p>
            </form>

            <div className="ticket-foot">
              <span className="mini">✨ Pastel Sky — Paper Plane Edition ✨</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
