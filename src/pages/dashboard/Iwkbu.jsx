import React, { useMemo, useState, useEffect } from "react";
import "../../views/dashboard/Iwkbu.css";
import { supabase } from "../../lib/supabaseClient";
import * as XLSX from "xlsx";

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

const idr = (n) =>
  (Number(n) || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

/* helper: tambah ke opsi kalau belum ada (case-insensitive).
   return value yg disimpan (kadang dinaikkan ke UPPER utk konsistensi beberapa field) */
function addOptionIfMissing(
  options,
  setOptions,
  value,
  { forceUpper = false } = {}
) {
  if (value == null) return value;
  let v = String(value).trim();
  if (!v) return v;
  const exists = options.some(
    (opt) => String(opt).toLowerCase() === v.toLowerCase()
  );
  const valToPush = forceUpper ? v.toUpperCase() : v;
  if (!exists) setOptions((prev) => [...prev, valToPush]);
  return valToPush;
}

const IWKBU_BASE_KEYS = [
  "aksi",
  "no",
  "wilayah",
  "nopol",
  "tarif",
  "golongan",
  "nominal",
  "trayekNew",
  "jenis",
  "tahun",
  "pic",
  "badanHukum",
  "namaPerusahaan",
  "alamat",
  "kelurahan",
  "kecamatan",
  "kota",
  "tglTransaksi",
  "loket",
  "masaBerlaku",
  "masaSwdkllj",
  "statusBayar",
  "statusKendaraan",
  "outstanding",
  "konfirmasi",
  "hp",
  "namaPemilik",
  "nik",
  "dokPerizinan",
  "tglBayarOs",
  "nilaiBayarOs",
  "tglPemeliharaan",
  "nilaiPemeliharaanOs",
  "keterangan",
];

function useEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("employees")
          .select(
            `
            id,
            name,
            handle,
            loket,
            samsat:samsat_id (
              id,
              name,
              loket
            )
          `
          )
          .order("name", { ascending: true });
        if (!alive) return;
        if (error) throw error;
        setEmployees(data || []);
      } catch (e) {
        if (alive) {
          console.error("Load employees error:", e);
          setEmployees([]);
          setError(e.message || String(e));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { employees, loading, error };
}

export default function Iwkbu() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = usePersistentState("iwkbu:q", "");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [extraCols, setExtraCols] = usePersistentState("iwkbu:extraCols", []); // [{key,label}]
  const [showColModal, setShowColModal] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [renamingKey, setRenamingKey] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [totalNominalAll, setTotalNominalAll] = useState(0);
  const [filterWilayah, setFilterWilayah] = usePersistentState(
    "iwkbu:filter:wilayah",
    ""
  );
  const [filterLoket, setFilterLoket] = usePersistentState(
    "iwkbu:filter:loket",
    ""
  );
  const [filterTrayek, setFilterTrayek] = usePersistentState(
    "iwkbu:filter:trayek",
    ""
  );
  const [filterJenis, setFilterJenis] = usePersistentState(
    "iwkbu:filter:jenis",
    ""
  );
  const [filterPIC, setFilterPIC] = usePersistentState("iwkbu:filter:pic", "");
  const [filterBadanHukum, setFilterBadanHukum] = usePersistentState(
    "iwkbu:filter:badanHukum",
    ""
  );
  const [filterNamaPerusahaan, setFilterNamaPerusahaan] = usePersistentState(
    "iwkbu:filter:namaPerusahaan",
    ""
  );
  const [filterStatusBayar, setFilterStatusBayar] = usePersistentState(
    "iwkbu:filter:statusBayar",
    ""
  );
  const [filterStatusKendaraan, setFilterStatusKendaraan] = usePersistentState(
    "iwkbu:filter:statusKendaraan",
    ""
  );
  const [filterKonfirmasi, setFilterKonfirmasi] = usePersistentState(
    "iwkbu:filter:konfirmasi",
    ""
  );

  const [WILAYAH_FILTER_OPTS, setWilayahFilterOpts] = useState([]);
  const [LOKET_FILTER_OPTS, setLoketFilterOpts] = useState([]);
  const [TRAYEK_FILTER_OPTS, setTrayekFilterOpts] = useState([]);
  const [JENIS_FILTER_OPTS, setJenisFilterOpts] = useState([]);
  const [PIC_FILTER_OPTS, setPicFilterOpts] = useState([]);
  const [BADAN_FILTER_OPTS, setBadanFilterOpts] = useState([]);
  const [PERUSAHAAN_FILTER_OPTS, setPerusahaanFilterOpts] = useState([]);
  const [STATUS_BAYAR_FILTER_OPTS, setStatusBayarFilterOpts] = useState([]);
  const [STATUS_KEND_FILTER_OPTS, setStatusKendFilterOpts] = useState([]);
  const [KONF_FILTER_OPTS, setKonfFilterOpts] = useState([]);

  const { employees: EMP_OPTS, loading: employeesLoading } = useEmployees();

  const SAMSAT_OPTS = useMemo(() => {
    return Array.from(
      new Set((EMP_OPTS || []).map((e) => e.samsat?.name).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [EMP_OPTS]);

  const LOKET_OPTS = useMemo(() => {
    const fromRows = rows.map((r) => r.loket).filter(Boolean);
    const fromEmpSamsat = (EMP_OPTS || [])
      .map((e) => e.samsat?.name)
      .filter(Boolean);

    const uniq = Array.from(
      new Set([...fromRows, ...fromEmpSamsat].map((x) => x.trim()))
    ).sort((a, b) => a.localeCompare(b));

    return ["", ...uniq];
  }, [rows, EMP_OPTS]);

  const fromDB = (r) => ({
    id: r.id,
    wilayah: r.wilayah || "",
    nopol: r.nopol || "",
    tarif: r.tarif ?? 0,
    golongan: r.golongan || "",
    nominal: r.nominal ?? 0,
    trayekNew: r.trayek || "", // <— mapping DB.trayek -> UI.trayekNew
    jenis: r.jenis || "",
    tahun: r.tahun ?? "",
    pic: r.pic || "",
    badanHukum: r.badan_hukum || "",
    namaPerusahaan: r.nama_perusahaan || "",
    alamat: r.alamat || "",
    kelurahan: r.kelurahan || "",
    kecamatan: r.kecamatan || "",
    kota: r.kota || "",
    tglTransaksi: r.tgl_transaksi || "",
    loket: r.loket || "",
    masaBerlaku: r.masa_berlaku || "",
    masaSwdkllj: r.masa_swdkllj || "",
    statusBayar: r.status_bayar || "",
    statusKendaraan: r.status_kendaraan || "",
    outstanding: r.outstanding ?? 0,
    konfirmasi: r.konfirmasi || "",
    hp: r.hp || "",
    namaPemilik: r.nama_pemilik || "",
    nik: r.nik || "",
    dokPerizinan: r.dok_perizinan || "",
    tglBayarOs: r.tgl_bayar_os || "",
    nilaiBayarOs: r.nilai_bayar_os ?? 0,
    tglPemeliharaan: r.tgl_pemeliharaan || "",
    nilaiPemeliharaanOs: r.nilai_pemeliharaan_os ?? 0,
    keterangan: r.keterangan || "",
  });

  const toDB = (r) => ({
    wilayah: r.wilayah,
    nopol: r.nopol,
    tarif: Number(r.tarif || 0),
    golongan: r.golongan || null,
    nominal: Number(String(r.nominal || 0).replace(/[^\d]/g, "")),
    trayek: r.trayekNew || null, // <— mapping UI.trayekNew -> DB.trayek
    jenis: r.jenis || null,
    tahun: r.tahun ? Number(r.tahun) : null,
    pic: r.pic || null,
    badan_hukum: r.badanHukum || null,
    nama_perusahaan: r.namaPerusahaan || null,
    alamat: r.alamat || null,
    kelurahan: r.kelurahan || null,
    kecamatan: r.kecamatan || null,
    kota: r.kota || null,
    tgl_transaksi: r.tglTransaksi || null,
    loket: r.loket || null,
    masa_berlaku: r.masaBerlaku || null,
    masa_swdkllj: r.masaSwdkllj || null,
    status_bayar: r.statusBayar || null,
    status_kendaraan: r.statusKendaraan || null,
    outstanding: Number(r.outstanding || 0),
    konfirmasi: r.konfirmasi || null,
    hp: r.hp || null,
    nama_pemilik: r.namaPemilik || null,
    nik: r.nik || null,
    dok_perizinan: r.dokPerizinan || null,
    tgl_bayar_os: r.tglBayarOs || null,
    nilai_bayar_os: Number(r.nilaiBayarOs || 0),
    tgl_pemeliharaan: r.tglPemeliharaan || null,
    nilai_pemeliharaan_os: Number(r.nilaiPemeliharaanOs || 0),
    keterangan: r.keterangan || null,
  });

  const exportToExcel = async () => {
    try {
      const PAGE_SIZE = 1000; // batas Supabase
      let page = 0;
      let allRows = [];
      let isDone = false;

      while (!isDone) {
        let query = supabase
          .from("iwkbu")
          .select("*")
          .order("id", { ascending: true })
          .range(
            page * PAGE_SIZE,
            page * PAGE_SIZE + PAGE_SIZE - 1
          );

        // 🔹 FILTER SAMA PERSIS DENGAN TABEL
        if (filterWilayah) query = query.eq("wilayah_norm", filterWilayah);
        if (filterLoket) query = query.eq("loket", filterLoket);
        if (filterTrayek) query = query.eq("trayek", filterTrayek);
        if (filterJenis) query = query.eq("jenis", filterJenis);
        if (filterPIC) query = query.eq("pic", filterPIC);
        if (filterBadanHukum) query = query.eq("badan_hukum", filterBadanHukum);
        if (filterNamaPerusahaan)
          query = query.ilike("nama_perusahaan", `%${filterNamaPerusahaan}%`);
        if (filterStatusBayar)
          query = query.ilike("status_bayar", filterStatusBayar);
        if (filterStatusKendaraan)
          query = query.ilike("status_kendaraan", filterStatusKendaraan);
        if (filterKonfirmasi)
          query = query.eq("konfirmasi", filterKonfirmasi);

        const { data, error } = await query;
        if (error) throw error;

        allRows.push(...(data || []));

        // ❗ kalau data < 1000 artinya SUDAH HABIS
        if (!data || data.length < PAGE_SIZE) {
          isDone = true;
        } else {
          page++;
        }
      }

      if (allRows.length === 0) {
        alert("Tidak ada data untuk di-export");
        return;
      }

      // 🔹 FORMAT EXCEL
      const excelData = allRows.map((r, i) => ({
        No: i + 1,
        Wilayah: r.wilayah,
        "Nomor Polisi": r.nopol,
        Tarif: r.tarif,
        Golongan: r.golongan,
        "Nominal IWKBU": r.nominal,
        Trayek: r.trayek,
        Jenis: r.jenis,
        Tahun: r.tahun,
        PIC: r.pic,
        "Badan Hukum": r.badan_hukum,
        "Nama Perusahaan": r.nama_perusahaan,
        Kota: r.kota,
        Loket: r.loket,
        "Status Bayar": r.status_bayar,
        Outstanding: r.outstanding,
        Keterangan: r.keterangan,
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data IWKBU");

      XLSX.writeFile(
        wb,
        `Data_IWKBU_SEMUA_${new Date().toISOString().slice(0, 10)}.xlsx`
      );

    } catch (err) {
      console.error(err);
      alert("Gagal export semua data");
    }
  };

  const fetchTotalNominal = async () => {
    try {
      const PAGE_SIZE = 1000; // batas supabase
      let page = 0;
      let isDone = false;
      let grandTotal = 0;
      let totalRows = 0;

      while (!isDone) {
        let query = buildBaseQuery()
          .select("nominal")
          .order("id", { ascending: true })
          .range(
            page * PAGE_SIZE,
            page * PAGE_SIZE + PAGE_SIZE - 1
          );

        const { data, error } = await query;
        if (error) throw error;

        const rows = data || [];

        // jumlahkan per page
        for (const r of rows) {
          grandTotal += Number(r.nominal || 0);
        }

        totalRows += rows.length;

        // kalau < 1000 berarti sudah habis
        if (rows.length < PAGE_SIZE) {
          isDone = true;
        } else {
          page++;
        }
      }

      console.log("TOTAL rows (ALL):", totalRows);
      console.log("TABLE count:", totalCount);

      setTotalNominalAll(grandTotal);
    } catch (e) {
      console.error("fetchTotalNominal error:", e);
      setTotalNominalAll(0);
    }
  };

  //Hitung Total Nominal
  const totalNominal = rows.reduce((sum, r) => sum + Number(r.nominal || 0), 0);

  const fetchFilterOptions = async () => {
    try {
      const PAGE_SIZE = 1000;
      let page = 0;
      let isDone = false;
      let allRows = [];

      while (!isDone) {
        const { data, error } = await supabase
          .from("iwkbu")
          .select(
            "wilayah_norm, loket, trayek, jenis, pic, badan_hukum, nama_perusahaan, status_bayar, status_kendaraan, konfirmasi"
          )
          .range(
            page * PAGE_SIZE,
            page * PAGE_SIZE + PAGE_SIZE - 1
          );

        if (error) throw error;

        const rows = data || [];
        allRows.push(...rows);

        if (rows.length < PAGE_SIZE) {
          isDone = true;
        } else {
          page++;
        }
      }

      console.log("FILTER SOURCE rows (ALL):", allRows.length);

      // helper uniq aman
      const safeUniq = (arr, { upper = false } = {}) =>
        Array.from(
          new Set(
            (arr || [])
              .map((x) => (x == null ? "" : String(x).trim()))
              .filter(Boolean)
              .map((x) => (upper ? x.toUpperCase() : x))
          )
        ).sort((a, b) => a.localeCompare(b));

      // 🔥 SET SEMUA FILTER (FULL DATA)
      setWilayahFilterOpts(
        safeUniq(allRows.map((x) => x.wilayah_norm), { upper: true })
      );

      setLoketFilterOpts(
        safeUniq(allRows.map((x) => x.loket))
      );

      setTrayekFilterOpts(
        safeUniq(allRows.map((x) => x.trayek), { upper: true })
      );

      setJenisFilterOpts(
        safeUniq(allRows.map((x) => x.jenis), { upper: true })
      );

      const picUniqDB = safeUniq(allRows.map((x) => x.pic));
      const picUniqEmp = safeUniq((EMP_OPTS || []).map((e) => e.name));
      setPicFilterOpts(
        safeUniq([...picUniqDB, ...picUniqEmp])
      );

      setBadanFilterOpts(
        safeUniq(allRows.map((x) => x.badan_hukum))
      );

      setPerusahaanFilterOpts(
        safeUniq(allRows.map((x) => x.nama_perusahaan))
      );

      setStatusBayarFilterOpts(
        safeUniq(allRows.map((x) => x.status_bayar))
      );

      setStatusKendFilterOpts(
        safeUniq(allRows.map((x) => x.status_kendaraan))
      );

      setKonfFilterOpts(
        safeUniq(allRows.map((x) => x.konfirmasi))
      );

    } catch (e) {
      console.error("fetchFilterOptions error:", e);
      setWilayahFilterOpts([]);
      setLoketFilterOpts([]);
      setTrayekFilterOpts([]);
      setJenisFilterOpts([]);
      setPicFilterOpts([]);
      setBadanFilterOpts([]);
      setPerusahaanFilterOpts([]);
      setStatusBayarFilterOpts([]);
      setStatusKendFilterOpts([]);
      setKonfFilterOpts([]);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, [EMP_OPTS?.length]);

  const buildBaseQuery = () => {
    let query = supabase
      .from("iwkbu")
      .select("*", { count: "exact" });

    const s = (q || "").trim();

    if (s) {
      query = query.or(
        [
          `nopol.ilike.%${s}%`,
          `wilayah_norm.ilike.%${s}%`,
          `kota.ilike.%${s}%`,
          `trayek.ilike.%${s}%`,
          `nama_perusahaan.ilike.%${s}%`,
          `pic.ilike.%${s}%`,
        ].join(",")
      );
    }

    // 🎯 filters
    if (filterWilayah) query = query.eq("wilayah_norm", filterWilayah);
    if (filterLoket) query = query.eq("loket", filterLoket);
    if (filterTrayek) query = query.eq("trayek", filterTrayek);
    if (filterJenis) query = query.eq("jenis", filterJenis);
    if (filterPIC) query = query.eq("pic", filterPIC);
    if (filterBadanHukum) query = query.eq("badan_hukum", filterBadanHukum);

    if (filterNamaPerusahaan)
      query = query.ilike("nama_perusahaan", `%${filterNamaPerusahaan}%`);

    if (filterStatusBayar)
      query = query.ilike("status_bayar", filterStatusBayar);

    if (filterStatusKendaraan)
      query = query.ilike("status_kendaraan", filterStatusKendaraan);

    if (filterKonfirmasi)
      query = query.eq("konfirmasi", filterKonfirmasi);

    return query;
  };

  const fetchRows = async () => {
    setLoadingRows(true);
    try {
      let query = buildBaseQuery().order("id", { ascending: false });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      setRows((data || []).map(fromDB));
      setTotalCount(count || 0);
    } catch (e) {
      console.error(e);
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoadingRows(false);
    }
  };

  // helper bikin key aman dari label
  const makeKeyFromLabel = (label) =>
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+(\w)/g, (_, c) => c.toUpperCase())
      .replace(/[^a-z0-9]/g, "");

  const [WILAYAH_OPTS, setWilayahOpts] = usePersistentState("iwkbu:opts:wilayah",[]);
  const [TRAYEK_OPTS, setTrayekOpts] = usePersistentState("iwkbu:opts:trayek", []);
  const [JENIS_OPTS, setJenisOpts] = usePersistentState("iwkbu:opts:jenis", []);
  const [BADAN_HUKUM_OPTS, setBadanOpts] = usePersistentState("iwkbu:opts:badan", []);
  const [STATUS_BAYAR_OPTS, setStatusBayarOpts] = usePersistentState("iwkbu:opts:statusBayar", []);
  const [STATUS_KENDARAAN_OPTS, setStatusKendaraanOpts] = usePersistentState("iwkbu:opts:statusKend", []);
  const [GOLONGAN_OPTS, setGolonganOpts] = usePersistentState("iwkbu:opts:golongan", []);
  const [DOK_PERIZINAN_OPTS, setDokPerizinanOpts] = usePersistentState("iwkbu:opts:dokPerizinan", []);
  const [HASIL_KONF_OPTS, setHasilKonfOpts] = usePersistentState("iwkbu:opts:hasilKonf", []);

  useEffect(() => {
    if (WILAYAH_FILTER_OPTS.length) {
      setWilayahOpts(WILAYAH_FILTER_OPTS);
    }
  }, [WILAYAH_FILTER_OPTS]);
  
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
    tahun: "",
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
    namaPemilik: "",
    nik: "",
    dokPerizinan: DOK_PERIZINAN_OPTS[0] || "",
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

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    fetchRows();
    fetchTotalNominal();
  }, [
    page,
    q,
    filterWilayah,
    filterLoket,
    filterTrayek,
    filterJenis,
    filterPIC,
    filterBadanHukum,
    filterNamaPerusahaan,
    filterStatusBayar,
    filterStatusKendaraan,
    filterKonfirmasi,
  ]);

  const totalPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageData = rows;

  const addNopol = async (e) => {
    e?.preventDefault?.();
    if (!newForm.nopol.trim()) return;

    const wilayahSaved = addOptionIfMissing(
      WILAYAH_OPTS,
      setWilayahOpts,
      newForm.wilayah,
      { forceUpper: true }
    );
    const trayekSaved = addOptionIfMissing(
      TRAYEK_OPTS,
      setTrayekOpts,
      newForm.trayekNew
    );
    const jenisSaved = addOptionIfMissing(
      JENIS_OPTS,
      setJenisOpts,
      newForm.jenis
    );
    const badanSaved = addOptionIfMissing(
      BADAN_HUKUM_OPTS,
      setBadanOpts,
      newForm.badanHukum
    );
    const statusBaySaved = addOptionIfMissing(
      STATUS_BAYAR_OPTS,
      setStatusBayarOpts,
      newForm.statusBayar
    );
    const statusKenSaved = addOptionIfMissing(
      STATUS_KENDARAAN_OPTS,
      setStatusKendaraanOpts,
      newForm.statusKendaraan
    );
    const golSaved = addOptionIfMissing(
      GOLONGAN_OPTS,
      setGolonganOpts,
      newForm.golongan
    );
    const dokSaved = addOptionIfMissing(
      DOK_PERIZINAN_OPTS,
      setDokPerizinanOpts,
      newForm.dokPerizinan
    );
    addOptionIfMissing(
      HASIL_KONF_OPTS,
      setHasilKonfOpts,
      newForm.konfirmasi || ""
    );

    const next = {
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
      kota: newForm.kota || wilayahSaved,
    };

    const payload = toDB(next);
    const { error } = await supabase.from("iwkbu").insert(payload);
    if (error) {
      alert("Gagal tambah data: " + error.message);
      return;
    }

    setShowNopolModal(false);
    setNewForm(emptyForm);
    setPage(1);
    fetchRows();
    fetchFilterOptions();
  };

  const saveCell = async (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );

    const patchUI = { [field]: value };
    const patchDB = toDB({ ...rows.find((r) => r.id === id), ...patchUI });

    let dbField = field;
    if (field === "trayekNew") dbField = "trayek";
    if (field === "badanHukum") dbField = "badan_hukum";
    if (field === "namaPerusahaan") dbField = "nama_perusahaan";
    if (field === "tglTransaksi") dbField = "tgl_transaksi";
    if (field === "masaBerlaku") dbField = "masa_berlaku";
    if (field === "masaSwdkllj") dbField = "masa_swdkllj";
    if (field === "statusBayar") dbField = "status_bayar";
    if (field === "statusKendaraan") dbField = "status_kendaraan";
    if (field === "namaPemilik") dbField = "nama_pemilik";
    if (field === "dokPerizinan") dbField = "dok_perizinan";
    if (field === "tglBayarOs") dbField = "tgl_bayar_os";
    if (field === "nilaiBayarOs") dbField = "nilai_bayar_os";
    if (field === "tglPemeliharaan") dbField = "tgl_pemeliharaan";
    if (field === "nilaiPemeliharaanOs") dbField = "nilai_pemeliharaan_os";

    const patch = { [dbField]: patchDB[dbField] };

    const { error } = await supabase.from("iwkbu").update(patch).eq("id", id);
    if (error) {
      alert("Gagal menyimpan: " + error.message);
      fetchRows();
    } else {
      fetchFilterOptions();
    }
  };

  const openNominalFor = (rowId, current) => {
    setEditingRowId(rowId);
    setNominalInput(String(current ?? 0));
    setShowNominalModal(true);
  };

  const saveNominal = async () => {
    const val = Number(String(nominalInput).replace(/[^\d]/g, ""));
    await saveCell(editingRowId, "nominal", val);
    setShowNominalModal(false);
    setEditingRowId(null);
  };

  const updateRow = (id, patch) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const deleteRow = async (id) => {
    if (!window.confirm("Hapus baris ini?")) return;
    const { error } = await supabase.from("iwkbu").delete().eq("id", id);
    if (error) {
      alert("Gagal hapus: " + error.message);
      return;
    }
    fetchRows();
    fetchFilterOptions();
  };

  return (
    <div className="iwkbu-wrap">
      <div className="iwkbu-clouds" aria-hidden />

      <header className="iwkbu-header">
        <div className="title">
          <span role="img" aria-label="bus" className="emoji">
            🚌
          </span>
          <h1>Data IWKBU</h1>
        </div>

        <div className="actions">
          {/* ROW ATAS */}
          <div className="actions-row top">
            <input
              className="search"
              placeholder="Cari nopol / wilayah / kota / trayek / perusahaan / PIC…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />

            <button
              className="btn primary"
              onClick={() => {
                setNewForm(emptyForm);
                setShowNopolModal(true);
              }}
            >
              + Tambah Nomor Polisi
            </button>
            <button className="btn ghost" onClick={exportToExcel}>
              📥 Export Excel
            </button>
          </div>

          {/* ROW BAWAH */}
          <div className="actions-row bottom">
            <button
              className="btn ghost"
              onClick={() => {
                setQ("");
                setFilterWilayah("");
                setFilterLoket("");
                setFilterTrayek("");
                setFilterJenis("");
                setFilterPIC("");
                setFilterBadanHukum("");
                setFilterNamaPerusahaan("");
                setFilterStatusBayar("");
                setFilterStatusKendaraan("");
                setFilterKonfirmasi("");
                setPage(1);
              }}
            >
              Reset Filter
            </button>

            {/* --- Baris 1 --- */}
            <select
              className="select-filter"
              value={filterWilayah}
              onChange={(e) => {
                setFilterWilayah(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Wilayah</option>
              {WILAYAH_FILTER_OPTS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>

            <select
              className="select-filter"
              value={filterLoket}
              onChange={(e) => {
                setFilterLoket(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Loket</option>
              {LOKET_FILTER_OPTS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              className="select-filter"
              value={filterTrayek}
              onChange={(e) => {
                setFilterTrayek(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Trayek</option>
              {TRAYEK_FILTER_OPTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              className="select-filter"
              value={filterJenis}
              onChange={(e) => {
                setFilterJenis(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Jenis</option>
              {JENIS_FILTER_OPTS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>

            {/* --- Baris 2 --- */}
            <select
              className="select-filter"
              value={filterPIC}
              onChange={(e) => {
                setFilterPIC(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua PIC</option>
              {PIC_FILTER_OPTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              className="select-filter"
              value={filterBadanHukum}
              onChange={(e) => {
                setFilterBadanHukum(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Badan</option>
              {BADAN_FILTER_OPTS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              className="select-filter"
              value={filterStatusBayar}
              onChange={(e) => {
                setFilterStatusBayar(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Status Bayar</option>
              {STATUS_BAYAR_FILTER_OPTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="select-filter"
              value={filterStatusKendaraan}
              onChange={(e) => {
                setFilterStatusKendaraan(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Status Kendaraan</option>
              {STATUS_KEND_FILTER_OPTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="select-filter"
              value={filterKonfirmasi}
              onChange={(e) => {
                setFilterKonfirmasi(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Hasil Konfirmasi</option>
              {KONF_FILTER_OPTS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>

            {/* Nama Perusahaan (dropdown searchable versi simple) */}
            <select
              className="select-filter"
              value={filterNamaPerusahaan}
              onChange={(e) => {
                setFilterNamaPerusahaan(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua Perusahaan</option>
              {PERUSAHAAN_FILTER_OPTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="table-card">
        <div className="table-scroll">
          <table className="kawaii-table">
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
                    {/* bagian ring control & rename tetap seperti punyamu */}
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => (
                <tr key={r.id}>
                  {/* Aksi */}
                  <td>
                    <button
                      className="btn danger ghost xs"
                      onClick={() => deleteRow(r.id)}
                    >
                      Hapus
                    </button>
                  </td>

                  {/* No */}
                  <td>{(page - 1) * pageSize + i + 1}</td>

                  {/* Wilayah */}
                  <td>
                    <input
                      list="wilayah-list"
                      value={r.wilayah}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(
                          WILAYAH_OPTS,
                          setWilayahOpts,
                          e.target.value,
                          { forceUpper: true }
                        );
                        updateRow(r.id, { wilayah: saved });
                      }}
                      onBlur={(e) => {
                        const saved = addOptionIfMissing(
                          WILAYAH_OPTS,
                          setWilayahOpts,
                          e.target.value,
                          { forceUpper: true }
                        );
                        saveCell(r.id, "wilayah", saved);
                      }}
                    />
                    <datalist id="wilayah-list">
                      {WILAYAH_OPTS.map((w) => (
                        <option key={w} value={w} />
                      ))}
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
                      onChange={(e) =>
                        updateRow(r.id, {
                          tarif:
                            e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                      onBlur={(e) =>
                        saveCell(
                          r.id,
                          "tarif",
                          e.target.value === "" ? 0 : Number(e.target.value)
                        )
                      }
                    />
                    <div className="hint">{idr(r.tarif)}</div>
                  </td>

                  {/* Golongan */}
                  <td>
                    <input
                      list="golongan-list"
                      value={r.golongan || ""}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(
                          GOLONGAN_OPTS,
                          setGolonganOpts,
                          e.target.value
                        );
                        updateRow(r.id, { golongan: saved });
                      }}
                      onBlur={(e) => {
                        const saved = addOptionIfMissing(
                          GOLONGAN_OPTS,
                          setGolonganOpts,
                          e.target.value
                        );
                        saveCell(r.id, "golongan", saved);
                      }}
                    />
                    <datalist id="golongan-list">
                      {GOLONGAN_OPTS.map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                  </td>

                  {/* Nominal IWKBU */}
                  <td>
                    <button
                      className="link-btn"
                      onClick={() => openNominalFor(r.id, r.nominal)}
                    >
                      {r.nominal ? idr(r.nominal) : "Atur"}
                    </button>
                  </td>

                  {/* Trayek */}
                  <td>
                    <input
                      list="trayek-list"
                      value={r.trayekNew}
                      onChange={(e) =>
                        updateRow(r.id, { trayekNew: e.target.value })
                      }
                      onBlur={(e) =>
                        saveCell(r.id, "trayekNew", e.target.value)
                      }
                    />
                    <datalist id="trayek-list">
                      {TRAYEK_OPTS.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </td>

                  {/* Jenis */}
                  <td>
                    <input
                      list="jenis-list"
                      value={r.jenis}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(
                          JENIS_OPTS,
                          setJenisOpts,
                          e.target.value
                        );
                        updateRow(r.id, { jenis: saved });
                      }}
                      onBlur={(e) => {
                        const saved = addOptionIfMissing(
                          JENIS_OPTS,
                          setJenisOpts,
                          e.target.value
                        );
                        saveCell(r.id, "jenis", saved);
                      }}
                    />
                    <datalist id="jenis-list">
                      {JENIS_OPTS.map((j) => (
                        <option key={j} value={j} />
                      ))}
                    </datalist>
                  </td>

                  {/* Tahun */}
                  <td>
                    <input
                      className="num"
                      type="number"
                      min="1900"
                      max="2100"
                      placeholder="cth: 2015"
                      value={r.tahun ?? ""}
                      onChange={(e) =>
                        updateRow(r.id, {
                          tahun:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      onBlur={(e) =>
                        saveCell(
                          r.id,
                          "tahun",
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                    />
                  </td>

                  {/* PIC */}
                  <td>
                    <input
                      list="pic-list"
                      type="text"
                      value={r.pic || ""}
                      onChange={(e) => {
                        const picName = e.target.value;
                        const emp = EMP_OPTS.find(
                          (x) => x.name.toLowerCase() === picName.toLowerCase()
                        );
                        updateRow(r.id, {
                          pic: picName,
                          loket: emp?.samsat?.name ?? "",
                        });
                      }}
                      onBlur={(e) => {
                        const picName = e.target.value;

                        const emp = EMP_OPTS.find(
                          (x) => x.name.toLowerCase() === picName.toLowerCase()
                        );

                        saveCell(r.id, "pic", picName);

                        if (emp?.samsat?.name) {
                          saveCell(r.id, "loket", emp.samsat.name);
                        }
                      }}
                      placeholder="Pilih PIC"
                    />
                  </td>

                  {/* Badan Hukum */}
                  <td>
                    <input
                      list="badan-list"
                      value={r.badanHukum}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(
                          BADAN_HUKUM_OPTS,
                          setBadanOpts,
                          e.target.value
                        );
                        updateRow(r.id, { badanHukum: saved });
                      }}
                      onBlur={(e) => {
                        const saved = addOptionIfMissing(
                          BADAN_HUKUM_OPTS,
                          setBadanOpts,
                          e.target.value
                        );
                        saveCell(r.id, "badanHukum", saved);
                      }}
                    />
                    <datalist id="badan-list">
                      {BADAN_HUKUM_OPTS.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </td>

                  {/* Nama Perusahaan */}
                  <td>
                    <input
                      type="text"
                      value={r.namaPerusahaan}
                      onChange={(e) =>
                        updateRow(r.id, { namaPerusahaan: e.target.value })
                      }
                      onBlur={(e) =>
                        saveCell(r.id, "namaPerusahaan", e.target.value)
                      }
                      placeholder={
                        r.badanHukum?.toUpperCase?.() === "BH"
                          ? "Nama PT/CV"
                          : "—"
                      }
                      disabled={r.badanHukum?.toUpperCase?.() !== "BH"}
                    />
                  </td>

                  {/* Alamat */}
                  <td>
                    <input
                      type="text"
                      value={r.alamat}
                      onChange={(e) =>
                        updateRow(r.id, { alamat: e.target.value })
                      }
                      onBlur={(e) => saveCell(r.id, "alamat", e.target.value)}
                      placeholder="Alamat lengkap"
                    />
                  </td>

                  {/* Kelurahan */}
                  <td>
                    <input
                      type="text"
                      value={r.kelurahan}
                      onChange={(e) =>
                        updateRow(r.id, { kelurahan: e.target.value })
                      }
                      onBlur={(e) =>
                        saveCell(r.id, "kelurahan", e.target.value)
                      }
                    />
                  </td>

                  {/* Kecamatan */}
                  <td>
                    <input
                      type="text"
                      value={r.kecamatan}
                      onChange={(e) =>
                        updateRow(r.id, { kecamatan: e.target.value })
                      }
                      onBlur={(e) =>
                        saveCell(r.id, "kecamatan", e.target.value)
                      }
                    />
                  </td>

                  {/* Kota */}
                  <td>
                    <input
                      type="text"
                      value={r.kota}
                      onChange={(e) =>
                        updateRow(r.id, { kota: e.target.value })
                      }
                      onBlur={(e) => saveCell(r.id, "kota", e.target.value)}
                    />
                  </td>

                  {/* Tanggal Transaksi */}
                  <td>
                    <input
                      type="date"
                      value={r.tglTransaksi || ""}
                      onChange={(e) =>
                        updateRow(r.id, { tglTransaksi: e.target.value })
                      }
                      onBlur={(e) =>
                        saveCell(r.id, "tglTransaksi", e.target.value)
                      }
                    />
                  </td>

                  {/* Loket */}
                  <td>
                    <input
                      list="loket-list"
                      type="text"
                      value={r.loket || ""}
                      onChange={(e) =>
                        updateRow(r.id, { loket: e.target.value })
                      }
                      onBlur={(e) => {
                        const val = e.target.value;
                        saveCell(r.id, "loket", val);
                      }}
                      placeholder="Pilih / ketik samsat"
                    />

                    <datalist id="loket-list">
                      {LOKET_OPTS.map((l) => (
                        <option key={l} value={l} />
                      ))}
                    </datalist>
                  </td>

                  {/* Masa Berlaku IWKBU */}
                  <td>
                    <input
                      type="date"
                      value={r.masaBerlaku || ""}
                      onChange={(e) =>
                        updateRow(r.id, { masaBerlaku: e.target.value })
                      }
                      onBlur={(e) =>
                        saveCell(r.id, "masaBerlaku", e.target.value)
                      }
                    />
                  </td>

                  {/* Masa Laku SWDKLLJ */}
                  <td>
                    <input
                      type="date"
                      value={r.masaSwdkllj || ""}
                      onChange={(e) =>
                        updateRow(r.id, { masaSwdkllj: e.target.value })
                      }
                      onBlur={(e) =>
                        saveCell(r.id, "masaSwdkllj", e.target.value)
                      }
                    />
                  </td>

                  {/* Status Pembayaran */}
                  <td>
                    <input
                      list="status-bayar-list"
                      value={r.statusBayar}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(
                          STATUS_BAYAR_OPTS,
                          setStatusBayarOpts,
                          e.target.value
                        );
                        updateRow(r.id, { statusBayar: saved });
                      }}
                      onBlur={(e) => {
                        const saved = addOptionIfMissing(
                          STATUS_BAYAR_OPTS,
                          setStatusBayarOpts,
                          e.target.value
                        );
                        saveCell(r.id, "statusBayar", saved);
                      }}
                    />
                    <datalist id="status-bayar-list">
                      {STATUS_BAYAR_OPTS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </td>

                  {/* Status Kendaraan */}
                  <td>
                    <input
                      list="status-kend-list"
                      value={r.statusKendaraan}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(
                          STATUS_KENDARAAN_OPTS,
                          setStatusKendaraanOpts,
                          e.target.value
                        );
                        updateRow(r.id, { statusKendaraan: saved });
                      }}
                      onBlur={(e) => {
                        const saved = addOptionIfMissing(
                          STATUS_KENDARAAN_OPTS,
                          setStatusKendaraanOpts,
                          e.target.value
                        );
                        saveCell(r.id, "statusKendaraan", saved);
                      }}
                    />
                    <datalist id="status-kend-list">
                      {STATUS_KENDARAAN_OPTS.map((s) => (
                        <option key={s} value={s} />
                      ))}
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
                        updateRow(r.id, {
                          outstanding: Number(e.target.value || 0),
                        })
                      }
                      onBlur={(e) =>
                        saveCell(
                          r.id,
                          "outstanding",
                          Number(e.target.value || 0)
                        )
                      }
                    />
                    <div className="hint">{idr(r.outstanding)}</div>
                  </td>

                  {/* Hasil Konfirmasi */}
                  <td>
                    <input
                      list="hasil-konf-list"
                      value={r.konfirmasi || ""}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(
                          HASIL_KONF_OPTS,
                          setHasilKonfOpts,
                          e.target.value
                        );
                        updateRow(r.id, { konfirmasi: saved });
                      }}
                      onBlur={(e) => {
                        const saved = addOptionIfMissing(
                          HASIL_KONF_OPTS,
                          setHasilKonfOpts,
                          e.target.value
                        );
                        saveCell(r.id, "konfirmasi", saved);
                      }}
                      placeholder="Catatan/hasil"
                    />
                    <datalist id="hasil-konf-list">
                      {HASIL_KONF_OPTS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                    <datalist id="pic-list">
                      {EMP_OPTS.map((emp) => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name}
                          {emp.samsat?.name ? ` — ${emp.samsat.name}` : ""}
                          {emp.handle ? ` (@${emp.handle})` : ""}
                        </option>
                      ))}
                    </datalist>
                  </td>

                  {/* No HP */}
                  <td>
                    <input
                      type="tel"
                      value={r.hp}
                      onChange={(e) => updateRow(r.id, { hp: e.target.value })}
                      onBlur={(e) => saveCell(r.id, "hp", e.target.value)}
                      placeholder="08xx…"
                      pattern="[0-9+\\-\\s]+"
                    />
                  </td>

                  {/* Nama Pemilik/Pengelola */}
                  <td>
                    <input
                      type="text"
                      value={r.namaPemilik || ""}
                      onChange={(e) =>
                        updateRow(r.id, { namaPemilik: e.target.value })
                      }
                      onBlur={(e) =>
                        saveCell(r.id, "namaPemilik", e.target.value)
                      }
                    />
                  </td>

                  {/* NIK */}
                  <td>
                    <input
                      type="text"
                      value={r.nik || ""}
                      onChange={(e) => updateRow(r.id, { nik: e.target.value })}
                      onBlur={(e) => saveCell(r.id, "nik", e.target.value)}
                    />
                  </td>

                  {/* Dok Perizinan */}
                  <td>
                    <input
                      list="dok-perizinan-list"
                      value={r.dokPerizinan || ""}
                      onChange={(e) => {
                        const saved = addOptionIfMissing(
                          DOK_PERIZINAN_OPTS,
                          setDokPerizinanOpts,
                          e.target.value
                        );
                        updateRow(r.id, { dokPerizinan: saved });
                      }}
                      onBlur={(e) => {
                        const saved = addOptionIfMissing(
                          DOK_PERIZINAN_OPTS,
                          setDokPerizinanOpts,
                          e.target.value
                        );
                        saveCell(r.id, "dokPerizinan", saved);
                      }}
                    />
                    <datalist id="dok-perizinan-list">
                      {DOK_PERIZINAN_OPTS.map((d) => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  </td>

                  {/* Tgl Bayar OS */}
                  <td>
                    <input
                      type="date"
                      value={r.tglBayarOs || ""}
                      onChange={(e) =>
                        updateRow(r.id, { tglBayarOs: e.target.value })
                      }
                      onBlur={(e) =>
                        saveCell(r.id, "tglBayarOs", e.target.value)
                      }
                    />
                  </td>

                  {/* Nilai Bayar OS */}
                  <td>
                    <input
                      className="num"
                      type="number"
                      min={0}
                      value={r.nilaiBayarOs || 0}
                      onChange={(e) =>
                        updateRow(r.id, {
                          nilaiBayarOs: Number(e.target.value || 0),
                        })
                      }
                      onBlur={(e) =>
                        saveCell(
                          r.id,
                          "nilaiBayarOs",
                          Number(e.target.value || 0)
                        )
                      }
                    />
                    <div className="hint">{idr(r.nilaiBayarOs || 0)}</div>
                  </td>

                  {/* Tgl Pemeliharaan */}
                  <td>
                    <input
                      type="date"
                      value={r.tglPemeliharaan || ""}
                      onChange={(e) =>
                        updateRow(r.id, { tglPemeliharaan: e.target.value })
                      }
                      onBlur={(e) =>
                        saveCell(r.id, "tglPemeliharaan", e.target.value)
                      }
                    />
                  </td>

                  {/* Nilai Pemeliharaan */}
                  <td>
                    <input
                      className="num"
                      type="number"
                      min={0}
                      value={r.nilaiPemeliharaanOs || 0}
                      onChange={(e) =>
                        updateRow(r.id, {
                          nilaiPemeliharaanOs: Number(e.target.value || 0),
                        })
                      }
                      onBlur={(e) =>
                        saveCell(
                          r.id,
                          "nilaiPemeliharaanOs",
                          Number(e.target.value || 0)
                        )
                      }
                    />
                    <div className="hint">
                      {idr(r.nilaiPemeliharaanOs || 0)}
                    </div>
                  </td>

                  {/* Keterangan */}
                  <td>
                    <input
                      type="text"
                      value={r.keterangan || ""}
                      onChange={(e) =>
                        updateRow(r.id, { keterangan: e.target.value })
                      }
                      onBlur={(e) =>
                        saveCell(r.id, "keterangan", e.target.value)
                      }
                    />
                  </td>

                  {/* Kolom dinamis */}
                  {extraCols.map((c) => (
                    <td key={`c-extra-${r.id}-${c.key}`}>
                      <input
                        type="text"
                        value={r[c.key] ?? ""}
                        onChange={(e) =>
                          updateRow(r.id, { [c.key]: e.target.value })
                        }
                        // kalau mau disimpan ke Supabase juga, perlu kolom di DB & mapping sendiri
                        placeholder={c.label}
                      />
                    </td>
                  ))}
                </tr>
              ))}

              {pageData.length === 0 && (
                <tr>
                  <td colSpan={35} className="empty">
                    Tidak ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="df-summary">
            <div
              style={{
                padding: "4px 8px",
                borderRadius: "8px",
                background: "#fff4e5",
                border: "1px solid #ffd8a8",
                fontWeight: 600,
              }}
            >
              🧾 Total IWKBU: <b>{idr(totalNominalAll)}</b>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="pager">
          {/* ⏮ First */}
          <button
            className="btn ghost"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            ⏮ First
          </button>

          {/* ‹ Prev */}
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

          {/* Next › */}
          <button
            className="btn ghost"
            onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
            disabled={page >= totalPage}
          >
            Next ›
          </button>

          {/* ⏭ Last */}
          <button
            className="btn ghost"
            onClick={() => setPage(totalPage)}
            disabled={page === totalPage}
          >
            Last ⏭
          </button>
        </div>
      </div>

      {/* Modal: Tambah Nomor Polisi */}
      {showNopolModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowNopolModal(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h3>Tambah Nomor Polisi</h3>

            <form
              onSubmit={addNopol}
              className="grid"
              style={{ overflow: "auto", paddingRight: 4 }}
            >
              {/* Data Kendaraan */}
              <label>
                Wilayah
                <input
                  list="wilayah-list-modal"
                  value={newForm.wilayah}
                  onChange={(e) => setF("wilayah", e.target.value)}
                />
                <datalist id="wilayah-list-modal">
                  {WILAYAH_OPTS.map((w) => (
                    <option key={w} value={w} />
                  ))}
                </datalist>
              </label>

              <label>
                Nomor Polisi
                <input
                  type="text"
                  value={newForm.nopol}
                  onChange={(e) => setF("nopol", e.target.value)}
                  placeholder="BM 1234 TU"
                  required
                />
              </label>

              <label>
                Tarif
                <input
                  type="number"
                  min={0}
                  value={newForm.tarif === 0 ? "" : newForm.tarif}
                  onChange={(e) => {
                    const val = e.target.value;
                    setF("tarif", val === "" ? 0 : Number(val));
                  }}
                />
                <small className="hint">{idr(newForm.tarif)}</small>
              </label>

              <label>
                Golongan
                <input
                  list="golongan-list-modal"
                  value={newForm.golongan}
                  onChange={(e) => setF("golongan", e.target.value)}
                />
                <datalist id="golongan-list-modal">
                  {GOLONGAN_OPTS.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </label>

              <label>
                Nominal IWKBU
                <input
                  type="number"
                  min={0}
                  value={newForm.nominal}
                  onChange={(e) => setF("nominal", e.target.value)}
                />
                <small className="hint">{idr(newForm.nominal)}</small>
              </label>

              <label>
                Trayek
                <input
                  list="trayek-list-modal"
                  value={newForm.trayekNew}
                  onChange={(e) => setF("trayekNew", e.target.value)}
                />
                <datalist id="trayek-list-modal">
                  {TRAYEK_OPTS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </label>

              <label>
                Jenis
                <input
                  list="jenis-list-modal"
                  value={newForm.jenis}
                  onChange={(e) => setF("jenis", e.target.value)}
                />
                <datalist id="jenis-list-modal">
                  {JENIS_OPTS.map((j) => (
                    <option key={j} value={j} />
                  ))}
                </datalist>
              </label>

              <label>
                Tahun Pembuatan
                <input
                  type="number"
                  min="1900"
                  max="2100"
                  placeholder="cth: 2015"
                  value={newForm.tahun || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setF("tahun", val === "" ? "" : Number(val));
                  }}
                />
              </label>

              <label>
                PIC
                <input
                  list="pic-list-modal"
                  type="text"
                  value={newForm.pic}
                  onChange={(e) => {
                    const picName = e.target.value;
                    const emp = EMP_OPTS.find(
                      (x) => x.name.toLowerCase() === picName.toLowerCase()
                    );
                    setF("pic", picName);
                    if (emp?.samsat?.name) {
                      setF("loket", emp.samsat.name);
                    }
                  }}
                  placeholder={
                    employeesLoading
                      ? "Memuat daftar pegawai…"
                      : "Klik atau ketik nama PIC"
                  }
                />
                <datalist id="pic-list-modal">
                  {EMP_OPTS.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name}
                      {emp.samsat?.name ? ` — ${emp.samsat.name}` : ""}
                      {emp.handle ? ` (@${emp.handle})` : ""}
                    </option>
                  ))}
                </datalist>
              </label>

              {/* Data Perusahaan */}
              <label>
                Badan Hukum / Perorangan
                <input
                  list="badan-list-modal"
                  value={newForm.badanHukum}
                  onChange={(e) => setF("badanHukum", e.target.value)}
                />
                <datalist id="badan-list-modal">
                  {BADAN_HUKUM_OPTS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </label>

              <label>
                Nama Perusahaan
                <input
                  type="text"
                  value={newForm.namaPerusahaan}
                  onChange={(e) => setF("namaPerusahaan", e.target.value)}
                  placeholder={
                    String(newForm.badanHukum).toUpperCase() === "BH"
                      ? "Nama PT/CV"
                      : "—"
                  }
                />
              </label>

              <label>
                Alamat Lengkap
                <input
                  type="text"
                  value={newForm.alamat}
                  onChange={(e) => setF("alamat", e.target.value)}
                  placeholder="Alamat lengkap"
                />
              </label>

              <label>
                Kelurahan
                <input
                  type="text"
                  value={newForm.kelurahan}
                  onChange={(e) => setF("kelurahan", e.target.value)}
                />
              </label>

              <label>
                Kecamatan
                <input
                  type="text"
                  value={newForm.kecamatan}
                  onChange={(e) => setF("kecamatan", e.target.value)}
                />
              </label>

              <label>
                Kota/Kab
                <input
                  type="text"
                  value={newForm.kota}
                  onChange={(e) => setF("kota", e.target.value)}
                />
              </label>

              {/* Transaksi & Pembayaran */}
              <label>
                Tanggal Transaksi
                <input
                  type="date"
                  value={newForm.tglTransaksi || ""}
                  onChange={(e) => setF("tglTransaksi", e.target.value)}
                />
              </label>

              <label>
                Loket Pembayaran
                <input
                  list="loket-list-modal"
                  type="text"
                  value={newForm.loket}
                  onChange={(e) => setF("loket", e.target.value)}
                  placeholder="Pilih atau ketik samsat"
                />
                <datalist id="loket-list-modal">
                  {LOKET_OPTS.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </label>

              <label>
                Masa Berlaku IWKBU
                <input
                  type="date"
                  value={newForm.masaBerlaku || ""}
                  onChange={(e) => setF("masaBerlaku", e.target.value)}
                />
              </label>

              <label>
                Masa Laku SWDKLLJ Terakhir
                <input
                  type="date"
                  value={newForm.masaSwdkllj || ""}
                  onChange={(e) => setF("masaSwdkllj", e.target.value)}
                />
              </label>

              <label>
                Status Pembayaran IWKBU
                <input
                  list="status-bayar-list-modal"
                  value={newForm.statusBayar}
                  onChange={(e) => setF("statusBayar", e.target.value)}
                />
                <datalist id="status-bayar-list-modal">
                  {STATUS_BAYAR_OPTS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>

              <label>
                Status Kendaraan
                <input
                  list="status-kend-list-modal"
                  value={newForm.statusKendaraan}
                  onChange={(e) => setF("statusKendaraan", e.target.value)}
                />
                <datalist id="status-kend-list-modal">
                  {STATUS_KENDARAAN_OPTS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>

              <label>
                Nilai Outstanding IWKBU (Rp)
                <input
                  type="number"
                  min={0}
                  value={newForm.outstanding}
                  onChange={(e) =>
                    setF("outstanding", Number(e.target.value || 0))
                  }
                />
                <small className="hint">{idr(newForm.outstanding)}</small>
              </label>

              <label>
                Hasil Konfirmasi
                <input
                  list="hasil-konf-list-modal"
                  value={newForm.konfirmasi}
                  onChange={(e) => setF("konfirmasi", e.target.value)}
                  placeholder="Catatan"
                />
                <datalist id="hasil-konf-list-modal">
                  {HASIL_KONF_OPTS.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>

              <label>
                No. HP
                <input
                  type="tel"
                  value={newForm.hp}
                  onChange={(e) => setF("hp", e.target.value)}
                  placeholder="08xx…"
                  pattern="[0-9+\\-\\s]+"
                />
              </label>

              {/* Pemilik & Dokumen */}
              <label>
                Nama Pemilik/Pengelola
                <input
                  type="text"
                  value={newForm.namaPemilik}
                  onChange={(e) => setF("namaPemilik", e.target.value)}
                />
              </label>

              <label>
                NIK / No Identitas
                <input
                  type="text"
                  value={newForm.nik}
                  onChange={(e) => setF("nik", e.target.value)}
                />
              </label>

              <label>
                Dok Perizinan
                <input
                  list="dok-perizinan-list-modal"
                  value={newForm.dokPerizinan}
                  onChange={(e) => setF("dokPerizinan", e.target.value)}
                />
                <datalist id="dok-perizinan-list-modal">
                  {DOK_PERIZINAN_OPTS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </label>

              {/* OS IWKBU & Pemeliharaan */}
              <label>
                Tgl Bayar OS IWKBU
                <input
                  type="date"
                  value={newForm.tglBayarOs || ""}
                  onChange={(e) => setF("tglBayarOs", e.target.value)}
                />
              </label>

              <label>
                Nilai Bayar OS IWKBU
                <input
                  type="number"
                  min={0}
                  value={newForm.nilaiBayarOs}
                  onChange={(e) =>
                    setF("nilaiBayarOs", Number(e.target.value || 0))
                  }
                />
                <small className="hint">{idr(newForm.nilaiBayarOs)}</small>
              </label>

              <label>
                Tgl Pemeliharaan
                <input
                  type="date"
                  value={newForm.tglPemeliharaan || ""}
                  onChange={(e) => setF("tglPemeliharaan", e.target.value)}
                />
              </label>

              <label>
                Nilai Pemeliharaan OS IWKBU
                <input
                  type="number"
                  min={0}
                  value={newForm.nilaiPemeliharaanOs}
                  onChange={(e) =>
                    setF("nilaiPemeliharaanOs", Number(e.target.value || 0))
                  }
                />
                <small className="hint">
                  {idr(newForm.nilaiPemeliharaanOs)}
                </small>
              </label>

              {/* Keterangan */}
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
                onClick={() => setShowNopolModal(false)}
              >
                Batal
              </button>
              <button className="btn primary" onClick={addNopol}>
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Atur Nominal IWKBU */}
      {showNominalModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowNominalModal(false)}
        >
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
              <button
                className="btn ghost"
                onClick={() => setShowNominalModal(false)}
              >
                Batal
              </button>
              <button className="btn primary" onClick={saveNominal}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <datalist id="wilayah-list">
        {WILAYAH_OPTS.map((w) => (
          <option key={w} value={w} />
        ))}
      </datalist>
      <datalist id="golongan-list">
        {GOLONGAN_OPTS.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <datalist id="trayek-list">
        {TRAYEK_OPTS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <datalist id="jenis-list">
        {JENIS_OPTS.map((j) => (
          <option key={j} value={j} />
        ))}
      </datalist>
      <datalist id="badan-list">
        {BADAN_HUKUM_OPTS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <datalist id="status-bayar-list">
        {STATUS_BAYAR_OPTS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="status-kend-list">
        {STATUS_KENDARAAN_OPTS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="dok-perizinan-list">
        {DOK_PERIZINAN_OPTS.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id="hasil-konf-list">
        {HASIL_KONF_OPTS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
