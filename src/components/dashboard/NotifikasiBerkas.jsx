import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../lib/supabaseClient";

/* ===========================
   FORMAT RUPIAH
   =========================== */

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

/* ===========================
   IMAGE UTILITIES
   =========================== */

async function loadImageAsDataURL(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}

function isImageFile(name = "") {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
}

function checkPage(doc, y, pad, needed = 40) {
  const h = doc.internal.pageSize.height;
  if (y + needed >= h - pad) {
    doc.addPage();
    return pad;
  }
  return y;
}

/* ===========================
   FETCH REPORT FULL (From Supabase)
   =========================== */

async function fetchReportFull(reportCode) {
  const { data: report, error: repErr } = await supabase
    .from("crm_reports")
    .select("*")
    .eq("report_code", reportCode)
    .single();

  if (repErr || !report) throw repErr || new Error("Report tidak ditemukan");

  const { data: armadaRows } = await supabase
    .from("crm_armada")
    .select("*")
    .eq("report_id", report.id);

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

  const totalOsHarusDibayar = rincianArmada.reduce((s, a) => {
    const x = Number(a.bayarOs);
    return s + (Number.isFinite(x) ? x : 0);
  }, 0);

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
    totalOS: totalOsHarusDibayar,
  };
}

function drawKeyValue(doc, pad, y, label, value) {
  const lineGap = 14;
  const labelText = `${label}:`;
  const valText = value ?? "-";

  doc.setFont("helvetica", "bold");
  doc.text(labelText, pad, y);

  doc.setFont("helvetica", "normal");
  const wrapped = doc.splitTextToSize(String(valText), 360);
  doc.text(wrapped, pad + 140, y);

  const lines = Math.max(1, wrapped.length);
  return y + lineGap * lines;
}

/* ===========================
   PDF GENERATOR (FINAL)
   =========================== */

