import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

const idr = (n) =>
  (Number(n) || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

const ARMADA_STATUS_OPTIONS = [
  "Beroperasi + Bayar",
  "Beroperasi",
  "Dijual",
  "Ubah Sifat",
  "Ubah Bentuk",
  "Rusak Sementara",
  "Rusak Selamanya",
  "Tidak Ditemukan",
  "Cadangan",
];

const ARMADA_STATUS_NEED_UPLOAD = new Set(
  ["Dijual", "Ubah Sifat", "Ubah Bentuk", "Rusak Sementara", "Rusak Selamanya", "Tidak Ditemukan"].map(
    (s) => s.toUpperCase()
  )
);

const LOKET_OPTIONS = [
    "Loket Kantor Wilayah","Pekanbaru Kota","Pekanbaru Selatan","Pekanbaru Utara","Panam",
    "Kubang","Bangkinang","Lipat Kain","Tapung","Siak","Perawang","Kandis","Pelalawan",
    "Sorek","Pasir Pengaraian","Ujung Batu","Dalu-Dalu","Koto Tengah","Taluk Kuantan",
    "Singingi Hilir","Rengat","Air Molek","Tembilahan","Kota Baru","Sungai Guntung",
    "Loket Kantor Cabang Dumai","Dumai","Duri","Bengkalis","Selat Panjang",
    "Bagan Siapiapi","Bagan Batu","Ujung Tanjung",
  ];

// === Shared table untuk CRM list (dipakai DataFormCrm juga) ===
const CRM_LS_KEY = "crmData";

function loadCrmRows() {
  try {
    const raw = localStorage.getItem(CRM_LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveCrmRows(rows) {
  localStorage.setItem(CRM_LS_KEY, JSON.stringify(rows));
}

// bikin ID: CRM-2025-xxx
function generateCrmId() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 999)).padStart(3, "0");
  return `CRM-${year}-${rand}`;
}

// mapping dari state `form` → struktur row yang dipakai DataFormCrm
function buildCrmRowFromForm(form) {
  const tanggal = form.tanggal || "";
  const waktu = form.waktu || "";
  const tanggalWaktu = `${tanggal} ${waktu || "00:00"}`.trim();

  const armadaList = Array.isArray(form.armadaList) ? form.armadaList : [];
  const firstArmada = armadaList[0] || {};

  // rincianArmada di tabel
  const rincianArmada = armadaList.map((a) => ({
    nopol: a.nopol || "",
    status: a.status || "",
    tipeArmada: a.tipeArmada || "",
    tahun: a.tahun || "",
    osTarif: a.osTarif ?? null,
    bayarOs: a.bayarOs || "",
    rekomendasi: a.rekomendasi || "",
    // untuk kompatibel dengan DataFormCrm yg sudah pakai `tindakLanjut`
    tindakLanjut: a.rekomendasi || "",
  }));

  // gabung rekomendasi armada jadi satu kalimat
  const rekomGabung = armadaList
    .map((a) => a.rekomendasi)
    .filter(Boolean)
    .join(" | ");

  return {
    id: generateCrmId(),

    // ===== STEP 1 di tabel =====
    step1: {
      tanggalWaktu,                      // "YYYY-MM-DD HH:mm"
      loket: form.loket || "",
      petugasDepan: form.namaPetugas || "",
      petugasBelakang: "",               // form cuma 1 field petugas
      perusahaan: form.badanUsahaNama || "",
      jenisAngkutan: form.jenisAngkutan || "",
      namaPemilik: form.namaPemilik || "",
      alamat: form.alamatKunjungan || "",
      telepon: form.telPemilik || "",
      // sudahKunjungan: !!form.sudahKunjungan,
      badanUsahaTipe: form.badanUsahaTipe || "",
      telPengelola: form.telPengelola || "",
    },

    // ===== STEP 2 di tabel =====
    step2: {
      nopolAtauNamaKapal: firstArmada.nopol || "",
      statusKendaraan: firstArmada.status || "",
      hasilKunjungan: form.hasilKunjungan || "",
      penjelasanHasil: form.hasilKunjungan || "",
      tunggakan: 0,                         // kamu bisa ganti logika ini nanti
      janjiBayar: form.janjiBayar || "-",
      rekomendasi: rekomGabung || "",
      rincianArmada,
    },

    // ===== STEP 3 di tabel =====
    step3: {
      // Untuk sekarang, foto & file tidak dipakai di list → isi array kosong dulu
      fotoKunjungan: [],
      suratPernyataan: [],
      evidence: [],
      responPemilik: form.nilaiKebersihan ?? 3,
      ketertibanOperasional: form.nilaiKebersihan ?? 3,
      ketaatanPerizinan: form.nilaiPelayanan ?? 3,
      keramaianPenumpang: form.nilaiKelengkapan ?? 3,
      ketaatanUjiKir: form.nilaiPelayanan ?? 3,
      tandaTanganPetugas: form.tandaTanganPetugas || "",
      tandaTanganPemilik: form.tandaTanganPemilik || "",
    },

    // ===== STEP 4 di tabel (validasi) =====
    step4: {
      validasiOleh: "Petugas",
      statusValidasi: "Menunggu",          // default: belum diverifikasi
      catatanValidasi: "",
      wilayah: form.loket || "",
      waktuValidasi: tanggalWaktu,
    },

    // ===== STEP 5 di tabel (pesan & saran) =====
    step5: {
      pesan: form.pesanPetugas || "",
      saran: form.saranUntukPemilik || "",
      kirimKeWaPemilik: !!form.kirimKeWaPemilik,
      kirimKeWaPengelola: !!form.kirimKeWaPengelola,
    },
  };
}

async function saveCrmToSupabase(form) {
  // 1) Build row dengan struktur lama
  const baseRow = buildCrmRowFromForm(form);
  const reportCode = baseRow.id; // contoh "CRM-2025-123"

  // 2) Upload file ke Storage (pakai reportCode sebagai folder)
  // 2a) Foto kunjungan (single)
  let fotoUrls = [];
  if (form.fotoKunjungan) {
    const up = await uploadToCrmStorage(
      form.fotoKunjungan,
      reportCode,
      "foto_kunjungan"
    );
    if (up?.url) {
      // DataFormCrm pakai array string untuk fotoKunjungan
      fotoUrls = [up.url];
    }
  }

  // 2b) Surat/evidence (multiple)
  const suratUploads = await uploadMany(
    form.suratPernyataanEvidence || [],
    reportCode,
    "surat"
  );
  // DataFormCrm pakai bentuk { name, url }
  const suratJson = suratUploads.map((f) => ({
    name: f.name,
    url: f.url,
  }));

  // 3) Gabungkan hasil upload ke step3
  const step3 = {
    ...baseRow.step3,
    fotoKunjungan: fotoUrls,   // ["https://..."]
    suratPernyataan: suratJson,
    evidence: [],              // kalau mau dipisah lagi, bisa diatur
  };

  // 4) Insert ke crm_reports
  const { data: reportInserted, error: reportError } = await supabase
    .from("crm_reports")
    .insert([
      {
        report_code: reportCode,
        step1: baseRow.step1,
        step2: baseRow.step2,
        step3,              // pakai yang sudah include URL upload
        step4: baseRow.step4,
        step5: baseRow.step5,
      },
    ])
    .select("id")
    .single();

  if (reportError) {
    console.error("Gagal insert crm_reports:", reportError);
    throw reportError;
  }

  const reportId = reportInserted.id;

  // 5) Insert ke crm_armada + upload buktiFiles per armada
  const armadaFromForm = Array.isArray(form.armadaList) ? form.armadaList : [];
  const armadaRows = [];

  for (let i = 0; i < armadaFromForm.length; i++) {
    const a = armadaFromForm[i];

    // upload buktiFiles (jika ada)
    let buktiUploads = [];
    if (a.buktiFiles && a.buktiFiles.length > 0) {
      buktiUploads = await uploadMany(a.buktiFiles, reportCode, `armada_${i + 1}`);
    }

    armadaRows.push({
      report_id: reportId,
      nopol: a.nopol || null,
      status: a.status || null,
      tipe_armada: a.tipeArmada || null,
      tahun: a.tahun ? Number(a.tahun) : null,
      bayar_os: a.bayarOs ? Number(a.bayarOs) : 0,
      rekomendasi: a.rekomendasi || null,

      // kolom baru jsonb bukti
      bukti: buktiUploads.map((f) => ({
        name: f.name,
        url: f.url,
      })),
    });
  }

  if (armadaRows.length > 0) {
    const { error: armadaError } = await supabase
      .from("crm_armada")
      .insert(armadaRows);

    if (armadaError) {
      console.error("Gagal insert crm_armada:", armadaError);
      throw armadaError;
    }
  }

  return { reportId, reportCode };
}

async function uploadToCrmStorage(file, folder, prefix = "file") {
  if (!file) return null;

  const ext = file.name.split(".").pop() || "bin";
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `${safeFolder}/${prefix}_${Date.now()}.${ext}`;

  const { data, error } = await supabase
    .storage
    .from("crm_uploads")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  // ambil public URL
  const { data: publicData } = supabase
    .storage
    .from("crm_uploads")
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: publicData.publicUrl,
    name: file.name,
  };
}

