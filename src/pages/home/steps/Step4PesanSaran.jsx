import React from "react";

function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
const Row = ({ children }) => <div className="row">{children}</div>;
const Col = ({ children, w = 1 }) => <div className={`col w-${w}`}>{children}</div>;

export default function Step4PesanSaran({ form, setField, waPemilikUrl, waPengelolaUrl }) {
  return (
    <div className="step-pane">
      <h3>Step 4 — Pesan & Saran</h3>

      <Field label="Pesan untuk pihak usaha">
        <textarea rows={4} placeholder="Tulis pesan/temuan untuk disampaikan"
                  value={form.pesanPetugas}
                  onChange={(e) => setField("pesanPetugas", e.target.value)} />
      </Field>

      <Field label="Saran untuk perbaikan">
        <textarea rows={3} placeholder="Contoh: Mohon melengkapi dokumen KIR dalam 7 hari"
                  value={form.saranUntukPemilik}
                  onChange={(e) => setField("saranUntukPemilik", e.target.value)} />
      </Field>

      <div className="card-lite">
        <div className="card-lite-title">Kirim Ringkasan via WhatsApp</div>
        <Row>
          <Col w={1}>
            <div className="wa-row">
              <a className={`btn wa ${!waPemilikUrl ? "disabled" : ""}`} href={waPemilikUrl || "#"} target="_blank" rel="noreferrer">
                Buka WA Pemilik
              </a>
            </div>
          </Col>
          <Col w={1}>
            <div className="wa-row">
              <a className={`btn wa ${!waPengelolaUrl ? "disabled" : ""}`} href={waPengelolaUrl || "#"} target="_blank" rel="noreferrer">
                Buka WA Pengelola
              </a>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}
