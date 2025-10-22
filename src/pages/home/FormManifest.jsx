import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../views/home/FormManifest.css";

const LS_KEY = "manifest_submissions";

function KawaiiNavbar({ active = "Form Manifest", onBack, backLabel = "Kembali", canBack = true }) {
  const links = [
    { to: "/", label: "Home", icon: "🏡" },
    { to: "/form-crm", label: "Form CRM", icon: "📋" },
    { to: "/login", label: "Login", icon: "🔐" },
  ];

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

        <nav className="nav-menu">
          {links.map((l) => (
            <a
              key={l.to}
              href={l.to}
              className={`nav-item ${window.location.pathname === l.to ? "active" : ""}`}
            >
              <span className="emoji">{l.icon}</span>
              <span>{l.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default function FormManifest() {
  // State form
  const [tanggal, setTanggal] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16); // format YYYY-MM-DDTHH:MM
  });
  const [kapal, setKapal] = useState("");
  const [asal, setAsal] = useState("");
  const [dewasa, setDewasa] = useState(0);
  const [anak, setAnak] = useState(0);
  const [premiPerOrang, setPremiPerOrang] = useState(5000);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [agen, setAgen] = useState("");
  const [telp, setTelp] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Signature canvas
  const canvasRef = useRef(null);

  // Hitung total penumpang dan premi
  const totalPenumpang = useMemo(() => {
    const d = parseInt(dewasa || 0, 10);
    const a = parseInt(anak || 0, 10);
    return (Number.isNaN(d) ? 0 : d) + (Number.isNaN(a) ? 0 : a);
  }, [dewasa, anak]);

  const jumlahPremi = useMemo(
    () => totalPenumpang * (parseInt(premiPerOrang || 0, 10) || 0),
    [totalPenumpang, premiPerOrang]
  );

  const [showPopup, setShowPopup] = useState(false);

  // Preview foto
  useEffect(() => {
    if (!fotoFile) {
      setFotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(fotoFile);
    setFotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [fotoFile]);

  // Event tanda tangan
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // set style goresan
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#333";

    // sinkron ukuran internal canvas dgn ukuran visual (CSS)
    const setupSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setupSize();

    const ro = new ResizeObserver(setupSize);
    ro.observe(canvas);

    let isDrawing = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return { x, y };
    };

    const start = (e) => {
      e.preventDefault();
      isDrawing = true;
      canvas.setPointerCapture?.(e.pointerId);
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const move = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const end = (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      isDrawing = false;
      canvas.releasePointerCapture?.(e.pointerId);
      ctx.closePath();
    };

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    canvas.addEventListener("pointerleave", end);
    canvas.addEventListener("pointercancel", end);

    return () => {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointerleave", end);
      canvas.removeEventListener("pointercancel", end);
    };
  }, []);

  // Bersihkan tanda tangan
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Helper: convert File -> dataURL (agar persist di localStorage)
  const fileToDataURL = (file) =>
    new Promise((resolve) => {
      if (!file) return resolve("");
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => resolve("");
      fr.readAsDataURL(file);
    });

  // Submit & simpan ke localStorage
  const handleSave = async () => {
    // validasi minimal
    if (!tanggal || !kapal || !asal) {
      alert("Lengkapi tanggal, kapal, dan asal dulu ya.");
      return;
    }

    setSaving(true);

    // ambil dataURL tanda tangan (opsional)
    let signUrl = "";
    try {
      const canvas = canvasRef.current;
      if (canvas) signUrl = canvas.toDataURL("image/png");
    } catch (e) {
      // noop
    }

    // konversi foto ke dataURL supaya tidak hilang saat reload
    const fotoUrl = await fileToDataURL(fotoFile);

    // bentuk record
    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tanggal,
      kapal,
      asal,
      dewasa: Number(dewasa) || 0,
      anak: Number(anak) || 0,
      total: totalPenumpang,
      premiPerOrang: Number(premiPerOrang) || 0,
      jumlahPremi: Number(jumlahPremi) || 0,
      agen: agen.trim(),
      telp: telp.trim(),
      fotoUrl,
      signUrl, // belum dipakai di list, tapi disimpan jika suatu saat perlu
    };

    try {
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(record);
      localStorage.setItem(LS_KEY, JSON.stringify(arr));

      setSubmitted(true);
      setShowPopup(true);

      // redirect setelah sejenak (ubah path sesuai rute daftar kamu)
      setTimeout(() => {
        window.location.href = "/"; // contoh: ke halaman list. Ubah ke "/dashboard/admin/manifest" jika itu rutenya.
      }, 1200);
    } catch (e) {
      console.error("Simpan manifest gagal", e);
      alert("Gagal menyimpan ke perangkat. Coba ulangi.");
    } finally {
      setSaving(false);
    }
  };

  const toRupiah = (n) =>
    (n || 0).toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    });

  return (
    <>
      <KawaiiNavbar
        active="Form Manifest"
        onBack={() => window.history.back()}
        backLabel="Kembali"
        canBack={true}
      />
      <div className="dfm-wrapper">
        <div className="dfm-cloud-bg" aria-hidden />
        <form className="dfm-card" onSubmit={(e) => e.preventDefault()}>
          <header className="dfm-header">
            <div className="dfm-title">
              <span className="dfm-emoji" role="img" aria-label="ferry">
                ⛴️
              </span>
              <h1>Data Manifest Keberangkatan</h1>
            </div>
            <p className="dfm-sub">Isi data dengan lengkap ya ~</p>
          </header>

          <section className="dfm-grid">
            {/* Tanggal dan Waktu */}
            <div className="dfm-field">
              <label>Tanggal & Waktu Keberangkatan</label>
              <input
                type="datetime-local"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
              />
            </div>

            {/* Nama Kapal */}
            <div className="dfm-field">
              <label>Nama Kapal</label>
              <select
                value={kapal}
                onChange={(e) => setKapal(e.target.value)}
                required
              >
                <option value="" disabled>
                  Pilih kapal…
                </option>
                <option>SB Karunia Jaya</option>
                <option>SB Bintang Rizky Express 89</option>
                <option>SB Verando 12</option>
                <option>SB Karuniya Jaya Mini 89</option>
                <option>SB Terubuk Express 2</option>
                <option>SB Four Brother 01</option>
                <option>SB Meranti Express 89</option>
                <option>SB Meranti Jaya</option>
              </select>
            </div>

            {/* Asal */}
            <div className="dfm-field">
              <label>Keberangkatan Asal</label>
              <select
                value={asal}
                onChange={(e) => setAsal(e.target.value)}
                required
              >
                <option value="" disabled>
                  Pilih asal…
                </option>
                <option>Pelabuhan Mangkapan</option>
                <option>Buton</option>
                <option>Siak</option>
              </select>
            </div>

            {/* Penumpang */}
            <div className="dfm-field">
              <label>Jumlah Penumpang Dewasa</label>
              <input
                type="number"
                min={0}
                value={dewasa}
                onChange={(e) => setDewasa(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="dfm-field">
              <label>Jumlah Penumpang Anak</label>
              <input
                type="number"
                min={0}
                value={anak}
                onChange={(e) => setAnak(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Total & Premi */}
            <div className="dfm-field dfm-readonly">
              <label>Total Penumpang</label>
              <div className="dfm-badge" aria-live="polite">
                {totalPenumpang}
              </div>
            </div>

            <div className="dfm-field">
              <label>Premi Jasa Raharja / Orang</label>
              <input
                type="number"
                min={0}
                value={premiPerOrang}
                onChange={(e) => setPremiPerOrang(e.target.value)}
              />
            </div>

            <div className="dfm-field dfm-readonly">
              <label>Jumlah Premi (otomatis)</label>
              <div className="dfm-badge">{toRupiah(jumlahPremi)}</div>
            </div>

            {/* Upload Foto */}
            <div className="dfm-field dfm-file">
              <label>Upload Foto Pencatatan Manifest</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
              />
              {fotoPreview && (
                <div className="dfm-photo-preview">
                  <img src={fotoPreview} alt="Preview manifest" />
                </div>
              )}
            </div>

            {/* Nama Agen */}
            <div className="dfm-field">
              <label>Nama Agen</label>
              <input
                type="text"
                value={agen}
                onChange={(e) => setAgen(e.target.value)}
                placeholder="cth: Budi Santoso"
              />
            </div>

            {/* No. Telepon */}
            <div className="dfm-field">
              <label>No. Telepon</label>
              <input
                type="tel"
                value={telp}
                onChange={(e) => setTelp(e.target.value)}
                placeholder="cth: 0812-3456-7890"
                pattern="[0-9+\\-\\s]+"
              />
            </div>

            {/* Tanda Tangan */}
            <div className="dfm-field dfm-sign">
              <label>Tanda Tangan</label>
              <div className="dfm-signboard">
                <canvas ref={canvasRef} width={560} height={200} />
                <div className="dfm-sign-actions">
                  <button
                    type="button"
                    className="dfm-btn ghost"
                    onClick={clearSignature}
                  >
                    Bersihkan
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="dfm-footer">
            <div className="dfm-summary">
              <span>
                👥 Total: <b>{totalPenumpang}</b> penumpang
              </span>
              <span>
                💸 Premi: <b>{toRupiah(jumlahPremi)}</b>
              </span>
            </div>
            <button
              type="button"
              className="dfm-btn primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Menyimpan…" : "Simpan Manifest ✨"}
            </button>

            {showPopup && (
              <div className="dfm-popup">
                <p>🎉 Manifest berhasil disimpan!</p>
              </div>
            )}
          </footer>
        </form>
      </div>
    </>
  );
}
