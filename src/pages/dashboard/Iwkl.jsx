import React, { useMemo, useState, useEffect } from "react";
import "../../views/dashboard/Iwkl.css";
import { supabase } from "../../lib/supabaseClient"; // sesuaikan path-nya ya

const LOKET_OPTS = [
  "Kantor Wilayah",
  "Pelalawan",
  "Siak",
  "Kota Baru",
  "Tembilahan",
  "Sungai Guntung",
];

const KELAS_OPTS = ["Gold", "Silver"];

const STATUS_PKS_OPTS = ["Aktif", "Non Aktif", "Berakhir", "Addendum", "-"];

const STATUS_PEMB_OPTS = [
  "Lancar",
  "Dispensasi",
  "Outstanding",
  "Belum Bayar",
  "Lunas",
  "Parsial",
  "-",
];

const STATUS_KAPAL_OPTS = [
  "Beroperasi",
  "Docking",
  "Cadangan",
  "Tidak Beroperasi",
  "Rusak",
  "-",
];

const PAS_OPTS = ["Ada", "Tidak", "-"];
const SERTIF_KSL_OPTS = ["Ada", "Tidak", "-"];
const IZIN_TRAYEK_OPTS = ["Ada", "Tidak", "-"];

const SISTEM_IWKL_OPTS = [
  "Manifest",
  "Borongan",
  "Manual",
  "E-Ticket",
  "Campuran",
  "-",
];

const PERHIT_TARIF_OPTS = [
  "Dalam Provinsi",
  "Antar Provinsi",
  "Angkutan Karyawan",
  "-",
];

const monthIndex = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  mei: 5,
  jun: 6,
  jul: 7,
  agust: 8,
  sept: 9,
  okt: 10,
  nov: 11,
  des: 12,
};

const monthFromIndex = {
  1: "jan",
  2: "feb",
  3: "mar",
  4: "apr",
  5: "mei",
  6: "jun",
  7: "jul",
  8: "agust",
  9: "sept",
  10: "okt",
  11: "nov",
  12: "des",
};

const monthKeys = [
  "jan",
  "feb",
  "mar",
  "apr",
  "mei",
  "jun",
  "jul",
  "agust",
  "sept",
  "okt",
  "nov",
  "des",
];

const monthLabels = {
  jan: "Januari",
  feb: "Februari",
  mar: "Maret",
  apr: "April",
  mei: "Mei",
  jun: "Juni",
  jul: "Juli",
  agust: "Agustus",
  sept: "September",
  okt: "Oktober",
  nov: "November",
  des: "Desember",
};

