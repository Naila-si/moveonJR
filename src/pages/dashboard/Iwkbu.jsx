import React, { useMemo, useState } from "react";
import "../../views/dashboard/Iwkbu.css";

const WILAYAH_OPTS = ["PEKANBARU", "DUMAI"];
const TRAYEK_OPTS = ["AJAP", "AKDP", "ANGKUTAN KARYAWAN", "TAKSI", "AKAP"];
const JENIS_OPTS = ["MINIBUS", "MICROBUS"];
const TAHUN_OPTS = [2025, 2024, 2023, 2022];
const BADAN_HUKUM_OPTS = ["Perorangan", "BH"]; // BH = Badan Hukum
const STATUS_BAYAR_OPTS = ["Belum Bayar", "Lunas", "Parsial"];
const STATUS_KENDARAAN_OPTS = ["Aktif", "Tidak Aktif", "Blokir"];

const idr = (n) =>
  (Number(n) || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

export default function Iwkbu() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // modal: tambah nopol
  const [showNopolModal, setShowNopolModal] = useState(false);

  const emptyForm = {
    wilayah: WILAYAH_OPTS[0],
    nopol: "",
    tarif: 0,
    nominal: 0,
    trayekNew: TRAYEK_OPTS[0],
    jenis: JENIS_OPTS[0],
    tahun: TAHUN_OPTS[0],
    badanHukum: BADAN_HUKUM_OPTS[0],
    namaPerusahaan: "",
    alamat: "",
    kelurahan: "",
    kecamatan: "",
    kota: WILAYAH_OPTS[0],
    tglTransaksi: "",
    loket: "",
    masaBerlaku: "",
    masaSwdkllj: "",
    statusBayar: STATUS_BAYAR_OPTS[0],
    statusKendaraan: STATUS_KENDARAAN_OPTS[0],
    outstanding: 0,
    konfirmasi: "",
    hp: "",
  };
  const [newForm, setNewForm] = useState(emptyForm);

  // helper kecil
  const setF = (k, v) => setNewForm((s) => ({ ...s, [k]: v }));

  // modal: nominal IWKBU
  const [showNominalModal, setShowNominalModal] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);
  const [nominalInput, setNominalInput] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const data = !s
      ? rows
      : rows.filter(
          (r) =>
            r.nopol.toLowerCase().includes(s) ||
            r.wilayah.toLowerCase().includes(s) ||
            (r.kota || "").toLowerCase().includes(s) ||
            (r.trayekNew || "").toLowerCase().includes(s)
        );
    return data;
  }, [rows, q]);

  const totalPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const addNopol = (e) => {
    e?.preventDefault?.();
    if (!newForm.nopol.trim()) return;

    const next = {
      id: Date.now(),
      ...newForm,
      nopol: newForm.nopol.toUpperCase(),
      kota: newForm.kota || newForm.wilayah,         // fallback kota = wilayah
      tarif: Number(newForm.tarif || 0),
      nominal: Number(String(newForm.nominal || 0).replace(/[^\d]/g, "")),
      tahun: Number(newForm.tahun || TAHUN_OPTS[0]),
      outstanding: Number(newForm.outstanding || 0),
    };

    setRows((prev) => [next, ...prev]);
    setShowNopolModal(false);
    setNewForm(emptyForm);
    setPage(1);
  };

  const openNominalFor = (rowId, current) => {
    setEditingRowId(rowId);
    setNominalInput(String(current ?? 0));
    setShowNominalModal(true);
  };

  const saveNominal = () => {
    const val = Number(String(nominalInput).replace(/[^\d]/g, ""));
    setRows((prev) =>
      prev.map((r) => (r.id === editingRowId ? { ...r, nominal: val } : r))
    );
    setShowNominalModal(false);
    setEditingRowId(null);
  };

  const updateRow = (id, patch) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="iwkbu-wrap">
      <div className="iwkbu-clouds" aria-hidden />

      <header className="iwkbu-header">
        <div className="title">
          <span role="img" aria-label="bus" className="emoji">🚌</span>
          <h1>Data IWKBU</h1>
        </div>

        <div className="actions">
          <div className="search">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nopol / wilayah / kota / trayek…"
            />
          </div>
          <button
            className="btn primary"
            onClick={() => { setNewForm(emptyForm); setShowNopolModal(true); }}
          >
            + Tambah Nomor Polisi
          </button>
        </div>
      </header>

      <div className="table-card">
        <div className="table-scroll" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "70vh" }}>
          <table className="kawaii-table" style={{ minWidth: "4000px", tableLayout: "fixed" }}>
            <thead style={{ whiteSpace: "nowrap" }}>
              <tr>
                <th>No</th>
                <th>Wilayah</th>
                <th>Nomor Polisi</th>
                <th>Tarif</th>
                <th>Nominal IWKBU</th>
                <th>Trayek</th>
                <th>Jenis</th>
                <th>Tahun</th>
                <th>Badan Hukum</th>
                <th>Nama Perusahaan</th>
                <th>Alamat</th>
                <th>Kelurahan</th>
                <th>Kecamatan</th>
                <th>Kota</th>
                <th>Tgl Transaksi</th>
                <th>Loket</th>
                <th>Masa Berlaku IWKBU</th>
                <th>Masa Laku SWDKLLJ</th>
                <th>Status Pembayaran</th>
                <th>Status Kendaraan</th>
                <th>Outstanding</th>
                <th>Hasil Konfirmasi</th>
                <th>No. HP</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => (
                <tr key={r.id}>
                  <td>{(page - 1) * pageSize + i + 1}</td>

                  <td>
                    <select
                      value={r.wilayah}
                      onChange={(e) => updateRow(r.id, { wilayah: e.target.value })}
                    >
                      {WILAYAH_OPTS.map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </td>

                  <td className="nopol">
                    <span className="nopol-badge">{r.nopol}</span>
                  </td>

                  <td>
                    <input
                      className="num"
                      type="number"
                      min={0}
                      value={r.tarif}
                      onChange={(e) => updateRow(r.id, { tarif: Number(e.target.value) })}
                    />
                    <div className="hint">{idr(r.tarif)}</div>
                  </td>

                  <td>
                    <button
                      className="link-btn"
                      onClick={() => openNominalFor(r.id, r.nominal)}
                    >
                      {r.nominal ? idr(r.nominal) : "Atur"}
                    </button>
                  </td>

                  <td>
                    <select
                      value={r.trayekNew}
                      onChange={(e) => updateRow(r.id, { trayekNew: e.target.value })}
                    >
                      {TRAYEK_OPTS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <select
                      value={r.jenis}
                      onChange={(e) => updateRow(r.id, { jenis: e.target.value })}
                    >
                      {JENIS_OPTS.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <select
                      value={r.tahun}
                      onChange={(e) => updateRow(r.id, { tahun: Number(e.target.value) })}
                    >
                      {TAHUN_OPTS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <select
                      value={r.badanHukum}
                      onChange={(e) => updateRow(r.id, { badanHukum: e.target.value })}
                    >
                      {BADAN_HUKUM_OPTS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <input
                      type="text"
                      value={r.namaPerusahaan}
                      disabled={r.badanHukum !== "BH"}
                      onChange={(e) => updateRow(r.id, { namaPerusahaan: e.target.value })}
                      placeholder={r.badanHukum === "BH" ? "Nama PT/CV" : "—"}
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      value={r.alamat}
                      onChange={(e) => updateRow(r.id, { alamat: e.target.value })}
                      placeholder="Alamat lengkap"
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      value={r.kelurahan}
                      onChange={(e) => updateRow(r.id, { kelurahan: e.target.value })}
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      value={r.kecamatan}
                      onChange={(e) => updateRow(r.id, { kecamatan: e.target.value })}
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      value={r.kota}
                      onChange={(e) => updateRow(r.id, { kota: e.target.value })}
                    />
                  </td>

                  <td>
                    <input
                      type="date"
                      value={r.tglTransaksi || ""}
                      onChange={(e) => updateRow(r.id, { tglTransaksi: e.target.value })}
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      value={r.loket}
                      onChange={(e) => updateRow(r.id, { loket: e.target.value })}
                    />
                  </td>

                  <td>
                    <input
                      type="date"
                      value={r.masaBerlaku || ""}
                      onChange={(e) => updateRow(r.id, { masaBerlaku: e.target.value })}
                    />
                  </td>

                  <td>
                    <input
                      type="date"
                      value={r.masaSwdkllj || ""}
                      onChange={(e) => updateRow(r.id, { masaSwdkllj: e.target.value })}
                    />
                  </td>

                  <td>
                    <select
                      value={r.statusBayar}
                      onChange={(e) => updateRow(r.id, { statusBayar: e.target.value })}
                    >
                      {STATUS_BAYAR_OPTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <select
                      value={r.statusKendaraan}
                      onChange={(e) => updateRow(r.id, { statusKendaraan: e.target.value })}
                    >
                      {STATUS_KENDARAAN_OPTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <input
                      className="num"
                      type="number"
                      min={0}
                      value={r.outstanding}
                      onChange={(e) =>
                        updateRow(r.id, { outstanding: Number(e.target.value) })
                      }
                    />
                    <div className="hint">{idr(r.outstanding)}</div>
                  </td>

                  <td>
                    <input
                      type="text"
                      value={r.konfirmasi}
                      onChange={(e) => updateRow(r.id, { konfirmasi: e.target.value })}
                      placeholder="Catatan"
                    />
                  </td>

                  <td>
                    <input
                      type="tel"
                      value={r.hp}
                      onChange={(e) => updateRow(r.id, { hp: e.target.value })}
                      placeholder="08xx…"
                      pattern="[0-9+\\-\\s]+"
                    />
                  </td>
                </tr>
              ))}

              {pageData.length === 0 && (
                <tr>
                  <td colSpan={23} className="empty">Tidak ada data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pager">
          <button
            className="btn ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ‹ Prev
          </button>
          <span className="page-info">
            Halaman {page} / {totalPage}
          </span>
          <button
            className="btn ghost"
            onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
            disabled={page >= totalPage}
          >
            Next ›
          </button>
        </div>
      </div>

      {/* Modal: Tambah Nomor Polisi */}
      {showNopolModal && (
        <div className="modal-backdrop" onClick={() => setShowNopolModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{maxHeight:'80vh', display:'flex', flexDirection:'column'}}>
            <h3>Tambah Nomor Polisi</h3>

            {/* body scroll biar form panjang tetap enak dipakai */}
            <form onSubmit={addNopol} className="grid" style={{overflow:'auto', paddingRight:4}}>
              {/* BARIS 1: Identitas utama */}
              <label>
                Wilayah
                <select value={newForm.wilayah} onChange={(e)=>{ setF('wilayah', e.target.value); if(!newForm.kota) setF('kota', e.target.value); }}>
                  {WILAYAH_OPTS.map((w)=><option key={w} value={w}>{w}</option>)}
                </select>
              </label>

              <label>
                Nomor Polisi
                <input
                  type="text"
                  value={newForm.nopol}
                  onChange={(e)=>setF('nopol', e.target.value)}
                  placeholder="BM 1234 TU"
                  required
                />
              </label>

              <label>
                Trayek
                <select value={newForm.trayekNew} onChange={(e)=>setF('trayekNew', e.target.value)}>
                  {TRAYEK_OPTS.map((t)=><option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              <label>
                Jenis
                <select value={newForm.jenis} onChange={(e)=>setF('jenis', e.target.value)}>
                  {JENIS_OPTS.map((j)=><option key={j} value={j}>{j}</option>)}
                </select>
              </label>

              <label>
                Tahun
                <select value={newForm.tahun} onChange={(e)=>setF('tahun', Number(e.target.value))}>
                  {TAHUN_OPTS.map((t)=><option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              {/* BARIS 2: Status & angka */}
              <label>
                Tarif
                <input type="number" min={0} value={newForm.tarif} onChange={(e)=>setF('tarif', Number(e.target.value))}/>
                <small className="hint">{idr(newForm.tarif)}</small>
              </label>

              <label>
                Nominal IWKBU
                <input type="number" min={0} value={newForm.nominal} onChange={(e)=>setF('nominal', e.target.value)} />
                <small className="hint">{idr(newForm.nominal)}</small>
              </label>

              <label>
                Status Pembayaran
                <select value={newForm.statusBayar} onChange={(e)=>setF('statusBayar', e.target.value)}>
                  {STATUS_BAYAR_OPTS.map((s)=><option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label>
                Status Kendaraan
                <select value={newForm.statusKendaraan} onChange={(e)=>setF('statusKendaraan', e.target.value)}>
                  {STATUS_KENDARAAN_OPTS.map((s)=><option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label>
                Outstanding
                <input type="number" min={0} value={newForm.outstanding} onChange={(e)=>setF('outstanding', Number(e.target.value))}/>
                <small className="hint">{idr(newForm.outstanding)}</small>
              </label>

              {/* BARIS 3: Perizinan & tanggal */}
              <label>
                Tgl Transaksi
                <input type="date" value={newForm.tglTransaksi || ''} onChange={(e)=>setF('tglTransaksi', e.target.value)} />
              </label>

              <label>
                Loket
                <input type="text" value={newForm.loket} onChange={(e)=>setF('loket', e.target.value)} />
              </label>

              <label>
                Masa Berlaku IWKBU
                <input type="date" value={newForm.masaBerlaku || ''} onChange={(e)=>setF('masaBerlaku', e.target.value)} />
              </label>

              <label>
                Masa Laku SWDKLLJ
                <input type="date" value={newForm.masaSwdkllj || ''} onChange={(e)=>setF('masaSwdkllj', e.target.value)} />
              </label>

              {/* BARIS 4: Badan Hukum & data perusahaan */}
              <label>
                Badan Hukum
                <select value={newForm.badanHukum} onChange={(e)=>setF('badanHukum', e.target.value)}>
                  {BADAN_HUKUM_OPTS.map((b)=><option key={b} value={b}>{b}</option>)}
                </select>
              </label>

              <label>
                Nama Perusahaan
                <input
                  type="text"
                  value={newForm.namaPerusahaan}
                  onChange={(e)=>setF('namaPerusahaan', e.target.value)}
                  placeholder={newForm.badanHukum === 'BH' ? 'Nama PT/CV' : '—'}
                  disabled={newForm.badanHukum !== 'BH'}
                />
              </label>

              <label>
                Alamat
                <input type="text" value={newForm.alamat} onChange={(e)=>setF('alamat', e.target.value)} placeholder="Alamat lengkap" />
              </label>

              <label>
                Kelurahan
                <input type="text" value={newForm.kelurahan} onChange={(e)=>setF('kelurahan', e.target.value)} />
              </label>

              <label>
                Kecamatan
                <input type="text" value={newForm.kecamatan} onChange={(e)=>setF('kecamatan', e.target.value)} />
              </label>

              <label>
                Kota
                <input type="text" value={newForm.kota} onChange={(e)=>setF('kota', e.target.value)} />
              </label>

              {/* BARIS 5: Kontak & catatan */}
              <label style={{gridColumn:'1 / -1'}}>
                Hasil Konfirmasi (catatan)
                <input type="text" value={newForm.konfirmasi} onChange={(e)=>setF('konfirmasi', e.target.value)} placeholder="Catatan" />
              </label>

              <label>
                No. HP
                <input
                  type="tel"
                  value={newForm.hp}
                  onChange={(e)=>setF('hp', e.target.value)}
                  placeholder="08xx…"
                  pattern="[0-9+\\-\\s]+"
                />
              </label>
            </form>

            <div className="modal-actions" style={{marginTop:10}}>
              <button className="btn ghost" onClick={() => setShowNopolModal(false)}>Batal</button>
              <button className="btn primary" onClick={addNopol}>Tambah</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Atur Nominal IWKBU */}
      {showNominalModal && (
        <div className="modal-backdrop" onClick={() => setShowNominalModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Atur Nominal IWKBU</h3>
            <div className="grid">
              <label>
                Nominal
                <input
                  type="number"
                  min={0}
                  value={nominalInput}
                  onChange={(e) => setNominalInput(e.target.value)}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setShowNominalModal(false)}>
                Batal
              </button>
              <button className="btn primary" onClick={saveNominal}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
