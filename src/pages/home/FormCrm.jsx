import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";

/**
 * FORM CRM — PRO + SignaturePad
 */
export default function FormCrm() {
  const [step, setStep] = useState(1);
  const [dirty, setDirty] = useState(false);
  const initial = useRef(true);

  // ================== STATE ==================
  const [form, setForm] = useState(() => {
    const draft = localStorage.getItem("form_crm_draft_v5");
    if (draft) { try { return JSON.parse(draft); } catch {} }
    return {
      // Step 1 — Datakunjungan
      tanggal: "", waktu: "", loket: "", namaPetugas: "",
      sudahKunjungan: false, badanUsahaTipe: "PT", badanUsahaNama: "",
      jenisAngkutan: "", namaPemilik: "", alamatKunjungan: "",
      telPemilik: "", telPengelola: "",

      // Step 2 — Armada + Hasil kunjungan
      armadaList: [{ nopol: "", status: "", tipeArmada: "", tahun: "" }],
      hasilKunjunganPenjelasan: "",
      janjiBayarTunggakan: "",

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

  // ================== URL SYNC (?step=1..4) ==================
  useEffect(() => {
    const s = Number(new URLSearchParams(location.search).get("step"));
    if (s >= 1 && s <= 4) setStep(s);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set("step", String(step));
    history.replaceState({}, "", `${location.pathname}?${params.toString()}`);
  }, [step]);

  // ================== UNSAVED GUARD ==================
  useEffect(() => {
    const onBeforeUnload = (e) => { if (!dirty) return; e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const steps = [
    { id: 1, title: "Data Kunjungan" },
    { id: 2, title: "Armada" },
    { id: 3, title: "Upload & Penilaian" },
    { id: 4, title: "Pesan & Saran" },
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
      if (k.tahun && (Number(k.tahun) < 1980 || Number(k.tahun) > new Date().getFullYear() + 1))
        e[`tahun_${i}`] = "Tahun tidak wajar";
    });
    return e;
  }, [form.armadaList]);

  const step3Errors = useMemo(() => {
    const e = {};
    const anyUpload =
      form.fotoKunjungan ||
      (form.suratPernyataanEvidence || []).length > 0;
    if (!anyUpload) e.minimal = "Unggah minimal satu dokumen/foto";
    return e;
  }, [form]);

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
      return;
    }
    setStep(s => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, canNext1, canNext2, canNext3, focusFirstError]);

  const prev = useCallback(() => {
    setStep(s => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSubmit = () => {
    console.log("Payload submit:", form);
    alert("Form siap dikirim! (demo)");
    setDirty(false);
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
        <Header dirty={dirty} onReset={resetDraft} />

        <div className="container">
          <Stepper steps={steps} current={step} progressPct={progressPct} onJump={setStep} />
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
                {step === 1 && <Step1Datakunjungan form={form} setField={setField} errors={step1Errors} />}
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
                      const files = Array.from(e.target.files || []).slice(0, 5);
                      setField(key, files);
                    }}
                  />
                )}
                {step === 4 && <Step4PesanSaran form={form} setField={setField} />}
              </div>

              <div className="crm-footer sticky">
                <button className="btn ghost" disabled={step === 1} onClick={prev}>⟵ Kembali</button>
                <div className="spacer" />
                {step < 4 ? (
                  <button
                    className="btn primary"
                    onClick={guardNext}
                    disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2) || (step === 3 && !canNext3)}
                    title="Ctrl+Enter untuk lanjut, Shift+Enter untuk kembali"
                  >
                    Lanjut ⟶
                  </button>
                ) : (
                  <button className="btn success" onClick={handleSubmit}>🚀 Submit</button>
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
    </div>
  );
}

/* ================ SUBS ================ */
function Header({ dirty, onReset }) {
  return (
    <div className="crm-header">
      <div className="container header-inner">
        <div className="title">
          <span className="dot" /><span>Formulir CRM</span>
        </div>
        <div className="header-actions">
          <button className="btn ghost sm" onClick={() => (window.location.href = "/")}>🏠 Kembali ke Home</button>
          <button className="btn ghost sm" onClick={onReset}>Reset Draft</button>
        </div>
      </div>
      <div className="container">
        <div className="subtitle">Isi data kunjungan, armada/kendaraan, lalu upload bukti & penilaian. Ikuti langkah-langkah di bawah ini.</div>
      </div>
    </div>
  );
}