async function uploadMany(files, folder, prefix) {
  const arr = Array.from(files || []);
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const up = await uploadToCrmStorage(arr[i], folder, `${prefix}_${i + 1}`);
    if (up) result.push(up);
  }
  return result;
}

export default function FormCrm() {
  const [step, setStep] = useState(1);
  const [dirty, setDirty] = useState(false);
  const initial = useRef(true);
  const [picMaster, setPicMaster] = useState([]);
  const [companyMaster, setCompanyMaster] = useState([]);
  const onBeforeUnloadRef = useRef(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showFileLimitPopup, setShowFileLimitPopup] = useState(false);
  const [fileCountSelected, setFileCountSelected] = useState(0);

  // ================== STATE ==================
  const showCutePopup = () => {
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000); // otomatis hilang 3 detik
  };
  const [form, setForm] = useState(() => {
    const draft = localStorage.getItem("form_crm_draft_v5");
    if (draft) { try { return JSON.parse(draft); } catch {} }
    return {
      // Step 1 — Datakunjungan
      tanggal: "", waktu: "", loket: "", namaPetugas: "",
      // sudahKunjungan: false, 
      badanUsahaTipe: "PT", badanUsahaNama: "",
      jenisAngkutan: "", namaPemilik: "", alamatKunjungan: "",
      telPemilik: "", telPengelola: "",

      // Step 2 — Armada + Hasil kunjungan
      armadaList: [{ nopol: "", status: "", tipeArmada: "", tahun: "" }],
      hasilKunjungan: "",
      janjiBayar: "",

      // Step 3 — Upload & Penilaian
      fotoKunjungan: null,
      suratPernyataanEvidence: [],     // max 5
      nilaiKebersihan: 3, nilaiKelengkapan: 3, nilaiPelayanan: 3,
      tandaTanganPetugas: "",          // dataURL
      tandaTanganPemilik: "",          // dataURL

      // Step 4 — Pesan & Saran
      pesanPetugas: "", saranUntukPemilik: "",
      kirimKeWaPemilik: true, kirimKeWaPengelola: false,
    };
  });

  // ================== OTOMATIS ISI TANGGAL/WAKTU ==================
  useEffect(() => {
    const now = new Date();
    const d = now.toISOString().slice(0, 10);
    const t = now.toTimeString().slice(0, 5);
    setForm(f => ({ ...f, tanggal: f.tanggal || d, waktu: f.waktu || t }));
  }, []);

  // ================== AUTOSAVE ==================
  useEffect(() => {
    if (initial.current) { initial.current = false; return; }
    localStorage.setItem("form_crm_draft_v5", JSON.stringify(form));
    setDirty(true);
  }, [form]);

    // ================== LOAD MASTER DATA DARI IWKBU ==================
  useEffect(() => {
    (async () => {
      try {
        // 1) Master PIC + Loket (distinct)
        const { data: picData, error: picErr } = await supabase
          .from("iwkbu")
          .select("pic,loket")
          .not("pic", "is", null)
          .neq("pic", "");

        if (!picErr && picData) {
          const map = new Map();
          for (const row of picData) {
            const raw = (row.pic || "").trim();
            if (!raw) continue;
            const key = raw.toLowerCase();
            const loket = row.loket || "";
            if (!map.has(key)) {
              map.set(key, { pic: raw, loket });
            } else {
              const existing = map.get(key);
              // kalau sebelumnya belum ada loket, tapi sekarang ada → update
              if (!existing.loket && loket) {
                map.set(key, { pic: existing.pic, loket });
              }
            }
          }
          const arr = Array.from(map.values()).sort((a, b) =>
            a.pic.localeCompare(b.pic, "id")
          );
          setPicMaster(arr);
        } else if (picErr) {
          console.error("Gagal load PIC:", picErr);
        }

        // 2) Master PT/CV + pemilik + HP
        const { data: compData, error: compErr } = await supabase
          .from("iwkbu")
          .select("nama_perusahaan,nama_pemilik,hp")
          .not("nama_perusahaan", "is", null)
          .neq("nama_perusahaan", "");

        if (!compErr && compData) {
          const map2 = new Map();
          for (const row of compData) {
            const raw = (row.nama_perusahaan || "").trim();
            if (!raw) continue;
            const key = raw.toLowerCase();
            if (!map2.has(key)) {
              map2.set(key, {
                nama_perusahaan: raw,
                nama_pemilik: row.nama_pemilik || "",
                hp: row.hp || "",
              });
            }
          }
          const arr2 = Array.from(map2.values()).sort((a, b) =>
            a.nama_perusahaan.localeCompare(b.nama_perusahaan, "id")
          );
          setCompanyMaster(arr2);
        } else if (compErr) {
          console.error("Gagal load perusahaan:", compErr);
        }
      } catch (e) {
        console.error("Error load master data IWKBU:", e);
      }
    })();
  }, []);

  // ================== URL SYNC (?step=1..4) ==================
  useEffect(() => {
    const s = Number(new URLSearchParams(location.search).get("step"));
    if (s >= 1 && s <= 3) setStep(s);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set("step", String(step));
    history.replaceState({}, "", `${location.pathname}?${params.toString()}`);
  }, [step]);

  // ================== UNSAVED GUARD ==================
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    onBeforeUnloadRef.current = onBeforeUnload;
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const steps = [
    { id: 1, title: "Data Kunjungan" },
    { id: 2, title: "Armada" },
    { id: 3, title: "Upload & Penilaian" },
  ];

  const progressPct = useMemo(() => (step - 1) * (100 / (steps.length - 1)), [step]);

  // ================== VALIDASI ==================
  const step1Errors = useMemo(() => {
    const e = {};
    if (!form.tanggal) e.tanggal = "Wajib diisi";
    if (!form.waktu) e.waktu = "Wajib diisi";
    if (!form.loket) e.loket = "Pilih loket";
    if (!form.namaPetugas) e.namaPetugas = "Wajib diisi";
    if (!form.jenisAngkutan) e.jenisAngkutan = "Pilih jenis angkutan";
    if (!form.alamatKunjungan) e.alamatKunjungan = "Wajib diisi";
    return e;
  }, [form]);

  const step2Errors = useMemo(() => {
    const e = {};
    const list = form.armadaList || [];
    if (list.length === 0) e.list = "Tambah minimal 1 kendaraan";
    list.forEach((k, i) => {
      if (!k.nopol) e[`nopol_${i}`] = "Isi nopol";
      if (!k.status) e[`status_${i}`] = "Pilih status";
    });
    if (!form.hasilKunjungan) e.HasilKunjungan = "Isi penjelasan hasil kunjungan";
    if (!form.janjiBayar) e.janjiBayar = "Isi jadwal janji bayar";
    return e;
  }, [form.armadaList, form.hasilKunjungan, form.janjiBayar]);

  const step3Errors = useMemo(() => {
    const e = {};

    // Minimal satu upload
    const anyUpload =
      form.fotoKunjungan ||
      (form.suratPernyataanEvidence || []).length > 0;
    if (!anyUpload)
      e.minimal = "Unggah foto kunjungan.";

    if ((form.suratPernyataanEvidence || []).length > 10) {
      e.surat = "Surat pernyataan & evidence maksimal 10 file.";
    }

    // Penilaian wajib diisi (1–5)
    if (!form.nilaiKebersihan)
      e.nilaiKebersihan = "Isi nilai respon pemilik/pengelola";
    if (!form.nilaiKelengkapan)
      e.nilaiKelengkapan = "Isi nilai keramaian penumpang";
    if (!form.nilaiPelayanan)
      e.nilaiPelayanan = "Isi nilai ketaatan pengurusan izin";

    // Tanda tangan wajib
    if (!form.tandaTanganPetugas)
      e.tandaTanganPetugas = "Tanda tangan petugas wajib diisi";
    if (!form.tandaTanganPemilik)
      e.tandaTanganPemilik = "Tanda tangan pemilik wajib diisi";

    return e;
  }, [
    form.fotoKunjungan,
    form.suratPernyataanEvidence,
    form.nilaiKebersihan,
    form.nilaiKelengkapan,
    form.nilaiPelayanan,
    form.tandaTanganPetugas,
    form.tandaTanganPemilik,
  ]);

  const canNext1 = Object.keys(step1Errors).length === 0;
  const canNext2 = Object.keys(step2Errors).length === 0;
  const canNext3 = Object.keys(step3Errors).length === 0;

  // ================== NAV ==================
  const focusFirstError = useCallback(() => {
    const el = document.querySelector("[data-error='true']");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const guardNext = useCallback(() => {
    if ((step === 1 && !canNext1) || (step === 2 && !canNext2) || (step === 3 && !canNext3)) {
      focusFirstError();
      showCutePopup(); // ✨ tampilkan popup kawaii
      return;
    }
    setStep(s => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, canNext1, canNext2, canNext3, focusFirstError]);

  const prev = useCallback(() => {
    setStep(s => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSubmit = async () => {
    // safety: validasi terakhir
    if (
      Object.keys(step1Errors).length ||
      Object.keys(step2Errors).length ||
      Object.keys(step3Errors).length
    ) {
      alert("Masih ada kolom yang belum lengkap. Cek lagi langkah 1–3 ya 😊");
      return;
    }

    try {
      // 1) Simpan ke Supabase
      const { reportId, reportCode } = await saveCrmToSupabase(form);

      // 2) Simpan ke localStorage (opsional)
      const newRow = buildCrmRowFromForm(form);
      newRow.id = reportCode;
      const existing = loadCrmRows();
      const next = [newRow, ...existing];
      saveCrmRows(next);

      // 3) Bersihkan draft & matikan dirty flag
      setDirty(false);
      localStorage.removeItem("form_crm_draft_v5");

      // 4) Redirect otomatis ke halaman home
      window.location.replace("/");

    } catch (e) {
      console.error("Gagal menyimpan data CRM:", e);
      alert("Terjadi kesalahan saat menyimpan ke server. Coba lagi sebentar ya 🙏");
    }
  };

  const resetDraft = () => {
    if (confirm("Hapus draft yang tersimpan?")) {
      localStorage.removeItem("form_crm_draft_v5");
      location.reload();
    }
  };

  // ================== SHORTCUTS ==================
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); guardNext(); }
      if (e.shiftKey && e.key === "Enter") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guardNext, prev]);

  // ================== RENDER ==================
  return (
    <div className="crm-wrap full kawai">
      <style>{css}</style>

      <div className="crm-card">
        <Header dirty={dirty} onReset={resetDraft} onBeforeUnloadRef={onBeforeUnloadRef} />

        <div className="container">
          <Stepper
            steps={steps}
            current={step}
            progressPct={progressPct}
            onJump={setStep}
            canNext1={canNext1}
            canNext2={canNext2}
            canNext3={canNext3}
          />
        </div>

        <div className="container">
          <div className="grid">
            <main className="main">
              <ErrorSummary
                step={step}
                step1Errors={step1Errors}
                step2Errors={step2Errors}
                step3Errors={step3Errors}
              />

              <div className="section">
                {step === 1 && <Step1Datakunjungan form={form} setField={setField} errors={step1Errors} picMaster={picMaster} companyMaster={companyMaster} />}
                {step === 2 && (
                  <Step2Armada
                    form={form}
                    setField={setField}
                    armadaList={form.armadaList}
                    setArmadaList={(list) => setField("armadaList", list)}
                    errors={step2Errors}
                    onNext={() => setStep(3)}
                  />
                )}
                {step === 3 && (
                  <Step3UploadPenilaian
                    form={form}
                    setField={setField}
                    errors={step3Errors}
                    onPickMultiple={(key) => (e) => {
                      const files = Array.from(e.target.files || []);

                      if (files.length > 10) {
                        setFileCountSelected(files.length);
                        setShowFileLimitPopup(true);
                        e.target.value = ""; // reset input file
                        return;
                      }

                      setField(key, files);
                    }}
                  />
                )}
              </div>

              <div className="crm-footer sticky">
                <button className="btn ghost" disabled={step === 1} onClick={prev}>⟵ Kembali</button>
                <div className="spacer" />
                {step < 3 ? (
                  <button
                    className="btn primary"
                    onClick={guardNext}
                    title="Ctrl+Enter untuk lanjut, Shift+Enter untuk kembali"
                  >
                    Lanjut ⟶
                  </button>
                ) : (
                  <button className="btn success" onClick={handleSubmit}>
                    🚀 Submit
                  </button>
                )}
              </div>
            </main>

            <aside className="aside">
              <SidebarSummary
                form={form}
                step={step}
                step1Errors={step1Errors}
                step2Errors={step2Errors}
                step3Errors={step3Errors}
              />
            </aside>
          </div>
        </div>
      </div>
      {showPopup && (
        <div className="popup-cute">
          <div className="popup-box">
            <div className="popup-emoji">🌸</div>
            <div className="popup-text">Isi dulu semua kolom yang wajib yaa 💕</div>
            <button onClick={() => setShowPopup(false)} className="popup-btn">Oke deh~</button>
          </div>
        </div>
      )}
      {showFileLimitPopup && (
        <div className="popup-cute">
          <div className="popup-box">
            <div className="popup-emoji">📂💥</div>
            <div className="popup-text">
              Upss~ kamu pilih <b>{fileCountSelected} file</b> 😳  
              <br />
              Maksimal cuma <b>10 file</b> yaa~  
              <br />
              Pilih yang paling penting aja 💕
            </div>
            <button
              onClick={() => setShowFileLimitPopup(false)}
              className="popup-btn"
            >
              Okeee ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================ SUBS ================ */
function Header({ dirty, onReset, onBeforeUnloadRef }) {
  const handleGoHome = () => {
    if (window.onbeforeunload) window.onbeforeunload = null;
    if (onBeforeUnloadRef.current)
      window.removeEventListener("beforeunload", onBeforeUnloadRef.current);

    localStorage.removeItem("form_crm_draft_v5");
    window.location.replace("/");
  };

  return (
    <div className="crm-header">
      <div className="container header-inner">
        <div className="title">
          <span className="dot" /><span>Formulir CRM</span>
        </div>
        <div className="header-actions">
          <button className="btn ghost sm" onClick={handleGoHome}>
            🏠 Kembali ke Home
          </button>
          {/* <button className="btn ghost sm" onClick={onReset}>
            Reset Draft
          </button> */}
        </div>
      </div>
      <div className="container">
        <div className="subtitle">
          Isi data kunjungan, armada/kendaraan, lalu upload bukti & penilaian. 
          Ikuti langkah-langkah di bawah ini.
        </div>
      </div>
    </div>
  );
}

function Stepper({ steps, current, progressPct, onJump, canNext1, canNext2, canNext3 }) {
  const isStepAllowed = (id) => {
    if (id === 1) return true;
    if (id === 2) return canNext1; 
    if (id === 3) return canNext1 && canNext2;
    return false;
  };

  return (
    <div className="stepper">
      <div className="progress"><div className="bar" style={{ width: `${progressPct}%` }} /></div>
      <div className="steps">
        {steps.map(s => {
          const active = s.id === current;
          const done = s.id < current;
          const allowed = isStepAllowed(s.id);
          return (
            <button
              key={s.id}
              className={`step ${active ? "active" : ""} ${done ? "done" : ""}`}
              onClick={() => allowed && onJump(s.id)}
              disabled={!allowed}
              title={!allowed ? "Selesaikan langkah sebelumnya dulu ya 💕" : ""}
            >
              <div className="circle">{done ? "✓" : s.id}</div>
              <div className="label">{s.title}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ErrorSummary({ step, step1Errors, step2Errors, step3Errors }) {
  const list =
    step === 1 ? Object.values(step1Errors) :
    step === 2 ? Object.values(step2Errors) :
    step === 3 ? Object.values(step3Errors) : [];
  if (list.length === 0) return null;
  return (
    <div className="alert warn" style={{ marginBottom: 16 }}>
      <div className="alert-title">Perlu diisi</div>
      <ul>{list.map((v,i)=><li key={i}>{v}</li>)}</ul>
    </div>
  );
}

function SidebarSummary({ form, step, step1Errors, step2Errors, step3Errors }) {
  const totalArmada = form.armadaList?.length || 0;
  const totalFiles = [form.fotoKunjungan, ...(form.suratPernyataanEvidence||[])].filter(Boolean).length;
  const badges = [
    { label: "Langkah", value: `${step}/3` },
    { label: "Armada", value: totalArmada },
    { label: "Berkas", value: totalFiles },
  ];
  const errorCount =
    (step === 1 && Object.keys(step1Errors).length) ||
    (step === 2 && Object.keys(step2Errors).length) ||
    (step === 3 && Object.keys(step3Errors).length) || 0;

  return (
    <div className="aside-card">
      <div className="aside-title">Ringkasan</div>
      <div className="badges">
        {badges.map((b, i) => (
          <div className="badge stat" key={i}>
            <div className="x-label">{b.label}</div><div className="x-value">{b.value}</div>
          </div>
        ))}
      </div>

      <div className="mini">
        <div className="mini-title">Data Utama</div>
        <div className="mini-grid">
          <MiniItem label="Tanggal" value={form.tanggal || "—"} />
          <MiniItem label="Waktu" value={form.waktu || "—"} />
          <MiniItem label="Loket" value={form.loket || "—"} />
          <MiniItem label="Petugas" value={form.namaPetugas || "—"} />
          <MiniItem label="Jenis" value={form.jenisAngkutan || "—"} />
          <MiniItem label="Pemilik" value={form.namaPemilik || "—"} />
        </div>
      </div>

      {errorCount > 0 && (
        <div className="tip" style={{marginTop:10}}>
          Ada {errorCount} kolom yang perlu dilengkapi pada langkah ini.
        </div>
      )}
    </div>
  );
}
function MiniItem({ label, value }) {
  return (
    <div className="mini-item">
      <div className="mini-label">{label}</div>
      <div className="mini-value">{value}</div>
    </div>
  );
}

/* ================ STEPS ================ */
function Step1Datakunjungan({ form, setField, errors, picMaster, companyMaster }) {
  return (
    <>
      <h2 className="h2">Step 1 — Datakunjungan</h2>
      <p className="lead">Isi data kunjungan, detail badan usaha, dan lokasi yang dikunjungi.</p>

      <div className="form-grid">
        <Field label="Tanggal Kunjungan" req error={errors.tanggal}>
          <input data-error={!!errors.tanggal} type="date" value={form.tanggal} onChange={e=>setField("tanggal", e.target.value)} />
        </Field>

        <Field label="Waktu Kunjungan" req error={errors.waktu}>
          <input data-error={!!errors.waktu} type="time" value={form.waktu} onChange={e=>setField("waktu", e.target.value)} />
        </Field>

        <Field label="Nama Petugas" req error={errors.namaPetugas}>
          <input
            data-error={!!errors.namaPetugas}
            list="pic-list"
            value={form.namaPetugas}
            onChange={(e) => {
              const val = e.target.value;
              setField("namaPetugas", val);

              const match =
                picMaster?.find(
                  (p) => p.pic.toLowerCase() === val.trim().toLowerCase()
                ) || null;

              if (match && match.loket) {
                setField("loket", match.loket);
              }
            }}
            placeholder="Nama petugas lapangan"
            autoComplete="off"
          />
          <datalist id="pic-list">
            {picMaster?.map((p) => (
              <option
                key={p.pic}
                value={p.pic}
              >
                {p.pic}{p.loket ? ` — ${p.loket}` : ""}
              </option>
            ))}
          </datalist>
        </Field>

        <Field label="Loket" req error={errors.loket}>
          <input
            data-error={!!errors.loket}
            list="loket-list"
            value={form.loket}
            onChange={(e) => setField("loket", e.target.value)}
            placeholder="Ketik nama loket…"
            autoComplete="off"
          />
          <datalist id="loket-list">
            {LOKET_OPTIONS.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </Field>

        {/* <Field span="2" label="Status Kunjungan">
          <label className="check">
            <input type="checkbox" checked={form.sudahKunjungan} onChange={e=>setField("sudahKunjungan", e.target.checked)} />
            Sudah melakukan kunjungan
          </label>
        </Field> */}

        <Field label="Nama PT/CV yang Dikelola">
          <input
            list="perusahaan-list"
            value={form.badanUsahaNama}
            onChange={(e) => {
              const val = e.target.value;
              setField("badanUsahaNama", val);
            }}
            placeholder="Pilih / ketik nama PT/CV"
            autoComplete="off"
          />
          <datalist id="perusahaan-list">
            {(companyMaster || []).map((c) => (
              <option
                key={`${c.nama_perusahaan}-${c.nama_pemilik || "x"}`}
                value={c.nama_perusahaan}
              >
                {c.nama_perusahaan}
                {c.nama_pemilik ? ` — (${c.nama_pemilik})` : ""}
              </option>
            ))}
          </datalist>
        </Field>
        
        <Field label="Nama Pemilik / Pengelola">
          <input
            value={form.namaPemilik}
            onChange={(e) => {
              const val = e.target.value;
              setField("namaPemilik", val);
            }}
            placeholder="Nama pemilik atau pengelola"
            autoComplete="off"
          />
        </Field>

        <Field label="Jenis Angkutan" req error={errors.jenisAngkutan}>
          <select
            data-error={!!errors.jenisAngkutan}
            value={form.jenisAngkutan}
            onChange={(e) => setField("jenisAngkutan", e.target.value)}
          >
            <option value="">— Pilih jenis —</option>
            <option>Kendaraan Bermotor Umum</option>
            <option>Kapal Penumpang Umum</option>
          </select>
        </Field>

        <Field
          span="2"
          label="Alamat yang Dikunjungi"
          req
          error={errors.alamatKunjungan}
        >
          <textarea
            data-error={!!errors.alamatKunjungan}
            value={form.alamatKunjungan}
            onChange={(e) => setField("alamatKunjungan", e.target.value)}
            placeholder="Tulis alamat lengkap lokasi kunjungan"
          />
        </Field>

        <Field label="No. Telepon/HP Pemilik/Pengelola">
          <input
            value={form.telPemilik}
            onChange={(e) => setField("telPemilik", e.target.value)}
            placeholder="08xxxxxxxxxx"
            autoComplete="off"
          />
        </Field>
      </div>
    </>
  );
}

function Step2Armada({ form, setField, armadaList, setArmadaList, errors, onNext }) {
  const [iwkbuRows, setIwkbuRows] = useState([]);
  const [loadingIwkbu, setLoadingIwkbu] = useState(false);
  const [errorIwkbu, setErrorIwkbu] = useState(null);

  // ====== LOAD DATA IWKBU BERDASARKAN NAMA PERUSAHAAN (STEP 1) ======
  useEffect(() => {
    const nama = (form.badanUsahaNama || "").trim();
    if (!nama) {
      setIwkbuRows([]);
      return;
    }

    let alive = true;
    (async () => {
      setLoadingIwkbu(true);
      setErrorIwkbu(null);
      try {
        const { data, error } = await supabase
          .from("iwkbu")
          .select("nopol,tarif,jenis,tahun,nama_perusahaan")
          .ilike("nama_perusahaan", nama);

        if (!alive) return;
        if (error) throw error;
        setIwkbuRows(data || []);
      } catch (e) {
        if (!alive) return;
        console.error("Load iwkbu for Step2Armada error:", e);
        setErrorIwkbu(e.message || String(e));
        setIwkbuRows([]);
      } finally {
        if (alive) setLoadingIwkbu(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [form.badanUsahaNama]);

  // daftar nopol unik buat datalist
  const nopolOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (iwkbuRows || [])
            .map((r) => r.nopol)
            .filter(Boolean)
            .map((n) => n.toUpperCase())
        )
      ).sort(),
    [iwkbuRows]
  );

  // pastikan tiap item armada punya field tambahan (osTarif, bayarOs, buktiFiles, rekomendasi)
  const safeList = (armadaList || []).map((a) => ({
    nopol: "",
    status: "",
    tipeArmada: "",
    tahun: "",
    osTarif: null,
    bayarOs: "",
    buktiFiles: [],
    rekomendasi: "",
    ...a,
  }));

  const setSafeList = (next) => setArmadaList(next);

  const add = () =>
    setSafeList([
      ...safeList,
      {
        nopol: "",
        status: "",
        tipeArmada: "",
        tahun: "",
        osTarif: null,
        bayarOs: "",
        buktiFiles: [],
        rekomendasi: "",
      },
    ]);

  const remove = (idx) => setSafeList(safeList.filter((_, i) => i !== idx));

  const update = (idx, patch) => {
    const next = [...safeList];
    next[idx] = { ...next[idx], ...patch };
    setSafeList(next);
  };

  const handleNopolChange = (idx, raw) => {
    const value = (raw || "").toUpperCase().trim();
    // cari di data iwkbu buat perusahaan ini
    const row = iwkbuRows.find(
      (r) => (r.nopol || "").toUpperCase().trim() === value
    );

    if (row) {
      update(idx, {
        nopol: value,
        osTarif: row.tarif ?? 0,
        tipeArmada: row.jenis || "",
        tahun: row.tahun || "",
      });
    } else {
      // manual, tanpa data iwkbu
      update(idx, { nopol: value, osTarif: null });
    }
  };

  const handleStatusChange = (idx, newStatus) => {
    const normalized = (newStatus || "").toUpperCase();
    const current = safeList[idx];

    const patch = { status: newStatus };

    // kalau ganti dari "Beroperasi + Bayar" ke status lain → kosongkan bayarOs
    if (current.status === "Beroperasi + Bayar" && newStatus !== "Beroperasi + Bayar") {
      patch.bayarOs = "";
    }

    // kalau status baru tidak butuh upload → kosongkan buktiFiles
    if (!ARMADA_STATUS_NEED_UPLOAD.has(normalized)) {
      patch.buktiFiles = [];
    }

    update(idx, patch);
  };

  const handleBuktiChange = (idx, fileList) => {
    const files = Array.from(fileList || []);
    const MAX_FILES = 3;
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

    const valid = [];
    const rejected = [];

    for (const f of files) {
      if (valid.length >= MAX_FILES) {
        rejected.push(`${f.name} (lebih dari 3 file)`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        rejected.push(`${f.name} (lebih dari 5MB)`);
        continue;
      }
      valid.push(f);
    }

    if (rejected.length) {
      alert(
        "Beberapa file tidak digunakan:\n" +
          rejected.map((r) => "- " + r).join("\n") +
          "\nSyarat: maks 3 file, masing-masing ≤ 5MB."
      );
    }

    update(idx, { buktiFiles: valid });
  };

  return (
    <>
      <h2 className="h2">Step 2 — Armada</h2>
      <p className="lead">
        Daftar kendaraan, status & nilai OS IWKBU untuk PT/CV:{" "}
        <strong>{form.badanUsahaNama || "— belum dipilih di Step 1"}</strong>
      </p>

      {loadingIwkbu && (
        <div className="hint" style={{ marginBottom: 8 }}>
          Memuat riwayat armada dari IWKBU…
        </div>
      )}
      {errorIwkbu && (
        <div className="alert warn" style={{ marginBottom: 8 }}>
          <div className="alert-title">Gagal memuat data IWKBU</div>
          {errorIwkbu}
        </div>
      )}
      {errors.list && (
        <div className="alert warn" style={{ marginBottom: 12 }}>
          <div className="alert-title">Perlu diisi</div>
          {errors.list}
        </div>
      )}

      {safeList.map((a, i) => {
        const statusNorm = (a.status || "").toUpperCase();
        const showBayarOs = a.status === "Beroperasi + Bayar";
        const showUpload = ARMADA_STATUS_NEED_UPLOAD.has(statusNorm);

        return (
          <div className="card-sub" key={i}>
            <div className="form-grid">
              {/* NOPOL */}
              <Field label="No. Polisi" req error={errors[`nopol_${i}`]}>
                <input
                  data-error={!!errors[`nopol_${i}`]}
                  list="armada-nopol-list"
                  value={a.nopol}
                  onChange={(e) => handleNopolChange(i, e.target.value)}
                  placeholder="BM 1234 TU"
                  autoComplete="off"
                />
                {a.osTarif != null && (
                  <div className="hint" style={{ marginTop: 4 }}>
                    Jumlah OS yang harus dibayar:{" "}
                    <strong>{idr(a.osTarif)}</strong>
                  </div>
                )}
              </Field>

              {/* STATUS */}
              <Field label="Status Kendaraan" req error={errors[`status_${i}`]}>
                <select
                  data-error={!!errors[`status_${i}`]}
                  value={a.status}
                  onChange={(e) => handleStatusChange(i, e.target.value)}
                >
                  <option value="">— Pilih Status —</option>
                  {ARMADA_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </Field>

              {/* TIPE ARMADA (otomatis dari iwkbu.jenis tapi bisa edit) */}
              <Field label="Tipe Armada">
                <input
                  value={a.tipeArmada}
                  onChange={(e) => update(i, { tipeArmada: e.target.value })}
                  placeholder="BUS, MINIBUS, dll."
                />
              </Field>

              {/* TAHUN (otomatis dari iwkbu.tahun tapi bisa edit) */}
              <Field label="Tahun Pembuatan" error={errors[`tahun_${i}`]}>
                <input
                  data-error={!!errors[`tahun_${i}`]}
                  type="number"
                  value={a.tahun}
                  onChange={(e) => update(i, { tahun: e.target.value })}
                  placeholder="2020"
                />
              </Field>
            </div>

            {/* Jika status = Beroperasi + Bayar → input jumlah OS yang mau dibayar */}
            {showBayarOs && (
              <div className="form-grid" style={{ marginTop: 8 }}>
                <Field
                  label={
                    <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                      <span>Jumlah OS yang mau dibayar</span>
                      {a.osTarif != null && (
                        <small style={{ color: "#9CA3AF" }}>
                          (minimal {idr(a.osTarif)})
                        </small>
                      )}
                    </div>
                  }
                  error={errors[`bayarOs_${i}`]}
                >
                  <input
                    data-error={!!errors[`bayarOs_${i}`]}
                    type="number"
                    min={0}
                    value={a.bayarOs}
                    onChange={(e) => update(i, { bayarOs: e.target.value })}
                    placeholder="Masukkan jumlah yang dibayar"
                  />

                  {a.osTarif != null && (
                    <div className="hint">
                      Nilai OS penuh: <strong>{idr(a.osTarif)}</strong>
                    </div>
                  )}
                </Field>
              </div>
            )}

            {/* Status tertentu → upload bukti */}
            {showUpload && (
              <div className="form-grid" style={{ marginTop: 8 }}>
                <Field label="Upload Bukti (PDF / Foto)">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={(e) =>
                      handleBuktiChange(i, e.target.files || [])
                    }
                  />
                  <div className="hint">
                    Maksimal 3 file, masing-masing ≤ 5MB.
                    {a.buktiFiles?.length
                      ? ` (${a.buktiFiles.length} file terpilih)`
                      : ""}
                  </div>
                </Field>
              </div>
            )}

            {/* Rekomendasi tindak lanjut untuk armada ini */}
            <div className="form-grid" style={{ marginTop: 8 }}>
              <Field span="2" label="Rekomendasi Tindak Lanjut (Armada ini)">
                <textarea
                  value={a.rekomendasi}
                  onChange={(e) =>
                    update(i, { rekomendasi: e.target.value })
                  }
                  placeholder="Contoh : Bayar IWKBU / Pemeliharaan Data KBU / Kunjungan Kembali"
                />
              </Field>
            </div>

            <div className="actions-right">
              <button
                type="button"
                className="btn ghost"
                onClick={() => remove(i)}
              >
                Hapus Armada
              </button>
            </div>
          </div>
        );
      })}

      {/* datalist nopol untuk semua armada */}
      <datalist id="armada-nopol-list">
        {nopolOptions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {/* tombol tambah kendaraan */}
      <button type="button" className="btn primary" onClick={add}>
        + Tambah Kendaraan
      </button>

      {/* B. Hasil Kunjungan (umum) */}
      <div className="section" style={{ marginTop: 20 }}>
        <h3 className="h2">B. Hasil Kunjungan</h3>
        <Field span="2" label="Penjelasan Hasil Kunjungan">
          <textarea
            rows={3}
            placeholder="Tuliskan hasil kunjungan…"
            value={form?.hasilKunjungan || ""}
            onChange={(e) => setField("hasilKunjungan", e.target.value)}
          />
        </Field>
        <Field label="Janji Bayar Tunggakan">
          <input
            type="date"
            value={form.janjiBayar}
            onChange={(e) => setField("janjiBayar", e.target.value)}
          />
        </Field>
      </div>
    </>
  );
}

/** SignaturePad sederhana (mouse & touch) */
function SignaturePad({ value, onChange, height = 160 }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const ratioRef = useRef(1); // simpan ratio global

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const ratio = ratioRef.current;
    if (e.touches && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left),
        y: (e.touches[0].clientY - rect.top),
      };
    }
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    last.current = getPos(e);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();

    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";

    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    last.current = pos;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const data = canvasRef.current.toDataURL("image/png");
    onChange(data);
  };

  const clear = () => {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    onChange("");
  };

  // ✅ scale for crisp lines on HiDPI
  useEffect(() => {
    const c = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    ratioRef.current = ratio;
    const width = c.clientWidth;
    const heightCss = c.clientHeight;
    c.width = width * ratio;
    c.height = heightCss * ratio;
    const ctx = c.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, heightCss);
  }, []);

  // render ulang dari value (saat reload Step 3)
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
    if (value.startsWith("data:image")) img.src = value;
  }, []);

  return (
    <div>
      <div
        style={{
          border: "1.5px dashed var(--border)",
          borderRadius: 12,
          background: "#fff",
          position: "relative",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height,
            touchAction: "none",
            borderRadius: 12,
            display: "block",
          }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <div className="actions-right" style={{ gap: 8 }}>
        <button className="btn ghost" onClick={clear}>Hapus</button>
      </div>
    </div>
  );
}

function Step3UploadPenilaian({ form, setField, errors, onPickMultiple }) {
  const totalSurat = (form.suratPernyataanEvidence || []).length;

  return (
    <>
      <h2 className="h2">Step 3 — Upload & Penilaian</h2>
      <p className="lead">
        Unggah bukti kunjungan (1 foto wajib) dan surat/evidence (maks 10 file), lalu berikan penilaian dan tanda tangan.
      </p>

      <div className="form-grid">
        <Field label="Upload Foto Kunjungan (wajib)">
          <input type="file" accept="image/*" onChange={e => setField("fotoKunjungan", e.target.files?.[0] || null)} />
          <span className="hint">{form.fotoKunjungan ? `Terpilih: ${form.fotoKunjungan.name}` : "Belum ada file"}</span>
        </Field>

        <Field label="Upload Surat Pernyataan & Evidence (maks 10 file)">
          <input type="file" multiple accept="image/*,.pdf" onChange={onPickMultiple("suratPernyataanEvidence")} />
          <span className="hint">
            {totalSurat > 0 ? `${totalSurat} file terpilih` : "Belum ada file"}
          </span>
        </Field>
      </div>

      <div className="card-sub">
        <div className="form-grid">
          <Field label="Respon Pemilik / Pengelola">
            <input type="range" min="1" max="5" value={form.nilaiKebersihan} onChange={e=>setField("nilaiKebersihan", Number(e.target.value))} />
            <span className="hint">Nilai: {form.nilaiKebersihan}</span>
          </Field>
          <Field label="Keramaian Penumpang">
            <input type="range" min="1" max="5" value={form.nilaiKelengkapan} onChange={e=>setField("nilaiKelengkapan", Number(e.target.value))} />
            <span className="hint">Nilai: {form.nilaiKelengkapan}</span>
          </Field>
          <Field label="Ketaatan Pengurusan Izin Angkutan">
            <input type="range" min="1" max="5" value={form.nilaiPelayanan} onChange={e=>setField("nilaiPelayanan", Number(e.target.value))} />
            <span className="hint">Nilai: {form.nilaiPelayanan}</span>
          </Field>
        </div>
      </div>

      {/* Signature pads */}
      <div className="form-grid" style={{ marginTop: 12 }}>
        <Field span="2" label="Tanda Tangan Petugas">
          <SignaturePad
            value={form.tandaTanganPetugas}
            onChange={(dataUrl) => setField("tandaTanganPetugas", dataUrl)}
          />
        </Field>

        <Field span="2" label="Tanda Tangan Pemilik">
          <SignaturePad
            value={form.tandaTanganPemilik}
            onChange={(dataUrl) => setField("tandaTanganPemilik", dataUrl)}
          />
        </Field>
      </div>
    </>
  );
}

/* ================ ATOMS ================ */
function Field({ label, req, error, span = "1", children }) {
  return (
    <div className={`field span-${span}`}>
      <label className="field-label">
        {label} {req && <span className="req">*</span>}
      </label>
      <div className="control">{children}</div>
      {error && <span className="err">{error}</span>}
    </div>
  );
}

/* ===== CSS ===== */
const css = `
:root{
  --bb-25:#f6fbff; --bb-50:#eaf6ff; --bb-100:#e3f2ff;
  --bb-200:#dbeafe; --bb-400:#b8deff; --bb-600:#7ec0ff;
  --by-25:#fffdf4; --by-50:#fff9e6; --by-300:#ffefb0; --by-500:#ffe48a;
  --ink:#0f172a; --muted:#64748b; --ok:#10b981;
  --border:#dbeafe; --card:#ffffff;
  --ring:0 0 0 3px rgba(126,192,255,.35);
  --radius:16px;
  --gutter: clamp(14px, 3.4vw, 28px);
  --space: 14px;
}

*{box-sizing:border-box}
body{
  margin:0;
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial;
  color:var(--ink);
  background:var(--bb-50);
}

.crm-wrap.full.kawai{
  min-height:100dvh;
  width:100vw;
  overflow-x:hidden;
  background:
    radial-gradient(900px 520px at 8% -10%, var(--by-50), transparent 60%),
    radial-gradient(900px 520px at 110% 110%, var(--bb-50), transparent 60%),
    linear-gradient(180deg, var(--bb-25) 0%, var(--by-25) 100%);
}

.container{
  max-width:1120px;
  margin:0 auto;
  padding:0 var(--gutter);
  width:100%;
}

.crm-card{
  width:100%;
  background:var(--card);
}

.h2{
  margin:0 0 8px 0;
  font-size:22px;
  line-height:1.25;
}
.lead{
  margin:0 0 14px 0;
  color:#334155;
}

/* ===== HEADER ===== */
.crm-header{
  position:sticky;
  top:0;
  z-index:10;
  border-bottom:1px solid var(--bb-200);
  background:
    radial-gradient(160px 60px at 10% 0%, var(--by-50), transparent 70%),
    radial-gradient(200px 80px at 90% 0%, var(--bb-50), transparent 70%),
    linear-gradient(90deg, var(--by-300), var(--bb-400) 45%, var(--bb-600) 100%);
  box-shadow:0 8px 18px rgba(12,34,78,.06);
}
.header-inner{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:18px 0 10px;
}
.crm-header .title{
  display:flex;
  align-items:center;
  gap:10px;
  font-weight:900;
  font-size:22px;
  color:#0e1b34;
}
.crm-header .title .dot{
  width:10px;
  height:10px;
  border-radius:999px;
  background:var(--by-500);
  box-shadow:0 0 0 6px rgba(255,228,138,.35);
}
.crm-header .subtitle{
  font-size:13px;
  color:#2b3c66;
  opacity:.9;
  padding-bottom:12px;
}
.badge{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:4px 8px;
  border-radius:999px;
  font-size:12px;
  font-weight:800;
  color:#0f1f3a;
  background:linear-gradient(90deg,var(--bb-400),var(--by-300));
}
.header-actions .btn.sm{
  padding:8px 12px;
  border-radius:10px;
  font-weight:800;
}

/* ===== STEPPER ===== */
.stepper{
  padding:14px 0;
  background:linear-gradient(180deg,#fff,var(--bb-50));
  border-bottom:1px solid var(--bb-200);
}
.stepper .progress{
  height:8px;
  border-radius:999px;
  background:#fff;
  overflow:hidden;
  margin:0 var(--gutter) 12px;
}
.stepper .bar{
  height:100%;
  border-radius:999px;
  background:linear-gradient(90deg,var(--bb-400),var(--by-300));
  transition:width .35s ease;
}
.stepper .steps{
  display:flex;
  gap:10px;
  overflow:auto;
  padding:0 var(--gutter) 6px;
}
.stepper .steps::-webkit-scrollbar{display:none}
.stepper .step{
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px 12px;
  border-radius:999px;
  border:1px solid var(--border);
  background:#fff;
  cursor:pointer;
  transition:transform .08s,box-shadow .15s,border-color .15s,background .15s;
  white-space:nowrap;
}
.stepper .step.active{
  border-color:var(--bb-600);
  box-shadow:var(--ring);
  background:linear-gradient(180deg,#fff,#f8fbff);
}
.stepper .step.done{
  border-color:#bfead2;
  background:linear-gradient(180deg,#fff,#f5fff9);
}
.stepper .circle{
  width:26px;
  height:26px;
  border-radius:999px;
  display:grid;
  place-items:center;
  font-weight:800;
  background:var(--by-300);
}
.stepper .label{
  font-size:13px;
  font-weight:800;
  color:#243b6b;
}

/* ===== LAYOUT GRID ===== */
.grid{
  display:grid;
  grid-template-columns: minmax(0,1fr) 360px;
  gap:22px;
  align-items:start;
  padding:22px 0 24px;
}
.main{min-width:0}
.aside{position:sticky;top:108px}

/* ===== SECTIONS & CARDS ===== */
.section{
  background:#fff;
  border:1px solid var(--border);
  border-radius:18px;
  padding:16px;
  box-shadow:0 8px 24px rgba(18,43,99,.05);
}
.card-sub{
  background:linear-gradient(180deg,#fff,var(--bb-50));
  border:1px solid var(--border);
  border-radius:14px;
  padding:12px;
  margin:0 0 12px 0;
}
.actions-right{
  display:flex;
  justify-content:flex-end;
  margin-top:8px;
}

/* ===== FORM GRID ===== */
.form-grid{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space);
}
.field{
  display:flex;
  flex-direction:column;
  gap:6px;
}
.field.span-2{grid-column: span 2}
.field .field-label{
  font-size:13px;
  font-weight:800;
  color:#334155;
}
.field .field-label .req{color:#ef4444;margin-left:4px}
.field .hint{font-size:12px;color:#475569}
.field .err{font-size:12px;color:#b91c1c;font-weight:800}

input,select,textarea{
  width:100%;
  min-height:44px;
  padding:10px 12px;
  border-radius:12px;
  border:1.5px solid var(--border);
  background:#fff;
  transition:border-color .15s,box-shadow .15s,background .15s;
}
input[data-error='true'], select[data-error='true'], textarea[data-error='true']{border-color:#ef4444}
input:focus,select:focus,textarea:focus{
  outline:none;
  border-color:var(--bb-600);
  box-shadow:var(--ring);
}
textarea{
  resize:vertical;
  min-height:96px;
}

.check{display:inline-flex;gap:8px;align-items:center}

/* ===== FOOTER ===== */
.crm-footer{
  display:flex;
  align-items:center;
  gap:12px;
  margin-top:16px;
}
.crm-footer.sticky{
  position:sticky;
  bottom:12px;
  background:linear-gradient(180deg,#ffffffaa,#ffffffee);
  backdrop-filter:blur(6px);
  padding:12px;
  border:1px solid var(--bb-200);
  border-radius:14px;
  box-shadow:0 10px 28px rgba(18,43,99,.12);
}
.spacer{flex:1}

/* ===== BUTTONS ===== */
.btn{
  border:0;
  border-radius:14px;
  padding:12px 18px;
  font-weight:800;
  cursor:pointer;
  transition:transform .08s,box-shadow .15s;
}
.btn.primary{
  background:linear-gradient(90deg,var(--bb-400),var(--by-300));
  color:#0f1f3a;
}
.btn.success{
  background:linear-gradient(180deg,#b7f2d3,#79e2b4);
  color:#064e3b;
}
.btn.ghost{
  background:#fff;
  border:1.5px dashed var(--bb-200);
  color:#334155;
}
.btn:hover{
  transform:translateY(-1px);
  box-shadow:0 10px 18px rgba(0,0,0,.06);
}
.btn:disabled{opacity:.55;cursor:not-allowed}

/* ===== ASIDE ===== */
.aside-card{
  background:linear-gradient(180deg,#fff,var(--bb-50));
  border:1.5px solid var(--border);
  border-radius:20px;
  padding:16px;
  box-shadow:0 8px 24px rgba(18,43,99,.06);
}
.aside-title{
  font-weight:900;
  font-size:16px;
  color:#1e3a8a;
  margin-bottom:12px;
  display:flex;
  align-items:center;
  gap:8px;
}
.aside-title::before{content:"📋"}
.badges{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-bottom:12px;
}
.badge.stat{
  background:#fff;
  border:1.5px solid var(--border);
  border-radius:12px;
  padding:10px 12px;
}
.badge.stat .x-label{font-size:11px;color:#334155}
.badge.stat .x-value{font-size:14px;font-weight:900}
.mini{margin-top:8px}
.mini-title{font-weight:800;color:#0f1f3a;margin-bottom:8px}
.mini-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}
.mini-item{
  background:#fff;
  border:1.5px dashed var(--border);
  border-radius:12px;
  padding:10px;
}
.mini-label{font-size:11px;color:#334155}
.mini-value{font-weight:800;font-size:13px;color:#0f1b34}

/* ===== ALERT / TIP ===== */
.alert{
  border-radius:14px;
  padding:10px 12px;
  margin-top:12px;
}
.alert.warn{
  background:#fff7ed;
  border:1.5px solid #fed7aa;
}
.alert-title{
  font-weight:900;
  margin-bottom:6px;
  color:#7c2d12;
}
.tip{
  margin-top:12px;
  font-size:12px;
  color:#334155;
}

/* keyboard helper */
kbd{
  background:#fff;
  border:1px solid var(--bb-200);
  border-bottom-width:2px;
  padding:2px 6px;
  border-radius:6px;
  font-weight:800;
}

/* ===== INPUT VISIBILITY FIX ===== */
.crm-wrap { color-scheme: light; }

input, select, textarea {
  color: #0f172a !important;
  -webkit-text-fill-color: #0f172a;
  caret-color: #0f172a;
  font-weight: 600;
}

/* Placeholder */
::placeholder {
  color: #475569;
  opacity: .95;
  font-weight: 500;
}

/* Auto-fill fix */
input:-webkit-autofill,
textarea:-webkit-autofill,
select:-webkit-autofill{
  -webkit-text-fill-color: #0f172a !important;
  box-shadow: 0 0 0 1000px #ffffff inset !important;
  transition: background-color 9999s ease-out 0s;
}

input, select, textarea { text-rendering: optimizeLegibility; }

/* ===== POPUP KAWAII ===== */
.popup-cute {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn .25s ease;
}
.popup-box {
  background: linear-gradient(180deg, #fff, #fef9ff);
  border: 2px solid #ffd6f5;
  box-shadow: 0 10px 30px rgba(255, 0, 150, 0.15);
  border-radius: 20px;
  padding: 28px 36px;
  text-align: center;
  max-width: 320px;
  animation: popIn .3s ease;
}
.popup-emoji {
  font-size: 42px;
  margin-bottom: 10px;
  animation: bounce 1s infinite ease-in-out;
}
.popup-text {
  font-weight: 700;
  color: #8b2b83;
  font-size: 15px;
  margin-bottom: 14px;
}
.popup-btn {
  background: linear-gradient(90deg, #ffc6f0, #ffd4b8);
  color: #432d3c;
  font-weight: 800;
  border: none;
  border-radius: 999px;
  padding: 8px 18px;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(0,0,0,.08);
  transition: transform .1s;
}
.popup-btn:hover { transform: scale(1.05); }

@keyframes popIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

/* efek shake ringan untuk field error */
[data-error='true'] {
  animation: shake .35s ease;
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

/* ====== RESPONSIVE ====== */

/* Tablet ke bawah: aside turun ke bawah, 1 kolom */
@media (max-width: 980px){
  .grid{
    grid-template-columns: 1fr;
    gap:18px;
  }
  .aside{
    position:static;
  }
}

/* HP besar (<= 768px) */
@media (max-width: 768px){
  .crm-card{
    min-height:100dvh;
    border-radius:0;
    box-shadow:none;
  }

  .header-inner{
    flex-direction:column;
    align-items:flex-start;
    gap:6px;
  }
  .crm-header .title{
    font-size:18px;
  }
  .crm-header .subtitle{
    font-size:12px;
    padding-bottom:10px;
  }

  .stepper .steps{
    padding-inline:16px;
    gap:8px;
  }
  .stepper .step{
    padding:6px 10px;
  }
  .stepper .label{
    font-size:12px;
  }

  /* footer dibikin fixed di bawah */
  .crm-footer.sticky{
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    border-radius:16px 16px 0 0;
    margin:0;
    border-left:0;
    border-right:0;
    padding:10px 16px;
  }
  /* beri space bawah untuk konten biar ga ketutup footer */
  .grid{
    padding-bottom:80px;
  }
}

/* HP kecil (<= 520px) */
@media (max-width: 520px){
  .container{
    padding:0 14px;
  }

  .form-grid{
    grid-template-columns:1fr;
  }
  .field.span-2{
    grid-column: span 1;
  }

  .btn{
    padding:10px 14px;
    font-size:13px;
  }
  input,select,textarea{
    min-height:40px;
    font-size:13px;
  }

  .stepper .step:not(.active) .label{
    display:none; /* tampilkan label lengkap cuma utk step aktif */
  }

  .popup-box{
    max-width:90vw;
    padding:20px 18px;
  }
}
`;
