import React, { useMemo, useState, useEffect } from "react";
import "../../views/dashboard/Iwkl.css";

const LOKET_OPTS = ["DUMAI", "BENGKALIS", "SELAT PANJANG"];
const KELAS_OPTS = ["PLATINUM", "GOLD", "SILVER"];
const STATUS_PKS_OPTS = ["Aktif", "Berakhir", "Addendum", "-"];
const STATUS_PEMB_OPTS = ["Belum Bayar", "Lunas", "Parsial", "-"];
const STATUS_KAPAL_OPTS = ["Beroperasi", "Cadangan", "Tidak Beroperasi", "Rusak", "-"];
const PAS_OPTS = ["Pas Besar", "Pas Kecil", "-"];
const SERTIF_KSL_OPTS = ["Ada", "Tidak Ada", "-"];
const IZIN_TRAYEK_OPTS = ["Ada", "Tidak Ada", "-"];
const SISTEM_IWKL_OPTS = ["Manual", "E-Ticket", "Campuran", "-"];
const PERHIT_TARIF_OPTS = ["Per Kepala", "Borongan", "Campuran", "-"];

const BASE_COLUMNS = [
  { key: "no", label: "No"},
  { key: "aksi", label: "Aksi"},
  { key: "loket", label: "Loket" },
  { key: "kelas", label: "Kelas" },
  { key: "namaPerusahaan", label: "Nama Perusahaan" },
  { key: "namaKapal", label: "Nama Kapal" },
  { key: "namaPemilik", label: "Nama Pemilik / Pengelola" },
  { key: "alamat", label: "Alamat" },
  { key: "noKontak", label: "No. Kontak" },
  { key: "tglLahir", label: "Tanggal Lahir" },
  { key: "kapasitasPenumpang", label: "Kapasitas Penumpang" },
  { key: "tglPKS", label: "Tanggal PKS" },
  { key: "tglBerakhirPKS", label: "Tanggal Berakhir PKS" },
  { key: "tglAddendum", label: "Tanggal Addendum" },
  { key: "statusPKS", label: "Status PKS" },
  { key: "statusPembayaran", label: "Status Pembayaran" },
  { key: "statusKapal", label: "Status Kapal" },
  { key: "potensiPerBulan", label: "Potensi Per Bulan (Rp)" },
  { key: "pasBesarKecil", label: "Pas Besar / Kecil" },
  { key: "sertifikatKeselamatan", label: "Sertifikat Keselamatan" },
  { key: "izinTrayek", label: "Izin Trayek" },
  { key: "tglJatuhTempoSertifikatKeselamatan", label: "Tgl Jatuh Tempo Sertifikat Keselamatan Kapal" },
  { key: "rute", label: "Rute" },
  { key: "sistemPengutipanIWKL", label: "Sistem Pengutipan IWKL" },
  { key: "trayek", label: "Trayek" },
  { key: "perhitunganTarif", label: "Perhitungan Tarif" },
  { key: "tarifBoronganDisepakati", label: "Tarif Borongan Disepakati" },
  { key: "keterangan", label: "Keterangan" },
  // bulan
  { key: "jan", label: "Januari" },
  { key: "feb", label: "Februari" },
  { key: "mar", label: "Maret" },
  { key: "apr", label: "April" },
  { key: "mei", label: "Mei" },
  { key: "jun", label: "Juni" },
  { key: "jul", label: "Juli" },
  { key: "agust", label: "Agust" },
  { key: "sept", label: "Sept" },
  { key: "okt", label: "Okt" },
  { key: "nov", label: "Nov" },
  { key: "des", label: "Des" },
  // total & persen
  { key: "total", label: "Total", readOnly: true },
  { key: "persenAkt2423", label: "% Akt 24 - 23" },
];

