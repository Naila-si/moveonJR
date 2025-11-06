import React from "react";

/* Grid util: 12 kolom (akan diubah di media query oleh CSS global jika mau) */
const Row = ({ children, gap = 12 }) => (
  <div className="row" style={{ display: "grid", gap, gridTemplateColumns: "repeat(12, 1fr)" }}>
    {children}
  </div>
);
const Col = ({ children, span = 4 }) => (
  <div className="col" style={{ gridColumn: `span ${span}` }}>{children}</div>
);

function Field({ label, children, error, required, hint }) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span className="field-label">
        {label} {required ? <b className="req">*</b> : null}
      </span>
      {children}
      {hint ? <small className="hint">{hint}</small> : null}
      {error ? <span className="err">{error}</span> : null}
    </label>
  );
}

export default function Step1Datakunjungan({ form, setField, errors = {} }) {
  const loketOptions = [
    "Loket Kantor Wilayah","Pekanbaru Kota","Pekanbaru Selatan","Pekanbaru Utara","Panam","Kubang",
    "Bangkinang","Lipat Kain","Tapung","Siak","Perawang","Kandis","Pelalawan","Sorek","Pasir Pengaraian",
    "Ujung Batu","Dalu-Dalu","Koto Tengah","Taluk Kuantan","Singingi Hilir","Rengat","Air Molek","Tembilahan",
    "Kota Baru","Sungai Guntung","Loket Kantor Cabang Dumai","Dumai","Duri","Bengkalis","Selat Panjang",
    "Bagan Siapiapi","Bagan Batu","Ujung Tanjung",
  ];

  return (
    <div className="section section-step1">
      <div className="section-head">
        <h3>Step 1 — Datakunjungan</h3>
        <p className="section-desc">Isi data kunjungan, detail badan usaha, dan lokasi yang dikunjungi.</p>
      </div>

      {/* Baris 1 */}
      <Row gap={14}>
        <Col span={4}>
          <Field label="Tanggal Kunjungan" required error={errors.tanggal}>
            <input type="date" value={form.tanggal} onChange={(e) => setField("tanggal", e.target.value)} />
          </Field>
        </Col>
        <Col span={4}>
          <Field label="Waktu Kunjungan" required error={errors.waktu}>
            <input type="time" value={form.waktu} onChange={(e) => setField("waktu", e.target.value)} />
          </Field>
        </Col>
        <Col span={4}>
          <Field label="Loket" required error={errors.loket} hint={!errors.loket && "Pilih loket layanan terdekat"}>
            <select value={form.loket} onChange={(e) => setField("loket", e.target.value)}>
              <option value="">— Pilih Loket —</option>
              {loketOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </Col>
      </Row>

      {/* Baris 2 */}
      <Row gap={14}>
        <Col span={6}>
          <Field label="Nama Petugas" required error={errors.namaPetugas} hint={!errors.namaPetugas && "Wajib diisi"}>
            <input
              type="text"
              placeholder="Nama petugas lapangan"
              value={form.namaPetugas}
              onChange={(e) => setField("namaPetugas", e.target.value)}
            />
          </Field>
        </Col>
        <Col span={6}>
          <Field label="Status Kunjungan">
            <div className="switch inline">
              <input
                id="sudahKunjungan"
                type="checkbox"
                checked={form.sudahKunjungan}
                onChange={(e) => setField("sudahKunjungan", e.target.checked)}
              />
              <label htmlFor="sudahKunjungan" style={{ userSelect: "none" }}>
                {form.sudahKunjungan ? "Sudah melakukan kunjungan" : "Belum melakukan kunjungan"}
              </label>
            </div>
          </Field>
        </Col>
      </Row>

      {/* Kartu PT/CV */}
      <div className="card-lite">
        <div className="card-lite-title">Atas nama PT/CV</div>
        <Row gap={14}>
          <Col span={4}>
            <Field label="Tipe Badan Usaha">
              <div className="inline">
                <label className="chip">
                  <input
                    type="radio"
                    name="badanUsahaTipe"
                    value="PT"
                    checked={form.badanUsahaTipe === "PT"}
                    onChange={(e) => setField("badanUsahaTipe", e.target.value)}
                  />
                  <span>PT</span>
                </label>
                <label className="chip">
                  <input
                    type="radio"
                    name="badanUsahaTipe"
                    value="CV"
                    checked={form.badanUsahaTipe === "CV"}
                    onChange={(e) => setField("badanUsahaTipe", e.target.value)}
                  />
                  <span>CV</span>
                </label>
              </div>
            </Field>
          </Col>
          <Col span={8}>
            <Field label="Nama PT/CV">
              <input
                type="text"
                placeholder="Contoh: PT Maju Jaya"
                value={form.badanUsahaNama}
                onChange={(e) => setField("badanUsahaNama", e.target.value)}
              />
            </Field>
          </Col>
        </Row>
      </div>

      {/* Baris 3 */}
      <Row gap={14}>
        <Col span={4}>
          <Field label="Jenis Angkutan" required error={errors.jenisAngkutan}>
            <select
              value={form.jenisAngkutan}
              onChange={(e) => setField("jenisAngkutan", e.target.value)}
            >
              <option value="">— Pilih jenis —</option>
              <option value="Kendaraan Bermotor Umum">Kendaraan Bermotor Umum</option>
              <option value="Angkutan Barang">Angkutan Barang</option>
              <option value="Penumpang">Penumpang</option>
              <option value="Moda Laut">Moda Laut</option>
            </select>
          </Field>
        </Col>
        <Col span={8}>
          <Field label="Nama Pemilik / Pengelola">
            <input
              type="text"
              placeholder="Nama pemilik atau pengelola"
              value={form.namaPemilik}
              onChange={(e) => setField("namaPemilik", e.target.value)}
            />
          </Field>
        </Col>
      </Row>

      {/* Alamat */}
      <Row gap={14}>
        <Col span={12}>
          <Field label="Alamat yang Dikunjungi" required error={errors.alamatKunjungan}>
            <textarea
              rows={3}
              placeholder="Tulis alamat lengkap lokasi kunjungan"
              value={form.alamatKunjungan}
              onChange={(e) => setField("alamatKunjungan", e.target.value)}
            />
          </Field>
        </Col>
      </Row>

      {/* Kontak */}
      <Row gap={14}>
        <Col span={6}>
          <Field label="No. Telepon/HP Pemilik">
            <input
              type="tel"
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              value={form.telPemilik}
              onChange={(e) => setField("telPemilik", e.target.value)}
            />
          </Field>
        </Col>
        <Col span={6}>
          <Field label="No. Telepon/HP Pengelola">
            <input
              type="tel"
              inputMode="tel"
              placeholder="08xxxxxxxxxx"
              value={form.telPengelola}
              onChange={(e) => setField("telPengelola", e.target.value)}
            />
          </Field>
        </Col>
      </Row>

      {Object.keys(errors).length > 0 && (
        <div className="alert-warn" role="alert">
          Beberapa kolom wajib masih kosong atau belum valid. Mohon lengkapi dulu ya ✨
        </div>
      )}
    </div>
  );
}
