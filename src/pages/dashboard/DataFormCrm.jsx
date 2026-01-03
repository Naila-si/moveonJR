import React, { useMemo, useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

async function addVerificationNotification({
  reportId,
  status,
  note,
  waktuValidasi,
  perusahaan,
}) {
  const ts = waktuValidasi
    ? new Date(waktuValidasi).toISOString()
    : new Date().toISOString();

  const { data, error } = await supabase.from("crm_notifikasi").insert([
    {
      report_id: reportId,
      perusahaan,
      status,
      note,
      ts,
      payload: { reportId, status, note, perusahaan },
    },
  ]);

  if (error) console.error("Gagal insert notif:", error);
}

export default function DataFormCrm() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const [filterJenis, setFilterJenis] = useState("Semua");
  const [filterValidasi, setFilterValidasi] = useState("Semua");
  const [selected, setSelected] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      setErrorMsg("");

      try {
        // 1) Ambil laporan (tanpa armada detail)
        const { data: remote, error } = await supabase
          .from("crm_reports_with_total_os")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Supabase error:", error);
          setErrorMsg("Gagal mengambil data dari server.");
          setRows([]);
          setLoading(false);
          return;
        }

        const reports = remote || [];
        const reportIds = reports.map((r) => r.id).filter(Boolean);

        // 2) Ambil detail armada dari tabel crm_armada, untuk semua report_id
        let armadaByReport = new Map();

        if (reportIds.length > 0) {
          const { data: armadaRows, error: armadaErr } = await supabase
            .from("crm_armada")
            .select("*")
            .in("report_id", reportIds);

          if (armadaErr) {
            console.error("Supabase armada error:", armadaErr);
          } else {
            (armadaRows || []).forEach((row) => {
              const rid = row.report_id;
              if (!armadaByReport.has(rid)) armadaByReport.set(rid, []);
              armadaByReport.get(rid).push(row);
            });
          }
        }

        // 3) Map ke shape yang dipakai DataFormCrm
        const mapped = (remote || []).map((r) => {
          const armadaRows = armadaByReport.get(r.id) || [];

          const rincianArmada = armadaRows.map((a) => ({
            nopol: a.nopol ?? "",
            status: a.status ?? "",
            tipeArmada: a.tipe_armada ?? "",
            tahun: a.tahun ?? null,
            bayarOs: a.bayar_os ?? 0,
            rekomendasi: a.rekomendasi ?? "",
            tindakLanjut: a.rekomendasi ?? "",
            bukti: a.bukti || [],
          }));

          return {
            // id untuk ditampilkan (kode laporan)
            id: r.report_code || r.id,
            // simpan id asli tabel crm_reports untuk update/verifikasi
            dbId: r.id,
            step1: r.step1 || {},
            step2: {
              ...(r.step2 || {}),
              hasilKunjungan:
                r.step2?.hasilKunjungan ||
                r.step2?.penjelasanKunjungan ||
                r.step2?.penjelasanHasil ||
                "",
              janjiBayar: r.step2?.janjiBayar || r.step2?.janji_bayar || "-",
              rincianArmada, // <-- full list dari crm_armada
            },
            step3: r.step3 || {},
            step4: r.step4 || {},
            totalOS: Number(r.total_os_dibayar || 0),
          };
        });

        setRows(mapped);
      } catch (e) {
        console.error("Supabase exception:", e);
        setErrorMsg("Terjadi kesalahan saat menghubungi server.");
        setRows([]);
      }

      setLoading(false);
    }

    fetchReports();
  }, []);

  const wrapRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  function handleWheel(e) {
    const el = wrapRef.current;
    if (!el) return;
    if (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
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
    const walk = (x - startX.current) * 1;
    el.scrollLeft = scrollLeftStart.current - walk;
  }

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyNote, setVerifyNote] = useState("");
  const [verifyStatus, setVerifyStatus] = useState("Tervalidasi");
  useEffect(() => {
    if (!selected) return;

    setVerifyOpen(false);
    setVerifyNote(selected?.step4?.catatanValidasi || "");
    setVerifyStatus(selected?.step4?.statusValidasi || "Pending");
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    setVerifyOpen(false);
    setVerifyNote(selected?.step4?.catatanValidasi || "");
  }, [selected]);

  useEffect(() => {
    if (selected) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selected]);

  const handleSaveVerification = async () => {
    if (!selected || !selected.dbId) return;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const newStep4 = {
      ...(selected.step4 || {}),
      validasiOleh: "Petugas",
      statusValidasi: verifyStatus,   // ⬅️ LANGSUNG DARI DROPDOWN
      catatanValidasi: verifyNote || "",
      waktuValidasi: ts,
    };

    const { data: updated, error } = await supabase
      .from("crm_reports")
      .update({ step4: newStep4 })
      .eq("id", selected.dbId)
      .select("*")
      .single();

    if (error) {
      alert("Gagal menyimpan verifikasi.");
      return;
    }

    const finalStep4 = updated?.step4 || newStep4;

    setRows((prev) =>
      prev.map((row) =>
        row.dbId === selected.dbId ? { ...row, step4: finalStep4 } : row
      )
    );

    setSelected((prev) => (prev ? { ...prev, step4: finalStep4 } : prev));

    await addVerificationNotification({
      reportId: selected.id,
      status: finalStep4.statusValidasi,
      note: finalStep4.catatanValidasi || "",
      waktuValidasi: finalStep4.waktuValidasi,
      perusahaan: selected.step1?.perusahaan || "-",
    });

    setVerifyOpen(false);
  };

  useEffect(() => {
    if (selected) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selected]);

  const filtered = useMemo(() => {
    return rows.filter((d) => {
      const s1 = d?.step1 || {};
      const s2 = d?.step2 || {};
      const s4 = d?.step4 || {};

      const rincian = Array.isArray(s2.rincianArmada) ? s2.rincianArmada : [];

      const text = `${d?.id ?? ""} ${s1.tanggalWaktu ?? ""} ${s1.loket ?? ""} ${
        s1.petugasDepan ?? ""
      } ${s1.petugasBelakang ?? ""} ${s1.jenisAngkutan ?? ""} ${
        s1.namaPemilik ?? ""
      } ${s1.perusahaan ?? ""} ${s2.nopolAtauNamaKapal ?? ""} ${
        s2.statusKendaraan ?? ""
      } ${s2.janjiBayar ?? ""} ${s4.statusValidasi ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase());

      const matchJenis =
        filterJenis === "Semua" || s1.jenisAngkutan === filterJenis;
      const matchValidasi =
        filterValidasi === "Semua" || s4.statusValidasi === filterValidasi;

      return text && matchJenis && matchValidasi;
    });
  }, [rows, query, filterJenis, filterValidasi]);

  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);

  // reset ke halaman 1 kalau filter / search berubah
  useEffect(() => {
    setPage(1);
  }, [query, filterJenis, filterValidasi, rows.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  async function loadImageAsDataURL(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // penting kalau src dari url
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

  function ensureSpace(doc, neededHeight, pad, y) {
    const pageHeight = doc.internal.pageSize.height;
    if (y + neededHeight > pageHeight - pad) {
      doc.addPage();
      return pad; // reset y di halaman baru
    }
    return y;
  }

  function checkPage(doc, y, pad, needed = 40) {
    const pageHeight = doc.internal.pageSize.height;
    if (y + needed >= pageHeight - pad) {
      doc.addPage();
      return pad;
    }
    return y;
  }

  function isImageFile(name = "") {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
  }

  async function handleDownloadPdf(row) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pad = 36;
    let y = pad;

    // -----------------------------------------------------------
    // HEADER
    // -----------------------------------------------------------
    const logoDataUrl = await loadImageAsDataURL("/assets/logo-bulat.png");
    const logoSize = 34;

    doc.addImage(
      logoDataUrl,
      "PNG",
      pad + 523 - logoSize,
      y,
      logoSize,
      logoSize
    );

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("LAPORAN CRM / DTD", pad, y + 14);

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(
      `ID: ${row.id}  •  Validasi: ${row.step4.statusValidasi}`,
      pad,
      y + 28
    );

    doc.line(pad, y + 36, pad + 523, y + 36);
    y += 50;

    // -----------------------------------------------------------
    // STEP 1
    // -----------------------------------------------------------
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    y = checkPage(doc, y, pad);
    doc.text("1. Data Kunjungan", pad, y);
    y += 16;

    doc.setFont("times", "normal");
    doc.setFontSize(10);

    const step1Fields = [
      ["Tanggal & Waktu", row.step1.tanggalWaktu],
      ["Loket", row.step1.loket],
      [
        "Nama Petugas",
        `${row.step1.petugasDepan} ${row.step1.petugasBelakang}`,
      ],
      ["Perusahaan", row.step1.perusahaan],
      ["Jenis Angkutan", row.step1.jenisAngkutan],
      ["Nama Pemilik", row.step1.namaPemilik],
      ["Alamat", row.step1.alamat],
      ["No. Telepon", row.step1.telepon],
    ];

    for (let [label, val] of step1Fields) {
      y = checkPage(doc, y, pad, 20);
      y = drawKeyValue(doc, pad, y, label, val);
    }
    y += 10;

    // -----------------------------------------------------------
    // STEP 2 - ARMADA
    // -----------------------------------------------------------
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    y = checkPage(doc, y, pad);
    doc.text("2. Armada", pad, y);
    y += 16;

    const rincian = row.step2.rincianArmada || [];
    // ==== STEP 2 - ARMADA ====

// Build table text (basic)
const armadaBody = rincian.map((r, i) => [
  i + 1,
  r.nopol || "-",
  r.status || "-",
  `${r.tipeArmada || "-"}${r.tahun ? " (" + r.tahun + ")" : ""}`,
  formatRupiah(Number(r.bayarOs || 0)),
  r.rekomendasi || r.tindakLanjut || "-",
  (Array.isArray(r.bukti) && r.bukti.length) ? "" : "-"
]);

  // ==== PRELOAD BUKTI Gambar untuk ARMADA ====
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
    head: [[
      "No", "Nopol", "Status", "Tipe/Tahun",
      "OS Dibayar", "Rekomendasi", "Bukti"
    ]],
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
          doc.text("PDF", dx + size / 2, cellY + size / 2 + 2, { align: "center" });

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
    }
  });

  y = doc.lastAutoTable.finalY + 12;

    // Summary
    doc.setFont("times", "normal");
    y = checkPage(doc, y, pad);
    doc.text(
      `Total OS Harus Dibayar: ${formatRupiah(row.totalOS || 0)}`,
      pad,
      y
    );
    y += 14;
    doc.text(`Hasil Kunjungan : ${row.step2.hasilKunjungan || "-"}`, pad, y);
    y += 14;
    doc.text(`Penjelasan      : ${row.step2.penjelasanHasil || "-"}`, pad, y);
    y += 14;
    doc.text(`Janji Bayar     : ${row.step2.janjiBayar || "-"}`, pad, y);
    y += 24;

    // -----------------------------------------------------------
    // STEP 3 – Upload & Penilaian
    // -----------------------------------------------------------
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
          if (!iw || !ih) { iw = 100; ih = 100; } // fallback

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
    const ttdPemilik = row.step3?.tandaTanganPemilik;

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
        try {
          const imgPetugas = await loadImageAsDataURL(ttdPetugas);

          doc.setFont("times", "normal");
          doc.text("Petugas", x, y + 12);

          doc.addImage(
            imgPetugas,
            "PNG",
            x,
            y + 18,
            maxW,
            maxH,
            undefined,
            "FAST"
          );

          x += maxW + 40;
        } catch (e) {
          console.warn("Gagal load TTD Petugas", e);
        }
      }

      // === TTD PEMILIK ===
      if (ttdPemilik) {
        try {
          const imgPemilik = await loadImageAsDataURL(ttdPemilik);

          doc.setFont("times", "normal");
          doc.text("Pemilik / Pengelola", x, y + 12);

          doc.addImage(
            imgPemilik,
            "PNG",
            x,
            y + 18,
            maxW,
            maxH,
            undefined,
            "FAST"
          );
        } catch (e) {
          console.warn("Gagal load TTD Pemilik", e);
        }
      }

      y += maxH + 30;
    }
    // -----------------------------------------------------------
    // STEP 4 – Validasi
    // -----------------------------------------------------------
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

  return (
    <div className="dfc-container kawaii">
      <header className="dfc-header">
        <div className="dfc-title">
          <KawaiiCloud />
          <h1>Hasil Input Form CRM</h1>
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
            {paginated.map((d) => {
              const s2 = d.step2 || {};
              const rincian = Array.isArray(s2.rincianArmada)
                ? s2.rincianArmada
                : [];

              const semuaNopol = rincian.map((r) => r.nopol).filter(Boolean);

              const totalArmada =
                semuaNopol.length || (s2.nopolAtauNamaKapal ? 1 : 0);

              const nopolDisplay =
                semuaNopol.length === 0
                  ? s2.nopolAtauNamaKapal || "-"
                  : semuaNopol.length <= 2
                  ? semuaNopol.join(", ")
                  : `${semuaNopol[0]}, ${semuaNopol[1]} (+${
                      semuaNopol.length - 2
                    } armada)`;

              const statusDisplay =
                totalArmada <= 1
                  ? s2.statusKendaraan || "-"
                  : `Lihat detail (${totalArmada} armada)`;

              const statusTone =
                s2.statusKendaraan === "Beroperasi" ||
                s2.statusKendaraan === "Aktif"
                  ? "green"
                  : "gray";

              return (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.step1.tanggalWaktu}</td>
                  <td>{d.step1.loket}</td>
                  <td>
                    {d.step1.petugasDepan} {d.step1.petugasBelakang}
                  </td>
                  <td>{d.step1.jenisAngkutan}</td>
                  <td>{d.step1.namaPemilik}</td>

                  {/* NOPOL: ringkas + info jumlah armada */}
                  <td>
                    {nopolDisplay}
                    {totalArmada > 1 && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#64748b",
                          marginTop: 2,
                        }}
                      >
                        Total {totalArmada} armada
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td>
                    <Badge tone={statusTone}>{statusDisplay}</Badge>
                  </td>

                  <td>{d.step2.janjiBayar}</td>
                  <td>
                    {d.step3.ketertibanOperasional}/5 •{" "}
                    {d.step3.ketaatanPerizinan}/5 • {d.step3.keramaianPenumpang}
                    /5
                  </td>
                  <td>
                    <Badge
                      tone={
                        d.step4.statusValidasi === "Tervalidasi"
                          ? "green"
                          : d.step4.statusValidasi === "Pending"
                          ? "blue"
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
              );
            })}
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
      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <div style={{ fontSize: 12, color: "#475569" }}>
            Halaman {page} / {totalPages} • Total data: {filtered.length}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-soft"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </button>
            <button
              className="btn btn-soft"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        </div>
      )}

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

                <button
                  className="btn primary"
                  onClick={() => setVerifyOpen((v) => !v)}
                >
                  {verifyOpen ? "Tutup Panel" : "Verifikasi"}
                </button>

                <button className="btn" onClick={() => setSelected(null)}>
                  Tutup
                </button>
              </div>
            </div>

            <div className="dfc-modal-body">
              {verifyOpen && (
                <Section title="Verifikasi">
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>Status Validasi</label>

                    <select
                      className={`verify-select ${verifyStatus.toLowerCase()}`}
                      value={verifyStatus}
                      onChange={(e) => setVerifyStatus(e.target.value)}
                    >
                      <option value="Tervalidasi">✅ Tervalidasi</option>
                      <option value="Pending">⏳ Pending</option>
                    </select>
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
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
                  <div className="dfc-modal-actions" style={{ marginTop: 8 }}>
                    <button
                      className="btn ghost"
                      onClick={() => setVerifyOpen(false)}
                    >
                      Batal
                    </button>
                    <button
                      className="btn primary"
                      onClick={handleSaveVerification}
                    >
                      Simpan Verifikasi
                    </button>
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
                  <Item
                    label="Nama Perusahaan (PT/CV)"
                    value={selected.step1.perusahaan}
                  />
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
                {(() => {
                  const rincian = Array.isArray(selected.step2?.rincianArmada)
                    ? selected.step2.rincianArmada
                    : [];

                  // total OS yang harus dibayar (sum semua bayarOs yang terisi)
                  const totalOsHarusDibayar = rincian.reduce((sum, a) => {
                    const raw = Number(a?.bayarOs);
                    return sum + (Number.isFinite(raw) ? raw : 0);
                  }, 0);

                  return (
                    <>
                      <dl className="grid-2">
                        <Item
                          label="Hasil Kunjungan"
                          value={
                            selected.step2.hasilKunjungan ||
                            selected.step2.penjelasanKunjungan ||
                            "-"
                          }
                        />
                        <Item
                          label="Total OS yang harus dibayar"
                          value={formatRupiah(totalOsHarusDibayar)}
                        />
                        <Item
                          label="Janji Bayar Tunggakan"
                          value={selected.step2.janjiBayar || "-"}
                        />
                      </dl>

                      {/* 👉 TABEL DETAIL SEMUA ARMADA */}
                      {rincian.length > 0 && (
                        <div className="armada-table-mini">
                          <table>
                            <thead>
                              <tr>
                                <th>No</th>
                                <th>Nopol / Nama Kapal</th>
                                <th>Status</th>
                                <th>Tipe / Tahun</th>
                                <th>OS Dibayar</th>
                                <th>Rekomendasi / Tindak Lanjut</th>
                                <th>Bukti</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rincian.map((a, idx) => {
                                const rawOs = Number(a.bayarOs);
                                const osValue = Number.isFinite(rawOs)
                                  ? rawOs
                                  : 0;

                                const tipe = a.tipeArmada || "Tidak diisi";
                                const tahun = a.tahun ? ` (${a.tahun})` : "";

                                return (
                                  <tr key={idx}>
                                    <td>{idx + 1}</td>
                                    <td>{a.nopol || "-"}</td>
                                    <td>{a.status || "-"}</td>
                                    <td>{`${tipe}${tahun}`}</td>
                                    <td>{formatRupiah(osValue)}</td>
                                    <td>
                                      {a.rekomendasi || a.tindakLanjut || "-"}
                                    </td>
                                    <td>
                                      {Array.isArray(a.bukti) &&
                                      a.bukti.length > 0 ? (
                                        a.bukti.map((f, i) => (
                                          <div key={i}>
                                            <a
                                              href={f.url}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              {f.name || `Bukti ${i + 1}`}
                                            </a>
                                          </div>
                                        ))
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: 11,
                                            color: "#94a3b8",
                                          }}
                                        >
                                          Tidak ada
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
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
                    value={`${selected.step3.responPemilik}/5`}
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
                {(selected.step3.tandaTanganPetugas ||
                  selected.step3.tandaTanganPemilik) && (
                  <div className="signatures">
                    {selected.step3.tandaTanganPetugas && (
                      <div className="sig-card">
                        <div className="sig-label">Tanda Tangan Petugas</div>
                        <img
                          src={selected.step3.tandaTanganPetugas}
                          alt="Tanda tangan petugas"
                        />
                      </div>
                    )}
                    {selected.step3.tandaTanganPemilik && (
                      <div className="sig-card">
                        <div className="sig-label">
                          Tanda Tangan Pemilik/Pengelola
                        </div>
                        <img
                          src={selected.step3.tandaTanganPemilik}
                          alt="Tanda tangan pemilik/pengelola"
                        />
                      </div>
                    )}
                  </div>
                )}
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
      /* ==== OVERRIDE AGAR FLUID SEPERTI DATA MANIFEST ==== */

/* 1) Container jangan dibatasi 900px, biar ikut lebar konten saat sidebar toggle */
.dfc-container{
  max-width: none !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 20px !important; /* mirip list-wrap di contoh kedua */
}

/* 2) Kartu tabel: biar bisa penuh & nyaman diresize */
.dfc-table-wrap{
  max-width: 100% !important;
  width: 100% !important;
  /* tetap boleh scroll horizontal/vertical seperti semula */
}

/* 3) Tabel: gunakan pola width seperti contoh kedua */
table.dfc-table{
  /* ketika layar lebar: tabel boleh melebar; ketika sempit: minimal 1100px, jadi ada scroll */
  width: max(1100px, 100%) !important;
  min-width: 0 !important;       /* hilangkan pengunci min-width bawaan */
  table-layout: auto !important; /* biar kolom bisa adaptif */
}

/* 4) Kolom: jangan kunci width per kolom terlalu agresif.
      Biar browser yang atur, tetap rapi saat area melebar/menciut */
.dfc-table th:nth-child(n),
.dfc-table td:nth-child(n){
  width: auto !important;
  white-space: nowrap;   /* header tetap satu baris */
}
.dfc-table td{ white-space: normal; } /* isi sel boleh wrap */

/* 5) Header tetap lengket & aman di berbagai lebar */
.dfc-table thead th{
  position: sticky;
  top: 0;
}

/* 6) Modal tetap full-screen friendly; tak perlu diubah
      tapi pastikan padding tubuh modal nyaman saat viewport melebar */
.dfc-modal-card{ max-width: min(1200px, 96vw) !important; }
.dfc-modal-body{ padding: 16px 20px !important; }

/* 7) Sedikit penyesuaian responsif */
@media (max-width: 980px){
  /* saat sempit, biar pengalaman mirip contoh kedua */
  table.dfc-table{ width: max(1000px, 100%) !important; }
}
.armada-table-mini{
  margin-top:10px;
  border-radius:14px;
  border:2px solid var(--sky-200);
  overflow:hidden;
  background:var(--sky-50);
}
.armada-table-mini table{
  width:100%;
  border-collapse:collapse;
  font-size:12px;
}
.armada-table-mini th,
.armada-table-mini td{
  padding:6px 8px;
  border-bottom:1px solid var(--border);
}
.armada-table-mini th{
  background:var(--sky-100);
  text-align:left;
  color:#0369a1;
  font-weight:700;
}
.armada-table-mini tr:last-child td{
  border-bottom:none;
}
  .signatures{
  margin-top:12px;
  display:grid;
  grid-template-columns:repeat(2, minmax(0,1fr));
  gap:10px;
}
@media (max-width:720px){
  .signatures{
    grid-template-columns:1fr;
  }
}
.sig-card{
  background:var(--sky-50);
  border:2px dashed var(--sky-200);
  border-radius:16px;
  padding:10px;
}
.sig-label{
  font-size:11px;
  color:#64748b;
  margin-bottom:6px;
  font-weight:600;
}
.sig-card img{
  width:100%;
  max-height:160px;
  object-fit:contain;
  background:#fff;
  border-radius:12px;
}
/* === VERIFIKASI SECTION KAWAII === */

.field{
  display:flex;
  flex-direction:column;
  gap:6px;
  margin-top:4px;
}

.field label{
  font-size:12px;
  color:#64748b;
  font-weight:600;
}

.field textarea{
  resize:vertical;
  min-height:72px;
  border-radius:16px;
  border:2px solid var(--sky-200);
  padding:10px 12px;
  font-family:inherit;
  font-size:13px;
  background:#f9fbff;
  transition:border-color .15s ease, box-shadow .15s ease, background .15s ease;
}

.field textarea:focus{
  outline:none;
  border-color:var(--sky-400);
  box-shadow:0 0 0 2px rgba(59,130,246,.28);
  background:#ffffff;
}

.field .muted{
  font-size:11px;
  color:#94a3b8;
  margin-top:2px;
}

/* tombol khusus verifikasi */
.dfc-modal-actions .btn.primary{
  background:var(--sky-500);
  color:#fff;
  border:none;
}

.dfc-modal-actions .btn.primary:hover{
  filter:brightness(1.05);
  transform:translateY(-1px);
}

.dfc-modal-actions .btn.ghost{
  background:#fff;
  color:#0284c7;
  border:2px solid var(--sky-300);
}

.dfc-modal-actions .btn.success{
  background:#22c55e;
  color:#fff;
  border:none;
}
/* === FIX: Set semua tulisan jadi hitam === */
.dfc-container, 
.dfc-container * {
  color: #0f172a !important;          /* teks utama */
}

/* label / subtitle abu-abu gelap */
.dfc-container label,
.dfc-container small,
.dfc-container .muted,
.dfc-container .item label {
  color: #475569 !important;          /* slate-600 */
}

/* badge tetap terlihat */
.badge {
  color: #0f172a !important;
}

/* tombol */
.btn {
  color: #ffffff !important;          /* biar tombol solid tetap putih */
}

/* input & textarea teks hitam */
.dfc-container input,
.dfc-container textarea,
.dfc-container select {
  color: #0f172a !important;
}

/* header table */
.dfc-table thead th {
  color: #0284c7 !important;          /* biru pastel */
}
/* perbaiki warna teks tombol Download PDF (btn-soft) */
.btn.btn-soft {
  color: #0284c7 !important;  /* biru, biar kebaca di background putih */
}
.badge.blue.dot::before {
  background: #3b82f6;
}
/* === VERIFICATION SELECT === */
.verify-select{
  appearance:none;
  -webkit-appearance:none;
  -moz-appearance:none;

  width:100%;
  padding:12px 44px 12px 14px;
  border-radius:18px;
  font-size:14px;
  font-weight:700;
  cursor:pointer;

  border:2px solid var(--sky-200);
  background:
    linear-gradient(180deg, #ffffff, #f0f9ff),
    url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230284c7' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>")
    no-repeat right 14px center / 16px;

  transition:all .15s ease;
  box-shadow:var(--shadow);
}

.verify-select:focus{
  outline:none;
  border-color:var(--sky-400);
  box-shadow:0 0 0 3px rgba(59,130,246,.25);
}

/* === STATUS COLORS === */
.verify-select.tervalidasi{
  background-color:#ecfeff;
  border-color:#22c55e;
  color:#166534;
}

.verify-select.pending{
  background-color:#eff6ff;
  border-color:#3b82f6;
  color:#1e3a8a;
}

.verify-select.ditolak{
  background-color:#fff1f2;
  border-color:#ef4444;
  color:#7f1d1d;
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

  return (
    <div className="rating">
      <div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
        <div style={{ fontWeight: 600 }}>{value || "-"}</div>
      </div>

      {numeric != null && (
        <div style={{ display: "flex", gap: 2 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} filled={i <= numeric} />
          ))}
        </div>
      )}
    </div>
  );
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

function formatRupiah(value) {
  if (value == null) return "Rp 0";

  // ubah string jadi angka aman
  let str = String(value).replace(/[^0-9,-]/g, ""); // buang huruf
  str = str.replace(/\./g, ""); // buang separator ribuan seperti 100.000
  str = str.replace(/,/g, "."); // kalau ada koma → ganti jadi titik

  const num = Number(str);

  if (isNaN(num)) return "Rp 0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

