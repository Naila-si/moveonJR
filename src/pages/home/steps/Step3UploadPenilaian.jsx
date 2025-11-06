import React from "react";

function Field({ label, children, error, required }) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span className="field-label">{label} {required ? <b className="req">*</b> : null}</span>
      {children}
      {error ? <span className="err">{error}</span> : null}
    </label>
  );
}
const Row = ({ children }) => <div className="row">{children}</div>;
const Col = ({ children, w = 1 }) => <div className={`col w-${w}`}>{children}</div>;

const FileName = ({ file }) => file ? <small className="hint">Terpilih: {file.name}</small> : null;

export default function Step3UploadPenilaian({ form, setField, errors = {}, onPickFile }) {
  return (
    <div className="step-pane">
      <h3>Step 3 — Upload & Penilaian</h3>

      <div className="card-lite">
        <div className="card-lite-title">Unggah Dokumen/Fotokopi</div>
        <Row>
          <Col w={1}>
            <Field label="SIUP / Perizinan">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onPickFile("fileSiup")} />
              <FileName file={form.fileSiup} />
            </Field>
          </Col>
          <Col w={1}>
            <Field label="STNK Armada">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onPickFile("fileStnk")} />
              <FileName file={form.fileStnk} />
            </Field>
          </Col>
          <Col w={1}>
            <Field label="Foto Armada/Lokasi">
              <input type="file" accept=".jpg,.jpeg,.png" onChange={onPickFile("fileFotoArmada")} />
              <FileName file={form.fileFotoArmada} />
            </Field>
          </Col>
        </Row>
        {errors.minimal ? <div className="err">{errors.minimal}</div> : null}
      </div>

      <div className="card-lite">
        <div className="card-lite-title">Penilaian Lapangan (1–5)</div>
        <Row>
          <Col w={1}>
            <Field label={`Kebersihan: ${form.nilaiKebersihan}/5`}>
              <input type="range" min="1" max="5" step="1" value={form.nilaiKebersihan}
                     onChange={(e) => setField("nilaiKebersihan", Number(e.target.value))} />
            </Field>
          </Col>
          <Col w={1}>
            <Field label={`Kelengkapan: ${form.nilaiKelengkapan}/5`}>
              <input type="range" min="1" max="5" step="1" value={form.nilaiKelengkapan}
                     onChange={(e) => setField("nilaiKelengkapan", Number(e.target.value))} />
            </Field>
          </Col>
          <Col w={1}>
            <Field label={`Pelayanan: ${form.nilaiPelayanan}/5`}>
              <input type="range" min="1" max="5" step="1" value={form.nilaiPelayanan}
                     onChange={(e) => setField("nilaiPelayanan", Number(e.target.value))} />
            </Field>
          </Col>
        </Row>
      </div>
    </div>
  );
}