async function downloadPdfFromRow(row) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pad = 36;
  let y = pad;

  /* HEADER */
  const logoDataUrl = await loadImageAsDataURL("/assets/logo-bulat.png");
  const logoSize = 34;

  doc.addImage(logoDataUrl, "PNG", pad + 523 - logoSize, y, logoSize, logoSize);

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("LAPORAN CRM / DTD", pad, y + 14);

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(
    `ID: ${row.id}  •  Validasi: ${row.step4?.statusValidasi}`,
    pad,
    y + 28
  );

  doc.line(pad, y + 36, pad + 523, y + 36);
  y += 50;

  /* STEP 1 */
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("1. Data Kunjungan", pad, y);
  y += 16;

  doc.setFont("times", "normal");
  doc.setFontSize(10);

  const step1Fields = [
    ["Tanggal & Waktu", row.step1?.tanggalWaktu],
    ["Loket", row.step1?.loket],
    [
      "Nama Petugas",
      `${row.step1?.petugasDepan} ${row.step1?.petugasBelakang}`,
    ],
    ["Perusahaan", row.step1?.perusahaan],
    ["Jenis Angkutan", row.step1?.jenisAngkutan],
    ["Nama Pemilik", row.step1?.namaPemilik],
    ["Alamat", row.step1?.alamat],
    ["No. Telepon", row.step1?.telepon],
  ];

  for (let [label, val] of step1Fields) {
    y = checkPage(doc, y, pad, 20);
    y = drawKeyValue(doc, pad, y, label, val);
  }
  y += 10;

  /* STEP 2 - ARMADA */
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  y = checkPage(doc, y, pad);
  doc.text("2. Armada", pad, y);
  y += 16;

  const rincian = row.step2.rincianArmada || [];

  const armadaBody = rincian.map((r, i) => [
    i + 1,
    r.nopol || "-",
    r.status || "-",
    `${r.tipeArmada || "-"}${r.tahun ? " (" + r.tahun + ")" : ""}`,
    formatRupiah(Number(r.bayarOs || 0)),
    r.rekomendasi || r.tindakLanjut || "-",
    Array.isArray(r.bukti) && r.bukti.length ? "" : "-",
  ]);

  const buktiImages = {}; // { "row-file": dataURL }

  for (let rIndex = 0; rIndex < rincian.length; rIndex++) {
    const buktiList = rincian[rIndex]?.bukti || [];

    for (let bIndex = 0; bIndex < buktiList.length; bIndex++) {
      const f = buktiList[bIndex];

      if (isImageFile(f.name)) {
        try {
          buktiImages[`${rIndex}-${bIndex}`] = await loadImageAsDataURL(f.url);
        } catch {}
      }
    }
  }

  autoTable(doc, {
    startY: y,
    head: [
      [
        "No",
        "Nopol",
        "Status",
        "Tipe/Tahun",
        "OS Dibayar",
        "Rekomendasi",
        "Bukti",
      ],
    ],
    body: armadaBody,
    theme: "grid",
    styles: { font: "times", fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [230, 230, 230] },

    // 1) INI PENTING → BESARKAN ROW HEIGHT SEBELUM GAMBAR
    willDrawCell: (data) => {
      if (data.column.index === 6 && data.section === "body") {
        const rIndex = data.row.index;
        const buktiList = rincian[rIndex]?.bukti || [];

        if (buktiList.length > 0) {
          data.row.height = 48; // tinggi cell fix yang MUAT GAMBAR
        }
      }
    },

    // 2) GAMBAR BUKTI DALAM CELL
    didDrawCell: (data) => {
      // Hanya kolom Bukti
      if (data.column.index !== 6 || data.cell.section !== "body") return;

      const rIndex = data.row.index;
      const buktiList = rincian[rIndex]?.bukti || [];
      if (!buktiList.length) return;

      // ---- batas cell ----
      const cellX = data.cell.x;
      const cellY = data.cell.y;
      const cellW = data.cell.width;
      const cellH = data.cell.height;

      let dx = cellX + 2; // padding kiri
      const maxH = cellH - 4; // tinggi maksimum dalam cell
      const maxW = cellW - 4; // lebar maksimum dalam cell

      buktiList.forEach((f, i) => {
        const key = `${rIndex}-${i}`;
        const url = f.url;

        // ---- jika PDF ----
        if (/\.pdf$/i.test(f.name)) {
          const size = Math.min(maxW, maxH);

          doc.setFontSize(7);
          doc.text("PDF", dx + size / 2, cellY + size / 2 + 2, {
            align: "center",
          });

          doc.rect(dx, cellY + 2, size, size);
          doc.link(dx, cellY + 2, size, size, { url });

          dx += size + 3;
          return;
        }

        // ---- jika Gambar ----
        const img = buktiImages[key];
        if (!img) return;

        // hitung ratio gambar
        const temp = new Image();
        temp.src = img;

        let iw = temp.naturalWidth || 100;
        let ih = temp.naturalHeight || 100;

        let ratio = iw / ih;
        let w = maxH * ratio;
        let h = maxH;

        // Jika terlalu lebar → kecilkan lagi
        if (w > maxW) {
          w = maxW;
          h = w / ratio;
        }

        // gambar di posisi aman dalam cell
        const cx = dx;
        const cy = cellY + (cellH - h) / 2;

        doc.addImage(img, "JPEG", cx, cy, w, h);
        doc.link(cx, cy, w, h, { url });

        dx += w + 3;
      });
    },
  });

  y = doc.lastAutoTable.finalY + 12;

  // Summary
  doc.setFont("times", "normal");
  y = checkPage(doc, y, pad);
  doc.text(`Total OS Harus Dibayar: ${formatRupiah(row.totalOS || 0)}`, pad, y);
  y += 14;
  doc.text(`Hasil Kunjungan : ${row.step2.hasilKunjungan || "-"}`, pad, y);
  y += 14;
  doc.text(`Penjelasan      : ${row.step2.penjelasanHasil || "-"}`, pad, y);
  y += 14;
  doc.text(`Janji Bayar     : ${row.step2.janjiBayar || "-"}`, pad, y);
  y += 24;

  /* STEP 3 */
  doc.setFont("times", "bold");
  doc.text("3. Upload & Penilaian", pad, y);
  y += 18;

  // ====== FILE TERLAMPIR ======
  doc.text("File Terlampir:", pad, y);
  y += 14;

  const files = [
    ...(row.step3.suratPernyataan || []),
    ...(row.step3.evidence || []),
  ];

  if (!files.length) {
    doc.setFont("times", "normal");
    doc.text("- Tidak ada file", pad, y);
    y += 14;
  } else {
    for (let f of files) {
      y = checkPage(doc, y, pad, 16);

      if (isImageFile(f.name)) {
        // tampilkan gambar
        const dataURL = await loadImageAsDataURL(f.url);
        const maxW = 140;
        const maxH = 110;

        const img2 = new Image();

        await new Promise((resolve, reject) => {
          img2.onload = resolve;
          img2.onerror = reject;
          img2.src = dataURL;
        });

        // ukuran asli
        let iw = img2.naturalWidth;
        let ih = img2.naturalHeight;
        if (!iw || !ih) {
          iw = 100;
          ih = 100;
        } // fallback

        let ratio2 = iw / ih;
        if (!isFinite(ratio2) || ratio2 <= 0) ratio2 = 1;

        // scaling aman
        let w2 = maxW;
        let h2 = w2 / ratio2;

        if (h2 > maxH) {
          h2 = maxH;
          w2 = h2 * ratio2;
        }

        doc.addImage(dataURL, "JPEG", pad, y, w2, h2);
        y += h2 + 12;
      } else {
        // tampilkan link PDF / file
        doc.setFont("times", "normal");
        doc.text(`• ${f.name}`, pad, y);
        doc.link(pad, y - 10, 200, 20, { url: f.url });
        y += 18;
      }
    }
  }

  y += 10;

  // ====== PENILAIAN ======
  doc.setFont("times", "bold");
  doc.text("Penilaian:", pad, y);
  y += 16;

  doc.setFont("times", "normal");
  const penilaian = [
    `Respon Pemilik/Pengelola: ${row.step3.responPemilik || "-"}`,
    `Ketaatan Perizinan      : ${row.step3.ketaatanPerizinan || "-"}/5`,
    `Keramaian Penumpang     : ${row.step3.keramaianPenumpang || "-"}/5`,
  ];

  penilaian.forEach((t) => {
    y = checkPage(doc, y, pad, 16);
    doc.text(t, pad, y);
    y += 14;
  });

  y += 10;

  // -----------------------------------------------------------
  // FOTO KUNJUNGAN
  // -----------------------------------------------------------
  const maxW = 180;
  const maxH = 130;

  if (row.step3.fotoKunjungan?.length) {
    doc.setFont("times", "bold");
    y = checkPage(doc, y, pad, 20);
    doc.text("Foto Kunjungan:", pad, y);
    y += 10;

    let x = pad;

    for (let src of row.step3.fotoKunjungan) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";

        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = src;
        });

        const ratio = img.naturalWidth / img.naturalHeight;

        let w = maxW;
        let h = w / ratio;

        if (h > maxH) {
          h = maxH;
          w = h * ratio;
        }

        const dataURL = await loadImageAsDataURL(src);

        // cek halaman
        y = checkPage(doc, y, pad, h + 20);

        // cek horizontal overflow
        if (x + w > pad + 523) {
          x = pad;
          y += maxH + 20;
        }

        doc.addImage(dataURL, "JPEG", x, y, w, h);
        x += w + 15;
      } catch (e) {
        console.warn("Gagal load foto:", src, e);
      }
    }

    y += maxH + 20;
  }

  // -----------------------------------------------------------
  // TANDA TANGAN (PETUGAS & PEMILIK)
  // -----------------------------------------------------------
  const ttdPetugas = row.step3?.tandaTanganPetugas;
  const ttdPemilik  = row.step3?.tandaTanganPemilik;

  if (ttdPetugas || ttdPemilik) {
    doc.setFont("times", "bold");
    y = checkPage(doc, y, pad, 40);
    doc.text("Tanda Tangan", pad, y);
    y += 12;

    const maxW = 140;
    const maxH = 90;
    let x = pad;

    // === TTD PETUGAS ===
    if (ttdPetugas) {
      const imgPetugas = await loadImageAsDataURL(ttdPetugas);
      doc.setFont("times", "normal");
      doc.text("Petugas", x, y + 12);
      doc.addImage(imgPetugas, "PNG", x, y + 18, maxW, maxH);
      x += maxW + 40;
    }

    // === TTD PEMILIK ===
    if (ttdPemilik) {
      const imgPemilik = await loadImageAsDataURL(ttdPemilik);
      doc.text("Pemilik / Pengelola", x, y + 12);
      doc.addImage(imgPemilik, "PNG", x, y + 18, maxW, maxH);
    }

    y += maxH + 30;
  }

  /* STEP 4 */
  doc.setFont("times", "bold");
  doc.text("4. Validasi", pad, y);
  y += 16;

  doc.setFont("times", "normal");

  const val = [
    `Validasi oleh : ${row.step4.validasiOleh || "-"}`,
    `Status        : ${row.step4.statusValidasi || "-"}`,
    `Waktu         : ${row.step4.waktuValidasi || "-"}`,
    `Wilayah       : ${row.step4.wilayah || "-"}`,
    `Catatan       : ${row.step4.catatanValidasi || "-"}`,
  ];

  for (let t of val) {
    y = checkPage(doc, y, pad, 16);
    doc.text(t, pad, y);
    y += 14;
  }

  y += 20;

  // -----------------------------------------------------------
  // SAVE
  // -----------------------------------------------------------
  const perusahaanSafe = (row.step1.perusahaan || "Perusahaan")
    .replace(/[^a-z0-9 ]/gi, "")
    .replace(/\s+/g, "_");

  doc.save(`Laporan_CRM_${perusahaanSafe}.pdf`);
}

