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

  const [items, setItems] = useState(() => loadItems());
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("ts");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    const refresh = () => setItems(loadItems());
    refresh();
    const onStorage = (e) => { if (e.key === NOTIF_KEY) refresh(); };
    const onLocal = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("crm:notif:update", onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("crm:notif:update", onLocal);
    };
  }, []);

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
    <div className="notif-page">
      <header className="notif-header">
        <div className="brand">
          <span className="icon">📋</span>
          <h1>Notifikasi Berkas</h1>
        </div>
        <div className="actions">
          <button className="btn home" onClick={() => navigate("/")}>🏠 Home</button>
          <button className="btn mark" onClick={markAllRead}>✅ Tandai semua dibaca</button>
          <button className="btn danger" onClick={clearAll}>🧹 Bersihkan semua</button>
        </div>
      </header>

      <main className="notif-container">
        <section className="card">
          <h2>Cari Notifikasi</h2>
          <input
            className="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari ID laporan / status / catatan / tanggal..."
          />
        </section>

        <section className="card">
          <h2>Daftar Notifikasi</h2>
          <div className="table-wrap">
            <table className="notif-table">
              <thead>
                <tr>
                  <Th label="ID Laporan" k="reportId" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Catatan" k="note" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Waktu" k="ts" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Dibaca?" k="read" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="empty">Belum ada notifikasi.</td></tr>
                ) : filtered.map(it => (
                  <tr key={it.id} className={it.read ? "read" : "unread"}>
                    <td>{it?.meta?.reportId || "-"}</td>
                    <td><span className="badge">{it?.meta?.status || "-"}</span></td>
                    <td>{it?.meta?.note || "-"}</td>
                    <td>{new Date(it.ts).toLocaleString()}</td>
                    <td>{it.read ? "Ya" : "Belum"}</td>
                    <td className="aksi">
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

        <footer className="notif-footer">
          <p>✨ Semua pemberitahuan verifikasi berkas muncul di sini ✨</p>
        </footer>
      </main>

      <style>{css}</style>
    </div>
  );
}

function Th({ label, k, sortKey, sortDir, onToggle }) {
  const active = sortKey === k;
  return (
    <th className="th" onClick={() => onToggle(k)}>
      {label} {active ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );
}

const css = `
:root {
  --baby-blue: #e7f3ff;
  --baby-yellow: #fff8d6;
  --text-dark: #203040;
  --border: #c9e4ff;
  --shadow: 0 6px 18px rgba(135,190,255,.25);
  --radius: 18px;
}

html, body, .notif-page {
  height: 100%;
  width: 100%;
  margin: 0;
  font-family: 'Inter', sans-serif;
  background: linear-gradient(180deg, var(--baby-blue) 45%, var(--baby-yellow) 100%);
  color: var(--text-dark);
}

/* ===== HEADER ===== */
.notif-header {
  width: 100%;
  border-radius: 0;
  background: linear-gradient(90deg, var(--baby-yellow) 0%, var(--baby-blue) 100%);
  padding: 14px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  box-shadow: var(--shadow);
  position: sticky;
  top: 0;
  z-index: 10;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand .icon { font-size: 30px; }
.brand h1 { font-size: 22px; font-weight: 800; }

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.btn {
  border: none;
  border-radius: var(--radius);
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 700;
  box-shadow: var(--shadow);
  background: #fff;
  transition: transform .1s ease, box-shadow .2s ease;
}
.btn:hover { transform: translateY(-1px); }
.btn.home { background: linear-gradient(180deg, #fff, var(--baby-blue)); }
.btn.mark { background: linear-gradient(180deg, #fff, var(--baby-yellow)); }
.btn.danger { background: linear-gradient(180deg, #ffe1e1, #ffbcbc); color: #802020; }

/* ===== CONTAINER ===== */
.notif-container {
  flex: 1;
  padding: 16px clamp(14px, 3vw, 32px);
  width: 100vw;
  margin: 0;
  box-sizing: border-box;
}

/* ===== CARD ===== */
.card {
  background: rgba(255,255,255,0.9);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
  margin-bottom: 20px;
  width: 100%;
}
.card h2 {
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 700;
}

/* ===== SEARCH ===== */
.search {
  width: 100%;
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  font-size: 15px;
  box-shadow: inset 0 2px 6px rgba(180,210,255,.15);
}

/* ===== TABLE ===== */
.table-wrap {
  overflow-x: auto;
  border-radius: var(--radius);
  width: 100%;
}
.notif-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}
.notif-table th, .notif-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  font-size: 14px;
}
.notif-table thead {
  background: linear-gradient(180deg, var(--baby-blue), var(--baby-yellow));
}
.notif-table tr:hover td {
  background: rgba(255,255,255,0.6);
}
.badge {
  background: linear-gradient(180deg, #fff, var(--baby-yellow));
  border-radius: 12px;
  padding: 4px 8px;
  font-size: 13px;
}
.icon-btn {
  border: none;
  background: #fff;
  border-radius: 12px;
  padding: 6px 10px;
  box-shadow: var(--shadow);
  margin-right: 4px;
  transition: transform .08s ease;
}
.icon-btn:hover { transform: scale(1.05); }

.empty {
  text-align: center;
  color: #607080;
  padding: 18px;
}

/* ===== FOOTER ===== */
.notif-footer {
  width: 100%;
  text-align: center;
  color: #505f70;
  padding: 16px clamp(14px, 3vw, 32px) 28px;
  font-size: 14px;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 900px) {
  .notif-header { flex-direction: column; align-items: flex-start; }
  .brand h1 { font-size: 19px; }
}
@media (max-width: 600px) {
  .card { padding: 14px; }
  .notif-table th, .notif-table td { padding: 8px; font-size: 13px; }
  .actions { flex-direction: column; align-items: stretch; width: 100%; }
  .btn { width: 100%; text-align: center; }
  .notif-container { padding: 12px; }
}
`;
