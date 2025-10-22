import React, { useMemo, useState, useEffect } from "react";
import "../../views/dashboard/Iwkbu.css";

function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s != null ? JSON.parse(s) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // storage penuh / disallow — abaikan saja
    }
  }, [key, state]);

  return [state, setState];
}

/* ===== Opsional awal (seed). Nanti bisa bertambah dinamis lewat input user ===== */
const SEED_WILAYAH = ["PEKANBARU", "DUMAI", "ROHIL", "INHIL", "ROHUL", "KUANSING", "INHU", "PELALAWAN", "SIAK", "KAMPAR", "BENGKALIS", "ACEH", "-"];
const SEED_TRAYEK = ["AJAP", "AKDP", "Angkutan Karyawan", "AJDP", "Taksi", "AKAP", "Pariwisata", "Angdes", "Angkutan Sekolah", "-"];
const SEED_JENIS  = ["MINIBUS", "MICROBUS", "BUS", "SEDAN", "LIGHT TRUCK", "JEEP", "TAKSI", "-"];
const SEED_TAHUN  = [2025, 2024, 2023, 2022, 2021, 2020];
const SEED_BADAN  = ["Perorangan", "BH", "PR", "CV", "-"];
const SEED_STATUS_BAYAR = ["Belum Bayar", "Lunas", "Parsial", "OUTSTANDING", "DISPENSASI", "-"];
const SEED_STATUS_KEND  = ["Aktif", "Tidak Aktif", "Blokir", "BEROPERASI", "CADANGAN", "RUSAK SEMENTARA", "RUSAK SELAMANYA", "UBAH SIFAT", "UBAH SIFAT / BENTUK", "PINDAH PO", "-"];
const SEED_GOLONGAN     = ["DU", "EU", "-"]; // temanmu sebut 'undefined'
const SEED_DOK_PERIZINAN = ["ADA", "TIDAK ADA"];
const SEED_HASIL_KONF    = ["", "BEROPERASI BLM LUNAS", "BEROPERASI LUNAS", "DIJUAL", "GANTI NOPOL", "RUSAK SELAMANYA", "RUSAK SEMENTARA", "TIDAK BEROPERASI / CADANGAN", "TIDAK DITEMUKAN", "UBAH BENTUK", "UBAH SIFAT", "-"];

