import React, { useMemo, useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const LS_KEY = "crmData";

function loadCrmLs() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

const saveCrmLs = (rows) => localStorage.setItem(LS_KEY, JSON.stringify(rows));
const DEFAULT_ROWS = (() => {
  const ts = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const base = new Date();
  const d = (offsetDays, hh = 9, mm = 30) => {
    const t = new Date(base);
    t.setDate(t.getDate() + offsetDays);
    t.setHours(hh, mm, 0, 0);
    return ts(t);
  };

  return [
    {
      id: "CRM-2025-001",
      step1: {
        tanggalWaktu: d(-2, 9, 15),
        loket: "Loket A",
        petugasDepan: "Rani",
        petugasBelakang: "Putra",
        perusahaan: "PT Sinar Jaya",
        jenisAngkutan: "Bus",
        namaPemilik: "Bpk. Andika",
        alamat: "Jl. Melati No. 12, Bekasi",
        telepon: "0812-1111-2222",
      },
      step2: {
        nopolAtauNamaKapal: "B 1234 SJR",
        statusKendaraan: "Beroperasi",
        hasilKunjungan: "Armada siap operasi, admin tertib.",
        penjelasanHasil: "Dokumen lengkap, trayek aktif.",
        tunggakan: 0,
        janjiBayar: "-",
        rekomendasi: "Pertahankan kepatuhan.",
        rincianArmada: [{ nopol: "B 1234 SJR", status: "Aktif", tindakLanjut: "-" }],
      },
      step3: {
        fotoKunjungan: ["https://picsum.photos/seed/crm1/600/360"],
        suratPernyataan: [{ name: "Surat_Pernyataan.pdf", url: "#" }],
        evidence: [{ name: "Foto_Stiker.jpg", url: "#" }],
        responPemilik: "Kooperatif",
        ketaatanPerizinan: 5,
        keramaianPenumpang: 4,
      },
      step4: {
        validasiOleh: "Petugas",
        statusValidasi: "Tervalidasi",
        catatanValidasi: "Data lengkap.",
        wilayah: "Bekasi",
        waktuValidasi: d(-2, 10, 5),
      },
      step5: {
        pesan: "Tetap jaga ketertiban antrian.",
        saran: "Evaluasi load akhir pekan.",
      },
    },
    {
      id: "CRM-2025-002",
      step1: {
        tanggalWaktu: d(-1, 14, 40),
        loket: "Loket B",
        petugasDepan: "Dewi",
        petugasBelakang: "Akbar",
        perusahaan: "CV Laut Nusantara",
        jenisAngkutan: "Kapal",
        namaPemilik: "Ibu Sari",
        alamat: "Pelabuhan Muara Baru, Jakarta",
        telepon: "0813-3333-4444",
      },
      step2: {
        nopolAtauNamaKapal: "KM Nusantara 8",
        statusKendaraan: "Aktif",
        hasilKunjungan: "Operasional normal, manifest rapi.",
        penjelasanHasil: "Dokumen pelayaran valid.",
        tunggakan: 2500000,
        janjiBayar: "2025-10-25",
        rekomendasi: "Bayar tunggakan sebelum keberangkatan berikutnya.",
        rincianArmada: [{ nopol: "KM Nusantara 8", status: "Aktif", tindakLanjut: "Pantau pembayaran" }],
      },
      step3: {
        fotoKunjungan: ["https://picsum.photos/seed/crm2/600/360"],
        suratPernyataan: [],
        evidence: [{ name: "Manifest.pdf", url: "#" }],
        responPemilik: "Baik",
        ketertibanOperasional: 4,
        ketaatanPerizinan: 4,
        keramaianPenumpang: 3,
        ketaatanUjiKir: 4,
      },
      step4: {
        validasiOleh: "Petugas",
        statusValidasi: "Menunggu",
        catatanValidasi: "Menunggu pelunasan.",
        wilayah: "Jakarta Utara",
        waktuValidasi: d(-1, 15, 10),
      },
      step5: {
        pesan: "Mohon kepastian jadwal pembayaran.",
        saran: "Otomasi pengecekan manifest.",
      },
    },
    {
      id: "CRM-2025-003",
      step1: {
        tanggalWaktu: d(-3, 11, 5),
        loket: "Loket C",
        petugasDepan: "Iqbal",
        petugasBelakang: "Nina",
        perusahaan: "PT Angkasa Raya",
        jenisAngkutan: "Kendaraan Bermotor Umum",
        namaPemilik: "Bpk. Dodi",
        alamat: "Jl. Kenanga No. 5, Depok",
        telepon: "0812-7777-9999",
      },
      step2: {
        nopolAtauNamaKapal: "B 9090 AR",
        statusKendaraan: "Tidak Beroperasi",
        hasilKunjungan: "Armada parkir karena perbaikan.",
        penjelasanHasil: "STNK mati, perlu perpanjangan.",
        tunggakan: 1250000,
        janjiBayar: "2025-10-26",
        rekomendasi: "Perpanjang STNK, lanjutkan uji KIR.",
        rincianArmada: [{ nopol: "B 9090 AR", status: "Non-aktif", tindakLanjut: "Perpanjang dokumen" }],
      },
      step3: {
        fotoKunjungan: ["https://picsum.photos/seed/crm3/600/360"],
        suratPernyataan: [{ name: "Komitmen_Perbaikan.pdf", url: "#" }],
        evidence: [],
        responPemilik: "Kooperatif",
        ketertibanOperasional: 3,
        ketaatanPerizinan: 2,
        keramaianPenumpang: 2,
        ketaatanUjiKir: 2,
      },
      step4: {
        validasiOleh: "Petugas",
        statusValidasi: "Ditolak",
        catatanValidasi: "Dokumen belum lengkap.",
        wilayah: "Depok",
        waktuValidasi: d(-3, 12, 0),
      },
      step5: {
        pesan: "Segera lengkapi dokumen agar bisa beroperasi kembali.",
        saran: "Buat checklist legalitas.",
      },
    },
    {
      id: "CRM-2025-004",
      step1: {
        tanggalWaktu: d(0, 10, 20),
        loket: "Loket D",
        petugasDepan: "Rika",
        petugasBelakang: "Yoga",
        perusahaan: "PT Mega Jaya",
        jenisAngkutan: "Truk",
        namaPemilik: "Bpk. Surya",
        alamat: "Kawasan Industri MM2100",
        telepon: "0812-5555-6666",
      },
      step2: {
        nopolAtauNamaKapal: "B 4455 MJ",
        statusKendaraan: "Beroperasi",
        hasilKunjungan: "Distribusi lancar.",
        penjelasanHasil: "Unit dalam kondisi baik.",
        tunggakan: 0,
        janjiBayar: "-",
        rekomendasi: "Jadwalkan uji KIR rutin.",
        rincianArmada: [{ nopol: "B 4455 MJ", status: "Aktif", tindakLanjut: "-" }],
      },
      step3: {
        fotoKunjungan: ["https://picsum.photos/seed/crm4/600/360"],
        suratPernyataan: [],
        evidence: [{ name: "Checklist_KIR.xlsx", url: "#" }],
        responPemilik: "Sangat baik",
        ketertibanOperasional: 5,
        ketaatanPerizinan: 4,
        keramaianPenumpang: 1,
        ketaatanUjiKir: 5,
      },
      step4: {
        validasiOleh: "Petugas",
        statusValidasi: "Tervalidasi",
        catatanValidasi: "OK.",
        wilayah: "Cikarang",
        waktuValidasi: d(0, 11, 0),
      },
      step5: {
        pesan: "Pertahankan kondisi armada.",
        saran: "Tambahkan pelatihan safety.",
      },
    },
    {
      id: "CRM-2025-005",
      step1: {
        tanggalWaktu: d(1, 13, 0),
        loket: "Loket E",
        petugasDepan: "Alya",
        petugasBelakang: "Fadil",
        perusahaan: "Blue Taxi Group",
        jenisAngkutan: "Taksi",
        namaPemilik: "Ibu Reni",
        alamat: "Jl. Panglima Polim, Jakarta Selatan",
        telepon: "0812-8888-0000",
      },
      step2: {
        nopolAtauNamaKapal: "B 7788 BTG",
        statusKendaraan: "Beroperasi",
        hasilKunjungan: "Unit bersih, sopir patuh SOP.",
        penjelasanHasil: "Argometer terkalibrasi.",
        tunggakan: 350000,
        janjiBayar: "2025-10-27",
        rekomendasi: "Selesaikan iuran tepat waktu.",
        rincianArmada: [{ nopol: "B 7788 BTG", status: "Aktif", tindakLanjut: "Follow-up pembayaran" }],
      },
      step3: {
        fotoKunjungan: ["https://picsum.photos/seed/crm5/600/360"],
        suratPernyataan: [],
        evidence: [{ name: "Bukti_Kalibrasi.pdf", url: "#" }],
        responPemilik: "Baik",
        ketertibanOperasional: 4,
        ketaatanPerizinan: 4,
        keramaianPenumpang: 3,
        ketaatanUjiKir: 4,
      },
      step4: {
        validasiOleh: "Petugas",
        statusValidasi: "Menunggu",
        catatanValidasi: "Tunggu pelunasan iuran.",
        wilayah: "Jakarta Selatan",
        waktuValidasi: d(1, 13, 45),
      },
      step5: {
        pesan: "Mohon konfirmasi pembayaran setelah transfer.",
        saran: "Aktifkan pengingat iuran bulanan.",
      },
    },
  ];
})();

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
            step5: r.step5 || {},
            // boleh tetap pakai kolom agregat view kalau nanti sudah benar
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
  }, [data]);

  const wrapRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  function handleWheel(e) {
    const el = wrapRef.current;
    if (!el) return;
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
    const walk = (x - startX.current) * 1;
    el.scrollLeft = scrollLeftStart.current - walk;
  }

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyNote, setVerifyNote] = useState("");

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
      statusValidasi: "Tervalidasi",
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
      console.error("Gagal update verifikasi:", error);
      alert("Gagal menyimpan verifikasi.");
      return;
    }

    const finalStep4 = updated?.step4 || newStep4;

    // sinkron state
    setRows((prev) =>
      prev.map((row) =>
        row.dbId === selected.dbId ? { ...row, step4: finalStep4 } : row
      )
    );
    setSelected((prev) => (prev ? { ...prev, step4: finalStep4 } : prev));

    setVerifyOpen(false);

    // 🔔 1) simpan notifikasi ke localStorage (dibaca NotifikasiBerkas)
    addVerificationNotificationLocal({
      reportId: selected.id,                // kode laporan yang kamu tampilkan
      status: finalStep4.statusValidasi,
      note: finalStep4.catatanValidasi,
      waktuValidasi: finalStep4.waktuValidasi,
    });
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
      ["Ketaatan Perizinan", `${row.step3.ketaatanPerizinan || "-"}/5`],
      ["Keramaian Penumpang", `${row.step3.keramaianPenumpang || "-"}/5`],
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
              const rincian = Array.isArray(s2.rincianArmada) ? s2.rincianArmada : [];

              const semuaNopol = rincian
                .map((r) => r.nopol)
                .filter(Boolean);

              const totalArmada =
                semuaNopol.length || (s2.nopolAtauNamaKapal ? 1 : 0);

              const nopolDisplay =
                semuaNopol.length === 0
                  ? (s2.nopolAtauNamaKapal || "-")
                  : semuaNopol.length <= 2
                  ? semuaNopol.join(", ")
                  : `${semuaNopol[0]}, ${semuaNopol[1]} (+${
                      semuaNopol.length - 2
                    } armada)`;

              const statusDisplay =
                totalArmada <= 1
                  ? (s2.statusKendaraan || "-")
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
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12}}>
          <div style={{fontSize:12, color:"#475569"}}>
            Halaman {page} / {totalPages} • Total data: {filtered.length}
          </div>
          <div style={{display:"flex", gap:8}}>
            <button
              className="btn btn-soft"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              ← Prev
            </button>
            <button
              className="btn btn-soft"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
                          value={selected.step2.hasilKunjungan || selected.step2.penjelasanKunjungan || "-"}
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
                                const osValue = Number.isFinite(rawOs) ? rawOs : 0;

                                const tipe = a.tipeArmada || "Tidak diisi";
                                const tahun = a.tahun ? ` (${a.tahun})` : "";

                                return (
                                  <tr key={idx}>
                                    <td>{idx + 1}</td>
                                    <td>{a.nopol || "-"}</td>
                                    <td>{a.status || "-"}</td>
                                    <td>{`${tipe}${tahun}`}</td>
                                    <td>{formatRupiah(osValue)}</td>
                                    <td>{a.rekomendasi || a.tindakLanjut || "-"}</td>
                                    <td>
                                      {Array.isArray(a.bukti) && a.bukti.length > 0 ? (
                                        a.bukti.map((f, i) => (
                                          <div key={i}>
                                            <a href={f.url} target="_blank" rel="noreferrer">
                                              {f.name || `Bukti ${i + 1}`}
                                            </a>
                                          </div>
                                        ))
                                      ) : (
                                        <span style={{ fontSize: 11, color: "#94a3b8" }}>Tidak ada</span>
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
                {(selected.step3.tandaTanganPetugas || selected.step3.tandaTanganPemilik) && (
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
                        <div className="sig-label">Tanda Tangan Pemilik/Pengelola</div>
                        <img
                          src={selected.step3.tandaTanganPemilik}
                          alt="Tanda tangan pemilik/pengelola"
                        />
                      </div>
                    )}
                  </div>
                )}
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
