import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const LS_KEY = "terminal_notifications_v1";

function loadItems() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveItems(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

const initialForm = {
  keberangkatan: "",
  kedatangan: "",
  tanggal: "",
  waktu: "",
  noPol: "",
  namaBus: "",
};

/* ============================
   SEED DUMMY (auto sekali saja)
   ============================ */
(() => {
  try {
    const exists = localStorage.getItem(LS_KEY);
    if (exists) return; // sudah ada data, jangan timpa

    const now = Date.now();
    const mk = (i, data, sent = false) => ({
      id: now - i * 1000,
      ...data,
      sentAt: sent ? now - (i * 1000 + 123456) : null,
      createdAt: now - i * 1000,
      updatedAt: null,
    });

    // Relasi rute:
    // - MoveOn Express (B 1234 ABC): Pulo Gebang → Leuwi Panjang → Baranangsiang → Kampung Rambutan (+lanjutan besok)
    // - Cinta Jaya (D 5678 EFG): Giwangan → Jombor → Purabaya → Giwangan (PP)
    // - Romansa Prima (F 9012 HIJ): Bekasi → Pulo Gebang → Kampung Rambutan → Bekasi (loop)
    const items = [
      // MoveOn Express — 23 Oct
      mk(0, {
        keberangkatan: "Pulo Gebang",
        kedatangan: "Leuwi Panjang",
        tanggal: "2025-10-23",
        waktu: "08:00",
        noPol: "B 1234 ABC",
        namaBus: "MoveOn Express",
      }, true),
      mk(1, {
        keberangkatan: "Leuwi Panjang",
        kedatangan: "Baranangsiang",
        tanggal: "2025-10-23",
        waktu: "11:15",
        noPol: "B 1234 ABC",
        namaBus: "MoveOn Express",
      }, false),
      mk(2, {
        keberangkatan: "Baranangsiang",
        kedatangan: "Kampung Rambutan",
        tanggal: "2025-10-23",
        waktu: "14:30",
        noPol: "B 1234 ABC",
        namaBus: "MoveOn Express",
      }, true),

      // Cinta Jaya — 23 Oct (PP)
      mk(3, {
        keberangkatan: "Giwangan",
        kedatangan: "Jombor",
        tanggal: "2025-10-23",
        waktu: "09:00",
        noPol: "D 5678 EFG",
        namaBus: "Cinta Jaya",
      }, false),
      mk(4, {
        keberangkatan: "Jombor",
        kedatangan: "Purabaya (Bungurasih)",
        tanggal: "2025-10-23",
        waktu: "12:00",
        noPol: "D 5678 EFG",
        namaBus: "Cinta Jaya",
      }, true),
      mk(5, {
        keberangkatan: "Purabaya (Bungurasih)",
        kedatangan: "Giwangan",
        tanggal: "2025-10-23",
        waktu: "18:30",
        noPol: "D 5678 EFG",
        namaBus: "Cinta Jaya",
      }, false),

      // Romansa Prima — 24 Oct (loop)
      mk(6, {
        keberangkatan: "Bekasi",
        kedatangan: "Pulo Gebang",
        tanggal: "2025-10-24",
        waktu: "07:00",
        noPol: "F 9012 HIJ",
        namaBus: "Romansa Prima",
      }, true),
      mk(7, {
        keberangkatan: "Pulo Gebang",
        kedatangan: "Kampung Rambutan",
        tanggal: "2025-10-24",
        waktu: "08:15",
        noPol: "F 9012 HIJ",
        namaBus: "Romansa Prima",
      }, false),
      mk(8, {
        keberangkatan: "Kampung Rambutan",
        kedatangan: "Bekasi",
        tanggal: "2025-10-24",
        waktu: "10:00",
        noPol: "F 9012 HIJ",
        namaBus: "Romansa Prima",
      }, true),

      // Lanjutan MoveOn Express — 24 Oct
      mk(9, {
        keberangkatan: "Kampung Rambutan",
        kedatangan: "Leuwi Panjang",
        tanggal: "2025-10-24",
        waktu: "12:30",
        noPol: "B 1234 ABC",
        namaBus: "MoveOn Express",
      }, false),
    ];

    localStorage.setItem(LS_KEY, JSON.stringify(items));
    // console.log(`✅ Seeded ${items.length} items to localStorage[${LS_KEY}]`);
  } catch {
    // abaikan error seeding
  }
})();
/* ======== END SEED ======== */

export default function Terminal() {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => loadItems());
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  // search & sort
  const [query, setQuery] = useState("");
  const [onlyUnsent, setOnlyUnsent] = useState(false);
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [toast, setToast] = useState(null);
  const [lastAction, setLastAction] = useState(null);

  useEffect(() => {
    setItems(loadItems());
  }, []);

  const filtered = useMemo(() => {
    let data = [...items];
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((it) =>
        [it.keberangkatan, it.kedatangan, it.noPol, it.namaBus]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (onlyUnsent) data = data.filter((it) => !it.sentAt);

    data.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const va = (a[sortKey] ?? "").toString();
      const vb = (b[sortKey] ?? "").toString();
      return va > vb ? dir : va < vb ? -dir : 0;
    });
    return data;
  }, [items, query, onlyUnsent, sortKey, sortDir]);

  const sentOnly = useMemo(() => items.filter((it) => !!it.sentAt), [items]);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setError("");
  }
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }
  function validate(f) {
    if (!f.keberangkatan.trim()) return "Keberangkatan wajib diisi";
    if (!f.kedatangan.trim()) return "Kedatangan wajib diisi";
    if (!f.tanggal) return "Tanggal wajib diisi";
    if (!f.waktu) return "Waktu wajib diisi";
    if (!f.noPol.trim()) return "No. Pol wajib diisi";
    if (!f.namaBus.trim()) return "Nama Bus wajib diisi";
    return "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    const msg = validate(form);
    if (msg) return setError(msg);
    setError("");

    if (editingId) {
      setItems((prev) => {
        const next = prev.map((it) =>
          it.id === editingId ? { ...it, ...form, updatedAt: Date.now() } : it
        );
        saveItems(next);
        return next;
      });
    } else {
      const id = Date.now();
      setItems((prev) => {
        const next = [
          { id, ...form, sentAt: null, createdAt: Date.now(), updatedAt: null },
          ...prev,
        ];
        saveItems(next);
        return next;
      });
    }
    // lil confetti blink on submit button
    pulseButton();
    resetForm();
  }

  function handleEdit(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    setForm({
      keberangkatan: it.keberangkatan,
      kedatangan: it.kedatangan,
      tanggal: it.tanggal,
      waktu: it.waktu,
      noPol: it.noPol,
      namaBus: it.namaBus,
    });
    setEditingId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function handleDelete(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const ok = confirm(`Hapus data untuk bus "${it.namaBus}"?`);
    if (!ok) return;
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveItems(next);
      return next;
    });
    if (editingId === id) resetForm();
  }
  function handleSend(id) {
    setItems((prev) => {
      const updated = prev.map((it) =>
        it.id === id ? { ...it, sentAt: Date.now() } : it
      );
      saveItems(updated);
      return updated;
    });

    // simpan aksi buat opsi Undo, tampilkan toast lucu
    const sent = items.find((x) => x.id === id);
    setLastAction({ type: "send", id });
    setToast({
      id,
      msg: `📣 Notifikasi untuk “${sent?.namaBus ?? "Bus"}” terkirim! ✨`,
    });

    // burst emoji confetti kecil ✨
    burstEmoji();

    // auto-hide setelah 2.2s
    setTimeout(() => setToast(null), 2200);
  }
  function handleUndo() {
    if (!lastAction || lastAction.type !== "send") return;
    const { id } = lastAction;
    setItems((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, sentAt: null } : it));
      saveItems(next);
      return next;
    });
    setToast({ id: null, msg: "↩️ Dibatalkan, kembali ke Draft." });
    setLastAction(null);
    setTimeout(() => setToast(null), 1600);
  }
  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // ===== micro-interactions =====
  function pulseButton() {
    const el = document.querySelector(".btn.primary");
    if (!el) return;
    el.classList.remove("pulse");
    void el.offsetWidth; // restart animation
    el.classList.add("pulse");
    setTimeout(() => el.classList.remove("pulse"), 600);
  }
  function burstEmoji() {
    const host = document.querySelector(".confetti-host");
    if (!host) return;
    for (let i = 0; i < 10; i++) {
      const s = document.createElement("span");
      s.className = "confetti";
      s.textContent = ["✨", "✦", "✧", "⭐", "🫧"][i % 5];
      s.style.setProperty("--x", (Math.random() * 120 - 60).toFixed(1) + "px");
      s.style.setProperty("--y", (Math.random() * -80 - 20).toFixed(1) + "px");
      s.style.setProperty("--r", (Math.random() * 40 - 20).toFixed(1) + "deg");
      host.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  }

  return (
    <div className="terminal-wrap">
      {/* kawaii backdrop */}
      <div className="bg-sky" aria-hidden />
      <div className="bg-cloud cloud1" aria-hidden>☁️</div>
      <div className="bg-cloud cloud2" aria-hidden>☁️</div>
      <div className="bg-cloud cloud3" aria-hidden>☁️</div>
      <div className="bg-stars" aria-hidden>
        {Array.from({ length: 24 }).map((_, i) => (
          <i key={i} style={{ "--d": `${i * 0.18}s` }} />
        ))}
      </div>
      <div className="bg-mascot" aria-hidden>
        <span className="spark">✦</span>
        <span className="spark">✧</span>
        <span className="spark">✦</span>
      </div>

      <header className="topbar">
        <div className="brand">
          <span className="logo float-wiggle">🚌</span>
          <h1>Terminal Dashboard</h1>
          <span className="badge soft">kawaii mode</span>
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={() => navigate("/")}>⟵ Back to Home</button>
        </div>
      </header>

      <main className="container">
        {/* Form Card */}
        <section className="card">
          <div className="card-head">
            <h2>{editingId ? "Edit Data Perjalanan" : "Buat Notifikasi Terminal"}</h2>
            <p>Isi data lalu klik <b>{editingId ? "Simpan Perubahan" : "Tambahkan"}</b>. ✨</p>
          </div>
          {error && <div className="alert shake-sm">{error}</div>}

          <form className="form-grid" onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span className="label">Keberangkatan</span>
              <input name="keberangkatan" value={form.keberangkatan} onChange={handleChange} placeholder="Contoh: Terminal A" required />
            </label>
            <label className="field">
              <span className="label">Kedatangan</span>
              <input name="kedatangan" value={form.kedatangan} onChange={handleChange} placeholder="Contoh: Terminal B" required />
            </label>
            <label className="field">
              <span className="label">Tanggal</span>
              <input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} required />
            </label>
            <label className="field">
              <span className="label">Waktu</span>
              <input type="time" name="waktu" value={form.waktu} onChange={handleChange} required />
            </label>
            <label className="field">
              <span className="label">No. Pol</span>
              <input name="noPol" value={form.noPol} onChange={handleChange} placeholder="B 1234 ABC" required />
            </label>
            <label className="field">
              <span className="label">Nama Bus</span>
              <input name="namaBus" value={form.namaBus} onChange={handleChange} placeholder="Contoh: MoveOn Express" required />
            </label>

            <div className="form-actions confetti-host">
              <button type="submit" className="btn primary">
                {editingId ? "Simpan Perubahan 💾" : "Tambahkan ✅"}
              </button>
              {editingId && (
                <button type="button" className="btn ghost" onClick={resetForm}>
                  Batal
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Search Card */}
        <section className="card">
          <div className="card-head">
            <h2>Pencarian</h2>
            <p>Cari berdasarkan keberangkatan/kedatangan/no pol/nama bus.</p>
          </div>
          <div className="search-grid">
            <label className="field">
              <span className="label">Kata kunci</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cth: Terminal A / B 1234 ABC / MoveOn" />
            </label>
            <label className="toggle toggle-card">
              <input type="checkbox" checked={onlyUnsent} onChange={(e) => setOnlyUnsent(e.target.checked)} />
              <span>Hanya yang belum dikirim</span>
            </label>
          </div>
        </section>

        {/* Table: Riwayat Data (caption di atas) */}
        <section className="card">
          <div className="card-head sr-only"><h2>Riwayat Data</h2></div>
          <div className="table-wrap wide">
            <table className="table long pretty">
              <caption className="table-caption top">Riwayat Data</caption>
              <thead>
                <tr>
                  <Th label="Keberangkatan" sortKey="keberangkatan" sortKeyState={[sortKey, setSortKey]} sortDirState={[sortDir, setSortDir]} onToggle={toggleSort} />
                  <Th label="Kedatangan" sortKey="kedatangan" sortKeyState={[sortKey, setSortKey]} sortDirState={[sortDir, setSortDir]} onToggle={toggleSort} />
                  <Th label="Tanggal" sortKey="tanggal" sortKeyState={[sortKey, setSortKey]} sortDirState={[sortDir, setSortDir]} onToggle={toggleSort} />
                  <Th label="Waktu" sortKey="waktu" sortKeyState={[sortKey, setSortKey]} sortDirState={[sortDir, setSortDir]} onToggle={toggleSort} />
                  <Th label="No. Pol" sortKey="noPol" sortKeyState={[sortKey, setSortKey]} sortDirState={[sortDir, setSortDir]} onToggle={toggleSort} />
                  <Th label="Nama Bus" sortKey="namaBus" sortKeyState={[sortKey, setSortKey]} sortDirState={[sortDir, setSortDir]} onToggle={toggleSort} />
                  <Th label="Status" sortKey="sentAt" sortKeyState={[sortKey, setSortKey]} sortDirState={[sortDir, setSortDir]} onToggle={toggleSort} />
                  <th className="no-sort sticky-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty">Belum ada data. Yuk tambah dulu~ 🍡</td>
                  </tr>
                ) : (
                  filtered.map((it) => (
                    <tr key={it.id} className="row-wiggle">
                      <td className="col-place" data-label="Keberangkatan">{it.keberangkatan}</td>
                      <td className="col-place" data-label="Kedatangan">{it.kedatangan}</td>
                      <td className="col-date" data-label="Tanggal">{it.tanggal}</td>
                      <td className="col-time" data-label="Waktu">{it.waktu}</td>
                      <td className="col-nopol" data-label="No. Pol">{it.noPol}</td>
                      <td className="col-bus" data-label="Nama Bus">{it.namaBus}</td>
                      <td className="col-status" data-label="Status">
                        {it.sentAt ? (
                          <span className="pill sent twinkle" title={new Date(it.sentAt).toLocaleString()}>Terkirim</span>
                        ) : (
                          <span className="pill pending">Draft</span>
                        )}
                      </td>
                      <td className="row-actions sticky-right">
                        <button className="icon-btn" title="Edit" onClick={() => handleEdit(it.id)}>✏️</button>
                        <button className="icon-btn" title="Hapus" onClick={() => handleDelete(it.id)}>🗑️</button>
                        <button className="icon-btn" title="Kirim ke Notifikasi Terminal" onClick={() => handleSend(it.id)} disabled={!!it.sentAt}>📣</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Table: Notifikasi Terminal (caption di atas) */}
        <section className="card">
          <div className="card-head sr-only"><h2>Notifikasi Terminal</h2></div>
          <div className="table-wrap wider">
            <table className="table long pretty">
              <caption className="table-caption top">Notifikasi Terminal</caption>
              <thead>
                <tr>
                  <th>Keberangkatan</th>
                  <th>Kedatangan</th>
                  <th>Tanggal</th>
                  <th>Waktu</th>
                  <th>No. Pol</th>
                  <th>Nama Bus</th>
                  <th>Dikirim</th>
                </tr>
              </thead>
              <tbody>
                {sentOnly.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty">Belum ada notifikasi terkirim. Kirim dari riwayat ya~ 📣</td>
                  </tr>
                ) : (
                  sentOnly.map((it) => (
                    <tr key={it.id}>
                      <td className="col-place" data-label="Keberangkatan">{it.keberangkatan}</td>
                      <td className="col-place" data-label="Kedatangan">{it.kedatangan}</td>
                      <td className="col-date" data-label="Tanggal">{it.tanggal}</td>
                      <td className="col-time" data-label="Waktu">{it.waktu}</td>
                      <td className="col-nopol" data-label="No. Pol">{it.noPol}</td>
                      <td className="col-bus" data-label="Nama Bus">{it.namaBus}</td>
                      <td className="col-date" data-label="Dikirim" title={new Date(it.sentAt).toLocaleString()}>
                        {new Date(it.sentAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="footer">
          <p>
            Dibuat dengan semangat <span role="img" aria-label="mochi">🍡</span> dan langit pastel <span role="img" aria-label="sparkles">✨</span>.
          </p>
        </footer>
        {toast && (
          <div className="toast-wrap" role="status" aria-live="polite">
            <div className="toast">
              <span className="t-emoji">🚌</span>
              <span className="t-msg">{toast.msg}</span>
              {lastAction?.type === "send" && (
                <button className="t-undo" onClick={handleUndo} type="button">Undo</button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Inline kawaii CSS */}
      <style>{`
        :root{
          --sky:#f7fbff;
          --sun:#ffeb88;
          --primary:#5b8def;
          --primary-2:#86a9f5;
          --accent:#ffd3e2;
          --ink:#23324a;
          --muted:#6b7a90;
          --card:#ffffffcc;
          --danger:#ff6b6b;
          --ok:#2fcf6e;
          --border:#e6ecf7;
          --shadow:0 10px 30px rgba(91,141,239,.15);
          --stickyBg:#f6f9ff;
          --grad: linear-gradient(180deg, #fff, #f7fbff);
        }
        .terminal-wrap{position:relative; min-height:100dvh; color:var(--ink)}
        .bg-sky{position:fixed; inset:0; background:linear-gradient(180deg,var(--sky),#eef6ff 70%, #eaf2ff); z-index:-3}
        .bg-cloud{position:fixed; font-size:64px; opacity:.35; animation:float 10s ease-in-out infinite; z-index:-2}
        .cloud1{top:12%; left:6%; animation-delay:.2s}
        .cloud2{top:28%; right:8%; animation-delay:1.2s}
        .cloud3{bottom:10%; left:18%; animation-delay:2s}
        .bg-stars{position:fixed; inset:0; pointer-events:none; z-index:-2}
        .bg-stars i{position:absolute; width:4px; height:4px; background:#ffdca8; border-radius:50%; opacity:.75; animation:tw 3s var(--d) infinite alternate}
        .bg-mascot{position:fixed; top:8px; right:8px; pointer-events:none; opacity:.5}
        .bg-mascot .spark{margin-left:6px; animation:pulse 2.4s ease-in-out infinite}
        @keyframes tw{from{transform:scale(.8)} to{transform:scale(1)}}
        @keyframes float{0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)}}
        @keyframes pulse{0%,100%{opacity:.6; transform:scale(.96)} 50%{opacity:1; transform:scale(1)}}
        .float-wiggle{animation:wiggle 2.6s ease-in-out infinite}
        @keyframes wiggle{0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-2px) rotate(-2deg)}}

        .topbar{display:flex; align-items:center; justify-content:space-between; padding:16px 20px}
        .brand{display:flex; align-items:center; gap:10px}
        .logo{font-size:26px}
        .brand h1{font-size:20px; font-weight:800}
        .badge{background:var(--accent); padding:4px 10px; border-radius:999px; font-size:12px}
        .badge.soft{background:rgba(255, 211, 226, .7); border:1px solid #ffd3e2}
        .actions .btn{padding:10px 14px; border-radius:12px; border:1px solid var(--border); background:#fff; box-shadow:var(--shadow)}
        .btn.ghost{background:#fff}
        .btn.primary{background:var(--primary); color:#fff; border:none}
        .btn.primary:hover{filter:brightness(1.05)}
        .btn.primary.pulse{animation:bump .6s ease}
        @keyframes bump{0%{transform:scale(1)} 40%{transform:scale(1.05)} 100%{transform:scale(1)}}
        .icon-btn{border:none; background:#fff; border:1px solid var(--border); padding:6px 10px; border-radius:10px; margin-right:6px; box-shadow:var(--shadow)}
        .icon-btn:hover{transform:translateY(-1px)}
        .pill{display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; background:#eef3ff; color:#4b6fd6; border:1px solid #dfe7ff}
        .pill.pending{background:#fff4d6; color:#8a6b00; border-color:#ffe9ab}
        .pill.sent{background:#dbffe9; color:#087a3d; border-color:#bff5d5}
        .twinkle{animation:twinkle 1.8s ease-in-out infinite}
        @keyframes twinkle{0%,100%{box-shadow:0 0 0 rgba(255,255,255,0)} 50%{box-shadow:0 0 0 4px rgba(223, 247, 255, .5)}}

        .container{max-width:1200px; margin:0 auto; padding:10px 16px 48px}
        .card{background:var(--card); border:1px solid var(--border); border-radius:24px; padding:16px; box-shadow:var(--shadow); backdrop-filter:saturate(1.2) blur(4px); margin-bottom:16px; border-image:linear-gradient(180deg,#e9f1ff,#ffe8f2) 1}
        .card-head h2{margin:0; font-size:18px}
        .card-head p{margin:4px 0 0; color:var(--muted); font-size:14px}

        .sr-only{position:absolute !important; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0}
        .alert{margin:10px 0 14px; padding:12px 14px; border-radius:12px; background:#fff1f1; border:1px solid #ffd1d1; color:#8a1a1a}
        .shake-sm{animation:shake .26s ease}
        @keyframes shake{10%{transform:translateX(-2px)} 20%{transform:translateX(2px)} 30%{transform:translateX(-2px)} 40%{transform:translateX(2px)} 100%{transform:translateX(0)}}

        /* FORM */
        .form-grid{display:grid; grid-template-columns:repeat(6, 1fr); gap:12px; margin-top:12px}
        .field{display:flex; flex-direction:column; gap:6px}
        .field input{width:100%; border:1px solid var(--border); border-radius:12px; padding:10px 12px; background:var(--grad)}
        .label{font-size:12px; color:var(--muted)}
        .form-actions{grid-column:1 / -1; display:flex; gap:8px; margin-top:2px}
        .btn:disabled{opacity:.6; cursor:not-allowed}

        /* SEARCH CARD */
        .search-grid{display:grid; grid-template-columns: 1fr auto; gap:12px; margin-top:12px}
        .toggle-card{display:flex; align-items:center; gap:8px; padding:10px 12px; border:1px solid var(--border); background:#fff; border-radius:12px}

        /* TABLES */
        .table-wrap{overflow:auto}
        .table-wrap.wide{--minw: 1100px}
        .table-wrap.wider{--minw: 1200px}
        table.table{width:100%; border-collapse:separate; border-spacing:0; min-width:var(--minw, 1000px)}
        caption.table-caption{caption-side:top; text-align:left; padding:8px 10px 10px; font-weight:800; color:#2d3b5a}
        caption.table-caption.top::after{content:" "; display:block; height:3px; width:76px; background:linear-gradient(90deg,#86a9f5,#ffd3e2); border-radius:999px; margin-top:6px}
        thead th{position:sticky; top:0; background:var(--stickyBg); border-bottom:1px solid var(--border); font-weight:700; text-align:left; padding:10px; font-size:13px; z-index:1}
        tbody td{border-bottom:1px dashed var(--border); padding:10px; font-size:14px; vertical-align:middle}
        .no-sort{cursor:default}
        .th-sort{cursor:pointer; white-space:nowrap; position:relative}
        .th-sort .dir{opacity:.6; font-size:12px; margin-left:6px}
        .th-sort::after{content:""; position:absolute; left:10px; right:10px; bottom:-1px; height:1px; background:linear-gradient(90deg, transparent, #e6ecf7, transparent)}
        .row-actions{white-space:nowrap}
        .empty{text-align:center; padding:22px}

        /* Column sizing */
        .col-place{min-width:180px}
        .col-date{min-width:120px; white-space:nowrap}
        .col-time{min-width:100px; white-space:nowrap}
        .col-nopol{min-width:130px; white-space:nowrap}
        .col-bus{min-width:180px}
        .col-status{min-width:120px}

        /* sticky right action column */
        .sticky-right{position:sticky; right:0; background:#fff; border-left:1px solid var(--border)}

        /* cute row hover */
        tbody tr:hover{background:#fbfdff}
        .row-wiggle:hover{animation:micro-wiggle .4s ease}
        @keyframes micro-wiggle{0%{transform:translateX(0)} 25%{transform:translateX(-1px)} 50%{transform:translateX(1px)} 100%{transform:translateX(0)}}

        .footer{display:flex; align-items:center; justify-content:center; gap:8px; color:var(--muted); margin-top:12px}

        /* responsive + mobile table labels di ATAS cell */
        @media (max-width: 980px){ .form-grid{grid-template-columns:1fr 1fr 1fr} }
        @media (max-width: 720px){ .form-grid{grid-template-columns:1fr 1fr} .search-grid{grid-template-columns: 1fr} }
        @media (max-width: 600px){
          table.table.long thead{display:none}
          table.table.long tr{display:block; border:1px solid var(--border); border-radius:16px; margin:10px 0; overflow:hidden; background:#fff}
          table.table.long td{display:block; padding:8px 12px}
          table.table.long td[data-label]::before{content: attr(data-label); display:block; font-size:11px; color:var(--muted); margin-bottom:2px}
          .sticky-right{position:static}
        }

        /* ===== Toast kawaii ===== */
        .toast-wrap{position:fixed; left:0; right:0; bottom:24px; z-index:9999; display:flex; justify-content:center; pointer-events:none}
        .toast{pointer-events:auto; display:flex; align-items:center; gap:10px; background:#fff; border:1px solid var(--border); padding:10px 14px; border-radius:16px; box-shadow:var(--shadow); animation:toastIn .26s ease-out both, toastFloat 1.6s ease-in-out .26s infinite alternate}
        .t-emoji{font-size:18px}
        .t-msg{font-size:14px; color:#23324a}
        .t-undo{margin-left:6px; padding:6px 10px; border-radius:12px; border:1px solid #dfe7ff; background:linear-gradient(180deg,#fff,#f7fbff); font-size:12px; color:#3f7fe6; cursor:pointer}
        .t-undo:hover{filter:brightness(1.03)}
        @keyframes toastIn{ from{ opacity:0; transform:translateY(8px) scale(.98) } to{ opacity:1; transform:translateY(0) scale(1) } }
        @keyframes toastFloat{ from{ transform:translateY(0) } to{ transform:translateY(-2px) } }
        .icon-btn:disabled{opacity:.5; cursor:not-allowed; transform:none !important}

        /* emoji confetti */
        .confetti-host{position:relative}
        .confetti{position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); animation:conf .9s ease forwards; pointer-events:none}
        @keyframes conf{0%{opacity:1; transform:translate(-50%,-50%) rotate(0)} 100%{opacity:0; transform:translate(calc(-50% + var(--x)), calc(-50% + var(--y))) rotate(var(--r))}}

        /* reduce motion */
        @media (prefers-reduced-motion: reduce){
          *{animation: none !important; transition: none !important}
        }
      `}</style>
    </div>
  );
}

function Th({ label, sortKey, sortKeyState, sortDirState, onToggle }) {
  const [sk] = sortKeyState;
  const [sd] = sortDirState;
  const active = sk === sortKey;
  return (
    <th className="th-sort" onClick={() => onToggle(sortKey)} title="Urutkan">
      {label}
      <span className="dir">{active ? (sd === "asc" ? "▲" : "▼") : "⇅"}</span>
    </th>
  );
}
