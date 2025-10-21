// File: src/components/dashboard/NotifikasiBerkas.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const NOTIF_KEY = "crm:notif";

function loadItems() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]"); }
  catch { return []; }
}
function saveItems(items) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(items));
}

export default function NotifikasiBerkas() {
  const navigate = useNavigate();

  // data
  const [items, setItems] = useState(() => loadItems());
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("ts");
  const [sortDir, setSortDir] = useState("desc");

  // refresh on mount (and if other tabs update storage)
  useEffect(() => {
    const refresh = () => setItems(loadItems());
    refresh();

    const onStorage = (e) => { if (e.key === NOTIF_KEY) refresh(); };
    const onLocal = () => refresh(); // event kustom dari addVerificationNotificationLocal

    window.addEventListener("storage", onStorage);
    window.addEventListener("crm:notif:update", onLocal);
    return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("crm:notif:update", onLocal);
    };
    }, []);

  // derive + filter
  const filtered = useMemo(() => {
    let data = [...items];
    if (q.trim()) {
      const s = q.toLowerCase();
      data = data.filter(it => {
        const msg = [
          it?.meta?.reportId || "",
          it?.meta?.status || "",
          it?.meta?.note || "",
          it?.title || "",
          it?.message || "",
          it?.ts || ""
        ].join(" ").toLowerCase();
        return msg.includes(s);
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    data.sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      // khusus ts → parse tanggal biar bener
      if (sortKey === "ts") {
        const ta = Date.parse(va) || 0;
        const tb = Date.parse(vb) || 0;
        return (ta - tb) * dir;
      }
      return va > vb ? dir : va < vb ? -dir : 0;
    });
    return data;
  }, [items, q, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  // actions
  function markAsRead(id, read = true) {
    setItems(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read } : n);
      saveItems(next);
      return next;
    });
  }
  function handleDelete(id) {
    const it = items.find(x => x.id === id);
    if (!it) return;
    if (!confirm(`Hapus notifikasi laporan "${it?.meta?.reportId || it.id}"?`)) return;
    setItems(prev => {
      const next = prev.filter(x => x.id !== id);
      saveItems(next);
      return next;
    });
  }
  function markAllRead() {
    setItems(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      saveItems(next);
      return next;
    });
  }
  function clearAll() {
    if (!confirm("Hapus SEMUA notifikasi berkas?")) return;
    setItems([]);
    saveItems([]);
  }

  return (
    <div className="notif-wrap">
      {/* background imut sama seperti halaman terminal */}
      <div className="bg-sky" aria-hidden />
      <div className="bg-cloud c1" aria-hidden>☁️</div>
      <div className="bg-cloud c2" aria-hidden>☁️</div>
      <div className="bg-cloud c3" aria-hidden>☁️</div>

      <header className="topbar">
        <div className="brand">
          <span className="logo">📋</span>
          <h1>Notifikasi Berkas (Verifikasi)</h1>
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={() => navigate("/")}>🏠 Home</button>
          <button className="btn" onClick={markAllRead}>✅ Tandai semua dibaca</button>
          <button className="btn danger" onClick={clearAll}>🧹 Bersihkan semua</button>
        </div>
      </header>

      <main className="container">
        {/* Pencarian */}
        <section className="card">
          <div className="card-head">
            <h2>Cari Notifikasi</h2>
            <p>Ketik ID laporan / status / catatan / tanggal.</p>
          </div>
          <div className="search-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Contoh: CRM-2509-123 / Tervalidasi / cek alamat"
            />
          </div>
        </section>

        {/* Tabel Notifikasi Berkas */}
        <section className="card">
          <div className="card-head">
            <h2>Daftar Notifikasi</h2>
          </div>

          <div className="table-wrap wider">
            <table className="table long">
              <thead>
                <tr>
                  <Th label="ID Laporan" k="reportId" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Catatan" k="note" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Waktu" k="ts" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Dibaca?" k="read" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <th className="sticky-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td className="empty" colSpan={6}>Belum ada notifikasi.</td></tr>
                ) : filtered.map(it => (
                  <tr key={it.id}>
                    <td className="col-id">{it?.meta?.reportId || "-"}</td>
                    <td className="col-status">
                      <span className="badge">{it?.meta?.status || "-"}</span>
                    </td>
                    <td className="col-note">{it?.meta?.note || "-"}</td>
                    <td className="col-date" title={it.ts}>
                      {new Date(it.ts).toLocaleString()}
                    </td>
                    <td className="col-read">{it.read ? "Ya" : "Belum"}</td>
                    <td className="row-actions sticky-right">
                      {it.read ? (
                        <button className="icon-btn" title="Tandai belum dibaca" onClick={() => markAsRead(it.id, false)}>↩️</button>
                      ) : (
                        <button className="icon-btn" title="Tandai dibaca" onClick={() => markAsRead(it.id, true)}>✅</button>
                      )}
                      <button className="icon-btn" title="Hapus" onClick={() => handleDelete(it.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="footer">
          <p>Berkas tervalidasi? info muncul di sini 📋✨</p>
        </footer>

        {/* Sparkles imut */}
        <div className="sparkle" aria-hidden>
          <span style={{ left: "8%" }}>✦</span>
          <span style={{ left: "22%" }}>✧</span>
          <span style={{ left: "38%" }}>✦</span>
          <span style={{ left: "55%" }}>✧</span>
          <span style={{ left: "72%" }}>✦</span>
          <span style={{ left: "88%" }}>✧</span>
        </div>
      </main>

      {/* gaya visual: copy dari NotifikasiTerminal biar konsisten */}
      <StyleCopy />
    </div>
  );
}

function Th({ label, k, sortKey, sortDir, onToggle }) {
  const active = sortKey === k;
  return (
    <th className="th-sort" onClick={() => onToggle(k)} title="Urutkan">
      {label} <span className="dir">{active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
    </th>
  );
}

/** Reuse CSS dari halaman NotifikasiTerminal agar look & feel sama */
function StyleCopy() {
  return (
    <style>{`
      :root{
        --sky:#f6fbff; --sky-2:#eef7ff; --sky-3:#e7f2ff;
        --ink:#23405c; --muted:#6f86a0; --border:#e8f0fb;
        --card:#ffffffcc; --card-solid:#fff; --stickyBg:#f7fbff;
        --primary:#69a8ff; --accent:#ffd9ec; --mint:#c8f5e5; --sun:#ffe9a3;
        --danger:#ff7c88;
        --shadow:0 10px 28px rgba(122, 170, 255, .18);
        --radius-lg:26px; --radius-md:16px; --radius-sm:12px;
        --fs-xs:12px; --fs-sm:13px; --fs-md:14px; --fs-lg:18px; --fs-xl:21px;
      }

      .notif-wrap{min-height:100dvh;color:var(--ink);position:relative}
      .bg-sky{position:fixed;inset:0;background:
        radial-gradient(1200px 600px at 15% 10%, #fff8 0 40%, transparent 60%),
        linear-gradient(180deg,var(--sky),var(--sky-2) 70%,var(--sky-3)); z-index:-3}
      .bg-cloud{position:fixed;font-size:70px;opacity:.28;animation:float 13s ease-in-out infinite;z-index:-2;filter:drop-shadow(0 8px 12px rgba(105,168,255,.15))}
      .c1{top:10%;left:6%} .c2{top:30%;right:8%} .c3{bottom:8%;left:16%}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}

      .sparkle{position:fixed;inset:0;pointer-events:none;z-index:-1}
      .sparkle span{position:absolute;font-size:18px;opacity:.6;animation:rise 9s linear infinite;filter:drop-shadow(0 6px 8px rgba(105,168,255,.15))}
      .sparkle span:nth-child(3n){animation-duration:11s}
      .sparkle span:nth-child(5n){animation-duration:13s;font-size:16px;opacity:.5}
      @keyframes rise{0%{transform:translateY(20px) scale(.9)}100%{transform:translateY(-90vh) scale(1.1)}}

      .topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;gap:12px}
      .brand{display:flex;gap:10px;align-items:center}
      .logo{font-size:28px}
      .brand h1{font-size:var(--fs-xl);font-weight:800;letter-spacing:.2px}
      .actions{display:flex;gap:8px;flex-wrap:wrap}

      .btn{padding:10px 14px;border-radius:18px;border:1px solid var(--border);
          background:var(--card-solid);box-shadow:var(--shadow);transition:transform .06s ease, box-shadow .2s ease}
      .btn:hover{transform:translateY(-1px)}
      .btn:active{transform:translateY(0)}
      .btn.ghost{background:linear-gradient(180deg,#fff, #fafdff)}
      .btn.danger{background:linear-gradient(180deg,#ff9aa7,#ff7c88);color:#fff;border:none}

      .btn:focus-visible, .search-row input:focus-visible, .icon-btn:focus-visible, .th-sort:focus-visible{
        outline:2px solid #a8c9ff; outline-offset:2px; border-radius:14px;
      }

      .container{max-width:1200px;margin:0 auto;padding:10px 16px 56px}
      .card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);
            padding:16px;box-shadow:var(--shadow);backdrop-filter:saturate(1.15) blur(6px);margin-bottom:16px}
      .card-head h2{margin:0;font-size:var(--fs-lg);font-weight:900}
      .card-head p{margin:6px 0 0;color:var(--muted);font-size:var(--fs-sm)}

      .search-row{margin-top:10px}
      .search-row input{
        width:100%;border:1px solid var(--border);border-radius:14px;padding:12px 14px;background:#fff;
        font-size:var(--fs-md);transition:border-color .2s ease, box-shadow .2s ease;
        box-shadow:0 4px 14px rgba(122,170,255,.07)
      }
      .search-row input::placeholder{color:#9ab2cc}
      .search-row input:focus{border-color:#bcd7ff;box-shadow:0 0 0 5px rgba(122,170,255,.18)}

      .table-wrap{position:relative;overflow:auto;--minw: 1000px}
      .table-wrap.wider{--minw: 1100px}
      .table-wrap::before,.table-wrap::after{
        content:"";position:sticky;top:0;bottom:0;width:18px;pointer-events:none;z-index:2;display:block
      }
      .table-wrap::before{left:0;background:linear-gradient(90deg, rgba(122,170,255,.15), transparent)}
      .table-wrap::after{float:right;right:0;background:linear-gradient(270deg, rgba(122,170,255,.15), transparent)}

      table.table{width:100%;border-collapse:separate;border-spacing:0;min-width:var(--minw)}
      thead th{
        position:sticky;top:0;background:var(--stickyBg);backdrop-filter:saturate(1.1) blur(4px);
        border-bottom:1px solid var(--border);font-weight:800;text-align:left;padding:12px 10px;font-size:var(--fs-sm);z-index:1
      }
      tbody td{border-bottom:1px dashed var(--border);padding:12px 10px;font-size:var(--fs-md);vertical-align:middle}
      tbody tr:hover td{background:linear-gradient(90deg,#fff, #f6fbff)}
      tbody tr:nth-child(2n) td{background:linear-gradient(90deg,#fff, #f3f8ff)}

      .empty{text-align:center;padding:22px;color:var(--muted)}
      .row-actions{white-space:nowrap}
      .icon-btn{
        border:1px solid var(--border);background:#fff;border-radius:12px;padding:7px 11px;margin-right:6px;
        box-shadow:var(--shadow);transition:transform .06s ease
      }
      .icon-btn:hover{transform:translateY(-1px)}
      .sticky-right{position:sticky;right:0;background:var(--stickyBg);border-left:1px solid var(--border);z-index:1}

      .col-id{min-width:160px}
      .col-status{min-width:140px}
      .col-note{min-width:260px}
      .col-date{min-width:170px;white-space:nowrap}
      .col-read{min-width:90px}

      .badge{background:linear-gradient(180deg,var(--accent),#ffc9e4);padding:5px 10px;border-radius:999px;font-size:var(--fs-xs)}

      .footer{display:flex;justify-content:center;color:var(--muted);font-size:var(--fs-sm);padding-top:6px}

      @media (max-width: 960px){
        .brand h1{font-size:18px}
        .col-note{min-width:200px}
      }
      @media (max-width: 720px){
        .container{padding:8px 12px 56px}
        .card{padding:14px;border-radius:22px}
        thead th, tbody td{padding:10px}
      }
    `}</style>
  );
}