function Stepper({ steps, current, progressPct, onJump }) {
  return (
    <div className="stepper">
      <div className="progress"><div className="bar" style={{ width: `${progressPct}%` }} /></div>
      <div className="steps">
        {steps.map(s => {
          const active = s.id === current; const done = s.id < current;
          return (
            <button key={s.id} className={`step ${active ? "active" : ""} ${done ? "done" : ""}`} onClick={() => onJump(s.id)}>
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
      <div className="alert-title">Perlu diperbaiki</div>
      <ul>{list.map((v,i)=><li key={i}>{v}</li>)}</ul>
    </div>
  );
}

function SidebarSummary({ form, step, step1Errors, step2Errors, step3Errors }) {
  const totalArmada = form.armadaList?.length || 0;
  const totalFiles = [form.fotoKunjungan, ...(form.suratPernyataanEvidence||[])].filter(Boolean).length;
  const badges = [
    { label: "Langkah", value: `${step}/4` },
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

      <div className="tip">
        Tekan <kbd>Ctrl</kbd>+<kbd>Enter</kbd> untuk lanjut, <kbd>Shift</kbd>+<kbd>Enter</kbd> untuk kembali.
      </div>
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
function Step1Datakunjungan({ form, setField, errors }) {
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

        <Field label="Loket" req error={errors.loket}>
          <select data-error={!!errors.loket} value={form.loket} onChange={e=>setField("loket", e.target.value)}>
            <option value="">— Pilih Loket —</option>
            <option>Loket A</option><option>Loket B</option><option>Loket C</option>
          </select>
        </Field>

        <Field label="Nama Petugas" req error={errors.namaPetugas}>
          <input data-error={!!errors.namaPetugas} value={form.namaPetugas} onChange={e=>setField("namaPetugas", e.target.value)} placeholder="Nama petugas lapangan" />
        </Field>

        <Field span="2" label="Status Kunjungan">
          <label className="check">
            <input type="checkbox" checked={form.sudahKunjungan} onChange={e=>setField("sudahKunjungan", e.target.checked)} />
            Sudah melakukan kunjungan
          </label>
        </Field>

        <Field label="Tipe Badan Usaha">
          <div className="segmented">
            <div className={`seg ${form.badanUsahaTipe==='PT'?'active':''}`} onClick={()=>setField('badanUsahaTipe','PT')}>PT</div>
            <div className={`seg ${form.badanUsahaTipe==='Pribadi'?'active':''}`} onClick={()=>setField('badanUsahaTipe','Pribadi')}>Pribadi</div>
          </div>
        </Field>

        <Field label="Nama PT/CV / Pemilik">
          <input value={form.badanUsahaNama} onChange={e=>setField("badanUsahaNama", e.target.value)} placeholder="Contoh: PT Maju Jaya" />
        </Field>

        <Field label="Jenis Angkutan" req error={errors.jenisAngkutan}>
          <select data-error={!!errors.jenisAngkutan} value={form.jenisAngkutan} onChange={e=>setField("jenisAngkutan", e.target.value)}>
            <option value="">— Pilih jenis —</option>
            <option value="Barang">Barang</option><option value="Orang">Orang</option><option value="Pariwisata">Pariwisata</option>
          </select>
        </Field>

        <Field label="Nama Pemilik / Pengelola">
          <input value={form.namaPemilik} onChange={e=>setField("namaPemilik", e.target.value)} placeholder="Nama pemilik atau pengelola" />
        </Field>

        <Field span="2" label="Alamat yang Dikunjungi" req error={errors.alamatKunjungan}>
          <textarea data-error={!!errors.alamatKunjungan} value={form.alamatKunjungan} onChange={e=>setField("alamatKunjungan", e.target.value)} placeholder="Tulis alamat lengkap lokasi kunjungan" />
        </Field>

        <Field label="No. Telepon/HP Pemilik">
          <input value={form.telPemilik} onChange={e=>setField("telPemilik", e.target.value)} placeholder="08xxxxxxxxxx" />
        </Field>
        <Field label="No. Telepon/HP Pengelola">
          <input value={form.telPengelola} onChange={e=>setField("telPengelola", e.target.value)} placeholder="08xxxxxxxxxx" />
        </Field>
      </div>
    </>
  );
}

function Step2Armada({ form, setField, armadaList, setArmadaList, errors, onNext }) {
  const add = () => setArmadaList([...(armadaList||[]), { nopol:"", status:"", tipeArmada:"", tahun:"" }]);
  const remove = (idx) => setArmadaList(armadaList.filter((_,i)=>i!==idx));
  const update = (idx, key, val) => {
    const next = [...armadaList]; next[idx] = { ...next[idx], [key]: val }; setArmadaList(next);
  };

  return (
    <>
      <h2 className="h2">Step 2 — Armada</h2>
      <p className="lead">Daftar kendaraan dan hasil kunjungan.</p>

      {errors.list && <div className="alert warn" style={{marginBottom:12}}><div className="alert-title">Perlu diperbaiki</div>{errors.list}</div>}

      {(armadaList||[]).map((a, i) => (
        <div className="card-sub" key={i}>
          <div className="form-grid">
            <Field label="No. Polisi" req error={errors[`nopol_${i}`]}>
              <input data-error={!!errors[`nopol_${i}`]} value={a.nopol} onChange={e=>update(i,"nopol",e.target.value)} placeholder="B 1234 CD" />
            </Field>

            <Field label="Status" req error={errors[`status_${i}`]}>
              <select data-error={!!errors[`status_${i}`]} value={a.status} onChange={e=>update(i,"status",e.target.value)}>
                <option value="">— Pilih —</option><option>Aktif</option><option>Perawatan</option><option>Tidak Aktif</option>
              </select>
            </Field>

            <Field label="Tipe Armada">
              <input value={a.tipeArmada} onChange={e=>update(i,"tipeArmada",e.target.value)} placeholder="Truk bak, Bus, dll." />
            </Field>

            <Field label="Tahun" error={errors[`tahun_${i}`]}>
              <input data-error={!!errors[`tahun_${i}`]} type="number" value={a.tahun} onChange={e=>update(i,"tahun",e.target.value)} placeholder="2020" />
            </Field>
          </div>

          <div className="actions-right">
            <button className="btn ghost" onClick={()=>remove(i)}>Hapus</button>
          </div>
        </div>
      ))}

      <button className="btn primary" onClick={add}>+ Tambah Kendaraan</button>

      <div className="section" style={{ marginTop: 20 }}>
        <h3 className="h2">B. Hasil Kunjungan</h3>
        <Field span="2" label="Penjelasan Hasil Kunjungan">
          <textarea
            value={form.hasilKunjunganPenjelasan}
            onChange={e => setField("hasilKunjunganPenjelasan", e.target.value)}
            placeholder="Tuliskan Nopol / Nama Kapal dan penjelasan berdasarkan hasil kunjungan..."
          />
        </Field>
        <Field label="Janji Bayar Tunggakan">
          <input
            type="datetime-local"
            value={form.janjiBayarTunggakan}
            onChange={e => setField("janjiBayarTunggakan", e.target.value)}
          />
        </Field>

        <div className="actions-right" style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={onNext}>Lanjut ke Upload ⟶</button>
        </div>
      </div>
    </>
  );
}

/** SignaturePad sederhana (mouse & touch), mengekspor dataURL PNG */
function SignaturePad({ value, onChange, height = 160 }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

  const start = (e) => {
    drawing.current = true;
    last.current = getPos(e);
  };
  const move = (e) => {
    if (!drawing.current) return;
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
    e.preventDefault();
  };
  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    onChange("");
  };
  const save = () => {
    const data = canvasRef.current.toDataURL("image/png");
    onChange(data);
  };

  // scale for crisp lines on HiDPI
  useEffect(() => {
    const c = canvasRef.current;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = c.clientWidth;
    const heightCss = c.clientHeight;
    c.width = Math.floor(width * ratio);
    c.height = Math.floor(heightCss * ratio);
    const ctx = c.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, heightCss);
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
          style={{ width: "100%", height, touchAction: "none", borderRadius: 12, display: "block" }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
      </div>
      <div className="actions-right" style={{ gap: 8 }}>
        <button className="btn ghost" onClick={clear}>Hapus</button>
        <button className="btn primary" onClick={save}>Simpan</button>
      </div>
      {value && (
        <div className="hint" style={{marginTop:6}}>
          Tersimpan ✓ (PNG {Math.round((value.length*3/4)/1024)} KB)
        </div>
      )}
    </div>
  );
}

function Step3UploadPenilaian({ form, setField, errors, onPickMultiple }) {
  const totalSurat = (form.suratPernyataanEvidence || []).length;

  return (
    <>
      <h2 className="h2">Step 3 — Upload & Penilaian</h2>
      <p className="lead">Unggah bukti kunjungan, surat (maks 5 file), berikan penilaian, dan tanda tangan.</p>

      {errors.minimal && <div className="alert warn" style={{marginBottom:12}}><div className="alert-title">Perlu diperbaiki</div>{errors.minimal}</div>}

      <div className="form-grid">
        <Field label="Upload Foto Kunjungan">
          <input type="file" accept="image/*" onChange={e => setField("fotoKunjungan", e.target.files?.[0] || null)} />
          <span className="hint">{form.fotoKunjungan ? `Terpilih: ${form.fotoKunjungan.name}` : "Belum ada file"}</span>
        </Field>

        <Field label="Upload Surat Pernyataan & Evidence (max 5 file)">
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

function Step4PesanSaran({ form, setField }) {
  return (
    <>
      <h2 className="h2">Step 4 — Pesan & Saran</h2>
      <p className="lead">Tulis ringkasan pesan petugas dan saran untuk pemilik/pengelola.</p>

      <div className="form-grid">
        <Field span="2" label="Pesan Petugas">
          <textarea value={form.pesanPetugas} onChange={e=>setField("pesanPetugas", e.target.value)} placeholder="Catatan hasil kunjungan, temuan, dsb." />
        </Field>

        <Field span="2" label="Saran untuk Pemilik">
          <textarea value={form.saranUntukPemilik} onChange={e=>setField("saranUntukPemilik", e.target.value)} placeholder="Saran perbaikan, prioritas, dan tindak lanjut." />
        </Field>

        <Field span="2" label="Kirim via WhatsApp">
          <label className="check"><input type="checkbox" checked={form.kirimKeWaPemilik} onChange={e=>setField("kirimKeWaPemilik", e.target.checked)} />Pemilik</label>
          <label className="check"><input type="checkbox" checked={form.kirimKeWaPengelola} onChange={e=>setField("kirimKeWaPengelola", e.target.checked)} />Pengelola</label>
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
body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial;color:var(--ink);background:var(--bb-50)}

.crm-wrap.full.kawai{
  min-height:100dvh;width:100vw;overflow-x:hidden;
  background:
    radial-gradient(900px 520px at 8% -10%, var(--by-50), transparent 60%),
    radial-gradient(900px 520px at 110% 110%, var(--bb-50), transparent 60%),
    linear-gradient(180deg, var(--bb-25) 0%, var(--by-25) 100%);
}

.container{max-width:1120px;margin:0 auto;padding:0 var(--gutter);width:100%}
.crm-card{width:100%;background:var(--card)}

.h2{margin:0 0 8px 0;font-size:22px;line-height:1.25}
.lead{margin:0 0 14px 0;color:#334155}

.crm-header{position:sticky;top:0;z-index:10;border-bottom:1px solid var(--bb-200);
  background:
    radial-gradient(160px 60px at 10% 0%, var(--by-50), transparent 70%),
    radial-gradient(200px 80px at 90% 0%, var(--bb-50), transparent 70%),
    linear-gradient(90deg, var(--by-300), var(--bb-400) 45%, var(--bb-600) 100%);
  box-shadow:0 8px 18px rgba(12,34,78,.06);
}
.header-inner{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 0 10px}
.crm-header .title{display:flex;align-items:center;gap:10px;font-weight:900;font-size:22px;color:#0e1b34}
.crm-header .title .dot{width:10px;height:10px;border-radius:999px;background:var(--by-500);box-shadow:0 0 0 6px rgba(255,228,138,.35)}
.crm-header .subtitle{font-size:13px;color:#2b3c66;opacity:.9;padding-bottom:12px}
.badge{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:800;color:#0f1f3a;background:linear-gradient(90deg,var(--bb-400),var(--by-300))}
.header-actions .btn.sm{padding:8px 12px;border-radius:10px;font-weight:800}

.stepper{padding:14px 0;background:linear-gradient(180deg,#fff,var(--bb-50));border-bottom:1px solid var(--bb-200)}
.stepper .progress{height:8px;border-radius:999px;background:#fff;overflow:hidden;margin:0 var(--gutter) 12px}
.stepper .bar{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--bb-400),var(--by-300));transition:width .35s ease}
.stepper .steps{display:flex;gap:10px;overflow:auto;padding:0 var(--gutter) 6px}
.stepper .steps::-webkit-scrollbar{display:none}
.stepper .step{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;border:1px solid var(--border);background:#fff;cursor:pointer;transition:transform .08s,box-shadow .15s,border-color .15s,background .15s}
.stepper .step.active{border-color:var(--bb-600);box-shadow:var(--ring);background:linear-gradient(180deg,#fff,#f8fbff)}
.stepper .step.done{border-color:#bfead2;background:linear-gradient(180deg,#fff,#f5fff9)}
.stepper .circle{width:26px;height:26px;border-radius:999px;display:grid;place-items:center;font-weight:800;background:var(--by-300)}
.stepper .label{font-size:13px;font-weight:800;color:#243b6b}

.grid{display:grid;grid-template-columns: minmax(0,1fr) 360px; gap: 22px; align-items:start; padding: 22px 0 24px}
.main{min-width:0}.aside{position:sticky;top:108px}

.section{background:#fff;border:1px solid var(--border);border-radius:18px;padding:16px;box-shadow:0 8px 24px rgba(18,43,99,.05)}
.card-sub{background:linear-gradient(180deg,#fff,var(--bb-50));border:1px solid var(--border);border-radius:14px;padding:12px;margin:0 0 12px 0}
.actions-right{display:flex;justify-content:flex-end;margin-top:8px}

.form-grid{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space);
}
.field{display:flex;flex-direction:column;gap:6px}
.field.span-2{grid-column: span 2}
.field .field-label{font-size:13px;font-weight:800;color:#334155}
.field .field-label .req{color:#ef4444;margin-left:4px}
.field .hint{font-size:12px;color:#475569}
.field .err{font-size:12px;color:#b91c1c;font-weight:800}

input,select,textarea{
  width:100%;min-height:44px;padding:10px 12px;border-radius:12px;
  border:1.5px solid var(--border);background:#fff;
  transition:border-color .15s,box-shadow .15s,background .15s;
}
input[data-error='true'], select[data-error='true'], textarea[data-error='true']{border-color:#ef4444}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--bb-600);box-shadow:var(--ring)}
textarea{resize:vertical;min-height:96px}

.check{display:inline-flex;gap:8px;align-items:center}

.segmented{display:inline-flex;gap:8px;background:var(--bb-100);padding:4px;border-radius:999px;border:1px solid var(--border)}
.segmented .seg{padding:8px 12px;border-radius:999px;font-weight:800;cursor:pointer;user-select:none}
.segmented .seg.active{background:#fff;box-shadow:var(--ring)}

.crm-footer{display:flex;align-items:center;gap:12px;margin-top:16px}
.crm-footer.sticky{position:sticky;bottom:12px;background:linear-gradient(180deg,#ffffffaa,#ffffffee);backdrop-filter:blur(6px);padding:12px;border:1px solid var(--bb-200);border-radius:14px;box-shadow:0 10px 28px rgba(18,43,99,.12)}
.spacer{flex:1}

.btn{border:0;border-radius:14px;padding:12px 18px;font-weight:800;cursor:pointer;transition:transform .08s,box-shadow .15s}
.btn.primary{background:linear-gradient(90deg,var(--bb-400),var(--by-300));color:#0f1f3a}
.btn.success{background:linear-gradient(180deg,#b7f2d3,#79e2b4);color:#064e3b}
.btn.ghost{background:#fff;border:1.5px dashed var(--bb-200);color:#334155}
.btn:hover{transform:translateY(-1px);box-shadow:0 10px 18px rgba(0,0,0,.06)}
.btn:disabled{opacity:.55;cursor:not-allowed}

.aside-card{background:linear-gradient(180deg,#fff,var(--bb-50));border:1.5px solid var(--border);border-radius:20px;padding:16px;box-shadow:0 8px 24px rgba(18,43,99,.06)}
.aside-title{font-weight:900;font-size:16px;color:#1e3a8a;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.aside-title::before{content:"📋"}
.badges{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.badge.stat{background:#fff;border:1.5px solid var(--border);border-radius:12px;padding:10px 12px}
.badge.stat .x-label{font-size:11px;color:#334155}
.badge.stat .x-value{font-size:14px;font-weight:900}
.mini{margin-top:8px}.mini-title{font-weight:800;color:#0f1f3a;margin-bottom:8px}
.mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mini-item{background:#fff;border:1.5px dashed var(--border);border-radius:12px;padding:10px}
.mini-label{font-size:11px;color:#334155}.mini-value{font-weight:800;font-size:13px;color:#0f1b34}
.alert{border-radius:14px;padding:10px 12px;margin-top:12px}
.alert.warn{background:#fff7ed;border:1.5px solid #fed7aa}
.alert-title{font-weight:900;margin-bottom:6px;color:#7c2d12}
.tip{margin-top:12px;font-size:12px;color:#334155}
kbd{background:#fff;border:1px solid var(--bb-200);border-bottom-width:2px;padding:2px 6px;border-radius:6px;font-weight:800}

@media (max-width: 980px){ .grid{grid-template-columns: 1fr} .aside{position:static} }
@media (max-width: 520px){ .container{padding:0 14px} }
`;
