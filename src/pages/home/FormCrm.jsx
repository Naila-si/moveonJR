import React, { useMemo, useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../../views/home/FormCrm.css";

const cls = (...a) => a.filter(Boolean).join(" ");
const LS_KEY = "crmData";

function loadCrmLs() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}
function saveCrmLs(rows) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}
// baca FileList -> array dataURL (aman untuk disimpan/ditampilkan ulang)
async function filesToDataUrls(fileList, max = 5) {
  if (!fileList || !fileList.length) return [];
  const files = Array.from(fileList).slice(0, max);
  const read = (f) =>
    new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res({ name: f.name, url: fr.result });
      fr.onerror = rej;
      fr.readAsDataURL(f);
    });
  return Promise.all(files.map(read));
}

function KawaiiNavbar({
  active = "Form CRM",
  onBack,               
  backLabel = "Kembali",
  canBack = true        
}) {
  const links = [
    { to: "/", label: "Home", icon: "🏡" },
    { to: "/manifest", label: "Form Manifest", icon: "⛴️" },
    { to: "/login", label: "Login", icon: "🔐" },
  ];

  const location = useLocation();
  const activeLabel = links.find(l => l.to === location.pathname)?.label || active;

  return (
    <header className="nav-kawaii-fixed">
      <div className="nav-glow" aria-hidden />

      <div className="nav-inner">
        <button
          className="nav-back-icon"
          onClick={onBack}
          title={backLabel}
          aria-label={backLabel}
          disabled={!canBack}
        >
          <span className="nav-back-txt">Kembali</span>
        </button>

        {/* Menu */}
        <nav className="nav-menu">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              end
            >
              <span className="emoji">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

/* Bintang rating sederhana */
function Stars({ value = 0, onChange }) {
  return (
    <div className="stars" aria-label="Penilaian bintang">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={cls("star", n <= value && "active")}
          onClick={() => onChange?.(n)}
          aria-label={`${n} bintang`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/* Confetti Emoji — variasi per step */
function ConfettiBurst({ emojis = ["✨"], trigger }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!trigger) return;
    const now = Date.now();
    const count = 32;
    const make = Array.from({ length: count }).map((_, i) => ({
      id: `${now}-${i}`,
      left: 5 + Math.random() * 90, // %
      delay: Math.random() * 180, // ms
      rotate: Math.floor(Math.random() * 360),
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      scale: 0.9 + Math.random() * 0.7,
      dur: 1000 + Math.random() * 700,
    }));
    setItems(make);
    const t = setTimeout(() => setItems([]), 1900);
    return () => clearTimeout(t);
  }, [trigger, emojis]);

  return (
    <div className="confetti-wrap" aria-hidden style={{ pointerEvents: "none", zIndex: 1 }}>
      {items.map((b) => (
        <span
          key={b.id}
          className="confetti"
          style={{
            left: `${b.left}%`,
            animationDelay: `${b.delay}ms`,
            animationDuration: `${b.dur}ms`,
            transform: `rotate(${b.rotate}deg) scale(${b.scale})`,
            pointerEvents: "none",
          }}
        >
          {b.emoji}
        </span>
      ))}
    </div>
  );
}

function useSmartBack({ step, steps, onStepBack, fallback = "/" }) {
  const canStepBack = typeof step === "number" && step > 0;

  const haveReferrer =
    typeof document !== "undefined" &&
    document.referrer &&
    (() => {
      try {
        const prev = new URL(document.referrer);
        return prev.origin === window.location.origin && prev.pathname !== window.location.pathname;
      } catch {
        return false;
      }
    })();

  const canHistoryBack = window.history.length > 1 || haveReferrer;

  const canBack = canStepBack || canHistoryBack || Boolean(fallback);

  const backHint = canStepBack
    ? `Kembali ke: ${steps[step - 1]?.title ?? "Sebelumnya"}`
    : canHistoryBack
    ? "Kembali ke halaman sebelumnya"
    : "Ke Beranda";

  const handleBack = () => {
    if (canStepBack) {
      onStepBack?.();
      return;
    }
    if (canHistoryBack) {
      window.history.back();
      return;
    }
    if (fallback) {
      window.location.assign(fallback);
    }
  };

  return { handleBack, backHint, canBack };
}

function SignaturePad({ value, onChange, height = 180, stroke = 2.2, placeholder = "Tanda tangan di sini…" }) {
  const canvasRef = React.useRef(null);
  const isDrawingRef = React.useRef(false);
  const lastRef = React.useRef({ x: 0, y: 0 });

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    c.width = c.clientWidth * dpr;
    c.height = height * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);

    // placeholder
    if (!value) {
      ctx.font = "14px ui-sans-serif, system-ui";
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillText(placeholder, 12, 22);
    } else {
      // render existing image if ada
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.width / dpr, c.height / dpr);
      img.src = value;
    }
  }, [value, height, placeholder]);

  const getPos = (e) => {
    const c = canvasRef.current;
    const rect = c.getBoundingClientRect();
    const isTouch = e.touches && e.touches[0];
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    isDrawingRef.current = true;
    lastRef.current = getPos(e);
  };
  const move = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    const p = getPos(e);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827"; // ink
    ctx.lineWidth = stroke;
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };
  const end = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    // simpan dataURL
    const c = canvasRef.current;
    onChange?.(c.toDataURL("image/png"));
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    onChange?.("");
  };

  return (
    <div className="sig-wrap">
      <canvas
        className="sig-canvas"
        ref={canvasRef}
        height={height}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="sig-actions">
        <button type="button" className="btn ghost" onClick={clear}>Bersihkan</button>
        <button type="button" className="btn" onClick={() => onChange?.(canvasRef.current.toDataURL("image/png"))}>
          Simpan TTD
        </button>
      </div>
      <div className="sig-note">Gunakan mouse/pen/jari untuk menandatangani.</div>
    </div>
  );
}

