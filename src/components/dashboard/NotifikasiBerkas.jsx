import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../lib/supabaseClient";

const NOTIF_KEY = "crm:notif";

function loadItems() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]"); }
  catch { return []; }
}
function saveItems(items) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(items));
}

function formatRupiah(n) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);
  } catch {
    return `Rp ${n}`;
  }
}

function addSignatureImage(doc, dataUrl, x, y, w) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) return y;
  try {
    // auto height proporsional (anggap ttd landscape)
    const h = w * 0.45;
    doc.addImage(dataUrl, "PNG", x, y, w, h);
    return y + h;
  } catch (e) {
    console.warn("Gagal render ttd:", e);
    return y;
  }
}

async function fetchReportFull(reportCode) {
  // 1) ambil 1 laporan (berdasarkan report_code)
  const { data: report, error: repErr } = await supabase
    .from("crm_reports")
    .select("*")
    .eq("report_code", reportCode)
    .single();

  if (repErr || !report) throw repErr || new Error("Report tidak ditemukan");

  // 2) ambil armada detail
  const { data: armadaRows, error: armErr } = await supabase
    .from("crm_armada")
    .select("*")
    .eq("report_id", report.id);

  if (armErr) console.warn("Armada fetch error:", armErr);

  const rincianArmada = (armadaRows || []).map((a) => ({
    nopol: a.nopol ?? "",
    status: a.status ?? "",
    tipeArmada: a.tipe_armada ?? "",
    tahun: a.tahun ?? null,
    bayarOs: a.bayar_os ?? 0,
    rekomendasi: a.rekomendasi ?? "",
    tindakLanjut: a.rekomendasi ?? "",
    bukti: a.bukti || [],
  }));

  // total OS dibayar (sum bayar_os)
  const totalOsHarusDibayar = rincianArmada.reduce((sum, a) => {
    const raw = Number(a.bayarOs);
    return sum + (Number.isFinite(raw) ? raw : 0);
  }, 0);

  // 3) return row shape mirip DataFormCrm
  return {
    id: report.report_code || report.id,
    step1: report.step1 || {},
    step2: {
      ...(report.step2 || {}),
      rincianArmada,
      hasilKunjungan:
        report.step2?.hasilKunjungan ||
        report.step2?.penjelasanKunjungan ||
        report.step2?.penjelasanHasil ||
        "",
      janjiBayar: report.step2?.janjiBayar || report.step2?.janji_bayar || "-",
    },
    step3: report.step3 || {},
    step4: report.step4 || {},
    step5: report.step5 || {},
    totalOS: totalOsHarusDibayar,
  };
}

