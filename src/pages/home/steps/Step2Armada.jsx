import React, { useMemo, useState, useEffect } from "react";

function Field({ label, children, error, required, hint }) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span className="field-label">
        {label} {required ? <b className="req">*</b> : null}
      </span>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
      {error ? <span className="err">{error}</span> : null}
    </label>
  );
}
const Row = ({ children }) => <div className="row">{children}</div>;
const Col = ({ children, w = 1 }) => <div className={`col w-${w}`}>{children}</div>;

/**
 * Step2Armada
 * - Layout kartu armada (dinamis add/remove)
 * - Seksi "Hasil Kunjungan" seperti gambar
 * - Janji Bayar → siap kirim WA (dengan confirm)
 *   - Pilihan nomor: Pemilik / Pengelola / Manual
 *   - Template pesan otomatis + list nopol
 */
export default function Step2Armada({
  armadaList = [],
  setArmadaList,
  errors = {},
  form,
  setField,
}) {
  // ============== WA helpers ==============
  const [waTarget, setWaTarget] = useState(
    form?.telPemilik || form?.telPengelola || ""
  );
  const phones = useMemo(() => {
    const p = [];
    if (form?.telPemilik) p.push({ k: "pemilik", label: `Pemilik (${form.telPemilik})`, v: form.telPemilik });
    if (form?.telPengelola) p.push({ k: "pengelola", label: `Pengelola (${form.telPengelola})`, v: form.telPengelola });
    return p;
  }, [form?.telPemilik, form?.telPengelola]);

  const normalizePhoneID = (s) => {
    if (!s) return "";
    const d = String(s).replace(/[^\d]/g, "");
    if (d.startsWith("62")) return d;
    if (d.startsWith("0")) return "62" + d.slice(1);
    return d; // biarkan kalau sudah internasional
  };

  const formatDateTimeID = (val) => {
    if (!val) return "";
    // val dari input datetime-local => "YYYY-MM-DDTHH:mm"
    const [d, t] = val.split("T");
    const [y, m, dd] = d.split("-");
    const [hh, mm] = (t || "").split(":");
    return `${dd}/${m}/${y} ${hh}:${mm}`;
  };

  const buildJanjiMessage = () => {
    const dt = formatDateTimeID(form?.janjiBayar);
    const daftar = armadaList?.map((a, i) => `${i + 1}. ${a.nopol || "-"}`).join("%0A");
    const header = `*JANJI BAYAR TUNGGAKAN*%0A`;
    const baris1 = `Tanggal/Waktu: ${dt || "-"}%0A`;
    const baris2 = `Petugas: ${form?.namaPetugas || "-"}%0A`;
    const baris3 = `Kendaraan:%0A${daftar || "-" }%0A`;
    const baris4 = form?.penjelasanKunjungan
      ? `Catatan: ${encodeURIComponent(form.penjelasanKunjungan)}%0A`
      : "";
    const penutup = `%0AMohon konfirmasi balasan WA ini. Terima kasih.`;
    return `${header}${baris1}${baris2}${baris3}${baris4}${penutup}`;
  };

  const sendWA = (phone, text) => {
    const p = normalizePhoneID(phone);
    if (!p) {
      alert("Nomor WhatsApp belum diisi.");
      return;
    }
    const url = `https://api.whatsapp.com/send?phone=${p}&text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleJanjiChange = (e) => {
    const val = e.target.value;
    setField("janjiBayar", val);
    if (!val) return;
    // Konfirmasi auto-kirim
    const target = waTarget || phones[0]?.v || "";
    if (!target) return;
    const dtLabel = formatDateTimeID(val);
    const ok = confirm(
      `Kirim pesan JANJI BAYAR ke WhatsApp (${target}) untuk jadwal ${dtLabel}?`
    );
    if (ok) sendWA(target, buildJanjiMessage());
  };

  const handleSendClick = () => {
    sendWA(waTarget || phones[0]?.v, buildJanjiMessage());
  };

  // ============== Armada CRUD ==============
  const addKendaraan = () => {
    setArmadaList([
      ...armadaList,
      { nopol: "", status: "", tipeArmada: "", kapasitas: "", tahun: "" },
    ]);
  };

  const removeKendaraan = (index) => {
    const next = armadaList.filter((_, i) => i !== index);
    setArmadaList(next);
  };

  const update = (index, key, value) => {
    const next = armadaList.map((k, i) =>
      i === index ? { ...k, [key]: value } : k
    );
    setArmadaList(next);
  };

  return (
    <div className="step-pane step2-armada">
      <style>{armadaCss}</style>

      <h3 className="armada-title">
        <span className="dot" /> Armada <span className="spark">✨</span>
      </h3>

      {armadaList.map((k, idx) => {
        const idxErr = {
          nopol: errors[`nopol_${idx}`],
          status: errors[`status_${idx}`],
          kapasitas: errors[`kapasitas_${idx}`],
          tahun: errors[`tahun_${idx}`],
        };
        return (
          <div key={idx} className="card-kawaii">
            <div className="card-head">
              <span className="badge">🚚</span>
              <span className="head-text">
                Data Kendaraan {armadaList.length > 1 ? `#${idx + 1}` : ""}
              </span>
              {armadaList.length > 1 && (
                <button
                  type="button"
                  className="chip-del"
                  onClick={() => removeKendaraan(idx)}
                >
                  Hapus
                </button>
              )}
            </div>

            <Row>
              <Col w={1}>
                <Field label="Nopol / Nama Kapal" error={idxErr.nopol} required>
                  <input
                    type="text"
                    placeholder="BM 1234 CD"
                    value={k.nopol}
                    onChange={(e) =>
                      update(idx, "nopol", e.target.value.toUpperCase())
                    }
                  />
                </Field>
              </Col>

              <Col w={1}>
                <Field label="Status Kendaraan" error={idxErr.status} required>
                  <select
                    value={k.status}
                    onChange={(e) => update(idx, "status", e.target.value)}
                  >
                    <option value="">— Pilih Status —</option>
                    <option value="Beroperasi + Bayar">Beroperasi + Bayar</option>
                    <option value="Perlu Perpanjangan">Perlu Perpanjangan</option>
                    <option value="Dijual">Dijual</option>
                    <option value="Ubah Sifat">Ubah Sifat</option>
                    <option value="Ubah Bentuk">Ubah Bentuk</option>
                    <option value="Rusak Sementara">Rusak Sementara</option>
                    <option value="Rusak Selamanya">Rusak Selamanya</option>
                    <option value="Tidak Ditemukan">Tidak Ditemukan</option>
                    <option value="Cadangan">Cadangan</option>
                  </select>
                </Field>
              </Col>

              <Col w={1}>
                <Field label="Informasi OS">
                  <input
                    type="text"
                    placeholder="Isi Nopol dulu ya…"
                    disabled={!k.nopol}
                    value={k.nopol ? "OS ditemukan" : ""}
                    readOnly
                  />
                </Field>
              </Col>
            </Row>
          </div>
        );
      })}

      {errors.list ? <div className="err">{errors.list}</div> : null}

      <button type="button" className="add-vehicle-btn" onClick={addKendaraan}>
        + Tambah Kendaraan
      </button>

      {/* ================== Hasil Kunjungan (sesuai gambar) ================== */}
      <div className="card-kawaii">
        <div className="card-head">
          <span className="badge">📝</span>
          <span className="head-text">B. Hasil Kunjungan</span>
        </div>

        <Field label="Penjelasan Hasil Kunjungan">
          <textarea
            rows={3}
            placeholder="Tuliskan Nopol / Nama Kapal dan penjelasan berdasarkan hasil kunjungan…"
            value={form?.penjelasanKunjungan || ""}
            onChange={(e) => setField("penjelasanKunjungan", e.target.value)}
          />
        </Field>

        <Field
          label="Janji Bayar Tunggakan"
          hint="Set jadwal lalu kirim via WhatsApp ke nomor yang dipilih."
        >
          <div className="input-action">
            <input
              type="datetime-local"
              value={form?.janjiBayar || ""}
              onChange={handleJanjiChange}
            />
            <button
              type="button"
              className="btn-wa"
              title="Kirim Janji Bayar via WhatsApp"
              onClick={handleSendClick}
            >
              Kirim WA
            </button>
          </div>
        </Field>

        <Field label="Kirim ke Nomor WhatsApp">
          {/* pilihan nomor atau input manual */}
          {phones.length > 0 ? (
            <select
              value={waTarget}
              onChange={(e) => setWaTarget(e.target.value)}
            >
              {phones.map((p) => (
                <option key={p.k} value={p.v}>
                  {p.label}
                </option>
              ))}
              <option value="">— Nomor lain (isi manual) —</option>
            </select>
          ) : null}

          {phones.length === 0 || waTarget === "" ? (
            <input
              style={{ marginTop: 8 }}
              type="tel"
              placeholder="Contoh: 08xxxxxxxxxx"
              value={waTarget}
              onChange={(e) => setWaTarget(e.target.value)}
            />
          ) : null}
        </Field>
      </div>
    </div>
  );
}