function SuccessPopup({ show, onClose }) {
  if (!show) return null;

  return (
    <div className="popup-backdrop" onClick={onClose}>
      <div className="popup-card" onClick={(e) => e.stopPropagation()}>
        <div className="popup-emoji">🎉</div>
        <h2>Data Berhasil Dikirim!</h2>
        <p>Terima kasih telah mengisi formulir CRM. Semoga harimu menyenangkan ☀️</p>
        <button className="btn primary" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  );
}

/* ------------------------ Halaman CRM ------------------------ */
export default function CRMForm() {
  const steps = useMemo(
    () => [
      { key: 0, title: "Data Kunjungan", icon: "🚗", confetti: ["🚗", "🚙", "🚕", "🏎️"] },
      { key: 1, title: "Armada", icon: "🚌", confetti: ["🚌", "🚎"] },
      { key: 2, title: "Upload & Penilaian", icon: "🚚", confetti: ["🚚", "🚛"] },
      { key: 3, title: "Pesan & Saran", icon: "⛴️", confetti: ["⛴️", "🚢", "🛳️"] },
    ],
    []
  );

  const [step, setStep] = useState(0);
  const [burstKey, setBurstKey] = useState(0);

  /* --------- State form --------- */
  const [f1, setF1] = useState({
    tanggal: "",
    loket: "",
    petugasDepan: "",
    petugasBelakang: "",
    perusahaan: "",
    jenis: "Kendaraan Bermotor Umum",
    pemilik: "",
    alamat: "",
    telp: "",
  });

  const [armada, setArmada] = useState([{ id: 1, nopol: "", status: "", os: "" }]);

  const [f3, setF3] = useState({
    foto: null,
    evidence: null,
    respon: 0,
    ramai: 0,
    izin: 0,
    hasilKunjungan: "",
    janjiBayar: "",
    ttdPetugas: "",
    ttdPemilik: "",
  });

  const [f4, setF4] = useState({
    validPetugas: false,
    validPemilik: false,
    catatanValidasi: "",
  });

  const [f5, setF5] = useState({
    kesan: "",
    saran: "",
    kepuasan: 0,
  });

  /* --------- Step handlers --------- */
  const go = (to) => {
    setStep(to);
    setBurstKey((k) => k + 1);
    // pastikan scroll ke atas panel saat pindah step
    document.querySelector(".crm-panels")?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => (step < steps.length - 1 ? go(step + 1) : undefined);
  const back = () => (step > 0 ? go(step - 1) : undefined);

  const { handleBack, backHint, canBack } = useSmartBack({
    step,
    steps,
    onStepBack: () => back(),
    fallback: "/",
  });

  // (opsional) keyboard ESC untuk back
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        handleBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleBack]);

  /* --------- UI --------- */
  const active = steps[step];
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  const buildReportRow = async () => {
    const fotoKunjungan = await filesToDataUrls(f3.foto, 10);     // boleh banyak, tampil di galeri
    const suratPernyataan = await filesToDataUrls(f3.evidence, 5); // sesuai label "maks 5 file"

    // gabung nama petugas, default nilai aman
    const petugasD = (f1.petugasDepan || "").trim();
    const petugasB = (f1.petugasBelakang || "").trim();
    const petugasFull = [petugasD, petugasB].filter(Boolean).join(" ");

    // ringkas nopol & status armada
    const nopolJoined = armada.map(a => a.nopol).filter(Boolean).join("; ");
    const firstStatus  = armada.find(a => a.status)?.status || "-";

    // mapping bintang ke skala/narasi
    const responMap = ["-", "Kurang Kooperatif", "Cukup", "Baik", "Kooperatif", "Sangat Kooperatif"];
    const responPemilik = responMap[f3.respon] ?? "-";

    const nextId = () => {
      const today = new Date();
      const y = today.getFullYear().toString().slice(-2);
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const seq = String(Math.floor(Math.random() * 900) + 100); // 3 digit acak
      return `CRM-${y}${m}-${seq}`;
    };

    // format tanggal time-local -> "YYYY-MM-DD HH:mm"
    const fmtDT = (v) => {
      if (!v) return "-";
      const d = new Date(v);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const row = {
      id: nextId(),
      step1: {
        tanggalWaktu: fmtDT(f1.tanggal),
        loket: f1.loket || "-",
        petugasDepan: f1.petugasDepan || "-",
        petugasBelakang: f1.petugasBelakang || "-",
        kunjunganKePemilik: Boolean(f1.perusahaan || f1.pemilik), // heuristik sederhana
        jenisAngkutan: f1.jenis || "-",
        namaPemilik: f1.pemilik || f1.perusahaan || "-",
        alamat: f1.alamat || "-",
        telepon: f1.telp || "-",
        jabatan: "-", // tidak ada di form — isi default
      },
      step2: {
        dataKendaraan: firstStatus === "-" ? "—" : `Armada ${firstStatus.toLowerCase()}`,
        nopolAtauNamaKapal: nopolJoined || "-",
        statusKendaraan: firstStatus || "-",
        hasilKunjungan: f3.hasilKunjungan || "-",
        penjelasanHasil: f3.hasilKunjungan || "-",
        janjiBayar: f3.janjiBayar ? fmtDT(f3.janjiBayar) : "-",
        rekomendasi: f3.janjiBayar ? "Monitor janji bayar" : "-",
        tunggakan: 0,
        rincianArmada: armada.map(a => ({
          nopol: a.nopol || "-",
          status: a.status || "-",
          tindakLanjut: a.status?.toLowerCase().includes("bayar") ? "Bersedia membayar" : "-",
        })),
      },
      step3: {
        fotoKunjungan: fotoKunjungan.map(x => x.url), // galeri butuh src langsung
        suratPernyataan,                                // {name,url} agar bisa jadi pill link
        evidence: [],                                   // kamu bisa gabungkan ke sini juga kalau mau pisah
        responPemilik,
        ketertibanOperasional: f3.ramai || 0,
        ketaatanPerizinan: f3.izin || 0,
        keramaianPenumpang: f3.ramai || 0,
        ketaatanUjiKir: f3.izin || 0,
      },
      step4: {
        validasiOleh: "Petugas",
        statusValidasi: "Menunggu",
        catatanValidasi: "",
        waktuValidasi: "-",
        wilayah: "-", // tidak ada di form
        // (opsional) bisa simpan ttd di step4 atau step3 jika perlu jejak
        // ttdPetugas: f3.ttdPetugas,
        // ttdPemilik: f3.ttdPemilik,
      },
      step5: {
        pesan: f5.kesan || "-",
        saran: f5.saran || "-",
      },
    };

    return row;
  };

  // === [BARU] Handler submit ===
  const handleSubmit = async () => {
    setBurstKey(k => k + 1);
    setShowPopup(true);

    const row = await buildReportRow();
    const all = loadCrmLs();
    saveCrmLs([row, ...all]); // prepend biar yang baru di atas

    setTimeout(() => {
      navigate("/data-crm"); // arahkan ke halaman daftar hasil
    }, 1200);
  };

  return (
    <>
      {/* NAVBAR BARU */}
      <KawaiiNavbar
        active="Form CRM"
        onBack={handleBack}
        backLabel={backHint}
        canBack={canBack}
      />

      <main className="crm kawaii" aria-label="Formulir CRM">
        {/* background dekor */}
        <div className="crm-bg sky" aria-hidden style={{ pointerEvents: "none", zIndex: 0 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={`cloud cc${i + 1}`} />
          ))}
        </div>
        <div className="crm-bg blobs" aria-hidden style={{ pointerEvents: "none", zIndex: 0 }}>
          <span className="blob b1" />
          <span className="blob b2" />
        </div>

        {/* Confetti unik per step */}
        <ConfettiBurst emojis={active.confetti} trigger={burstKey} />

        <section className="crm-container" style={{ position: "relative", zIndex: 10 }}>
          {/* Header */}
          <header className="crm-header">
            <h1>
              Formulir CRM <span aria-hidden>✨</span>
            </h1>
            <p>
              Isi data kunjungan, armada/kendaraan, upload bukti & penilaian, lalu lakukan validasi serta masukkan pesan & saran.
              Ikuti langkah-langkah di bawah ini.
            </p>
          </header>

          {/* Stepper sticky */}
          <nav className="crm-steps" aria-label="Langkah">
            {steps.map((s, idx) => {
              const done = idx < step;
              const active = idx === step;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={cls("step", active && "active", done && "done")}
                  onClick={() => go(idx)}
                  aria-current={active ? "step" : undefined}
                  title={s.title}
                >
                  <span className="badge">{s.icon}</span>
                  <span className="label">{s.title}</span>
                </button>
              );
            })}
            <div className="progress" style={{ width: `${(step / (steps.length - 1)) * 100}%` }} aria-hidden />
          </nav>

          {/* Panels */}
          <div className="crm-panels" role="region" aria-live="polite" style={{ position: "relative", zIndex: 10 }}>
            {/* STEP 1 */}
            {step === 0 && (
              <div className="panel">
                <h3>
                  <span className="dot" /> Data Kunjungan
                </h3>

                <div className="grid two">
                  <div className="field">
                    <label>Tanggal & Waktu Kunjungan</label>
                    <input
                      type="datetime-local"
                      value={f1.tanggal}
                      onChange={(e) => setF1({ ...f1, tanggal: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Loket</label>
                    <input
                      list="loket-list"
                      name="loket"
                      id="loket"
                      placeholder="Ketik nama loket..."
                      required
                      value={f1.loket}
                      onChange={(e) => setF1({ ...f1, loket: e.target.value })}
                    />

                    <datalist id="loket-list">
                      <option value="Loket Kantor Wilayah" />
                      <option value="Pekanbaru Kota" />
                      <option value="Pekanbaru Selatan" />
                      <option value="Pekanbaru Utara" />
                      <option value="Panam" />
                      <option value="Kubang" />
                      <option value="Bangkinang" />
                      <option value="Lipat Kain" />
                      <option value="Tapung" />
                      <option value="Siak" />
                      <option value="Perawang" />
                      <option value="Kandis" />
                      <option value="Pelalawan" />
                      <option value="Sorek" />
                      <option value="Pasir Pengaraian" />
                      <option value="Ujung Batu" />
                      <option value="Dalu-Dalu" />
                      <option value="Koto Tengah" />
                      <option value="Taluk Kuantan" />
                      <option value="Singingi Hilir" />
                      <option value="Rengat" />
                      <option value="Air Molek" />
                      <option value="Tembilahan" />
                      <option value="Kota Baru" />
                      <option value="Sungai Guntung" />
                      <option value="Loket Kantor Cabang Dumai" />
                      <option value="Dumai" />
                      <option value="Duri" />
                      <option value="Bengkalis" />
                      <option value="Selat Panjang" />
                      <option value="Bagan Siapiapi" />
                      <option value="Bagan Batu" />
                      <option value="Ujung Tanjung" />
                    </datalist>
                  </div>
                </div>

                <div className="grid two">
                  <div className="field">
                    <label>Nama Petugas (Depan)</label>
                    <input
                      value={f1.petugasDepan}
                      onChange={(e) => setF1({ ...f1, petugasDepan: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Nama Petugas (Belakang)</label>
                    <input
                      value={f1.petugasBelakang}
                      onChange={(e) => setF1({ ...f1, petugasBelakang: e.target.value })}
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Telah melakukan kunjungan ke Pemilik/Operator atas nama PT/CV?</label>
                  <input
                    placeholder="Contoh: PT Maju Jaya"
                    value={f1.perusahaan}
                    onChange={(e) => setF1({ ...f1, perusahaan: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Jenis Angkutan</label>
                  <select value={f1.jenis} onChange={(e) => setF1({ ...f1, jenis: e.target.value })}>
                    <option>Kendaraan Bermotor Umum</option>
                    <option>Angkutan Barang</option>
                    <option>Angkutan Penumpang</option>
                    <option>Moda Laut</option>
                  </select>
                </div>

                <div className="field">
                  <label>Nama Pemilik / Pengelola</label>
                  <input value={f1.pemilik} onChange={(e) => setF1({ ...f1, pemilik: e.target.value })} />
                </div>

                <div className="field">
                  <label>Alamat yang Dikunjungi</label>
                  <textarea
                    rows={3}
                    placeholder="Alamat lengkap…"
                    value={f1.alamat}
                    onChange={(e) => setF1({ ...f1, alamat: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>No. Telepon / HP Pemilik / Pengelola</label>
                  <input
                    placeholder="08xxxxxxxxxx"
                    value={f1.telp}
                    onChange={(e) => setF1({ ...f1, telp: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 1 && (
              <div className="panel">
                <h3>
                  <span className="dot" /> Armada
                </h3>

                {armada.map((a) => (
                  <div className="card" key={a.id}>
                    <div className="row between">
                      <strong>Data Kendaraan</strong>
                      {armada.length > 1 && (
                        <button
                          type="button"
                          className="btn danger ghost xs"
                          onClick={() => setArmada((list) => list.filter((it) => it.id !== a.id))}
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    <div className="field">
                      <label>Nopol / Nama Kapal</label>
                      <input
                        placeholder="BM 1234 CD"
                        value={a.nopol}
                        onChange={(e) =>
                          setArmada((list) =>
                            list.map((it) => (it.id === a.id ? { ...it, nopol: e.target.value } : it))
                          )
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Status Kendaraan</label>
                      <select
                        value={a.status}
                        onChange={(e) =>
                          setArmada((list) =>
                            list.map((it) => (it.id === a.id ? { ...it, status: e.target.value } : it))
                          )
                        }
                      >
                        <option value="">— Pilih Status —</option>
                        <option>Beroperasi + Bayar</option>
                        <option>Beroperasi</option>
                        <option>Dijual</option>
                        <option>Ubah Sifat</option>
                        <option>Ubah Bentuk</option>
                        <option>Rusak Sementara</option>
                        <option>Rusak Selamanya</option>
                        <option>Tidak Ditemukan</option>
                        <option>Cadangan</option>
                      </select>
                    </div>

                    <div className="field">
                      <label>Informasi OS</label>
                      <div className="muted">Nominal OS akan tampil di sini…</div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn add"
                  onClick={() => setArmada((l) => [...l, { id: Date.now(), nopol: "", status: "", os: "" }])}
                >
                  + Tambah Kendaraan
                </button>

                <div className="divider" />

                <h3>
                  <span className="dot" /> Hasil Kunjungan
                </h3>

                <div className="field">
                  <label>Penjelasan Hasil Kunjungan</label>
                  <textarea
                    rows={4}
                    placeholder="Tuliskan Nopol / Nama Kapal dan penjelasan berdasarkan hasil kunjungan…"
                    value={f3.hasilKunjungan}
                    onChange={(e) => setF3({ ...f3, hasilKunjungan: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label>Janji Bayar Tunggakan</label>
                  <input
                    type="datetime-local"
                    value={f3.janjiBayar}
                    onChange={(e) => setF3({ ...f3, janjiBayar: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 2 && (
              <div className="panel">
                <h3>
                  <span className="dot" /> Upload & Penilaian
                </h3>

                <div className="field">
                  <label>Upload Foto Kunjungan</label>
                  <input type="file" multiple onChange={(e) => setF3({ ...f3, foto: e.target.files })} />
                </div>

                <div className="field">
                  <label>Upload Surat Pernyataan & Evidence (maks 5 file)</label>
                  <input type="file" multiple onChange={(e) => setF3({ ...f3, evidence: e.target.files })} />
                </div>

                <div className="divider" />

                <h3><span className="dot" /> Penilaian Lapangan</h3>

                
                <div className="field">
                  <label>Respon Pemilik / Pengelola</label>
                  <Stars value={f3.respon} onChange={(v) => setF3({ ...f3, respon: v })} />
                </div>
                <div className="field">
                  <label>Keramaian Penumpang</label>
                  <Stars value={f3.ramai} onChange={(v) => setF3({ ...f3, ramai: v })} />
                </div>
                <div className="field">
                  <label>Ketataan Perizinan</label>
                  <Stars value={f3.izin} onChange={(v) => setF3({ ...f3, izin: v })} />
                </div>

                <div className="divider" />

                <h3><span className="dot" /> Tanda Tangan</h3>

                <div className="grid two">
                  <div className="field">
                    <label>TTD Petugas</label>
                    <SignaturePad
                      value={f3.ttdPetugas}
                      onChange={(dataUrl) => setF3((p) => ({ ...p, ttdPetugas: dataUrl }))}
                    />
                  </div>
                  <div className="field">
                    <label>TTD Pemilik/Pengelola</label>
                    <SignaturePad
                      value={f3.ttdPemilik}
                      onChange={(dataUrl) => setF3((p) => ({ ...p, ttdPemilik: dataUrl }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 3 && (
              <div className="panel">
                <h3>
                  <span className="dot" /> Pesan & Saran
                </h3>

                <div className="field">
                  <label>Kesan Petugas</label>
                  <textarea rows={3} value={f5.kesan} onChange={(e) => setF5({ ...f5, kesan: e.target.value })} />
                </div>

                <div className="field">
                  <label>Saran Perbaikan</label>
                  <textarea rows={4} value={f5.saran} onChange={(e) => setF5({ ...f5, saran: e.target.value })} />
                </div>

                <div className="field">
                  <label>Tingkat Kepuasan</label>
                  <Stars value={f5.kepuasan} onChange={(v) => setF5({ ...f5, kepuasan: v })} />
                </div>

                <div className="success-note">🎉 Terima kasih! Formulir siap dikirim.</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <footer className="crm-actions">
            <button type="button" className="btn ghost" onClick={handleBack} disabled={!canBack}>
              ← Kembali
            </button>

            {step < steps.length - 1 ? (
              <button type="button" className="btn primary" onClick={next}>
                Lanjut {steps[step + 1]?.icon}
              </button>
            ) : (
              <button type="button" className="btn success" onClick={handleSubmit}>
                Submit ✨
              </button>
            )}
          </footer>
        </section>
        <SuccessPopup show={showPopup} onClose={() => setShowPopup(false)} />
      </main>
    </>
  );
}
