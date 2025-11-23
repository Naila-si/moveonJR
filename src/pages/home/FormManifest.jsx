import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../views/home/FormManifest.css";
import { supabase } from "../../lib/supabaseClient";
import { updateIwklBulananFromManifest } from "../../lib/integrationService";

const LS_KEY = "manifest_submissions";

function KawaiiNavbar({ active = "Form Manifest", onBack, backLabel = "Kembali", canBack = true }) {
  const links = [
    { to: "/", label: "Home", icon: "🏡" },
    // { to: "/form-crm", label: "Form CRM", icon: "📋" },
    // { to: "/login", label: "Login", icon: "🔐" },
  ];

  return (
    <header className="nav-kawaii-fixed">
      <div className="nav-glow" aria-hidden />
      <div className="nav-inner">
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
  // ========= STATE DASAR =========
  const [tanggal, setTanggal] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });

  const [kapal, setKapal] = useState("");
  const [asal, setAsal] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [rute, setRute] = useState("");

  const [dewasa, setDewasa] = useState(0);
  const [anak, setAnak] = useState(0);
  const [premiPerOrang, setPremiPerOrang] = useState(5000);

  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [agen, setAgen] = useState("");
  const [telp, setTelp] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // ========= DATA DARI IWKL =========
  const [iwklList, setIwklList] = useState([]);
  const [kapalOptions, setKapalOptions] = useState([]);
  const [asalOptions, setAsalOptions] = useState([]);
  const [selectedIwklId, setSelectedIwklId] = useState(null);
  const [agenOptions, setAgenOptions] = useState([]); // Opsi nama perusahaan/agen

  // Signature canvas
  const canvasRef = useRef(null);

  // ========= HITUNGAN =========
  const totalPenumpang = useMemo(() => {
    const d = parseInt(dewasa || 0, 10);
    const a = parseInt(anak || 0, 10);
    return (Number.isNaN(d) ? 0 : d) + (Number.isNaN(a) ? 0 : a);
  }, [dewasa, anak]);

  const jumlahPremi = useMemo(
    () => totalPenumpang * (parseInt(premiPerOrang || 0, 10) || 0),
    [totalPenumpang, premiPerOrang]
  );

  // ========= LOAD DATA IWKL =========
  useEffect(() => {
    const fetchIwkl = async () => {
      const { data, error } = await supabase
        .from("iwkl")
        .select("id, nama_kapal, rute_awal, rute_akhir, nama_perusahaan, no_kontak")
        .order("nama_kapal", { ascending: true });

      if (error) {
        console.error("Gagal load IWKL:", error);
        return;
      }

      const rows = data || [];
      setIwklList(rows);

      // nama kapal unik
      const kapalSet = new Set();
      const asalSet = new Set();
      const agenSet = new Set();

      rows.forEach((row) => {
        const nama = row.nama_kapal?.trim();
        const awal = row.rute_awal?.trim();
        const perusahaan = row.nama_perusahaan?.trim();

        if (nama) kapalSet.add(nama);
        if (awal) asalSet.add(awal);
        if (perusahaan) agenSet.add(perusahaan);
      });

      setKapalOptions(Array.from(kapalSet));
      setAsalOptions(Array.from(asalSet));
      setAgenOptions(Array.from(agenSet));
    };

    fetchIwkl();
  }, []);

  // ========= RUTE OPTIONS (PER KAPAL) =========
  const ruteOptions = useMemo(() => {
    if (!kapal) return [];
    return iwklList.filter(
      (r) =>
        r.nama_kapal === kapal &&
        (r.rute_awal || r.rute_akhir)
    );
  }, [kapal, iwklList]);

  const selectedRoute = useMemo(
    () => ruteOptions.find((r) => r.id === selectedIwklId) || null,
    [selectedIwklId, ruteOptions]
  );

  // ========= AUTO ISI SEMUA DATA SAAT AGEN/PERUSAHAAN DIPILIH =========
  useEffect(() => {
    if (agen) {
      // Cari data terbaru untuk agen/perusahaan ini
      const agenData = iwklList.filter(r => r.nama_perusahaan === agen);
      if (agenData.length > 0) {
        const latestData = agenData[0]; // Ambil data terbaru
        
        // Auto isi telepon jika ada dan belum diisi
        if (latestData.no_kontak && !telp) {
          setTelp(latestData.no_kontak);
        }
        
        // Auto isi kapal jika ada dan belum diisi
        if (latestData.nama_kapal && !kapal) {
          setKapal(latestData.nama_kapal);
        }
      }
    }
  }, [agen, iwklList, telp, kapal]);

  // ========= AUTO ISI DATA SAAT KAPAL DIPILIH =========
  useEffect(() => {
    if (kapal && ruteOptions.length > 0) {
      const latestKapalData = ruteOptions[0];
      
      // Auto isi agen jika ada dan belum diisi
      if (latestKapalData.nama_perusahaan && !agen) {
        setAgen(latestKapalData.nama_perusahaan);
      }
      
      // Auto isi telepon jika ada dan belum diisi
      if (latestKapalData.no_kontak && !telp) {
        setTelp(latestKapalData.no_kontak);
      }

      // Auto pilih rute pertama jika hanya ada 1 rute
      if (ruteOptions.length === 1 && !selectedIwklId) {
        setSelectedIwklId(ruteOptions[0].id);
        const r = ruteOptions[0];
        setAsal(r.rute_awal || "");
        setTujuan(r.rute_akhir || "");
      }
    }
  }, [kapal, ruteOptions, agen, telp, selectedIwklId]);

  // ========= UPDATE RUTE DISPLAY =========
  useEffect(() => {
    if (selectedRoute) {
      const awal = selectedRoute.rute_awal || asal;
      const akhir = selectedRoute.rute_akhir || tujuan;
      setRute(
        awal && akhir
          ? `${awal} → ${akhir}`
          : awal
          ? `${awal} → (tujuan?)`
          : ""
      );
      
      // Update asal dan tujuan dari rute yang dipilih
      if (selectedRoute.rute_awal && !asal) {
        setAsal(selectedRoute.rute_awal);
      }
      if (selectedRoute.rute_akhir && !tujuan) {
        setTujuan(selectedRoute.rute_akhir);
      }
    } else if (asal || tujuan) {
      setRute(
        asal && tujuan
          ? `${asal} → ${tujuan}`
          : asal
          ? `${asal} → (tujuan?)`
          : ""
      );
    } else {
      setRute("");
    }
  }, [asal, tujuan, selectedRoute]);

  // ========= PREVIEW FOTO =========
  useEffect(() => {
    if (!fotoFile) {
      setFotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(fotoFile);
    setFotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [fotoFile]);

  // ========= CANVAS TTD =========
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#333";

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

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const fileToDataURL = (file) =>
    new Promise((resolve) => {
      if (!file) return resolve("");
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => resolve("");
      fr.readAsDataURL(file);
    });

  // ========= SUBMIT =========
  const handleSave = async () => {
    if (!tanggal || !agen || !kapal || !asal) {
      alert("Lengkapi tanggal, nama perusahaan, kapal, dan asal dulu ya.");
      return;
    }

    setSaving(true);

    let signUrl = "";
    try {
      const canvas = canvasRef.current;
      if (canvas) signUrl = canvas.toDataURL("image/png");
    } catch (e) {
      // noop
    }

    const fotoUrl = await fileToDataURL(fotoFile);

    // HITUNG TOTAL PENUMPANG & PREMI
    const totalPenumpang = (Number(dewasa) || 0) + (Number(anak) || 0);
    const jumlahPremi = totalPenumpang * 5000;

    // FORMAT RUTE
    const ruteDisplay = asal && tujuan
      ? `${asal} → ${tujuan}`
      : asal
      ? `${asal} → (tujuan?)`
      : "";

    const record = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tanggal,
      agen: agen.trim(),
      telp: telp.trim(),
      kapal,
      rute: ruteDisplay,
      totalPenumpang: totalPenumpang,
      jumlahPremi: jumlahPremi,
      fotoUrl,
      signUrl,
      iwkl_id: selectedIwklId || null,
      
      _detail: {
        dewasa: Number(dewasa) || 0,
        anak: Number(anak) || 0,
        asal: asal,
        tujuan: tujuan,
        premiPerOrang: 5000
      }
    };

    try {
      const { data, error } = await supabase
      .from("manifest_submissions")
      .insert([
        {
          tanggal: record.tanggal,
          kapal: record.kapal,
          rute: record.rute,
          total_penumpang: record.totalPenumpang,
          jumlah_premi: record.jumlahPremi,
          agen: record.agen,
          telp: record.telp,
          foto_url: record.fotoUrl,
          sign_url: record.signUrl,
          iwkl_id: record.iwkl_id
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log("✅ Data saved to Supabase:", data);
    
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(record);
      localStorage.setItem(LS_KEY, JSON.stringify(arr));

      console.log('🔄 Starting IWKL integration...');
      try {
        const integrationResult = await updateIwklBulananFromManifest(record);
        
        if (integrationResult.success) {
          console.log('✅ IWKL integration successful:', integrationResult.message);
          // Tampilkan pesan sukses integrasi
          alert(`✅ Data berhasil disimpan dan terintegrasi ke IWKL!\n${integrationResult.message}`);
        } else {
          console.warn('⚠️ IWKL integration failed:', integrationResult.error);
          // Tetap sukses simpan ke localStorage, hanya tampilkan warning
          alert(`✅ Data berhasil disimpan ke manifest.\n⚠️ Integrasi ke IWKL gagal: ${integrationResult.error}`);
        }
      } catch (integrationError) {
        console.error('❌ Integration error:', integrationError);
        // Tetap sukses simpan ke localStorage
        alert('✅ Data berhasil disimpan ke manifest.\n⚠️ Terjadi error saat integrasi ke IWKL.');
      }

      setShowPopup(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);

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
            {/* 1. Tanggal dan Waktu */}
            <div className="dfm-field">
              <label>Tanggal & Waktu Keberangkatan</label>
              <input
                type="datetime-local"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
              />
            </div>

            {/* 2. Nama Perusahaan/Agen */}
            <div className="dfm-field">
              <label>Nama Perusahaan/Agen</label>
              <input
                list="agenList"
                value={agen}
                onChange={(e) => setAgen(e.target.value)}
                placeholder="Pilih atau ketik nama perusahaan/agen…"
                required
              />
              <datalist id="agenList">
                {agenOptions.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>

            {/* 3. No. Telepon */}
            <div className="dfm-field">
              <label>No. Telepon</label>
              <input
                type="tel"
                value={telp}
                onChange={(e) => setTelp(e.target.value)}
                placeholder="cth: 0812-3456-7890"
                pattern="[0-9+\\-\\s]+"
              />
              {agen && (
                <div className="dfm-field-hint">
                  {telp ? `Data dari perusahaan: ${telp}` : 'Tidak ada data telepon untuk perusahaan ini'}
                </div>
              )}
            </div>

            {/* 4. Nama Kapal */}
            <div className="dfm-field">
              <label>Nama Kapal</label>
              <input
                list="kapalList"
                value={kapal}
                onChange={(e) => {
                  const newKapal = e.target.value;
                  setKapal(newKapal);
                  setSelectedIwklId(null);
                  
                  if (!newKapal) {
                    setAsal("");
                    setTujuan("");
                  }
                }}
                placeholder="Pilih atau ketik nama kapal…"
                required
              />
              <datalist id="kapalList">
                {kapalOptions.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>

            {/* 5. Pilih Rute (muncul setelah kapal dipilih) */}
            {kapal && ruteOptions.length > 0 && (
              <div className="dfm-field">
                <label>Pilih Rute (riwayat IWKL)</label>
                <select
                  value={selectedIwklId || ""}
                  onChange={(e) => {
                    const id = Number(e.target.value) || null;
                    setSelectedIwklId(id);
                    const r = ruteOptions.find((x) => x.id === id);
                    if (r) {
                      setAsal(r.rute_awal || "");
                      setTujuan(r.rute_akhir || "");
                    }
                  }}
                >
                  <option value="">— Tidak pakai, isi manual —</option>
                  {ruteOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {(r.rute_awal || "-") + " → " + (r.rute_akhir || "-")}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 6. Keberangkatan Asal */}
            <div className="dfm-field">
              <label>Keberangkatan Asal</label>
              <input
                list="asalList"
                value={asal}
                onChange={(e) => setAsal(e.target.value)}
                placeholder="Pilih atau ketik asal…"
                required
              />
              <datalist id="asalList">
                {asalOptions.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>

            {/* 7. Tujuan */}
            <div className="dfm-field">
              <label>Tujuan</label>
              <input
                type="text"
                value={tujuan}
                onChange={(e) => setTujuan(e.target.value)}
                placeholder="Isi tujuan keberangkatan…"
              />
            </div>

            {/* 8. Rute tampilan saja */}
            <div className="dfm-field dfm-readonly">
              <label>Rute</label>
              <div className="dfm-badge">
                {rute || (asal ? `${asal} → (tujuan?)` : "-")}
              </div>
            </div>

            {/* 9. Jumlah Penumpang Dewasa */}
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

            {/* 10. Jumlah Penumpang Anak */}
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

            {/* 11. Total Penumpang */}
            <div className="dfm-field dfm-readonly">
              <label>Total Penumpang</label>
              <div className="dfm-badge" aria-live="polite">
                {totalPenumpang}
              </div>
            </div>

            {/* 12. Total Premi */}
            <div className="dfm-field dfm-readonly">
              <label>Jumlah Premi</label>
              <div className="dfm-badge">{toRupiah(jumlahPremi)}</div>
            </div>

            {/* 13. Upload Foto */}
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

            {/* 14. Tanda Tangan */}
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