const idr = (n) => (Number(n) || 0).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default function Iwkl() {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState(BASE_COLUMNS);
  const [q, setQ] = useState("");

  // modal tambah kolom (dinamis tetap bisa)
  const [showColModal, setShowColModal] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");

  // ring menu & rename
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [renamingKey, setRenamingKey] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);

  const emptyForm = {
    loket: LOKET_OPTS[0] || "",
    kelas: KELAS_OPTS[0] || "",
    namaPerusahaan: "",
    namaKapal: "",
    namaPemilik: "",
    alamat: "",
    noKontak: "",
    tglLahir: "",
    kapasitasPenumpang: 0,
    tglPKS: "",
    tglBerakhirPKS: "",
    tglAddendum: "",
    statusPKS: STATUS_PKS_OPTS[0] || "",
    statusPembayaran: STATUS_PEMB_OPTS[0] || "",
    statusKapal: STATUS_KAPAL_OPTS[0] || "",
    potensiPerBulan: 0,
    pasBesarKecil: PAS_OPTS[0] || "",
    sertifikatKeselamatan: SERTIF_KSL_OPTS[0] || "",
    izinTrayek: IZIN_TRAYEK_OPTS[0] || "",
    tglJatuhTempoSertifikatKeselamatan: "",
    rute: "",
    sistemPengutipanIWKL: SISTEM_IWKL_OPTS[0] || "",
    trayek: "",
    perhitunganTarif: PERHIT_TARIF_OPTS[0] || "",
    tarifBoronganDisepakati: 0,
    keterangan: "",
  };
  const [newForm, setNewForm] = useState(emptyForm);
  const setF = (k, v) => setNewForm(s => ({ ...s, [k]: v }));

  // buat baris dari form
  const addIwkl = (e) => {
    e?.preventDefault?.();
    const row = {
      id: Date.now(),
      ...newForm,
      kapasitasPenumpang: Number(newForm.kapasitasPenumpang || 0),
      potensiPerBulan: Number(newForm.potensiPerBulan || 0),
      tarifBoronganDisepakati: Number(newForm.tarifBoronganDisepakati || 0),
      // bulan default 0
      jan:0,feb:0,mar:0,apr:0,mei:0,jun:0,jul:0,agust:0,sept:0,okt:0,nov:0,des:0,
    };
    setRows(prev => [row, ...prev]);
    setShowAddModal(false);
    setNewForm(emptyForm);
  };

  const monthKeys = ["jan","feb","mar","apr","mei","jun","jul","agust","sept","okt","nov","des"];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => [
      r.loket, r.kelas, r.namaPerusahaan, r.namaKapal, r.namaPemilik, r.alamat, r.noKontak, r.rute, r.trayek
    ].join(" ").toLowerCase().includes(s));
  }, [rows, q]);

  const [page, setPage] = useState(1);
  const pageSize = 8;

  const totalPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const computeTotal = (r) => monthKeys.reduce((sum, k) => sum + (Number(r[k] || 0) || 0), 0);

  const addRow = () => {
    const blank = { id: Date.now() };
    columns.forEach((c) => {
      switch (c.key) {
        case "loket": blank[c.key] = LOKET_OPTS[0]; break;
        case "kelas": blank[c.key] = KELAS_OPTS[0]; break;
        case "statusPKS": blank[c.key] = STATUS_PKS_OPTS[0]; break;
        case "statusPembayaran": blank[c.key] = STATUS_PEMB_OPTS[0]; break;
        case "statusKapal": blank[c.key] = STATUS_KAPAL_OPTS[0]; break;
        case "pasBesarKecil": blank[c.key] = PAS_OPTS[0]; break;
        case "sertifikatKeselamatan": blank[c.key] = SERTIF_KSL_OPTS[0]; break;
        case "izinTrayek": blank[c.key] = IZIN_TRAYEK_OPTS[0]; break;
        case "sistemPengutipanIWKL": blank[c.key] = SISTEM_IWKL_OPTS[0]; break;
        case "perhitunganTarif": blank[c.key] = PERHIT_TARIF_OPTS[0]; break;
        case "tglLahir": case "tglPKS": case "tglBerakhirPKS": case "tglAddendum": case "tglJatuhTempoSertifikatKeselamatan":
          blank[c.key] = ""; break;
        case "kapasitasPenumpang": case "potensiPerBulan": case "tarifBoronganDisepakati":
          blank[c.key] = 0; break;
        default:
          if (monthKeys.includes(c.key)) blank[c.key] = 0; else if (!c.readOnly) blank[c.key] = "";
      }
    });
    blank.total = 0; // computed on render
    setRows((prev) => [blank, ...prev]);
  };

  const addColumn = () => {
    const label = newColLabel.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]+(\w)/g, (_, c) => c.toUpperCase()).replace(/[^a-z0-9]/g, "");
    if (columns.some((c) => c.key === key)) { alert("Kolom dengan nama itu sudah ada."); return; }
    const col = { key, label };
    setColumns((prev) => [...prev, col]);
    setRows((prev) => prev.map((r) => ({ ...r, [key]: "" })));
    setShowColModal(false); setNewColLabel("");
  };

  const updateCell = (id, key, value) => {
    if (key === "total") return; // readOnly
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const deleteRow = (id) => setRows((prev) => prev.filter((r) => r.id !== id));

  // helpers urut & hapus kolom
  const indexOfKey = (key) => columns.findIndex((c) => c.key === key);
  const moveColumnByIndex = (from, to) => {
    if (to < 0 || to >= columns.length || from === -1 || to === from) return;
    setColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };
  const moveRightByKey = (key) => { const i = indexOfKey(key); if (i === -1) return; const to = (i + 1) % columns.length; moveColumnByIndex(i, to); };
  const moveLeftByKey = (key) => { const i = indexOfKey(key); if (i === -1) return; const to = (i - 1 + columns.length) % columns.length; moveColumnByIndex(i, to); };
  const moveStart = (key) => { moveColumnByIndex(indexOfKey(key), 0); };
  const moveEnd   = (key) => { moveColumnByIndex(indexOfKey(key), columns.length - 1); };

  const removeColumn = (key) => {
    const col = columns.find((c) => c.key === key);
    if (!col) return;
    const ok = window.confirm(`Hapus kolom "${col.label}"? Data pada kolom ini akan hilang.`);
    if (!ok) return;
    setColumns((prev) => prev.filter((c) => c.key !== key));
    setRows((prev) => prev.map(({ [key]: _omit, ...rest }) => rest));
    setOpenMenuKey(null);
  };

  const startRename = (key) => {
    const col = columns.find((c) => c.key === key);
    if (!col) return;
    setRenamingKey(key);
    setRenameValue(col.label);
    setOpenMenuKey(null);
  };
  const commitRename = () => {
    const label = renameValue.trim();
    if (!label) { setRenamingKey(null); return; }
    setColumns((prev) => prev.map((c) => c.key === renamingKey ? { ...c, label } : c));
    setRenamingKey(null);
  };
  const toggleMenu = (key) => setOpenMenuKey((cur) => (cur === key ? null : key));

  useEffect(() => {
    const onDocClick = (e) => {
      if (!e.target.closest?.('.th-hasmenu, .th-ring, .th-orbit')) {
        setOpenMenuKey(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <div className="iwkl-wrap">
      <div className="iwkl-bg" aria-hidden />

      <header className="iwkl-header">
        <div className="title">
          <span className="emoji" aria-hidden>🛳️</span>
          <h1>Data IWKL</h1>
        </div>

        <div className="actions">
          <input
            className="search"
            placeholder="Cari perusahaan/pemilik/alamat…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
          <button className="btn ghost" onClick={() => setShowColModal(true)}>+ Tambah Kolom</button>
          <button
            className="btn primary"
            onClick={() => { setNewForm(emptyForm); setShowAddModal(true); }}
          >
            + Tambah Data IWKL
          </button>
        </div>
      </header>

      <div className="card">
        <div className="table-scroll">
          <table className="kawaii-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>
                    <div className="th-hasmenu">
                      {renamingKey === c.key ? (
                        <div className="th-rename">
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingKey(null); }}
                          />
                        </div>
                      ) : (
                        <button className="th-toggle" onClick={(e) => { e.stopPropagation(); toggleMenu(c.key); }} aria-haspopup="true" aria-expanded={openMenuKey === c.key}>
                          {c.label}
                        </button>
                      )}

                      {openMenuKey === c.key && (
                        <>
                          <div className="th-ring pretty" role="group" aria-label={`Atur kolom ${c.label}`}>
                            <div className="ring-aura" aria-hidden />
                            <button className="ring-btn ring-top" onClick={() => moveStart(c.key)} aria-label="Ke awal">⏮</button>
                            <button className="ring-btn ring-left" onClick={() => moveLeftByKey(c.key)} aria-label="Geser kiri">◀</button>
                            <button className="ring-btn ring-right" onClick={() => moveRightByKey(c.key)} aria-label="Geser kanan">▶</button>
                            <button className="ring-btn ring-bottom" onClick={() => moveEnd(c.key)} aria-label="Ke akhir">⏭</button>
                          </div>
                          <div className="th-orbit">
                            <button className="ring-chip ring-rename" onClick={() => startRename(c.key)} aria-label="Ubah nama">✎ Ubah</button>
                            <button className="ring-chip ring-delete" onClick={() => removeColumn(c.key)} aria-label="Hapus kolom">🗑 Hapus</button>
                          </div>
                        </>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, idx) => (
                <tr key={r.id}>
                  <td>{(page - 1) * pageSize + idx + 1}</td>
                  <td>
                    <button className="btn danger ghost xs" onClick={() => deleteRow(r.id)}>Hapus</button>
                  </td>

                  {columns.map((c) => {
                    const k = c.key;
                    const v = r[k];
                    if (k === "loket") {
                      return (
                        <td key={k}>
                          <select value={v} onChange={(e) => updateCell(r.id, k, e.target.value)}>
                            {LOKET_OPTS.map((o) => (<option key={o} value={o}>{o}</option>))}
                          </select>
                        </td>
                      );
                    }
                    if (k === "kelas") {
                      return (
                        <td key={k}>
                          <select value={v} onChange={(e) => updateCell(r.id, k, e.target.value)}>
                            {KELAS_OPTS.map((o) => (<option key={o} value={o}>{o}</option>))}
                          </select>
                        </td>
                      );
                    }
                    if (["tglLahir","tglPKS","tglBerakhirPKS","tglAddendum","tglJatuhTempoSertifikatKeselamatan"].includes(k)) {
                      return (
                        <td key={k}>
                          <input type="date" value={v || ""} onChange={(e) => updateCell(r.id, k, e.target.value)} />
                        </td>
                      );
                    }
                    if (["kapasitasPenumpang"].includes(k)) {
                      return (
                        <td key={k}>
                          <input type="number" min={0} value={v || 0} onChange={(e) => updateCell(r.id, k, Number(e.target.value))} />
                        </td>
                      );
                    }
                    if (k === "potensiPerBulan" || k === "tarifBoronganDisepakati") {
                      return (
                        <td key={k}>
                          <input type="number" min={0} value={v || 0} onChange={(e) => updateCell(r.id, k, Number(e.target.value))} />
                          <div className="hint">{idr(v || 0)}</div>
                        </td>
                      );
                    }
                    if (["jan","feb","mar","apr","mei","jun","jul","agust","sept","okt","nov","des"].includes(k)) {
                      return (
                        <td key={k}>
                          <input type="number" min={0} value={v || 0} onChange={(e) => updateCell(r.id, k, Number(e.target.value))} />
                        </td>
                      );
                    }
                    if (k === "statusPKS") {
                      return (
                        <td key={k}>
                          <select value={v} onChange={(e) => updateCell(r.id, k, e.target.value)}>
                            {STATUS_PKS_OPTS.map((o)=>(<option key={o} value={o}>{o}</option>))}
                          </select>
                        </td>
                      );
                    }
                    if (k === "statusPembayaran") {
                      return (
                        <td key={k}>
                          <select value={v} onChange={(e) => updateCell(r.id, k, e.target.value)}>
                            {STATUS_PEMB_OPTS.map((o)=>(<option key={o} value={o}>{o}</option>))}
                          </select>
                        </td>
                      );
                    }
                    if (k === "statusKapal") {
                      return (
                        <td key={k}>
                          <select value={v} onChange={(e) => updateCell(r.id, k, e.target.value)}>
                            {STATUS_KAPAL_OPTS.map((o)=>(<option key={o} value={o}>{o}</option>))}
                          </select>
                        </td>
                      );
                    }
                    if (k === "pasBesarKecil") {
                      return (
                        <td key={k}>
                          <select value={v} onChange={(e) => updateCell(r.id, k, e.target.value)}>
                            {PAS_OPTS.map((o)=>(<option key={o} value={o}>{o}</option>))}
                          </select>
                        </td>
                      );
                    }
                    if (k === "sertifikatKeselamatan") {
                      return (
                        <td key={k}>
                          <select value={v} onChange={(e) => updateCell(r.id, k, e.target.value)}>
                            {SERTIF_KSL_OPTS.map((o)=>(<option key={o} value={o}>{o}</option>))}
                          </select>
                        </td>
                      );
                    }
                    if (k === "izinTrayek") {
                      return (
                        <td key={k}>
                          <select value={v} onChange={(e) => updateCell(r.id, k, e.target.value)}>
                            {IZIN_TRAYEK_OPTS.map((o)=>(<option key={o} value={o}>{o}</option>))}
                          </select>
                        </td>
                      );
                    }
                    if (k === "sistemPengutipanIWKL") {
                      return (
                        <td key={k}>
                          <select value={v} onChange={(e) => updateCell(r.id, k, e.target.value)}>
                            {SISTEM_IWKL_OPTS.map((o)=>(<option key={o} value={o}>{o}</option>))}
                          </select>
                        </td>
                      );
                    }
                    if (k === "perhitunganTarif") {
                      return (
                        <td key={k}>
                          <select value={v} onChange={(e) => updateCell(r.id, k, e.target.value)}>
                            {PERHIT_TARIF_OPTS.map((o)=>(<option key={o} value={o}>{o}</option>))}
                          </select>
                        </td>
                      );
                    }
                    if (k === "noKontak") {
                      return (
                        <td key={k}>
                          <input type="tel" pattern="[0-9+\\-\\s]+" value={v || ""} onChange={(e) => updateCell(r.id, k, e.target.value)} placeholder="08xx…" />
                        </td>
                      );
                    }
                    if (k === "total") {
                      const total = computeTotal(r);
                      return (
                        <td key={k} className="num strong">{idr(total)}</td>
                      );
                    }
                    // default text
                    return (
                      <td key={k}>
                        <input type="text" value={v ?? ""} onChange={(e) => updateCell(r.id, k, e.target.value)} placeholder={c.label} />
                      </td>
                    );
                  })}
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td className="empty" colSpan={columns.length + 2}>Tidak ada data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

      {showColModal && (
        <div className="modal-backdrop" onClick={() => setShowColModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Tambah Kolom Baru</h3>
            <label className="stack">
              Nama Kolom
              <input type="text" value={newColLabel} onChange={(e) => setNewColLabel(e.target.value)} placeholder="Contoh: NPWP, Email, Catatan" />
            </label>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setShowColModal(false)}>Batal</button>
              <button className="btn primary" onClick={addColumn}>Tambah</button>
            </div>
          </div>
        </div>
      )}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{maxHeight:'80vh', display:'flex', flexDirection:'column'}}>
            <h3>Tambah Data IWKL</h3>

            <form onSubmit={addIwkl} className="grid" style={{overflow:'auto', paddingRight:4}}>
              {/* Baris 1 */}
              <label>
                Loket
                <select value={newForm.loket} onChange={(e)=>setF('loket', e.target.value)}>
                  {LOKET_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label>
                Kelas
                <select value={newForm.kelas} onChange={(e)=>setF('kelas', e.target.value)}>
                  {KELAS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label>
                Nama Perusahaan
                <input type="text" value={newForm.namaPerusahaan} onChange={(e)=>setF('namaPerusahaan', e.target.value)} />
              </label>

              <label>
                Nama Kapal
                <input type="text" value={newForm.namaKapal} onChange={(e)=>setF('namaKapal', e.target.value)} />
              </label>

              {/* Baris 2 */}
              <label>
                Nama Pemilik / Pengelola
                <input type="text" value={newForm.namaPemilik} onChange={(e)=>setF('namaPemilik', e.target.value)} />
              </label>

              <label style={{gridColumn:'span 1'}}>
                Alamat
                <input type="text" value={newForm.alamat} onChange={(e)=>setF('alamat', e.target.value)} />
              </label>

              <label>
                No. Kontak
                <input type="tel" pattern="[0-9+\\-\\s]+" value={newForm.noKontak} onChange={(e)=>setF('noKontak', e.target.value)} placeholder="08xx…" />
              </label>

              <label>
                Tanggal Lahir
                <input type="date" value={newForm.tglLahir || ''} onChange={(e)=>setF('tglLahir', e.target.value)} />
              </label>

              {/* Baris 3 */}
              <label>
                Kapasitas Penumpang
                <input type="number" min={0} value={newForm.kapasitasPenumpang} onChange={(e)=>setF('kapasitasPenumpang', e.target.value)} />
              </label>

              <label>
                Tanggal PKS
                <input type="date" value={newForm.tglPKS || ''} onChange={(e)=>setF('tglPKS', e.target.value)} />
              </label>

              <label>
                Tanggal Berakhir PKS
                <input type="date" value={newForm.tglBerakhirPKS || ''} onChange={(e)=>setF('tglBerakhirPKS', e.target.value)} />
              </label>

              <label>
                Tanggal Addendum
                <input type="date" value={newForm.tglAddendum || ''} onChange={(e)=>setF('tglAddendum', e.target.value)} />
              </label>

              {/* Baris 4 */}
              <label>
                Status PKS
                <select value={newForm.statusPKS} onChange={(e)=>setF('statusPKS', e.target.value)}>
                  {STATUS_PKS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label>
                Status Pembayaran
                <select value={newForm.statusPembayaran} onChange={(e)=>setF('statusPembayaran', e.target.value)}>
                  {STATUS_PEMB_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label>
                Status Kapal
                <select value={newForm.statusKapal} onChange={(e)=>setF('statusKapal', e.target.value)}>
                  {STATUS_KAPAL_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label>
                Potensi Per Bulan (Rp)
                <input type="number" min={0} value={newForm.potensiPerBulan} onChange={(e)=>setF('potensiPerBulan', e.target.value)} />
                <small className="hint">{idr(newForm.potensiPerBulan)}</small>
              </label>

              {/* Baris 5 */}
              <label>
                Pas Besar / Kecil
                <select value={newForm.pasBesarKecil} onChange={(e)=>setF('pasBesarKecil', e.target.value)}>
                  {PAS_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label>
                Sertifikat Keselamatan
                <select value={newForm.sertifikatKeselamatan} onChange={(e)=>setF('sertifikatKeselamatan', e.target.value)}>
                  {SERTIF_KSL_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label>
                Izin Trayek
                <select value={newForm.izinTrayek} onChange={(e)=>setF('izinTrayek', e.target.value)}>
                  {IZIN_TRAYEK_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label>
                Tgl Jatuh Tempo Sertifikat Keselamatan Kapal
                <input type="date" value={newForm.tglJatuhTempoSertifikatKeselamatan || ''} onChange={(e)=>setF('tglJatuhTempoSertifikatKeselamatan', e.target.value)} />
              </label>

              {/* Baris 6 */}
              <label>
                Rute
                <input type="text" value={newForm.rute} onChange={(e)=>setF('rute', e.target.value)} />
              </label>

              <label>
                Sistem Pengutipan IWKL
                <select value={newForm.sistemPengutipanIWKL} onChange={(e)=>setF('sistemPengutipanIWKL', e.target.value)}>
                  {SISTEM_IWKL_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              <label>
                Trayek
                <input type="text" value={newForm.trayek} onChange={(e)=>setF('trayek', e.target.value)} />
              </label>

              <label>
                Perhitungan Tarif
                <select value={newForm.perhitunganTarif} onChange={(e)=>setF('perhitunganTarif', e.target.value)}>
                  {PERHIT_TARIF_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>

              {/* Baris 7 */}
              <label>
                Tarif Borongan Disepakati (Rp)
                <input type="number" min={0} value={newForm.tarifBoronganDisepakati} onChange={(e)=>setF('tarifBoronganDisepakati', e.target.value)} />
                <small className="hint">{idr(newForm.tarifBoronganDisepakati)}</small>
              </label>

              <label style={{gridColumn:'1 / -1'}}>
                Keterangan
                <input type="text" value={newForm.keterangan} onChange={(e)=>setF('keterangan', e.target.value)} />
              </label>
            </form>

            <div className="modal-actions" style={{marginTop:10}}>
              <button className="btn ghost" onClick={() => setShowAddModal(false)}>Batal</button>
              <button className="btn primary" onClick={addIwkl}>Tambah</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
