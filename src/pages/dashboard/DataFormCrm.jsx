import React, { useMemo, useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const LS_KEY = "crmData";

function loadCrmLs() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

const saveCrmLs = (rows) => localStorage.setItem(LS_KEY, JSON.stringify(rows));

// ==== Notifikasi verifikasi (local only) ====
const NOTIF_KEY = "crm:notif";
function loadNotif() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]"); }
  catch { return []; }
}
function saveNotif(rows) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(rows));
}
function addVerificationNotificationLocal({ reportId, status, note, waktuValidasi }) {
  // pakai ISO biar aman diparse Date
  const iso = waktuValidasi
    ? new Date(waktuValidasi).toISOString()
    : new Date().toISOString();

  const all = loadNotif();
  const item = {
    id: `notif-${Date.now()}`,            // unik
    kind: "verification",
    title: "Laporan diverifikasi",
    message: `ID ${reportId} → ${status}${note ? ` — ${note}` : ""}`,
    ts: iso,                              // <-- ISO string
    read: false,
    meta: { reportId, status, note }
  };
  const next = [item, ...all].slice(0, 200);
  saveNotif(next);

  // beri tahu halaman yang sama tab (storage event hanya cross-tab)
  window.dispatchEvent(new Event("crm:notif:update"));
}

export default function DataFormCrm({ data = [] }) {
  const [query, setQuery] = useState("");
  const [filterJenis, setFilterJenis] = useState("Semua");
  const [filterValidasi, setFilterValidasi] = useState("Semua");
  const [selected, setSelected] = useState(null);

  const [rows, setRows] = useState(() => {
    const fromLs = Array.isArray(loadCrmLs()) ? loadCrmLs() : [];
    const base = Array.isArray(data) ? data : [];
    return [...fromLs, ...base];
  });

  const wrapRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyNote, setVerifyNote] = useState("");

  useEffect(() => {
    if (!selected) return;
    setVerifyOpen(false);
    setVerifyNote(selected?.step4?.catatanValidasi || "");
  }, [selected]);

  const handleSaveVerification = () => {
    if (!selected) return;
    const all = loadCrmLs();
    const idx = all.findIndex(r => r.id === selected.id);
    if (idx >= 0) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

      all[idx] = {
        ...all[idx],
        step4: {
          ...(all[idx].step4 || {}),
          validasiOleh: "Petugas",
          // NOTE: pakai "Tervalidasi" supaya konsisten dgn filter & badge di tabel kamu
          statusValidasi: "Tervalidasi",
          catatanValidasi: verifyNote || "",
          waktuValidasi: ts,
        },
      };
      saveCrmLs(all);
      // sinkronkan tabel & modal
      setRows(prev => {
        // update juga di state rows yang sedang dipakai tabel
        const j = prev.findIndex(r => r.id === selected.id);
        if (j < 0) return prev;
        const copy = [...prev];
        copy[j] = all[idx];
        return copy;
      });
      setSelected(all[idx]);
      addVerificationNotificationLocal({
        reportId: all[idx].id,
        status: all[idx].step4.statusValidasi,      // "Tervalidasi"
        note: all[idx].step4.catatanValidasi || "",
        waktuValidasi: all[idx].step4.waktuValidasi // supaya timestamp konsisten
      });

    }
    setVerifyOpen(false);
  };

  function handleWheel(e) {
    const el = wrapRef.current;
    if (!el) return;
    // Kalau user scroll vertikal, kita alihkan jadi horizontal
    // (kecuali dia pakai shift -> biarkan native)
    if (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }

  function onMouseDown(e) {
    const el = wrapRef.current;
    if (!el) return;
    isDown.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftStart.current = el.scrollLeft;
    el.classList.add("dragging");
  }
  function onMouseLeave() {
    isDown.current = false;
    wrapRef.current?.classList.remove("dragging");
  }
  function onMouseUp() {
    isDown.current = false;
    wrapRef.current?.classList.remove("dragging");
  }
  function onMouseMove(e) {
    const el = wrapRef.current;
    if (!isDown.current || !el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1; // kecepatan drag
    el.scrollLeft = scrollLeftStart.current - walk;
  }

  useEffect(() => {
    if (selected) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selected]);

  useEffect(() => {
    const sync = () => setRows([...loadCrmLs(), ...data]);
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [data]);

  const filtered = useMemo(() => {
    return rows.filter((d) => {
      const s1 = d?.step1 || {};
      const s2 = d?.step2 || {};
      const s4 = d?.step4 || {};
      const text = `${d?.id ?? ""} ${s1.tanggalWaktu ?? ""} ${s1.loket ?? ""} ${
        s1.petugasDepan ?? ""
      } ${s1.petugasBelakang ?? ""} ${s1.jenisAngkutan ?? ""} ${
        s1.namaPemilik ?? ""} ${s1.perusahaan ?? ""
      } ${s2.nopolAtauNamaKapal ?? ""} ${s2.statusKendaraan ?? ""} ${
        s2.janjiBayar ?? ""
      } ${s4.statusValidasi ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase());

      const matchJenis =
        filterJenis === "Semua" || s1.jenisAngkutan === filterJenis;
      const matchValidasi =
        filterValidasi === "Semua" || s4.statusValidasi === filterValidasi;
      return text && matchJenis && matchValidasi;
    });
  }, [rows, query, filterJenis, filterValidasi]);

  function handleDownloadPdf(row) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pad = 36;
    let y = pad;

    // Header kawaii
    doc.setDrawColor(147, 197, 253);
    doc.setFillColor(224, 242, 254);
    doc.roundedRect(pad, pad, 523, 60, 10, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(14, 116, 144);
    doc.setFontSize(16);
    doc.text("LAPORAN CRM / DTD", pad + 12, y + 22);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text(
      `ID: ${row.id}  •  Validasi: ${row.step4.statusValidasi}`,
      pad + 12,
      y + 40
    );
    y += 80;

    // STEP 1
    doc.setFont("helvetica", "bold");
    doc.setTextColor(2, 132, 199);
    doc.text("1) Tanggal, Petugas & Pemilik", pad, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    const s1 = [
      ["Tanggal & Waktu", row.step1.tanggalWaktu],
      ["Loket", row.step1.loket],
      [
        "Nama Petugas",
        `${row.step1.petugasDepan} ${row.step1.petugasBelakang}`,
      ],
      ["Nama Perusahaan (PT/CV)", row.step1.perusahaan],
      ["Jenis Angkutan", row.step1.jenisAngkutan],
      ["Nama Pemilik/Pengelola", row.step1.namaPemilik],
      ["Alamat", row.step1.alamat],
      ["No. Telepon/HP", row.step1.telepon],
    ];
    autoTable(doc, {
      startY: y + 6,
      head: [["Field", "Nilai"]],
      body: s1,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [186, 230, 253], textColor: 30 },
    });
    y = doc.lastAutoTable.finalY + 18;

    // STEP 2
    doc.setFont("helvetica", "bold");
    doc.setTextColor(2, 132, 199);
    doc.text("2) Armada", pad, y);
    y += 10;
    const armadaRows = (row.step2.rincianArmada || []).map((r) => [
      r.nopol,
      r.status,
      r.tindakLanjut,
    ]);
    autoTable(doc, {
      startY: y + 6,
      head: [["Nopol/Kapal", "Status", "Rekomendasi/Tindak Lanjut"]],
      body: armadaRows.length ? armadaRows : [["-", "-", "-"]],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [186, 230, 253], textColor: 30 },
    });
    y = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    const step2Text = [
      `Hasil Kunjungan: ${row.step2.hasilKunjungan || "-"}`,
      `Penjelasan: ${row.step2.penjelasanHasil || "-"}`,
      `Jumlah Tunggakan: ${formatRupiah(row.step2.tunggakan || 0)}`,
      `Janji Bayar: ${row.step2.janjiBayar || "-"}`,
    ];
    step2Text.forEach((t, i) => doc.text(t, pad, y + 14 * (i + 1)));
    y += 14 * (step2Text.length + 1);

    // STEP 3
    doc.setFont("helvetica", "bold");
    doc.setTextColor(2, 132, 199);
    doc.text("3) Upload & Penilaian", pad, y);
    y += 10;
    const s3 = [
      ["Respon Pemilik/Pengelola", row.step3.responPemilik || "-"],
      ["Ketertiban Operasional", `${row.step3.ketertibanOperasional || "-"}/5`],
      ["Ketaatan Perizinan", `${row.step3.ketaatanPerizinan || "-"}/5`],
      ["Keramaian Penumpang", `${row.step3.keramaianPenumpang || "-"}/5`],
      ["Ketaatan Uji KIR/Sertifikat", `${row.step3.ketaatanUjiKir || "-"}/5`],
    ];
    autoTable(doc, {
      startY: y + 6,
      head: [["Aspek", "Nilai"]],
      body: s3,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [186, 230, 253], textColor: 30 },
    });
    y = doc.lastAutoTable.finalY + 18;

    // STEP 4 & 5
    doc.setFont("helvetica", "bold");
    doc.setTextColor(2, 132, 199);
    doc.text("4) Validasi", pad, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(
      `Validasi oleh: ${row.step4.validasiOleh}  •  Status: ${row.step4.statusValidasi}  •  Waktu: ${row.step4.waktuValidasi}`,
      pad,
      y + 14
    );
    doc.text(`Wilayah: ${row.step4.wilayah || "-"}`, pad, y + 28);
    y += 44;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(2, 132, 199);
    doc.text("5) Pesan & Saran", pad, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(`Pesan: ${row.step5.pesan || "-"}`.substring(0, 150), pad, y + 14);
    doc.text(`Saran: ${row.step5.saran || "-"}`.substring(0, 150), pad, y + 28);

    doc.save(`${row.id}_Laporan_CRM.pdf`);
  }

  return (
    <div className="dfc-container kawaii">
      <header className="dfc-header">
        <div className="dfc-title">
          <KawaiiCloud />
          <h1>Hasil Input Form CRM</h1>
        </div>
        <p className="dfc-subtitle">
          5 langkah: Kunjungan • Kendaraan • Upload & Penilaian • Validasi •
          Pesan & Saran
        </p>
        <div style={{ marginLeft: "auto" }}>
          <button
            className="btn btn-soft"
            onClick={() => {
              localStorage.removeItem(LS_KEY);
              setRows([...(Array.isArray(data) ? data : [])]);
            }}
          >
            Bersihkan Data Lokal
          </button>
        </div>
      </header>

      <section className="dfc-controls">
        <div className="dfc-search">
          <IconSearch />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari ID, petugas, pemilik, nopol, status, dll..."
          />
        </div>
        <div className="dfc-filters">
          <label>
            Jenis Angkutan
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
            >
              <option>Semua</option>
              <option>Kendaraan Bermotor Umum</option>
              <option>Bus</option>
              <option>Kapal</option>
              <option>Truk</option>
              <option>Taksi</option>
            </select>
          </label>
          <label>
            Status Validasi
            <select
              value={filterValidasi}
              onChange={(e) => setFilterValidasi(e.target.value)}
            >
              <option>Semua</option>
              <option>Tervalidasi</option>
              <option>Menunggu</option>
              <option>Ditolak</option>
            </select>
          </label>
        </div>
      </section>

      <section
        className="dfc-table-wrap"
        ref={wrapRef}
        onWheel={selected ? undefined : handleWheel}
        onMouseDown={selected ? undefined : onMouseDown}
        onMouseLeave={selected ? undefined : onMouseLeave}
        onMouseUp={selected ? undefined : onMouseUp}
        onMouseMove={selected ? undefined : onMouseMove}
      >
        <table className="dfc-table">
          <thead>
            <tr>
              <th>PENGENAL</th>
              <th>Tanggal & Waktu</th>
              <th>Loket</th>
              <th>Petugas</th>
              <th>Jenis</th>
              <th>Pemilik / Pengelola</th>
              <th>Nopol/Nama Kapal</th>
              <th>Status Kendaraan</th>
              <th>Janji Bayar</th>
              <th>Rating (Ops/Perizinan/Pnp)</th>
              <th>Validasi</th>
              <th style={{ textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.step1.tanggalWaktu}</td>
                <td>{d.step1.loket}</td>
                <td>
                  {d.step1.petugasDepan} {d.step1.petugasBelakang}
                </td>
                <td>{d.step1.jenisAngkutan}</td>
                <td>{d.step1.namaPemilik}</td>
                <td>{d.step2.nopolAtauNamaKapal}</td>
                <td>
                  <Badge
                    tone={
                      d.step2.statusKendaraan === "Beroperasi" ||
                      d.step2.statusKendaraan === "Aktif"
                        ? "green"
                        : "gray"
                    }
                  >
                    {d.step2.statusKendaraan}
                  </Badge>
                </td>
                <td>{d.step2.janjiBayar}</td>
                <td>
                  {d.step3.ketertibanOperasional}/5 •{" "}
                  {d.step3.ketaatanPerizinan}/5 • {d.step3.keramaianPenumpang}/5
                </td>
                <td>
                  <Badge
                    tone={
                      d.step4.statusValidasi === "Tervalidasi"
                        ? "green"
                        : d.step4.statusValidasi === "Menunggu"
                        ? "amber"
                        : "red"
                    }
                  >
                    {d.step4.statusValidasi}
                  </Badge>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="btn btn-detail"
                    onClick={() => setSelected(d)}
                  >
                    Detail
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="dfc-empty">
                  Tidak ada data yang cocok dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Modal Detail */}
      {selected && (
        <div className="dfc-modal" role="dialog" aria-modal="true">
          <div className="dfc-modal-card">
            <div className="dfc-modal-head">
              <div className="dfc-drawer-title">
                <h2>
                  Detail Laporan — {selected.id}
                  {selected.step4?.statusValidasi && (
                    <span className="badge" style={{ marginLeft: 8 }}>
                      {selected.step4.statusValidasi}
                    </span>
                  )}
                </h2>
              </div>
              <div className="dfc-modal-actions">
                <button
                  className="btn btn-soft"
                  onClick={() => handleDownloadPdf(selected)}
                >
                  Download PDF
                </button>
                <button className="btn success" onClick={() => setVerifyOpen(v => !v)}>
                  {verifyOpen ? "Tutup Verifikasi" : "Verifikasi"}
                </button>
                <button className="btn" onClick={() => setSelected(null)}>
                  Tutup
                </button>
              </div>
            </div>

            <div className="dfc-modal-body">
              {verifyOpen && (
                <Section title="Verifikasi">
                  <div className="field" style={{gridColumn: "1 / -1"}}>
                    <label>Catatan Verifikasi (opsional)</label>
                    <textarea
                      rows={3}
                      placeholder="Boleh dikosongkan…"
                      value={verifyNote}
                      onChange={(e) => setVerifyNote(e.target.value)}
                    />
                    <small className="muted">
                      Menyimpan akan mengubah status menjadi <b>Tervalidasi</b>.
                    </small>
                  </div>
                  <div className="dfc-modal-actions" style={{marginTop: 8}}>
                    <button className="btn ghost" onClick={() => setVerifyOpen(false)}>Batal</button>
                    <button className="btn primary" onClick={handleSaveVerification}>Simpan Verifikasi</button>
                  </div>
                </Section>
              )}
              {/* Step 1 */}
              <Section title="1) Data Kunjungan">
                <dl className="grid-2">
                  <Item
                    label="Tanggal & Waktu Kunjungan"
                    value={selected.step1.tanggalWaktu}
                  />
                  <Item label="Loket" value={selected.step1.loket} />
                  <Item
                    label="Nama Petugas"
                    value={`${selected.step1.petugasDepan} ${selected.step1.petugasBelakang}`}
                  />
                  <Item label="Nama Perusahaan (PT/CV)" value={selected.step1.perusahaan} />
                  <Item
                    label="Jenis Angkutan"
                    value={selected.step1.jenisAngkutan}
                  />
                  <Item
                    label="Nama Pemilik/Pengelola"
                    value={selected.step1.namaPemilik}
                  />
                  <Item label="Alamat" value={selected.step1.alamat} />
                  <Item label="No. Telepon/HP" value={selected.step1.telepon} />
                </dl>
              </Section>

              {/* Step 2 */}
              <Section title="2) Armada">
                <dl className="grid-2">
                  <Item
                    label="Nopol/Nama Kapal"
                    value={selected.step2.nopolAtauNamaKapal}
                  />
                  <Item
                    label="Status Kendaraan"
                    value={selected.step2.statusKendaraan}
                  />
                  <Item
                    label="Hasil Kunjungan"
                    value={selected.step2.hasilKunjungan}
                  />
                  <Item
                    label="Jumlah Tunggakan"
                    value={formatRupiah(selected.step2.tunggakan || 0)}
                  />
                  <Item
                    label="Janji Bayar Tunggakan"
                    value={selected.step2.janjiBayar}
                  />
                  <Item
                    label="Rekomendasi"
                    value={selected.step2.rekomendasi}
                  />
                </dl>
              </Section>

              {/* Step 3 */}
              <Section title="3) Upload & Penilaian">
                <div className="gallery">
                  {selected.step3.fotoKunjungan?.map((src, idx) => {
                    const href = typeof src === "string" ? src : src?.url;
                    if (!href) return null;
                    return (
                      <a
                        className="thumb"
                        key={idx}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img src={href} alt={`Foto Kunjungan ${idx + 1}`} />
                      </a>
                    );
                  })}
                </div>
                <div className="files">
                  {selected.step3.suratPernyataan?.map((f, i) => (
                    <a key={i} href={f.url} className="file-pill">
                      <IconFile /> {f.name}
                    </a>
                  ))}
                  {selected.step3.evidence?.map((f, i) => (
                    <a key={i} href={f.url} className="file-pill">
                      <IconFile /> {f.name}
                    </a>
                  ))}
                </div>
                <div className="ratings">
                  <Rating
                    label="Respon Pemilik/Pengelola"
                    value={selected.step3.responPemilik}
                  />
                  <Rating
                    label="Ketertiban Operasional"
                    value={`${selected.step3.ketertibanOperasional}/5`}
                  />
                  <Rating
                    label="Ketaatan Perizinan"
                    value={`${selected.step3.ketaatanPerizinan}/5`}
                  />
                  <Rating
                    label="Keramaian Penumpang"
                    value={`${selected.step3.keramaianPenumpang}/5`}
                  />
                </div>
              </Section>

              {/* Step 4 */}
              <Section title="4) Pesan & Saran">
                <div className="notes">
                  <Note label="Pesan" text={selected.step5.pesan} />
                  <Note label="Saran" text={selected.step5.saran} />
                </div>
              </Section>
            </div>
          </div>
        </div>
      )}

      <style>{`
      :root{
        --sky-50:#f0f9ff; --sky-100:#e0f2fe; --sky-200:#bae6fd; --sky-300:#93c5fd; --sky-400:#60a5fa; --sky-500:#3b82f6;
        --pink-200:#fbcfe8; --yellow-200:#fef08a; --mint-200:#bbf7d0; --text:#0f172a; --muted:#475569; --border:#cbd5e1;
        --card:#ffffff; --ring:#93c5fd; --shadow:0 10px 40px rgba(147,197,253,.35);
      }

      .kawaii{ background:linear-gradient(180deg, var(--sky-50), var(--sky-100)); min-height:100vh; }
      .dfc-container{ color:var(--text); padding:24px; width:100%; box-sizing:border-box; max-width:900px; margin:0 auto; }
      .dfc-header{ display:flex; flex-direction:column; gap:6px; margin-bottom:18px; }
      .dfc-title{ display:flex; align-items:center; gap:10px; }
      .dfc-title h1{ font-size:26px; margin:0; }
      .dfc-subtitle{ margin:0; color:var(--muted); }

      .dfc-controls{ display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between; margin:16px 0 10px; }
      .dfc-search{ flex:1 1 420px; display:flex; align-items:center; gap:8px; background:var(--card); border:2px solid var(--sky-200); border-radius:16px; padding:10px 12px; box-shadow:var(--shadow); }
      .dfc-search input{ flex:1; background:transparent; color:var(--text); border:none; outline:none; font-size:14px; }
      .dfc-filters{ display:flex; gap:12px; }
      .dfc-filters label{ display:flex; flex-direction:column; gap:6px; font-size:12px; color:var(--muted); }
      .dfc-filters select{ background:var(--card); color:var(--text); border:2px solid var(--sky-200); border-radius:14px; padding:8px 10px; box-shadow:var(--shadow); }

      /* ====== TABLE SCROLL AREA (satu definisi saja) ====== */
      .dfc-table-wrap{
        max-width:100%;
        width:100%;
        overflow-x:auto;
        overflow-y:auto;         /* vertikal aktif */
        max-height:60vh;         /* batasi tinggi area tabel */
        position:relative;
        border:2px solid var(--sky-200);
        border-radius:18px;
        background:var(--card);
        box-shadow:var(--shadow);
        cursor:grab;
      }
      .dfc-table-wrap.dragging{ cursor:grabbing; }
      .dfc-table-wrap::-webkit-scrollbar{ height:10px; }
      .dfc-table-wrap::-webkit-scrollbar-thumb{ background:var(--sky-300); border-radius:999px; }
      .dfc-table-wrap::-webkit-scrollbar-track{ background:var(--sky-100); border-radius:999px; }
      .dfc-table-wrap::after{
        content:""; position:absolute; top:0; right:0; width:32px; height:100%;
        pointer-events:none; background:linear-gradient(to left, rgba(147,197,253,.45), transparent);
        opacity:.6; transition:opacity .2s;
      }
      .dfc-table-wrap:hover::after{ opacity:0; }

      table.dfc-table{
        width:100%;
        min-width:1000px;         /* boleh discroll kalau sempit */
        border-collapse:separate; border-spacing:0; table-layout:fixed;
      }
      .dfc-table thead th{
        position:sticky; top:0;
        background:linear-gradient(180deg, var(--sky-100), var(--sky-50));
        color:#0ea5e9; font-weight:700; text-align:left;
        padding:10px 12px; border-bottom:2px solid var(--sky-200);
        font-size:12px; letter-spacing:.2px; white-space:nowrap;
      }
      .dfc-table tbody td{
        padding:10px 12px; line-height:1.45; border-bottom:1px dashed var(--border);
        font-size:12px; color:var(--text); vertical-align:top; word-break:break-word; white-space:normal;
      }
      .dfc-table tbody tr:hover{ background:var(--sky-50); }
      .dfc-empty{ text-align:center; padding:24px; color:var(--muted); }

      /* column widths */
      .dfc-table th:nth-child(1),  .dfc-table td:nth-child(1){ width:110px; white-space:nowrap; }
      .dfc-table th:nth-child(2),  .dfc-table td:nth-child(2){ width:190px; }
      .dfc-table th:nth-child(3),  .dfc-table td:nth-child(3){ width:130px; white-space:nowrap; }
      .dfc-table th:nth-child(4),  .dfc-table td:nth-child(4){ width:170px; }
      .dfc-table th:nth-child(5),  .dfc-table td:nth-child(5){ width:180px; }
      .dfc-table th:nth-child(6),  .dfc-table td:nth-child(6){ width:210px; }
      .dfc-table th:nth-child(7),  .dfc-table td:nth-child(7){ width:180px; }
      .dfc-table th:nth-child(8),  .dfc-table td:nth-child(8){ width:140px; white-space:nowrap; }
      .dfc-table th:nth-child(9),  .dfc-table td:nth-child(9){ width:170px; }
      .dfc-table th:nth-child(10), .dfc-table td:nth-child(10){ width:200px; }
      .dfc-table th:nth-child(11), .dfc-table td:nth-child(11){ width:130px; white-space:nowrap; }
      .dfc-table th:nth-child(12), .dfc-table td:nth-child(12){ width:90px; white-space:nowrap; text-align:right; }
      @media (max-width:1024px){ table.dfc-table{ min-width:1100px; } }

      .btn{ background:var(--sky-400); color:#fff; border:none; padding:9px 14px; border-radius:999px; cursor:pointer; font-weight:700; box-shadow:var(--shadow); transition:transform .06s ease, filter .15s ease; }
      .btn:hover{ filter:brightness(1.05); transform:translateY(-1px); }
      .btn-detail::after{ content:"★"; margin-left:6px; }
      .btn-soft{ background:#fff; color:#0284c7; border:2px solid var(--sky-300); }

      .badge{ display:inline-flex; align-items:center; gap:6px; font-size:12px; padding:6px 10px; border-radius:999px; border:2px solid var(--sky-200); background:var(--sky-50); }
      .badge.dot::before{ content:""; width:8px; height:8px; border-radius:50%; display:inline-block; }
      .badge.green.dot::before{ background:#22c55e; }
      .badge.gray.dot::before{ background:#94a3b8; }
      .badge.amber.dot::before{ background:#f59e0b; }
      .badge.red.dot::before{ background:#ef4444; }

      /* ====== MODAL (satu definisi card, scroll di body) ====== */
      .dfc-modal{
        position:fixed; inset:0; background:rgba(14,165,233,.18); backdrop-filter:blur(2px);
        display:flex; align-items:center; justify-content:center; padding:18px; z-index:50; animation:fadeIn .15s ease-out; overscroll-behavior: contain;
      }
      .dfc-modal-card{
        width:min(980px, 100%);
        max-height:92vh;
        display:flex; flex-direction:column;
        overflow:hidden;                   /* penting: jangan scroll di card */
        background:var(--card);
        border:2px solid var(--sky-200);
        border-radius:24px;
        box-shadow:0 30px 120px rgba(2,132,199,.35);
      }
      .dfc-modal-head{
        position:sticky; top:0; z-index:1;
        display:flex; justify-content:space-between; align-items:center; gap:12px; padding:16px;
        background:linear-gradient(180deg, var(--sky-50), rgba(255,255,255,.9)); border-bottom:2px solid var(--sky-200);
        will-change: transform;transform: translateZ(0);
      }
      .dfc-modal-actions{ display:flex; gap:10px; }
      .dfc-modal-body{
        flex:1 1 auto;
        min-height:0;                      
        overflow:auto;                     
        -webkit-overflow-scrolling:touch;
        padding-bottom:12px;
        overscroll-behavior: contain;
        touch-action: pan-y;
      }
      .dfc-modal-body img{ max-width:100%; height:auto; display:block; }

      .section{ padding:16px; border-bottom:1px dashed var(--border); }
      .section h3{ margin:0 0 10px; font-size:16px; color:#0284c7; display:flex; align-items:center; gap:8px; }
      .grid-2{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:10px 16px; }
      @media (max-width:720px){ .grid-2{ grid-template-columns:1fr; } }
      .item{ display:flex; flex-direction:column; gap:4px; background:var(--sky-50); border:2px dashed var(--sky-200); border-radius:16px; padding:10px; }
      .item label{ color:var(--muted); font-size:11px; }
      .item .value{ font-size:13px; }

      .gallery{ display:flex; flex-wrap:wrap; gap:10px; margin-bottom:10px; }
      .thumb{ width:140px; height:88px; border-radius:14px; overflow:hidden; border:2px solid var(--sky-200); display:block; box-shadow:var(--shadow); }
      .thumb img{ width:100%; height:100%; object-fit:cover; display:block; }

      .files{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
      .file-pill{ display:inline-flex; align-items:center; gap:8px; padding:8px 10px; border:2px solid var(--sky-200); border-radius:999px; text-decoration:none; color:var(--text); background:var(--sky-50); }

      .ratings{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:10px; }
      @media (max-width:720px){ .ratings{ grid-template-columns:1fr; } }
      .rating{ background:var(--sky-50); border:2px dashed var(--sky-200); border-radius:16px; padding:10px; display:flex; justify-content:space-between; align-items:center; }

      .notes{ display:grid; grid-template-columns:1fr; gap:12px; }
      .note{ background:linear-gradient(180deg, var(--pink-200), var(--yellow-200)); border:2px solid var(--sky-200); border-radius:16px; padding:12px; }
      .note strong{ display:block; color:#0ea5e9; font-size:12px; margin-bottom:6px; }

      @keyframes fadeIn{ from{opacity:0} to{opacity:1} }
      .dfc-modal {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .dfc-modal-card {
        background: white;
        width: 90%;
        max-width: 800px;
        max-height: 90vh; /* batas tinggi modal */
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .dfc-modal-body {
        padding: 1rem 1.5rem;
        overflow-y: auto; /* scroll isi */
        flex: 1; /* biar isi bisa fleksibel */
      }
`}</style>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="section">
      <h3>🌈 {title}</h3>
      {children}
    </section>
  );
}

function Item({ label, value }) {
  return (
    <div className="item">
      <label>{label}</label>
      <div className="value">{value || "-"}</div>
    </div>
  );
}

function Rating({ label, value }) {
  const numeric = (() => {
    if (typeof value === "string" && value.endsWith("/5")) {
      const n = Number(value.replace("/5", ""));
      return Number.isFinite(n) ? n : null;
    }
    if (typeof value === "number") return value;
    return null;
  })();
}

function Note({ label, text }) {
  return (
    <div className="note">
      <strong>{label}</strong>
      <div>{text ?? "-"}</div>
    </div>
  );
}

function Badge({ tone = "gray", children }) {
  return <span className={`badge dot ${tone}`}>{children}</span>;
}

function Star({ filled }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "#60a5fa" : "none"}
      stroke="#60a5fa"
      strokeWidth="1.5"
      style={{ opacity: filled ? 1 : 0.35 }}
    >
      <path d="M12 3l2.9 5.88 6.5.95-4.7 4.58 1.1 6.42L12 18.9 6.2 20.83l1.1-6.42-4.7-4.58 6.5-.95L12 3z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0284c7"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-3.5-3.5" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0ea5e9"
      strokeWidth="1.8"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function KawaiiCloud() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#93c5fd">
      <path d="M6 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.2A4.5 4.5 0 1 1 19 18H6z" />
      <circle cx="9" cy="13.5" r=".8" fill="#0f172a" />
      <circle cx="12.5" cy="13.5" r=".8" fill="#0f172a" />
      <path
        d="M9.2 15.6c1.2 1 2.4 1 3.6 0"
        stroke="#0f172a"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

function formatRupiah(n) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rp ${n}`;
  }
}