function mapStatusLabel(status) {
  if (!status) return "Diproses";

  const s = String(status).toLowerCase();

  if (s === "pending" || s === "menunggu") return "Pending";

  if (
    s === "tervalidasi" ||
    s === "validated" ||
    s === "approved" ||
    s === "selesai"
  )
    return "Selesai";

  if (s === "ditolak" || s === "rejected") return "Ditolak";

  return "Diproses";
}

export default function NotifikasiBerkas() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("ts");
  const [sortDir, setSortDir] = useState("desc");

  // === FETCH NOTIFIKASI DARI SUPABASE ===
  const fetchNotif = async () => {
    const { data, error } = await supabase
      .from("crm_notifikasi")
      .select("*")
      .order("ts", { ascending: false });

    if (!error) setItems(data);
  };

  // === LOAD AWAL + REALTIME ===
  useEffect(() => {
    fetchNotif();

    const channel = supabase
      .channel("crm_notifikasi_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crm_notifikasi" },
        () => fetchNotif()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  /* ====== FILTERING ====== */
  const filtered = useMemo(() => {
    let data = [...items];
    if (q.trim()) {
      const s = q.toLowerCase();
      data = data.filter((it) => {
        const msg = [
          it?.report_id || "",
          it?.status || "",
          it?.note || "",
          it?.perusahaan || "",
          it?.ts || "",
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
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Hapus notifikasi ini?")) return;

    const { error } = await supabase
      .from("crm_notifikasi")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Gagal menghapus notifikasi.");
      return;
    }

    fetchNotif();
  }

  async function clearAll() {
    if (!confirm("Hapus SEMUA notifikasi?")) return;

    const { error } = await supabase
      .from("crm_notifikasi")
      .delete()
      .neq("id", "");

    if (error) {
      alert("Gagal menghapus semua notifikasi.");
      return;
    }

    fetchNotif();
  }

  return (
    <div className="notif-page">
      <header className="notif-header">
        <div className="brand">
          <span className="icon">📋</span>
          <h1>Notifikasi Berkas</h1>
        </div>

        <div className="actions">
          <button className="btn home" onClick={() => navigate("/")}>
            🏠 Home
          </button>
        </div>
      </header>

      <main className="notif-container">
        <section className="card">
          <h2>Cari Notifikasi</h2>
          <input
            className="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari laporan / catatan..."
          />
        </section>

        <section className="card">
          <h2>Daftar Notifikasi</h2>

          <div className="table-wrap">
            <table className="notif-table">
              <thead>
                <tr>
                  <Th label="Perusahaan" k="perusahaan" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Catatan" k="note" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Waktu" k="ts" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">Belum ada notifikasi.</td>
                  </tr>
                ) : (
                  filtered.map((it) => (
                    <tr key={it.id}>
                      <td>{it?.perusahaan || "-"}</td>
                      <td>
                        <span
                          className={`badge ${
                            mapStatusLabel(it?.status) === "Selesai"
                              ? "badge-success"
                              : mapStatusLabel(it?.status) === "Pending"
                              ? "badge-pending"
                              : "badge-process"
                          }`}
                        >
                          {mapStatusLabel(it?.status)}
                        </span>
                      </td>
                      <td>{it?.note || "-"}</td>
                      <td>{new Date(it.ts).toLocaleString()}</td>

                      <td className="aksi">
                        <button className="icon-btn" title="Hapus" onClick={() => handleDelete(it.id)}>
                          🗑️
                        </button>

                        <button
                          className="icon-btn"
                          title="Unduh Laporan PDF"
                          onClick={async () => {
                            try {
                              const rid = it?.report_id;
                              if (!rid) return alert("Report ID tidak ada.");
                              const row = await fetchReportFull(rid);
                              downloadPdfFromRow(row);
                            } catch (e) {
                              alert("Gagal unduh laporan.");
                            }
                          }}
                        >
                          📄
                        </button>
                      </td>
                    </tr>
                  ))
                )}
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


/* ===========================
    TH SORT COMPONENT
   =========================== */
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

/* PAGE ROOT */
html, body, .notif-page {
  height: 100%;
  width: 100%;
  margin: 0;
  font-family: 'Inter', sans-serif;
  background: linear-gradient(180deg, var(--baby-blue) 45%, var(--baby-yellow) 100%);
  color: var(--text-dark);
}

/* ========================= HEADER ========================= */
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

/* BUTTON GROUP */
.actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: nowrap;
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

/* ========================= MAIN AREA ========================= */
.notif-container {
  flex: 1;
  padding: 16px 24px;
  width: 100%;
  box-sizing: border-box;
  min-width: 0; 
}

/* CARD */
.card {
  background: rgba(255,255,255,0.9);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
  margin-bottom: 20px;
  width: 100%;
  max-width: none;
  min-width: 0;
}

.card h2 {
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 700;
}

/* SEARCH BOX */
.search {
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  font-size: 15px;
  box-shadow: inset 0 2px 6px rgba(180,210,255,.15);
  width: 100%;
  display: block; 
}

/* ========================= TABLE ========================= */
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

.notif-table th,
.notif-table td {
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

/* ICON BUTTONS */
.icon-btn {
  border: none;
  background: #fff;
  border-radius: 12px;
  padding: 6px 10px;
  box-shadow: var(--shadow);
  margin-right: 4px;
  transition: transform .08s ease;
  cursor: pointer;
}
.icon-btn:hover {
  transform: scale(1.05);
}

.empty {
  text-align: center;
  color: #607080;
  padding: 18px;
}

/* ========================= FOOTER ========================= */
.notif-footer {
  width: 100%;
  text-align: center;
  color: #505f70;
  padding: 16px clamp(14px, 3vw, 32px) 28px;
  font-size: 14px;
}

/* ========================= RESPONSIVE ========================= */
@media (max-width: 900px) {
  .notif-header {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 12px;
  }
  .actions {
    flex-direction: row;
    gap: 10px;
  }
  .brand h1 {
    font-size: 19px;
  }
}

@media (max-width: 600px) {
  .card { padding: 14px; }
  .notif-table th, .notif-table td {
    padding: 8px;
    font-size: 13px;
  }

  .actions {
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
    width: auto;
  }

  .btn {
    white-space: nowrap;
    text-align: center;
    padding: 8px 12px;
  }
}
/* === RESPONSIVE MOBILE FIX === */

@media (max-width: 600px) {
  .notif-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  }

  .btn {
    padding: 8px 10px;
    font-size: 12px;
  }

  .notif-table {
    min-width: 560px; /* penting biar tetap scrollable */
  }

  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .notif-table td,
  .notif-table th {
    padding: 6px;
    font-size: 12px;
    white-space: nowrap;
  }

  .badge {
    padding: 3px 6px;
    font-size: 11px;
  }

  .icon-btn {
    padding: 4px 6px;
    font-size: 12px;
  }
}
.notif-container,
.card {
  min-width: 0;
}

.search {
  width: 100%;
}
.search {
  width: 100% !important;
  max-width: none !important;
  flex: 1 !important;
}
  .card .search {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
}
  .badge-success {
  background: linear-gradient(180deg, #e6fff0, #bdf5d1);
  color: #1e7a3d;
}

.badge-pending {
  background: linear-gradient(180deg, #fff8e1, #ffe29a);
  color: #8a6d00;
}

.badge-process {
  background: linear-gradient(180deg, #eef5ff, #cfe0ff);
  color: #274c9b;
}
`;