const idr = (n) =>
  (Number(n) || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

/* helper: tambah ke opsi kalau belum ada (case-insensitive).
   return value yg disimpan (kadang dinaikkan ke UPPER utk konsistensi beberapa field) */
function addOptionIfMissing(options, setOptions, value, { forceUpper = false } = {}) {
  if (value == null) return value;
  let v = String(value).trim();
  if (!v) return v;
  const exists = options.some((opt) => String(opt).toLowerCase() === v.toLowerCase());
  const valToPush = forceUpper ? v.toUpperCase() : v;
  if (!exists) setOptions((prev) => [...prev, valToPush]);
  return valToPush;
}

const IWKBU_BASE_KEYS = [
  "aksi","no","wilayah","nopol","tarif","golongan","nominal","trayekNew","jenis",
  "tahun","pic","badanHukum","namaPerusahaan","alamat","kelurahan","kecamatan","kota",
  "tglTransaksi","loket","masaBerlaku","masaSwdkllj","statusBayar","statusKendaraan",
  "outstanding","konfirmasi","hp","namaPemilik","nik","dokPerizinan","tglBayarOs",
  "nilaiBayarOs","tglPemeliharaan","nilaiPemeliharaanOs","keterangan"
];

export default function Iwkbu() {
  const [rows, setRows] = usePersistentState("iwkbu:rows", []);
  const [q, setQ]       = usePersistentState("iwkbu:q", "");
  const [page, setPage] = usePersistentState("iwkbu:page", 1);
  const pageSize = 8;
  const [extraCols, setExtraCols] = usePersistentState("iwkbu:extraCols", []); // [{key,label}]
  const [showColModal, setShowColModal] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");
  const [openMenuKey, setOpenMenuKey]   = useState(null);  
  const [renamingKey, setRenamingKey]   = useState(null);  
  const [renameValue, setRenameValue]   = useState("");  

  // helper bikin key aman dari label
  const makeKeyFromLabel = (label) =>
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+(\w)/g, (_, c) => c.toUpperCase())
      .replace(/[^a-z0-9]/g, "");

  // tambah kolom baru
  const addColumn = () => {
    const label = (newColLabel || "").trim();
    if (!label) return;
    const key = makeKeyFromLabel(label);
    if (!key || IWKBU_BASE_KEYS.includes(key) || extraCols.some(c => c.key === key)) {
      alert("Kolom dengan nama itu sudah ada atau tidak valid.");
      return;
    }
    const col = { key, label };
    setExtraCols(prev => [...prev, col]);
    setRows(prev => prev.map(r => ({ ...r, [key]: "" })));
    setShowColModal(false);
    setNewColLabel("");
  };

  // hapus kolom
  const removeColumn = (key) => {
    const col = extraCols.find(c => c.key === key);
    if (!col) return;
    if (!window.confirm(`Hapus kolom "${col.label}"? Data pada kolom ini akan hilang.`)) return;
    setExtraCols(prev => prev.filter(c => c.key !== key));
    setRows(prev => prev.map(({ [key]: _omit, ...rest }) => rest));
    setOpenMenuKey(null);
  };

  // rename kolom
  const startRename = (key) => {
    const col = extraCols.find(c => c.key === key);
    if (!col) return;
    setRenamingKey(key);
    setRenameValue(col.label);
    setOpenMenuKey(null);
  };
  const commitRename = () => {
    const label = (renameValue || "").trim();
    if (!label) { setRenamingKey(null); return; }
    setExtraCols(prev => prev.map(c => c.key === renamingKey ? ({ ...c, label }) : c));
    setRenamingKey(null);
  };

  // urut kolom (di dalam extraCols saja)
  const indexOfExtra = (key) => extraCols.findIndex(c => c.key === key);
  const moveExtraByIndex = (from, to) => {
    if (to < 0 || to >= extraCols.length || from === -1 || to === from) return;
    setExtraCols(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };
  const moveStart = (key) => moveExtraByIndex(indexOfExtra(key), 0);
  const moveEnd   = (key) => moveExtraByIndex(indexOfExtra(key), extraCols.length - 1);
  const moveLeft  = (key) => { const i = indexOfExtra(key); if (i > -1) moveExtraByIndex(i, (i - 1 + extraCols.length) % extraCols.length); };
  const moveRight = (key) => { const i = indexOfExtra(key); if (i > -1) moveExtraByIndex(i, (i + 1) % extraCols.length); };

  const toggleMenu = (key) => setOpenMenuKey(cur => cur === key ? null : key);

  // tutup ring bila klik di luar
  useEffect(() => {
    const onDocClick = (e) => {
      if (!e.target.closest?.('.th-hasmenu, .th-ring, .th-orbit')) {
        setOpenMenuKey(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // opsi dinamis (seed dulu, lalu bisa nambah)
  const [WILAYAH_OPTS, setWilayahOpts]                   = usePersistentState("iwkbu:opts:wilayah", SEED_WILAYAH);
  const [TRAYEK_OPTS, setTrayekOpts]                     = usePersistentState("iwkbu:opts:trayek", SEED_TRAYEK);
  const [JENIS_OPTS, setJenisOpts]                       = usePersistentState("iwkbu:opts:jenis", SEED_JENIS);
  const [TAHUN_OPTS]                                     = useState(SEED_TAHUN);
  const [BADAN_HUKUM_OPTS, setBadanOpts]                 = usePersistentState("iwkbu:opts:badan", SEED_BADAN);
  const [STATUS_BAYAR_OPTS, setStatusBayarOpts]          = usePersistentState("iwkbu:opts:statusBayar", SEED_STATUS_BAYAR);
  const [STATUS_KENDARAAN_OPTS, setStatusKendaraanOpts]  = usePersistentState("iwkbu:opts:statusKend", SEED_STATUS_KEND);
  const [GOLONGAN_OPTS, setGolonganOpts]                 = usePersistentState("iwkbu:opts:golongan", SEED_GOLONGAN);
  const [DOK_PERIZINAN_OPTS, setDokPerizinanOpts]        = usePersistentState("iwkbu:opts:dokPerizinan", SEED_DOK_PERIZINAN);
  const [HASIL_KONF_OPTS, setHasilKonfOpts]              = usePersistentState("iwkbu:opts:hasilKonf", SEED_HASIL_KONF);

  // modal: tambah nopol
  const [showNopolModal, setShowNopolModal] = useState(false);

  const emptyForm = {
    wilayah: WILAYAH_OPTS[0] || "",
    nopol: "",
    tarif: 0,
    golongan: GOLONGAN_OPTS[0] || "",
    nominal: 0,
    trayekNew: TRAYEK_OPTS[0] || "",
    jenis: JENIS_OPTS[0] || "",
    tahun: TAHUN_OPTS[0] || "",
    pic: "",
    badanHukum: "Perorangan",
    namaPerusahaan: "",
    alamat: "",
    kelurahan: "",
    kecamatan: "",
    kota: WILAYAH_OPTS[0] || "",
    tglTransaksi: "",
    loket: "",
    masaBerlaku: "",
    masaSwdkllj: "",
    statusBayar: STATUS_BAYAR_OPTS[0] || "",
    statusKendaraan: STATUS_KENDARAAN_OPTS[0] || "",
    outstanding: 0,
    konfirmasi: "",
    hp: "",
    // tambahan pemilik & dok
    namaPemilik: "",
    nik: "",
    dokPerizinan: DOK_PERIZINAN_OPTS[0] || "",
    // OS & Pemeliharaan
    tglBayarOs: "",
    nilaiBayarOs: 0,
    tglPemeliharaan: "",
    nilaiPemeliharaanOs: 0,
    keterangan: "",
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
            (r.trayekNew || "").toLowerCase().includes(s) ||
            (r.namaPerusahaan || "").toLowerCase().includes(s) ||
            (r.pic || "").toLowerCase().includes(s)
        );
    return data;
  }, [rows, q]);

  const totalPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const addNopol = (e) => {
    e?.preventDefault?.();
    if (!newForm.nopol.trim()) return;

    // tambahkan nilai ke opsi jika belum ada (case-insensitive)
    const wilayahSaved   = addOptionIfMissing(WILAYAH_OPTS, setWilayahOpts, newForm.wilayah, { forceUpper: true });
    const trayekSaved    = addOptionIfMissing(TRAYEK_OPTS, setTrayekOpts, newForm.trayekNew);
    const jenisSaved     = addOptionIfMissing(JENIS_OPTS, setJenisOpts, newForm.jenis);
    const badanSaved     = addOptionIfMissing(BADAN_HUKUM_OPTS, setBadanOpts, newForm.badanHukum);
    const statusBaySaved = addOptionIfMissing(STATUS_BAYAR_OPTS, setStatusBayarOpts, newForm.statusBayar);
    const statusKenSaved = addOptionIfMissing(STATUS_KENDARAAN_OPTS, setStatusKendaraanOpts, newForm.statusKendaraan);
    const golSaved       = addOptionIfMissing(GOLONGAN_OPTS, setGolonganOpts, newForm.golongan);
    const dokSaved       = addOptionIfMissing(DOK_PERIZINAN_OPTS, setDokPerizinanOpts, newForm.dokPerizinan);
    addOptionIfMissing(HASIL_KONF_OPTS, setHasilKonfOpts, newForm.konfirmasi || "");

    const next = {
      id: Date.now(),
      ...newForm,
      wilayah: wilayahSaved,
      trayekNew: trayekSaved,
      jenis: jenisSaved,
      badanHukum: badanSaved,
      statusBayar: statusBaySaved,
      statusKendaraan: statusKenSaved,
      golongan: golSaved,
      dokPerizinan: dokSaved,
      nopol: newForm.nopol.toUpperCase(),
      kota: newForm.kota || wilayahSaved, // fallback kota = wilayah
      tarif: Number(newForm.tarif || 0),
      nominal: Number(String(newForm.nominal || 0).replace(/[^\d]/g, "")),
      tahun: Number(newForm.tahun || TAHUN_OPTS[0]),
      outstanding: Number(newForm.outstanding || 0),
      nilaiBayarOs: Number(newForm.nilaiBayarOs || 0),
      nilaiPemeliharaanOs: Number(newForm.nilaiPemeliharaanOs || 0),
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

  const deleteRow = (id) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  return (
    <div className="iwkbu-wrap">
      <div className="iwkbu-clouds" aria-hidden />

      <header className="iwkbu-header">
        <div className="title">
          <span role="img" aria-label="bus" className="emoji">🚌</span>
        <h1>Data IWKBU</h1>
        </div>

        <div className="actions">
          <input
            className="search"
            placeholder="Cari nopol / wilayah / kota / trayek / perusahaan / PIC…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
           <button className="btn ghost" onClick={() => setShowColModal(true)}>
              + Tambah Kolom
            </button>
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
          <table className="kawaii-table" style={{ minWidth: "4600px", tableLayout: "fixed" }}>
            <thead style={{ whiteSpace: "nowrap" }}>
              <tr>
                <th>Aksi</th>
                <th>No</th>
                <th>Wilayah</th>
                <th>Nomor Polisi</th>
                <th>Tarif</th>
                <th>Golongan</th>
                <th>Nominal IWKBU</th>
                <th>Trayek</th>
                <th>Jenis</th>
                <th>Tahun Pembuatan</th>
                <th>PIC</th>
                <th>Badan Hukum / Perorangan</th>
                <th>Nama Perusahaan</th>
                <th>Alamat</th>
                <th>Kel</th>
                <th>Kec</th>
                <th>Kota/Kab</th>
                <th>Tgl Transaksi</th>
                <th>Loket</th>
                <th>Masa Berlaku IWKBU</th>
                <th>Masa Laku SWDKLLJ</th>
                <th>Status Pembayaran</th>
                <th>Status Kendaraan</th>
                <th>Outstanding</th>
                <th>Hasil Konfirmasi</th>
                <th>No. HP</th>
                <th>Nama Pemilik/Pengelola</th>
                <th>NIK / No Identitas</th>
                <th>Dok Perizinan</th>
                <th>Tgl Bayar OS IWKBU</th>
                <th>Nilai Bayar OS IWKBU</th>
                <th>Tgl Pemeliharaan</th>
                <th>Nilai Pemeliharaan OS IWKBU</th>
                <th>Keterangan</th>
                {extraCols.map((c) => (
                  <th key={`h-extra-${c.key}`}>
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
                        <button
                          className="th-toggle"
                          onClick={(e) => { e.stopPropagation(); toggleMenu(c.key); }}
                          aria-haspopup="true"
                          aria-expanded={openMenuKey === c.key}
                        >
                          {c.label}
                        </button>
                      )}

                      {openMenuKey === c.key && (
                        <>
                          {/* RING CONTROL */}
                          <div className="th-ring pretty" role="group" aria-label={`Atur kolom ${c.label}`}>
                            <div className="ring-aura" aria-hidden />
                            <button className="ring-btn ring-top" onClick={() => moveStart(c.key)} aria-label="Ke awal">⏮</button>
                            <button className="ring-btn ring-left" onClick={() => moveLeft(c.key)} aria-label="Geser kiri">◀</button>
                            <button className="ring-btn ring-right" onClick={() => moveRight(c.key)} aria-label="Geser kanan">▶</button>
                            <button className="ring-btn ring-bottom" onClick={() => moveEnd(c.key)} aria-label="Ke akhir">⏭</button>
                          </div>

                          {/* ORBIT CHIP */}
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
              {pageData.map((r, i) => (
                <tr key={r.id}>
                  {/* Aksi */}
                  <td>
                    <button className="btn danger ghost xs" onClick={() => deleteRow(r.id)}>Hapus</button>
                  </td>

                  {/* No */}
                  <td>{(page - 1) * pageSize + i + 1}</td>

                  {/* Wilayah (datalist; auto-extend) */}
                  <td>
                    <input
                      list="wilayah-list"
                      value={r.wilayah}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(WILAYAH_OPTS, setWilayahOpts, e.target.value, { forceUpper: true });
                        updateRow(r.id, { wilayah: saved });
                      }}
                    />
                    <datalist id="wilayah-list">
                      {WILAYAH_OPTS.map((w) => <option key={w} value={w} />)}
                    </datalist>
                  </td>

                  {/* Nopol */}
                  <td className="nopol">
                    <span className="nopol-badge">{r.nopol}</span>
                  </td>

                  {/* Tarif */}
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

                  {/* Golongan (datalist) */}
                  <td>
                    <input
                      list="golongan-list"
                      value={r.golongan || ""}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(GOLONGAN_OPTS, setGolonganOpts, e.target.value);
                        updateRow(r.id, { golongan: saved });
                      }}
                    />
                    <datalist id="golongan-list">
                      {GOLONGAN_OPTS.map((g) => <option key={g} value={g} />)}
                    </datalist>
                  </td>

                  {/* Nominal IWKBU -> modal agar nyaman */}
                  <td>
                    <button
                      className="link-btn"
                      onClick={() => openNominalFor(r.id, r.nominal)}
                    >
                      {r.nominal ? idr(r.nominal) : "Atur"}
                    </button>
                  </td>

                  {/* Trayek (datalist) */}
                  <td>
                    <input
                      list="trayek-list"
                      value={r.trayekNew}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(TRAYEK_OPTS, setTrayekOpts, e.target.value);
                        updateRow(r.id, { trayekNew: saved });
                      }}
                    />
                    <datalist id="trayek-list">
                      {TRAYEK_OPTS.map((t) => <option key={t} value={t} />)}
                    </datalist>
                  </td>

                  {/* Jenis (datalist) */}
                  <td>
                    <input
                      list="jenis-list"
                      value={r.jenis}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(JENIS_OPTS, setJenisOpts, e.target.value);
                        updateRow(r.id, { jenis: saved });
                      }}
                    />
                    <datalist id="jenis-list">
                      {JENIS_OPTS.map((j) => <option key={j} value={j} />)}
                    </datalist>
                  </td>

                  {/* Tahun */}
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

                  {/* PIC */}
                  <td>
                    <input
                      type="text"
                      value={r.pic || ""}
                      onChange={(e) => updateRow(r.id, { pic: e.target.value })}
                      placeholder="PIC"
                    />
                  </td>

                  {/* Badan Hukum (datalist) */}
                  <td>
                    <input
                      list="badan-list"
                      value={r.badanHukum}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(BADAN_HUKUM_OPTS, setBadanOpts, e.target.value);
                        updateRow(r.id, { badanHukum: saved });
                      }}
                    />
                    <datalist id="badan-list">
                      {BADAN_HUKUM_OPTS.map((b) => <option key={b} value={b} />)}
                    </datalist>
                  </td>

                  {/* Nama Perusahaan */}
                  <td>
                    <input
                      type="text"
                      value={r.namaPerusahaan}
                      onChange={(e) => updateRow(r.id, { namaPerusahaan: e.target.value })}
                      placeholder={r.badanHukum?.toUpperCase?.() === "BH" ? "Nama PT/CV" : "—"}
                      disabled={r.badanHukum?.toUpperCase?.() !== "BH"}
                    />
                  </td>

                  {/* Alamat */}
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

                  {/* Tanggal-tanggal */}
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

                  {/* Status Pembayaran (datalist) */}
                  <td>
                    <input
                      list="status-bayar-list"
                      value={r.statusBayar}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(STATUS_BAYAR_OPTS, setStatusBayarOpts, e.target.value);
                        updateRow(r.id, { statusBayar: saved });
                      }}
                    />
                    <datalist id="status-bayar-list">
                      {STATUS_BAYAR_OPTS.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </td>

                  {/* Status Kendaraan (datalist) */}
                  <td>
                    <input
                      list="status-kend-list"
                      value={r.statusKendaraan}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(STATUS_KENDARAAN_OPTS, setStatusKendaraanOpts, e.target.value);
                        updateRow(r.id, { statusKendaraan: saved });
                      }}
                    />
                    <datalist id="status-kend-list">
                      {STATUS_KENDARAAN_OPTS.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </td>

                  {/* Outstanding */}
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

                  {/* Hasil Konfirmasi (datalist) */}
                  <td>
                    <input
                      list="hasil-konf-list"
                      value={r.konfirmasi || ""}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(HASIL_KONF_OPTS, setHasilKonfOpts, e.target.value);
                        updateRow(r.id, { konfirmasi: saved });
                      }}
                      placeholder="Catatan/hasil"
                    />
                    <datalist id="hasil-konf-list">
                      {HASIL_KONF_OPTS.map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </td>

                  {/* No HP */}
                  <td>
                    <input
                      type="tel"
                      value={r.hp}
                      onChange={(e) => updateRow(r.id, { hp: e.target.value })}
                      placeholder="08xx…"
                      pattern="[0-9+\\-\\s]+"
                    />
                  </td>

                  {/* Nama Pemilik/Pengelola */}
                  <td>
                    <input
                      type="text"
                      value={r.namaPemilik || ""}
                      onChange={(e) => updateRow(r.id, { namaPemilik: e.target.value })}
                    />
                  </td>

                  {/* NIK */}
                  <td>
                    <input
                      type="text"
                      value={r.nik || ""}
                      onChange={(e) => updateRow(r.id, { nik: e.target.value })}
                    />
                  </td>

                  {/* Dok Perizinan (datalist) */}
                  <td>
                    <input
                      list="dok-perizinan-list"
                      value={r.dokPerizinan || ""}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(DOK_PERIZINAN_OPTS, setDokPerizinanOpts, e.target.value);
                        updateRow(r.id, { dokPerizinan: saved });
                      }}
                    />
                    <datalist id="dok-perizinan-list">
                      {DOK_PERIZINAN_OPTS.map((d) => <option key={d} value={d} />)}
                    </datalist>
                  </td>

                  {/* OS & Pemeliharaan */}
                  <td>
                    <input
                      type="date"
                      value={r.tglBayarOs || ""}
                      onChange={(e) => updateRow(r.id, { tglBayarOs: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="num"
                      type="number"
                      min={0}
                      value={r.nilaiBayarOs || 0}
                      onChange={(e) => updateRow(r.id, { nilaiBayarOs: Number(e.target.value) })}
                    />
                    <div className="hint">{idr(r.nilaiBayarOs || 0)}</div>
                  </td>
                  <td>
                    <input
                      type="date"
                      value={r.tglPemeliharaan || ""}
                      onChange={(e) => updateRow(r.id, { tglPemeliharaan: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="num"
                      type="number"
                      min={0}
                      value={r.nilaiPemeliharaanOs || 0}
                      onChange={(e) => updateRow(r.id, { nilaiPemeliharaanOs: Number(e.target.value) })}
                    />
                    <div className="hint">{idr(r.nilaiPemeliharaanOs || 0)}</div>
                  </td>

                  {/* Keterangan */}
                  <td>
                    <input
                      type="text"
                      value={r.keterangan || ""}
                      onChange={(e) => updateRow(r.id, { keterangan: e.target.value })}
                    />
                  </td>
                  {/* Kolom dinamis */}
                  {extraCols.map((c) => (
                    <td key={`c-extra-${r.id}-${c.key}`}>
                      <input
                        type="text"
                        value={r[c.key] ?? ""}
                        onChange={(e) => updateRow(r.id, { [c.key]: e.target.value })}
                        placeholder={c.label}
                      />
                    </td>
                  ))}

                </tr>
              ))}

              {pageData.length === 0 && (
                <tr>
                  <td colSpan={35} className="empty">Tidak ada data</td>
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
              {/* Data Kendaraan */}
              <label>
                Wilayah
                <input
                  list="wilayah-list-modal"
                  value={newForm.wilayah}
                  onChange={(e)=>setF('wilayah', e.target.value)}
                />
                <datalist id="wilayah-list-modal">
                  {WILAYAH_OPTS.map((w)=><option key={w} value={w} />)}
                </datalist>
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
                Tarif
                <input type="number" min={0} value={newForm.tarif} onChange={(e)=>setF('tarif', Number(e.target.value))}/>
                <small className="hint">{idr(newForm.tarif)}</small>
              </label>

              <label>
                Golongan
                <input
                  list="golongan-list-modal"
                  value={newForm.golongan}
                  onChange={(e)=>setF('golongan', e.target.value)}
                />
                <datalist id="golongan-list-modal">
                  {GOLONGAN_OPTS.map((g)=><option key={g} value={g} />)}
                </datalist>
              </label>

              <label>
                Nominal IWKBU
                <input type="number" min={0} value={newForm.nominal} onChange={(e)=>setF('nominal', e.target.value)} />
                <small className="hint">{idr(newForm.nominal)}</small>
              </label>

              <label>
                Trayek
                <input list="trayek-list-modal" value={newForm.trayekNew} onChange={(e)=>setF('trayekNew', e.target.value)} />
                <datalist id="trayek-list-modal">
                  {TRAYEK_OPTS.map((t)=><option key={t} value={t} />)}
                </datalist>
              </label>

              <label>
                Jenis
                <input list="jenis-list-modal" value={newForm.jenis} onChange={(e)=>setF('jenis', e.target.value)} />
                <datalist id="jenis-list-modal">
                  {JENIS_OPTS.map((j)=><option key={j} value={j} />)}
                </datalist>
              </label>

              <label>
                Tahun Pembuatan
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  placeholder="cth: 2025"
                  value={newForm.tahun}
                  onChange={(e)=>setF('tahun', Number(e.target.value))}
                />
              </label>

              <label>
                PIC
                <input type="text" value={newForm.pic} onChange={(e)=>setF('pic', e.target.value)} />
              </label>

              {/* Data Perusahaan */}
              <label>
                Badan Hukum / Perorangan
                <input list="badan-list-modal" value={newForm.badanHukum} onChange={(e)=>setF('badanHukum', e.target.value)} />
                <datalist id="badan-list-modal">
                  {BADAN_HUKUM_OPTS.map((b)=><option key={b} value={b} />)}
                </datalist>
              </label>

              <label>
                Nama Perusahaan
                <input
                  type="text"
                  value={newForm.namaPerusahaan}
                  onChange={(e)=>setF('namaPerusahaan', e.target.value)}
                  placeholder={String(newForm.badanHukum).toUpperCase() === 'BH' ? 'Nama PT/CV' : '—'}
                  disabled={String(newForm.badanHukum).toUpperCase() !== 'BH'}
                />
              </label>

              <label>
                Alamat Lengkap
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
                Kota/Kab
                <input type="text" value={newForm.kota} onChange={(e)=>setF('kota', e.target.value)} />
              </label>

              {/* Transaksi & Pembayaran */}
              <label>
                Tanggal Transaksi
                <input type="date" value={newForm.tglTransaksi || ''} onChange={(e)=>setF('tglTransaksi', e.target.value)} />
              </label>

              <label>
                Loket Pembayaran
                <input type="text" value={newForm.loket} onChange={(e)=>setF('loket', e.target.value)} />
              </label>

              <label>
                Masa Berlaku IWKBU
                <input type="date" value={newForm.masaBerlaku || ''} onChange={(e)=>setF('masaBerlaku', e.target.value)} />
              </label>

              <label>
                Masa Laku SWDKLLJ Terakhir
                <input type="date" value={newForm.masaSwdkllj || ''} onChange={(e)=>setF('masaSwdkllj', e.target.value)} />
              </label>

              <label>
                Status Pembayaran IWKBU
                <input list="status-bayar-list-modal" value={newForm.statusBayar} onChange={(e)=>setF('statusBayar', e.target.value)} />
                <datalist id="status-bayar-list-modal">
                  {STATUS_BAYAR_OPTS.map((s)=><option key={s} value={s} />)}
                </datalist>
              </label>

              <label>
                Status Kendaraan
                <input list="status-kend-list-modal" value={newForm.statusKendaraan} onChange={(e)=>setF('statusKendaraan', e.target.value)} />
                <datalist id="status-kend-list-modal">
                  {STATUS_KENDARAAN_OPTS.map((s)=><option key={s} value={s} />)}
                </datalist>
              </label>

              <label>
                Nilai Outstanding IWKBU (Rp)
                <input type="number" min={0} value={newForm.outstanding} onChange={(e)=>setF('outstanding', Number(e.target.value))}/>
                <small className="hint">{idr(newForm.outstanding)}</small>
              </label>

              <label>
                Hasil Konfirmasi
                <input list="hasil-konf-list-modal" value={newForm.konfirmasi} onChange={(e)=>setF('konfirmasi', e.target.value)} placeholder="Catatan" />
                <datalist id="hasil-konf-list-modal">
                  {HASIL_KONF_OPTS.map((s)=><option key={s} value={s} />)}
                </datalist>
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

              {/* Pemilik & Dokumen */}
              <label>
                Nama Pemilik/Pengelola
                <input type="text" value={newForm.namaPemilik} onChange={(e)=>setF('namaPemilik', e.target.value)} />
              </label>

              <label>
                NIK / No Identitas
                <input type="text" value={newForm.nik} onChange={(e)=>setF('nik', e.target.value)} />
              </label>

              <label>
                Dok Perizinan
                <input list="dok-perizinan-list-modal" value={newForm.dokPerizinan} onChange={(e)=>setF('dokPerizinan', e.target.value)} />
                <datalist id="dok-perizinan-list-modal">
                  {DOK_PERIZINAN_OPTS.map((d)=><option key={d} value={d} />)}
                </datalist>
              </label>

              {/* OS IWKBU & Pemeliharaan */}
              <label>
                Tgl Bayar OS IWKBU
                <input type="date" value={newForm.tglBayarOs || ''} onChange={(e)=>setF('tglBayarOs', e.target.value)} />
              </label>

              <label>
                Nilai Bayar OS IWKBU
                <input type="number" min={0} value={newForm.nilaiBayarOs} onChange={(e)=>setF('nilaiBayarOs', Number(e.target.value))} />
                <small className="hint">{idr(newForm.nilaiBayarOs)}</small>
              </label>

              <label>
                Tgl Pemeliharaan
                <input type="date" value={newForm.tglPemeliharaan || ''} onChange={(e)=>setF('tglPemeliharaan', e.target.value)} />
              </label>

              <label>
                Nilai Pemeliharaan OS IWKBU
                <input type="number" min={0} value={newForm.nilaiPemeliharaanOs} onChange={(e)=>setF('nilaiPemeliharaanOs', Number(e.target.value))} />
                <small className="hint">{idr(newForm.nilaiPemeliharaanOs)}</small>
              </label>

              {/* Keterangan */}
              <label style={{gridColumn:'1 / -1'}}>
                Keterangan
                <input type="text" value={newForm.keterangan} onChange={(e)=>setF('keterangan', e.target.value)} />
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

      {/* Modal: Tambah Kolom Baru */}
      {showColModal && (
        <div className="modal-backdrop" onClick={() => setShowColModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Tambah Kolom Baru</h3>
            <label className="stack">
              Nama Kolom
              <input
                type="text"
                value={newColLabel}
                onChange={(e) => setNewColLabel(e.target.value)}
                placeholder="Contoh: NPWP, Email, Catatan"
              />
            </label>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setShowColModal(false)}>Batal</button>
              <button className="btn primary" onClick={addColumn}>Tambah</button>
            </div>
          </div>
        </div>
      )}

      {/* Datalist sumber table (supaya gak duplicate id antara modal & table) */}
      <datalist id="wilayah-list">{WILAYAH_OPTS.map((w)=><option key={w} value={w}/>)}</datalist>
      <datalist id="golongan-list">{GOLONGAN_OPTS.map((g)=><option key={g} value={g}/>)}</datalist>
      <datalist id="trayek-list">{TRAYEK_OPTS.map((t)=><option key={t} value={t}/>)}</datalist>
      <datalist id="jenis-list">{JENIS_OPTS.map((j)=><option key={j} value={j}/>)}</datalist>
      <datalist id="badan-list">{BADAN_HUKUM_OPTS.map((b)=><option key={b} value={b}/>)}</datalist>
      <datalist id="status-bayar-list">{STATUS_BAYAR_OPTS.map((s)=><option key={s} value={s}/>)}</datalist>
      <datalist id="status-kend-list">{STATUS_KENDARAAN_OPTS.map((s)=><option key={s} value={s}/>)}</datalist>
      <datalist id="dok-perizinan-list">{DOK_PERIZINAN_OPTS.map((d)=><option key={d} value={d}/>)}</datalist>
      <datalist id="hasil-konf-list">{HASIL_KONF_OPTS.map((s)=><option key={s} value={s}/>)}</datalist>
    </div>
  );
}