const idr = (n) =>
  (Number(n) || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

// DB -> React
const mapDbToRow = (dbRow) => ({
  id: dbRow.id,
  loket: dbRow.loket,
  kelas: dbRow.kelas,
  namaPerusahaan: dbRow.nama_perusahaan,
  namaKapal: dbRow.nama_kapal,
  namaPemilik: dbRow.nama_pemilik,
  statusPKS: dbRow.status_pks,
  statusPembayaran: dbRow.status_pembayaran,
  statusKapal: dbRow.status_kapal,
  potensiPerBulan: dbRow.potensi_per_bulan || 0,
  ruteAwal: dbRow.rute_awal,
  ruteAkhir: dbRow.rute_akhir,
  trayek: dbRow.trayek,
  persenAkt2423: dbRow.persen_akt_24_23,
  alamat: dbRow.alamat,
  noKontak: dbRow.no_kontak,
  tglLahir: dbRow.tgl_lahir || "",
  kapasitasPenumpang: dbRow.kapasitas_penumpang || 0,
  tglPKS: dbRow.tgl_pks || "",
  tglBerakhirPKS: dbRow.tgl_berakhir_pks || "",
  tglAddendum: dbRow.tgl_addendum || "",
  pasBesarKecil: dbRow.pas_besar_kecil,
  sertifikatKeselamatan: dbRow.sertifikat_keselamatan,
  izinTrayek: dbRow.izin_trayek,
  tglJatuhTempoSertifikatKeselamatan:
    dbRow.tgl_jatuh_tempo_sertifikat_keselamatan || "",
  sistemPengutipanIWKL: dbRow.sistem_pengutipan_iwkl,
  perhitunganTarif: dbRow.perhitungan_tarif,
  seat: dbRow.seat || 0,
  rit: dbRow.rit || 0,
  tarifDasarIwkl: dbRow.tarif_dasar_iwkl || 0,
  hari: dbRow.hari || 0,
  loadFactor: dbRow.load_factor || 0,          
  totalPerhitungan: dbRow.total_perhitungan || 0,
  tarifBoronganDisepakati: dbRow.tarif_borongan_disepakati || 0,
  keterangan: dbRow.keterangan,
  // bulan
  jan: dbRow.jan || 0,
  feb: dbRow.feb || 0,
  mar: dbRow.mar || 0,
  apr: dbRow.apr || 0,
  mei: dbRow.mei || 0,
  jun: dbRow.jun || 0,
  jul: dbRow.jul || 0,
  agust: dbRow.agust || 0,
  sept: dbRow.sept || 0,
  okt: dbRow.okt || 0,
  nov: dbRow.nov || 0,
  des: dbRow.des || 0,
});

// React -> DB
const mapRowToDbPayload = (r) => ({
  loket: r.loket,
  kelas: r.kelas,
  nama_perusahaan: r.namaPerusahaan,
  nama_kapal: r.namaKapal,
  nama_pemilik: r.namaPemilik,
  status_pks: r.statusPKS,
  status_pembayaran: r.statusPembayaran,
  status_kapal: r.statusKapal,
  potensi_per_bulan: r.potensiPerBulan,
  rute_awal: r.ruteAwal,
  rute_akhir: r.ruteAkhir,
  trayek: r.trayek,
  persen_akt_24_23: r.persenAkt2423,
  alamat: r.alamat,
  no_kontak: r.noKontak,
  tgl_lahir: r.tglLahir || null,
  kapasitas_penumpang: r.kapasitasPenumpang,
  tgl_pks: r.tglPKS || null,
  tgl_berakhir_pks: r.tglBerakhirPKS || null,
  tgl_addendum: r.tglAddendum || null,
  pas_besar_kecil: r.pasBesarKecil,
  sertifikat_keselamatan: r.sertifikatKeselamatan,
  izin_trayek: r.izinTrayek,
  tgl_jatuh_tempo_sertifikat_keselamatan:
    r.tglJatuhTempoSertifikatKeselamatan || null,
  sistem_pengutipan_iwkl: r.sistemPengutipanIWKL,
  perhitungan_tarif: r.perhitunganTarif,
  seat: r.seat,
  rit: r.rit,
  tarif_dasar_iwkl: r.tarifDasarIwkl,
  hari: r.hari,
  load_factor: r.loadFactor,
  total_perhitungan: r.totalPerhitungan,
  tarif_borongan_disepakati: r.tarifBoronganDisepakati,
  keterangan: r.keterangan,
  jan: r.jan || 0,
  feb: r.feb || 0,
  mar: r.mar || 0,
  apr: r.apr || 0,
  mei: r.mei || 0,
  jun: r.jun || 0,
  jul: r.jul || 0,
  agust: r.agust || 0,
  sept: r.sept || 0,
  okt: r.okt || 0,
  nov: r.nov || 0,
  des: r.des || 0,
});

const makeEmptyRow = () => ({
  id: null,
  loket: LOKET_OPTS[0],
  kelas: KELAS_OPTS[0],
  namaPerusahaan: "",
  namaKapal: "",
  namaPemilik: "",
  statusPKS: STATUS_PKS_OPTS[0],
  statusPembayaran: STATUS_PEMB_OPTS[0],
  statusKapal: STATUS_KAPAL_OPTS[0],
  potensiPerBulan: 0,
  ruteAwal: "",
  ruteAkhir: "",
  trayek: "",
  persenAkt2423: "",
  alamat: "",
  noKontak: "",
  tglLahir: "",
  kapasitasPenumpang: 0,
  tglPKS: "",
  tglBerakhirPKS: "",
  tglAddendum: "",
  pasBesarKecil: PAS_OPTS[0],
  sertifikatKeselamatan: SERTIF_KSL_OPTS[0],
  izinTrayek: IZIN_TRAYEK_OPTS[0],
  tglJatuhTempoSertifikatKeselamatan: "",
  sistemPengutipanIWKL: SISTEM_IWKL_OPTS[0],
  perhitunganTarif: PERHIT_TARIF_OPTS[0],
  seat: 0,
  rit: 0,
  tarifDasarIwkl: 0,
  hari: 0,
  loadFactor: 0,
  totalPerhitungan: 0,
  tarifBoronganDisepakati: 0,
  keterangan: "",
  ...monthKeys.reduce((acc, k) => ({ ...acc, [k]: 0 }), {}),
});

export default function IwklSimple() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [openDetailId, setOpenDetailId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tahunAktif, setTahunAktif] = useState(2024);

  // modal tambah
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState(makeEmptyRow());

  const pageSize = 50;

  const computeTotal = (r) =>
    monthKeys.reduce((sum, k) => sum + (Number(r[k] || 0) || 0), 0);

  // load data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: iwklData, error: errIwkl } = await supabase
        .from("iwkl")
        .select("*")
        .order("id", { ascending: false });

      console.log("RAW iwkl dari Supabase:", iwklData?.slice(0, 5));

      if (errIwkl) {
        console.error("Error load IWKL:", errIwkl);
        setLoading(false);
        return;
      }

      const { data: bulanData, error: errBulan } = await supabase
        .from("iwkl_bulanan")
        .select("*")
        .eq("tahun", tahunAktif);

      console.log("RAW iwkl_bulanan:", bulanData?.slice(0, 5));

      if (errBulan) {
        console.error("Error load iwkl_bulanan:", errBulan);
      }

      const grouped = {};
      (bulanData || []).forEach((row) => {
        const iwklId = row.iwkl_id;
        const k = monthFromIndex[row.bulan];
        if (!k) return;
        if (!grouped[iwklId]) grouped[iwklId] = {};
        grouped[iwklId][k] = Number(row.nilai) || 0;
      });

      const rowsMapped = (iwklData || []).map((r) => {
        const base = mapDbToRow(r);
        const bulan = grouped[r.id] || {};
        return { ...base, ...bulan };
      });

      console.log("HASIL map ke rows:", rowsMapped.slice(0, 5));

      setRows(rowsMapped);
      setLoading(false);
    };

    fetchData();
  }, [tahunAktif]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [
        r.loket,
        r.kelas,
        r.namaPerusahaan,
        r.namaKapal,
        r.namaPemilik,
        r.ruteAwal,
        r.ruteAkhir,
        r.trayek,
      ]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [rows, q]);

  const totalPage = Math.max(1, Math.ceil(filtered.length / pageSize));

  const pageData = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const deleteRow = async (id) => {
    if (!window.confirm("Hapus baris ini?")) return;
    setSaving(true);
    const { error } = await supabase.from("iwkl").delete().eq("id", id);
    setSaving(false);

    if (error) {
      console.error("Error delete:", error);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (openDetailId === id) setOpenDetailId(null);
  };

  const updateCell = async (id, key, value) => {
    // update state dulu biar UI responsif
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: value } : r))
    );

    // kalau yang diubah adalah bulan, arahkan ke iwkl_bulanan
    if (monthKeys.includes(key)) {
      await updateBulan(id, key, value);
      return;
    }

    const keyMap = {
      namaPerusahaan: "nama_perusahaan",
      namaKapal: "nama_kapal",
      namaPemilik: "nama_pemilik",
      statusPKS: "status_pks",
      statusPembayaran: "status_pembayaran",
      statusKapal: "status_kapal",
      potensiPerBulan: "potensi_per_bulan",
      persenAkt2423: "persen_akt_24_23",
      noKontak: "no_kontak",
      tglLahir: "tgl_lahir",
      kapasitasPenumpang: "kapasitas_penumpang",
      tglPKS: "tgl_pks",
      tglBerakhirPKS: "tgl_berakhir_pks",
      tglAddendum: "tgl_addendum",
      pasBesarKecil: "pas_besar_kecil",
      sertifikatKeselamatan: "sertifikat_keselamatan",
      izinTrayek: "izin_trayek",
      tglJatuhTempoSertifikatKeselamatan:
        "tgl_jatuh_tempo_sertifikat_keselamatan",
      sistemPengutipanIWKL: "sistem_pengutipan_iwkl",
      perhitunganTarif: "perhitungan_tarif",
      seat: "seat",
      rit: "rit",
      tarifDasarIwkl: "tarif_dasar_iwkl",
      hari: "hari",
      loadFactor: "load_factor",
      totalPerhitungan: "total_perhitungan",
      tarifBoronganDisepakati: "tarif_borongan_disepakati",
      keterangan: "keterangan",
      loket: "loket",
      kelas: "kelas",
      trayek: "trayek",
      ruteAwal: "rute_awal",
      ruteAkhir: "rute_akhir",
      // ❌ jan..des DIHAPUS dari sini, karena mereka di iwkl_bulanan
    };

    const colName = keyMap[key];
    if (!colName) {
      console.warn("Kolom belum dimapping ke DB:", key);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("iwkl")
      .update({ [colName]: value })
      .eq("id", id);
    setSaving(false);

    if (error) {
      console.error("Error update:", error);
    }
  };

  const updateBulan = async (iwklId, key, value) => {
    const bulan = monthIndex[key];
    if (!bulan) return;

    setSaving(true);

    // cek apakah row bulanan sudah ada
    const { data: existing, error: selError } = await supabase
      .from("iwkl_bulanan")
      .select("id")
      .eq("iwkl_id", iwklId)
      .eq("tahun", tahunAktif)
      .eq("bulan", bulan)
      .maybeSingle();

    if (selError && selError.code !== "PGRST116") {
      // PGRST116 = no rows
      console.error("Error cek iwkl_bulanan:", selError);
      setSaving(false);
      return;
    }

    let error;
    if (existing) {
      // update
      ({ error } = await supabase
        .from("iwkl_bulanan")
        .update({ nilai: value })
        .eq("id", existing.id));
    } else {
      // insert baru
      ({ error } = await supabase.from("iwkl_bulanan").insert({
        iwkl_id: iwklId,
        tahun: tahunAktif,
        bulan,
        nilai: value,
      }));
    }

    setSaving(false);

    if (error) {
      console.error("Error update/insert iwkl_bulanan:", error);
    }
  };

  const toggleDetail = (id) => {
    setOpenDetailId((cur) => (cur === id ? null : id));
  };

  // helper form tambah
  const setF = (field, value) =>
    setNewForm((prev) => ({
      ...prev,
      [field]: value,
    }));

  const addIwkl = async (e) => {
    e.preventDefault();
    const draft = { ...makeEmptyRow(), ...newForm };

    setSaving(true);
    const { data, error } = await supabase
      .from("iwkl")
      .insert([mapRowToDbPayload(draft)])
      .select()
      .single();
    setSaving(false);

    if (error) {
      console.error("Error insert:", error);
      return;
    }

    const newRow = mapDbToRow(data);
    setRows((prev) => [newRow, ...prev]);
    setShowAddModal(false);
    setNewForm(makeEmptyRow());
    setPage(1);
  };

  return (
    <div className="iwkl-wrap">
      <div className="iwkl-bg" aria-hidden />

      <header className="iwkl-header">
        <div className="title">
          <span className="emoji" aria-hidden>
            🛳️
          </span>
          <h1>Data IWKL</h1>
          {loading && <span style={{ marginLeft: 8, fontSize: 12 }}>Loading…</span>}
          {saving && !loading && (
            <span style={{ marginLeft: 8, fontSize: 12 }}>Menyimpan…</span>
          )}
        </div>

        <div className="actions actions-col">
          {/* ROW ATAS: search + tambah sejajar */}
          <div className="actions-row top">
            <input
              className="search"
              placeholder="Cari kapal / perusahaan / trayek…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />

            <button
              className="btn primary"
              type="button"
              onClick={() => {
                setNewForm(makeEmptyRow());
                setShowAddModal(true);
              }}
            >
              + Tambah Data IWKL
            </button>
          </div>

          {/* ROW BAWAH: dropdown tahun */}
          <div className="actions-row bottom">
            <select
              value={tahunAktif}
              onChange={(e) => setTahunAktif(Number(e.target.value))}
              className="year-select"
            >
              <option value={2021}>2021</option>
              <option value={2022}>2022</option>
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>

      </header>

      <div className="card">
        <div className="table-scroll">
          <div className="scroll-inner">
            <table className="kawaii-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Aksi</th>
                  <th>Loket</th>
                  <th>Kelas</th>
                  <th>Nama Kapal</th>
                  <th>Nama Perusahaan</th>
                  <th>Nama Pemilik / Pengelola</th>
                  <th>Status PKS</th>
                  <th>Status Kapal</th>
                  <th>Rute</th>
                  <th>Trayek</th>
                  <th>Potensi / Bulan (Rp)</th>
                  <th>Total Jan–Des</th>
                  <th>% Akt 24 - 23</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((r, idx) => {
                  const total = computeTotal(r);
                  const isOpen = openDetailId === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr>
                        <td>{(page - 1) * pageSize + idx + 1}</td>
                        <td>
                          <button
                            className="btn danger ghost xs"
                            onClick={() => deleteRow(r.id)}
                          >
                            Hapus
                          </button>
                        </td>

                        {/* Loket */}
                        <td>
                          <select
                            value={r.loket || ""}
                            onChange={(e) =>
                              updateCell(r.id, "loket", e.target.value)
                            }
                          >
                            {LOKET_OPTS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Kelas */}
                        <td>
                          <select
                            value={r.kelas || ""}
                            onChange={(e) =>
                              updateCell(r.id, "kelas", e.target.value)
                            }
                          >
                            {KELAS_OPTS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Nama Kapal */}
                        <td>
                          <input
                            type="text"
                            value={r.namaKapal || ""}
                            onChange={(e) =>
                              updateCell(r.id, "namaKapal", e.target.value)
                            }
                            placeholder="Nama Kapal"
                          />
                        </td>

                        {/* Nama Perusahaan */}
                        <td>
                          <input
                            type="text"
                            value={r.namaPerusahaan || ""}
                            onChange={(e) =>
                              updateCell(
                                r.id,
                                "namaPerusahaan",
                                e.target.value
                              )
                            }
                            placeholder="Nama Perusahaan"
                          />
                        </td>

                        {/* Nama Pemilik */}
                        <td>
                          <input
                            type="text"
                            value={r.namaPemilik || ""}
                            onChange={(e) =>
                              updateCell(r.id, "namaPemilik", e.target.value)
                            }
                            placeholder="Nama Pemilik"
                          />
                        </td>

                        {/* Status PKS */}
                        <td>
                          <select
                            value={r.statusPKS || ""}
                            onChange={(e) =>
                              updateCell(r.id, "statusPKS", e.target.value)
                            }
                          >
                            {STATUS_PKS_OPTS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Status Kapal */}
                        <td>
                          <select
                            value={r.statusKapal || ""}
                            onChange={(e) =>
                              updateCell(r.id, "statusKapal", e.target.value)
                            }
                          >
                            {STATUS_KAPAL_OPTS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Rute (gabungan awal-akhir) */}
                        <td>
                          {(r.ruteAwal || "-") + " → " + (r.ruteAkhir || "-")}
                        </td>

                        {/* Trayek */}
                        <td>
                          <input
                            type="text"
                            value={r.trayek || ""}
                            onChange={(e) =>
                              updateCell(r.id, "trayek", e.target.value)
                            }
                            placeholder="Trayek"
                          />
                        </td>

                        {/* Potensi per bulan */}
                        <td>
                          <input
                            type="number"
                            min={0}
                            value={r.potensiPerBulan || 0}
                            onChange={(e) =>
                              updateCell(
                                r.id,
                                "potensiPerBulan",
                                Number(e.target.value)
                              )
                            }
                          />
                          <div className="hint">
                            {idr(r.potensiPerBulan || 0)}
                          </div>
                        </td>

                        {/* Total Jan–Des */}
                        <td className="num strong">{idr(total)}</td>

                        {/* Persen Akt 24-23 */}
                        <td>
                          <input
                            type="text"
                            value={r.persenAkt2423 || ""}
                            onChange={(e) =>
                              updateCell(r.id, "persenAkt2423", e.target.value)
                            }
                            placeholder="contoh: 40.7%"
                          />
                        </td>

                        {/* tombol detail */}
                        <td>
                          <button
                            className="btn ghost xs"
                            type="button"
                            onClick={() => toggleDetail(r.id)}
                          >
                            {isOpen ? "Tutup" : "Detail"}
                          </button>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="row-detail">
                          <td colSpan={15}>
                            <div className="detail-grid">
                              <section>
                                <h4>Info Lengkap</h4>
                                <div className="detail-fields">
                                  <label>
                                    Rute Awal
                                    <input
                                      type="text"
                                      value={r.ruteAwal || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "ruteAwal",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>

                                  <label>
                                    Rute Akhir
                                    <input
                                      type="text"
                                      value={r.ruteAkhir || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "ruteAkhir",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>

                                  <label>
                                    Alamat
                                    <input
                                      type="text"
                                      value={r.alamat || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "alamat",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>

                                  <label>
                                    No. Kontak
                                    <input
                                      type="tel"
                                      value={r.noKontak || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "noKontak",
                                          e.target.value
                                        )
                                      }
                                      placeholder="08xx…"
                                    />
                                  </label>

                                  <label>
                                    Tanggal Lahir
                                    <input
                                      type="date"
                                      value={r.tglLahir || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "tglLahir",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>

                                  <label>
                                    Kapasitas Penumpang
                                    <input
                                      type="number"
                                      min={0}
                                      value={r.kapasitasPenumpang || 0}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "kapasitasPenumpang",
                                          Number(e.target.value)
                                        )
                                      }
                                    />
                                  </label>

                                  <label>
                                    Tanggal PKS
                                    <input
                                      type="date"
                                      value={r.tglPKS || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "tglPKS",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>

                                  <label>
                                    Tanggal Berakhir PKS
                                    <input
                                      type="date"
                                      value={r.tglBerakhirPKS || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "tglBerakhirPKS",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>

                                  <label>
                                    Tanggal Addendum
                                    <input
                                      type="date"
                                      value={r.tglAddendum || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "tglAddendum",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>

                                  <label>
                                    Status Pembayaran
                                    <select
                                      value={r.statusPembayaran || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "statusPembayaran",
                                          e.target.value
                                        )
                                      }
                                    >
                                      {STATUS_PEMB_OPTS.map((o) => (
                                        <option key={o} value={o}>
                                          {o}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label>
                                    Pas Besar / Kecil
                                    <select
                                      value={r.pasBesarKecil || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "pasBesarKecil",
                                          e.target.value
                                        )
                                      }
                                    >
                                      {PAS_OPTS.map((o) => (
                                        <option key={o} value={o}>
                                          {o}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label>
                                    Sertifikat Keselamatan
                                    <select
                                      value={r.sertifikatKeselamatan || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "sertifikatKeselamatan",
                                          e.target.value
                                        )
                                      }
                                    >
                                      {SERTIF_KSL_OPTS.map((o) => (
                                        <option key={o} value={o}>
                                          {o}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label>
                                    Izin Trayek
                                    <select
                                      value={r.izinTrayek || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "izinTrayek",
                                          e.target.value
                                        )
                                      }
                                    >
                                      {IZIN_TRAYEK_OPTS.map((o) => (
                                        <option key={o} value={o}>
                                          {o}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label>
                                    Tgl Jatuh Tempo Sertifikat Kapal
                                    <input
                                      type="date"
                                      value={
                                        r.tglJatuhTempoSertifikatKeselamatan ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "tglJatuhTempoSertifikatKeselamatan",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>

                                  <label>
                                    Sistem Pengutipan IWKL
                                    <select
                                      value={r.sistemPengutipanIWKL || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "sistemPengutipanIWKL",
                                          e.target.value
                                        )
                                      }
                                    >
                                      {SISTEM_IWKL_OPTS.map((o) => (
                                        <option key={o} value={o}>
                                          {o}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <section>
                                    <h4>Perhitungan Tarif</h4>
                                    <div className="detail-fields">
                                      <label>
                                        Seat
                                        <input
                                          type="number"
                                          min={0}
                                          value={r.seat || 0}
                                          onChange={(e) => updateCell(r.id, "seat", Number(e.target.value))}
                                        />
                                      </label>

                                      <label>
                                        Rit
                                        <input
                                          type="number"
                                          min={0}
                                          value={r.rit || 0}
                                          onChange={(e) => updateCell(r.id, "rit", Number(e.target.value))}
                                        />
                                      </label>

                                      <label>
                                        Tarif Dasar IWKL
                                        <input
                                          type="number"
                                          min={0}
                                          value={r.tarifDasarIwkl || 0}
                                          onChange={(e) =>
                                            updateCell(r.id, "tarifDasarIwkl", Number(e.target.value))
                                          }
                                        />
                                      </label>

                                      <label>
                                        Hari
                                        <input
                                          type="number"
                                          min={0}
                                          value={r.hari || 0}
                                          onChange={(e) => updateCell(r.id, "hari", Number(e.target.value))}
                                        />
                                      </label>

                                      <label>
                                        Load Factor (%)
                                        <input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={r.loadFactor || 0}
                                          onChange={(e) =>
                                            updateCell(r.id, "loadFactor", Number(e.target.value))
                                          }
                                        />
                                      </label>

                                      <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
                                        Total:
                                        <strong>
                                          {" "}
                                          {idr(
                                            (r.seat || 0) *
                                              (r.rit || 0) *
                                              (r.tarifDasarIwkl || 0) *
                                              (r.hari || 0) *
                                              ((r.loadFactor || 0) / 100)
                                          )}
                                        </strong>
                                      </div>
                                    </div>
                                  </section>

                                  <label>
                                    Tarif Borongan Disepakati (Rp)
                                    <input
                                      type="number"
                                      min={0}
                                      value={r.tarifBoronganDisepakati || 0}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "tarifBoronganDisepakati",
                                          Number(e.target.value)
                                        )
                                      }
                                    />
                                    <small className="hint">
                                      {idr(r.tarifBoronganDisepakati || 0)}
                                    </small>
                                  </label>

                                  <label style={{ gridColumn: "1 / -1" }}>
                                    Keterangan
                                    <input
                                      type="text"
                                      value={r.keterangan || ""}
                                      onChange={(e) =>
                                        updateCell(
                                          r.id,
                                          "keterangan",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </label>
                                </div>
                              </section>

                              <section>
                                <h4>Realisasi per Bulan</h4>
                                <div className="month-grid">
                                  {monthKeys.map((k) => (
                                    <label key={k}>
                                      {monthLabels[k]}
                                      <input
                                        type="number"
                                        min={0}
                                        value={r[k] || 0}
                                        onChange={(e) =>
                                          updateCell(
                                            r.id,
                                            k,
                                            Number(e.target.value)
                                          )
                                        }
                                      />
                                    </label>
                                  ))}
                                </div>

                                <div className="hint" style={{ marginTop: 8 }}>
                                  Total Jan–Des: <strong>{idr(total)}</strong>
                                </div>
                              </section>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td className="empty" colSpan={15}>
                      Tidak ada data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

      {/* MODAL TAMBAH DATA */}
      {showAddModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}
          >
            <h3>Tambah Data IWKL</h3>

            <form
              onSubmit={addIwkl}
              className="grid"
              style={{ overflow: "auto", paddingRight: 4 }}
            >
              <label>
                Loket
                <select
                  value={newForm.loket}
                  onChange={(e) => setF("loket", e.target.value)}
                >
                  {LOKET_OPTS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Kelas
                <select
                  value={newForm.kelas}
                  onChange={(e) => setF("kelas", e.target.value)}
                >
                  {KELAS_OPTS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Nama Perusahaan
                <input
                  type="text"
                  value={newForm.namaPerusahaan}
                  onChange={(e) => setF("namaPerusahaan", e.target.value)}
                />
              </label>

              <label>
                Nama Kapal
                <input
                  type="text"
                  value={newForm.namaKapal}
                  onChange={(e) => setF("namaKapal", e.target.value)}
                />
              </label>

              <label>
                Nama Pemilik / Pengelola
                <input
                  type="text"
                  value={newForm.namaPemilik}
                  onChange={(e) => setF("namaPemilik", e.target.value)}
                />
              </label>

              <label>
                Alamat
                <input
                  type="text"
                  value={newForm.alamat}
                  onChange={(e) => setF("alamat", e.target.value)}
                />
              </label>

              <label>
                No. Kontak
                <input
                  type="tel"
                  value={newForm.noKontak}
                  onChange={(e) => setF("noKontak", e.target.value)}
                  placeholder="08xx…"
                />
              </label>

              <label>
                Tanggal Lahir
                <input
                  type="date"
                  value={newForm.tglLahir || ""}
                  onChange={(e) => setF("tglLahir", e.target.value)}
                />
              </label>

              <label>
                Kapasitas Penumpang
                <input
                  type="number"
                  min={0}
                  value={newForm.kapasitasPenumpang}
                  onChange={(e) =>
                    setF("kapasitasPenumpang", Number(e.target.value))
                  }
                />
              </label>

              <label>
                Tanggal PKS
                <input
                  type="date"
                  value={newForm.tglPKS || ""}
                  onChange={(e) => setF("tglPKS", e.target.value)}
                />
              </label>

              <label>
                Tanggal Berakhir PKS
                <input
                  type="date"
                  value={newForm.tglBerakhirPKS || ""}
                  onChange={(e) => setF("tglBerakhirPKS", e.target.value)}
                />
              </label>

              <label>
                Tanggal Addendum
                <input
                  type="date"
                  value={newForm.tglAddendum || ""}
                  onChange={(e) => setF("tglAddendum", e.target.value)}
                />
              </label>

              <label>
                Status PKS
                <select
                  value={newForm.statusPKS}
                  onChange={(e) => setF("statusPKS", e.target.value)}
                >
                  {STATUS_PKS_OPTS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status Pembayaran
                <select
                  value={newForm.statusPembayaran}
                  onChange={(e) => setF("statusPembayaran", e.target.value)}
                >
                  {STATUS_PEMB_OPTS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Status Kapal
                <select
                  value={newForm.statusKapal}
                  onChange={(e) => setF("statusKapal", e.target.value)}
                >
                  {STATUS_KAPAL_OPTS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Potensi Per Bulan (Rp)
                <input
                  type="number"
                  min={0}
                  value={newForm.potensiPerBulan}
                  onChange={(e) =>
                    setF("potensiPerBulan", Number(e.target.value))
                  }
                />
                <small className="hint">
                  {idr(newForm.potensiPerBulan || 0)}
                </small>
              </label>

              <label>
                Pas Besar / Kecil
                <select
                  value={newForm.pasBesarKecil}
                  onChange={(e) => setF("pasBesarKecil", e.target.value)}
                >
                  {PAS_OPTS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Sertifikat Keselamatan
                <select
                  value={newForm.sertifikatKeselamatan}
                  onChange={(e) =>
                    setF("sertifikatKeselamatan", e.target.value)
                  }
                >
                  {SERTIF_KSL_OPTS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Izin Trayek
                <select
                  value={newForm.izinTrayek}
                  onChange={(e) => setF("izinTrayek", e.target.value)}
                >
                  {IZIN_TRAYEK_OPTS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tgl Jatuh Tempo Sertifikat Kapal
                <input
                  type="date"
                  value={newForm.tglJatuhTempoSertifikatKeselamatan || ""}
                  onChange={(e) =>
                    setF(
                      "tglJatuhTempoSertifikatKeselamatan",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Rute Awal
                <input
                  type="text"
                  value={newForm.ruteAwal}
                  onChange={(e) => setF("ruteAwal", e.target.value)}
                />
              </label>

              <label>
                Rute Akhir
                <input
                  type="text"
                  value={newForm.ruteAkhir}
                  onChange={(e) => setF("ruteAkhir", e.target.value)}
                />
              </label>

              <label>
                Sistem Pengutipan IWKL
                <select
                  value={newForm.sistemPengutipanIWKL}
                  onChange={(e) =>
                    setF("sistemPengutipanIWKL", e.target.value)
                  }
                >
                  {SISTEM_IWKL_OPTS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Trayek
                <input
                  type="text"
                  value={newForm.trayek}
                  onChange={(e) => setF("trayek", e.target.value)}
                />
              </label>

              <label>
                Perhitungan Tarif
                <select
                  value={newForm.perhitunganTarif}
                  onChange={(e) =>
                    setF("perhitunganTarif", e.target.value)
                  }
                >
                  {PERHIT_TARIF_OPTS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tarif Borongan Disepakati (Rp)
                <input
                  type="number"
                  min={0}
                  value={newForm.tarifBoronganDisepakati}
                  onChange={(e) =>
                    setF("tarifBoronganDisepakati", Number(e.target.value))
                  }
                />
                <small className="hint">
                  {idr(newForm.tarifBoronganDisepakati || 0)}
                </small>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Keterangan
                <input
                  type="text"
                  value={newForm.keterangan}
                  onChange={(e) => setF("keterangan", e.target.value)}
                />
              </label>
            </form>

            <div className="modal-actions" style={{ marginTop: 10 }}>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setShowAddModal(false)}
              >
                Batal
              </button>
              <button className="btn primary" type="submit" onClick={addIwkl}>
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