/* ================== CSS pastel kawaii + WA action ================== */
const armadaCss = `
.step2-armada{
  --p-blue:#2563eb; --p-yellow:#ffd64d;
  --p-yellow-soft:#fff8d6; --ink:#0f172a; --muted:#64748b;
  --ring:0 0 0 3px rgba(37,99,235,.25);
}
.armada-title{display:flex;align-items:center;gap:10px;margin-bottom:14px;font-size:20px;font-weight:800;color:var(--ink)}
.armada-title .dot{width:10px;height:10px;border-radius:999px;background:var(--p-blue);box-shadow:0 0 0 4px rgba(37,99,235,.15)}
.spark{filter:saturate(1.2)}

.card-kawaii{
  background:radial-gradient(140% 80% at -10% -20%, var(--p-yellow-soft), transparent 55%),
             radial-gradient(120% 80% at 120% 120%, #e2f0ff, transparent 55%),
             #fff;
  border:2px solid rgba(255,214,77,.7);
  border-radius:18px;padding:14px;margin:10px 0 18px 0;
  box-shadow:0 10px 30px rgba(2,6,23,.08);
}
.card-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.badge{display:grid;place-items:center;width:28px;height:28px;border-radius:999px;background:var(--p-yellow);box-shadow:0 4px 14px rgba(255,214,77,.45)}
.head-text{font-weight:800;color:var(--ink)}
.chip-del{margin-left:auto;background:#fee2e2;border:0;color:#7f1d1d;font-weight:700;border-radius:999px;padding:6px 10px;cursor:pointer}
.chip-del:hover{filter:brightness(0.98)}

.add-vehicle-btn{
  width:100%;margin-top:6px;padding:12px 14px;border:0;border-radius:12px;font-weight:800;cursor:pointer;
  background:linear-gradient(90deg,var(--p-blue),#60a5fa);color:#fff;box-shadow:0 6px 18px rgba(37,99,235,.25)
}
.add-vehicle-btn:hover{filter:brightness(1.05);transform:translateY(-1px)}

.field{display:block;margin-bottom:14px}
.field-label{display:block;font-size:13px;color:var(--muted);margin-bottom:6px}
.req{color:#ef4444;margin-left:4px}
.hint{display:block;margin-top:6px;font-size:12px;color:#475569}
input[type="text"],input[type="number"],input[type="datetime-local"],input[type="tel"],select,textarea{
  width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;background:#fffdfb;
  transition:border-color .15s,box-shadow .15s
}
textarea{resize:vertical}
input:focus,select:focus,textarea:focus{border-color:var(--p-blue);box-shadow:var(--ring);background:#fff}
.row{display:flex;gap:14px;flex-wrap:wrap}
.col{flex:1 1 0}
.w-2{flex-basis:calc(66.66% - 10px)}
.w-1{flex-basis:calc(33.33% - 10px)}
@media(max-width:900px){.col,.w-1,.w-2{flex-basis:100%}}
.has-error input,.has-error select,.has-error textarea{border-color:#ef4444}
.err{display:block;margin-top:6px;color:#dc2626;font-size:12px}

/* input + action button (WA) */
.input-action{display:flex;gap:8px;align-items:center}
.input-action .btn-wa{
  white-space:nowrap;padding:0 14px;height:44px;border:0;border-radius:12px;font-weight:800;cursor:pointer;
  background:linear-gradient(90deg,#25D366,#128C7E);color:#fff;box-shadow:0 6px 18px rgba(18,140,126,.25)
}
.input-action .btn-wa:hover{filter:brightness(1.05)}
`;