function downloadPdfFromRow(row) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pad = 36;
  let y = pad;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("LAPORAN CRM / DTD", pad, y + 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`ID: ${row.id} • Validasi: ${row.step4?.statusValidasi || "-"}`, pad, y + 34);
  y += 54;

  // STEP 1
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("1) Data Kunjungan", pad, y);
  y += 6;

  const s1 = [
    ["Tanggal & Waktu", row.step1?.tanggalWaktu || "-"],
    ["Loket", row.step1?.loket || "-"],
    ["Nama Petugas", `${row.step1?.petugasDepan || ""} ${row.step1?.petugasBelakang || ""}`.trim() || "-"],
    ["Nama Perusahaan (PT/CV)", row.step1?.perusahaan || "-"],
    ["Jenis Angkutan", row.step1?.jenisAngkutan || "-"],
    ["Nama Pemilik/Pengelola", row.step1?.namaPemilik || "-"],
    ["Alamat", row.step1?.alamat || "-"],
    ["No. Telepon/HP", row.step1?.telepon || "-"],
  ];

  autoTable(doc, {
    startY: y + 6,
    head: [["Field", "Nilai"]],
    body: s1,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 4 },
  });
  y = doc.lastAutoTable.finalY + 18;

  // STEP 2
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2) Armada", pad, y);
  y += 8;

  const rincian = row.step2?.rincianArmada || [];
  const armadaTable = rincian.map((r) => [
    r.nopol || "-",
    r.status || "-",
    formatRupiah(r.bayarOs || 0),
    r.rekomendasi || r.tindakLanjut || "-",
  ]);

  autoTable(doc, {
    startY: y + 6,
    head: [["Nopol/Kapal", "Status", "OS Dibayar", "Rekomendasi"]],
    body: armadaTable.length ? armadaTable : [["-", "-", "-", "-"]],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 4 },
  });

  y = doc.lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Hasil Kunjungan: ${row.step2?.hasilKunjungan || "-"}`, pad, y + 12);
  doc.text(`Total OS yang harus dibayar: ${formatRupiah(row.totalOS || 0)}`, pad, y + 26);
  doc.text(`Janji Bayar Tunggakan: ${row.step2?.janjiBayar || "-"}`, pad, y + 40);
  y += 60;

  // STEP 3
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3) Penilaian", pad, y);
  y += 8;

  const s3 = [
    ["Respon Pemilik/Pengelola", row.step3?.responPemilik || "-"],
    ["Ketaatan Perizinan", `${row.step3?.ketaatanPerizinan || "-"}/5`],
    ["Keramaian Penumpang", `${row.step3?.keramaianPenumpang || "-"}/5`],
  ];

  autoTable(doc, {
    startY: y + 6,
    head: [["Aspek", "Nilai"]],
    body: s3,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 4 },
  });
  y = doc.lastAutoTable.finalY + 18;

  // STEP 4
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("4) Validasi", pad, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Status: ${row.step4?.statusValidasi || "-"} • Catatan: ${row.step4?.catatanValidasi || "-"}`,
    pad,
    y + 14
  );
  y += 30;

  // STEP 5
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("5) Pesan & Saran", pad, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Pesan: ${(row.step5?.pesan || "-").substring(0, 160)}`, pad, y + 14);
  doc.text(`Saran: ${(row.step5?.saran || "-").substring(0, 160)}`, pad, y + 28);

  y += 44;

  const ttdPetugas = row.step3?.tandaTanganPetugas;
  const ttdPemilik = row.step3?.tandaTanganPemilik;

  if (ttdPetugas || ttdPemilik) {
    const pageH = doc.internal.pageSize.getHeight();
    const bottomPad = 36;

    const boxW = 220;
    const imgH = boxW * 0.45;
    const blockH = 12 + 8 + imgH + 12;

    if (y + blockH > pageH - bottomPad) {
      doc.addPage();
      y = bottomPad;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Tanda Tangan", pad, y);
    y += 12;

    const gap = 24;
    const leftX = pad;
    const rightX = pad + boxW + gap;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Petugas", leftX, y);
    doc.text("Pemilik/Pengelola", rightX, y);
    y += 8;

    const imgY = y;
    addSignatureImage(doc, ttdPetugas, leftX, imgY, boxW);
    addSignatureImage(doc, ttdPemilik, rightX, imgY, boxW);

    y = imgY + imgH + 8;
  }

  doc.save(`${row.id}_Laporan_CRM.pdf`);
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
                      <button
                        className="icon-btn"
                        title="Unduh Laporan PDF"
                        onClick={async () => {
                          try {
                            const rid = it?.meta?.reportId;
                            if (!rid) return alert("Report ID tidak ada.");
                            const row = await fetchReportFull(rid);
                            downloadPdfFromRow(row);
                          } catch (e) {
                            console.error(e);
                            alert("Gagal unduh laporan. Cek koneksi / data report.");
                          }
                        }}
                      >
                        📄
                      </button>
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
/* ===== HEADER ===== */
.notif-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(90deg, var(--baby-yellow) 0%, var(--baby-blue) 100%);
  padding: 14px 24px;
  gap: 24px;
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

.brand .icon {
  font-size: 30px;
}

.brand h1 {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
}

/* 🔥 inilah kunci biar tombol tetap sejajar */
.actions {
  display: flex;
  flex-direction: row; /* pastikan horizontal */
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  flex: 1;
  flex-wrap: nowrap; /* jangan dibungkus */
}

.actions .btn {
  white-space: nowrap;
  border: none;
  border-radius: var(--radius);
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 700;
  box-shadow: var(--shadow);
  background: #fff;
  transition: transform .1s ease, box-shadow .2s ease;
}

.actions .btn:hover {
  transform: translateY(-1px);
}

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
  .notif-header {
    flex-direction: row;
    flex-wrap: nowrap; /* ✅ jangan dibungkus */
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .actions {
    flex-direction: row;
    flex-wrap: nowrap; /* ✅ jaga tetap sejajar */
    align-items: center;
    gap: 10px;
  }
  .brand h1 { font-size: 19px; }
}

@media (max-width: 600px) {
  .card { padding: 14px; }
  .notif-table th, .notif-table td { padding: 8px; font-size: 13px; }
  
  /* ⛔ Hapus yang bikin tombol turun ke bawah */
  .actions {
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    width: auto;
  }
  .btn {
    width: auto;
    white-space: nowrap;
    text-align: center;
  }
  .notif-container { padding: 12px; }
}
`;
