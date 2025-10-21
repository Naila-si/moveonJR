// src/pages/dashboard/Settings.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProfile } from "../../context/ProfileContext";

/* ===== Cinnamoroll palette ===== */
const CINNA = {
  sky: "#C4DEF7",
  skySoft: "#F3F8FF",
  cloud: "#FFFFFF",
  border: "#E6F0FB",
  ink: "#143A59",
  muted: "#6C7B93",
  blush: "#FFDDEB",
};

function initialsFrom(name = "") {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "AD";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function Settings() {
  const { profile, updateProfile } = useProfile();
  const fileRef = useRef(null);

  /* form state */
  const [name, setName] = useState(profile.name ?? "");
  const [title, setTitle] = useState(profile.role ?? profile.title ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [toast, setToast] = useState(null); // {type:'ok'|'err', text:string}

  /* password */
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const preview = useMemo(() => avatarUrl || "", [avatarUrl]);
  const liveInitials = useMemo(() => initialsFrom(name), [name]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  function pickFile() { fileRef.current?.click(); }
  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(png|jpe?g|webp)/i.test(file.type)) {
      setToast({ type: "err", text: "Pilih gambar PNG/JPG/WEBP ya ✨" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  }
  function clearAvatar() {
    setAvatarUrl("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function validateEmail(v) {
    if (!v) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function saveProfile() {
    if (!validateEmail(email)) {
      setToast({ type: "err", text: "Format email tidak valid." });
      return;
    }
    updateProfile({
      name: name.trim() || "Admin",
      role: title.trim(),
      email: email.trim(),
      phone: phone.trim(),
      bio,
      avatarUrl: preview,
    });
    setToast({ type: "ok", text: "Profil tersimpan & header disinkronkan." });
  }

  function savePassword(e) {
    e.preventDefault();
    if (newPw.length < 8)
      return setToast({ type: "err", text: "Kata sandi baru min. 8 karakter." });
    if (newPw !== confirmPw)
      return setToast({ type: "err", text: "Konfirmasi kata sandi tidak cocok." });
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setToast({ type: "ok", text: "Kata sandi tersimpan." });
  }

  function resetProfile() {
    setName(profile.name ?? "");
    setTitle(profile.role ?? profile.title ?? "");
    setEmail(profile.email ?? "");
    setPhone(profile.phone ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatarUrl ?? "");
    setToast({ type: "ok", text: "Form direset." });
  }

  return (
    <>
      {/* ===== styles ===== */}
      <style>{`
:root{
  --ink:${CINNA.ink}; --muted:${CINNA.muted}; --sky:${CINNA.sky};
  --skySoft:${CINNA.skySoft}; --cloud:${CINNA.cloud}; --border:${CINNA.border}; --blush:${CINNA.blush};
}
.settings-wrap{display:grid; gap:16px}

/* Header */
.head{
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  background:var(--cloud); border:1px solid var(--border); border-radius:22px; padding:14px 16px;
  position:sticky; top:0; z-index:1; box-shadow:0 18px 42px rgba(20,58,89,.05)
}
.head h2{margin:0; font-size:22px; color:var(--ink)}
.head p{margin:0; color:var(--muted); font-size:13px}

/* Cloud cards */
.card{
  background:linear-gradient(180deg,var(--cloud),var(--skySoft));
  border:1px solid var(--border); border-radius:22px; padding:16px;
  box-shadow:0 20px 50px rgba(20,58,89,.07)
}

/* Stack all sections vertically */
.stack{ display:flex; flex-direction:column; gap:16px }

/* Tiny header preview */
.header-preview{ display:flex; align-items:center; gap:10px; background:var(--cloud);
  border:1px solid var(--border); border-radius:999px; padding:6px 10px }
.header-preview .thumb{ width:28px; height:28px; border-radius:999px; overflow:hidden;
  border:2px solid var(--sky); display:grid; place-items:center; font-weight:900; color:#1a4a75; background:var(--skySoft) }
.header-preview .thumb img{ width:100%; height:100%; object-fit:cover }
.header-preview .name{ font-weight:800; color:#1a4a75 }

/* Badge dengan animasi lembut */
.badge{
  display:inline-flex; align-items:center; gap:8px; padding:6px 12px;
  border:1px solid var(--border); border-radius:999px; background:var(--skySoft);
  color:#1a4a75; font-weight:900; font-size:12px
}
.badge i{ font-style:normal; animation:float 4.5s ease-in-out infinite }
@keyframes float{ 0%,100%{ transform:translateY(0)} 50%{ transform:translateY(-5px)} }

/* Avatar */
.avatar-wrap{ display:flex; align-items:center; gap:16px; flex-wrap:wrap }
.avatar{
  width:100px; height:100px; border-radius:999px; overflow:hidden;
  border:3px solid var(--sky); background:var(--skySoft);
  display:grid; place-items:center; color:#1a4a75; font-weight:900; position:relative;
  box-shadow:0 10px 26px rgba(20,58,89,.08)
}
.avatar::before, .avatar::after{
  content:""; position:absolute; width:18px; height:8px; background:var(--blush); border-radius:999px; opacity:.45
}
.avatar::before{ left:22px; bottom:22px }
.avatar::after{ right:22px; bottom:22px }
.avatar img{ width:100%; height:100%; object-fit:cover }

/* Inputs – full width, vertical */
.input{ display:flex; flex-direction:column; gap:6px; width:100% }
.input label{ font-weight:900; color:var(--ink) }
.input input, .input textarea{
  width:100%; background:var(--cloud); border:1px solid var(--border); border-radius:14px;
  padding:12px 12px; outline:none; color:#0f172a
}
/* Bio lebih panjang */
.bio-textarea { min-height: 240px; }
@media (min-width: 1024px){
  .bio-textarea { min-height: 300px; }
}
.help{ color:var(--muted); font-size:12.5px; margin-top:4px }

/* === Data Admin benar2 vertikal === */
.admin-form{ display:flex; flex-direction:column; gap:12px }
.admin-form .field{ width:100% }

/* Password form vertikal */
.pw-form{ display:flex; flex-direction:column; gap:12px }

/* Buttons */
.actions{ display:flex; align-items:center; gap:10px; margin-top:10px; flex-wrap:wrap }
.btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; cursor:pointer;
  border-radius:14px; border:1px solid var(--border); background:var(--cloud); color:#1a4a75;
  padding:10px 16px; font-weight:900 }
.btn.primary{ background:var(--sky); border-color:var(--sky) }
.btn.ghost{ background:var(--cloud) }

/* Toast */
.toast{ position:fixed; right:22px; bottom:22px; padding:10px 12px; border-radius:14px; border:1px solid var(--border);
  background:var(--cloud); box-shadow:0 10px 22px rgba(0,0,0,.08); font-weight:800 }
.toast.ok{ color:#14532d; background:#ecfdf5; border-color:#bbf7d0 }
.toast.err{ color:#7f1d1d; background:#fef2f2; border-color:#fecaca }
      `}</style>

      <div className="settings-wrap">
        {/* Header tetap */}
        <div className="head">
          <div>
            <h2>Pengaturan</h2>
            <p>Kelola profil admin & keamanan akun.</p>
          </div>
          <div className="header-preview" title="Pratinjau header">
            <div className="thumb">
              {preview ? <img src={preview} alt="thumb" /> : <span>{liveInitials}</span>}
            </div>
            <span className="name">{name || "Admin"}</span>
          </div>
        </div>

        {/* Semua section ditumpuk */}
        <div className="stack">
          {/* Avatar */}
          <div className="card">
            <span className="badge"><i>ʕ•ᴥ•ʔ</i> Foto Profil</span>
            <h3 className="section-title">Avatar Cinnamoroll</h3>
            <div className="avatar-wrap">
              <div className="avatar">
                {preview ? <img src={preview} alt="Avatar preview" /> : <span>{liveInitials}</span>}
              </div>
              <div>
                <p className="help">Unggah gambar (PNG/JPG/WEBP) untuk avatar di header.</p>
                <div className="actions">
                  <button className="btn primary" onClick={pickFile}>Pilih Gambar</button>
                  <button className="btn ghost" onClick={clearAvatar}>Hapus</button>
                </div>
                <input ref={fileRef} onChange={onFileChange} type="file" accept="image/*" hidden />
              </div>
            </div>
          </div>

          {/* Password – vertikal */}
          <div className="card">
            <span className="badge"><i>☁</i> Keamanan</span>
            <h3 className="section-title">Ubah Kata Sandi</h3>
            <form onSubmit={savePassword} className="pw-form">
              <div className="input">
                <label>Kata sandi saat ini</label>
                <input type="password" value={currentPw} onChange={e=>setCurrentPw(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="input">
                <label>Kata sandi baru</label>
                <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="min. 8 karakter" />
              </div>
              <div className="input">
                <label>Konfirmasi</label>
                <input type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="ulangi kata sandi" />
              </div>
              <div className="actions">
                <button className="btn primary" type="submit">Simpan Kata Sandi</button>
                <span className="help">Gunakan kata sandi kuat (huruf besar, angka, simbol).</span>
              </div>
            </form>
          </div>

          {/* Data Admin – FULL VERTICAL */}
          <div className="card">
            <span className="badge"><i>✿</i> Data Admin</span>
            <h3 className="section-title">Profil</h3>
            <p className="help">Data ini tampil di header & notifikasi sistem.</p>

            <div className="admin-form">
              <div className="field input">
                <label>Nama lengkap</label>
                <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="cth. Rina Amalia" />
              </div>

              <div className="field input">
                <label>Jabatan</label>
                <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="cth. Admin Sistem" />
              </div>

              <div className="field input">
                <label>Email</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="nama@perusahaan.co.id" />
                <span className="help">Dipakai untuk pemulihan akun & notifikasi.</span>
              </div>

              <div className="field input">
                <label>No. Telepon</label>
                <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+62…" />
              </div>

              <div className="field input">
                <label>Bio singkat</label>
                <textarea
                  className="bio-textarea"
                  value={bio}
                  onChange={(e)=>setBio(e.target.value)}
                  placeholder="Sedikit tentang dirimu…"
                />
              </div>

              <div className="actions">
                <button className="btn primary" onClick={saveProfile}>Simpan Profil</button>
                <button className="btn ghost" onClick={resetProfile}>Reset</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.text}</div>}
    </>
  );
}
