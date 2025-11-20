import React, { useEffect, useMemo, useState } from "react";
import "../../views/dashboard/Rekap.css";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnon ? createClient(supabaseUrl, supabaseAnon) : null;

const idr = (n) =>
  (Number(n) || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

const pct = (num) => {
  if (num === null || Number.isNaN(num)) return "—";
  if (num === "#DIV/0!") return "#DIV/0!";
  return (num * 100).toFixed(2) + "%";
};

const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d\-\.,]/g, "").replace(/\./g, "").replace(",", ".");
  const num = Number(s);
  return Number.isFinite(num) ? num : 0;
};

const computeRow = (r) => {
  const osAwal = toNumber(r.osAwal);
  const osSampai = toNumber(r.osSampai);
  const targetCRM = toNumber(r.targetCRM);
  const realisasiPO = toNumber(r.realisasiPO);
  const targetRupiah = toNumber(r.targetRupiah);
  const jumlahKendaraanBayarOS = toNumber(r.jumlahKendaraanBayarOS);
  const nominalOSBayar = toNumber(r.nominalOSBayar);

  const persenOS =
    osAwal > 0 ? osSampai / osAwal : (osAwal === 0 && osSampai === 0 ? "#DIV/0!" : "#DIV/0!");
  const gapPO = targetCRM - realisasiPO;
  const persenOSBayar =
    targetRupiah > 0
      ? nominalOSBayar / targetRupiah
      : (targetRupiah === 0 && nominalOSBayar === 0 ? "#DIV/0!" : "#DIV/0!");

  return {
    ...r,
    osAwal,
    osSampai,
    targetCRM,
    realisasiPO,
    gapPO,
    targetRupiah,
    jumlahKendaraanBayarOS,
    nominalOSBayar,
    persenOS,
    persenOSBayar,
  };
};

export default function DataFromManifest() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const monthRange = (y, m) => {
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end   = new Date(Date.UTC(y, m, 1, 0, 0, 0)); // bulan berikutnya
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  };

  const handleExportExcel = () => {
    // pakai data yang sedang tampil (sudah terfilter bulan/tahun & keyword)
    const rowsToExport = filtered.map((r) => ({
      "Kelompok Loket": r.loketGroup || "",
      "Nama Pegawai": r.namaPegawai,
      "Loket Samsat": r.loketSamsat,
      "OS Awal (Rp)": r.osAwal,
      "OS Sampai (Rp)": r.osSampai,
      "Persen OS": typeof r.persenOS === "number" ? r.persenOS : null,
      "Target CRM": r.targetCRM,
      "Realisasi PO": r.realisasiPO,
      "GAP PO": r.gapPO,
      "Target Rupiah (Rp)": r.targetRupiah,
      "Jumlah Kendaraan Bayar OS": r.jumlahKendaraanBayarOS,
      "Nominal OS Bayar (Rp)": r.nominalOSBayar,
      "Persen OS Bayar": typeof r.persenOSBayar === "number" ? r.persenOSBayar : null,
    }));

    // buat worksheet
    const ws = XLSX.utils.json_to_sheet(rowsToExport);

    // format kolom persen (opsional)
    const headers = Object.keys(rowsToExport[0] || {});
    const colIndexPersen1 = headers.indexOf("Persen OS");
    const colIndexPersen2 = headers.indexOf("Persen OS Bayar");

    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let R = 1; R <= range.e.r; R++) {
      [colIndexPersen1, colIndexPersen2].forEach((ci) => {
        if (ci >= 0) {
          const cellAddr = XLSX.utils.encode_cell({ r: R, c: ci });
          const cell = ws[cellAddr];
          if (cell && typeof cell.v === "number") {
            cell.z = "0.00%";
          }
        }
      });
    }

    // workbook & simpan
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap OS");

    const monthName = new Date(year, month - 1, 1).toLocaleString("id-ID",{ month:"long" });
    const filename = `Rekap-OS-${monthName}-${year}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const navigate = useNavigate();

  // data utama dari Supabase
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // search & paging
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal Rekap Baru
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState("");
  const [formNew, setFormNew] = useState({
    employee_id: "",
    namaPegawai: "",       // diisi otomatis dari employees
    loketSamsat: "",
  });

  // Inline edit
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({
    namaPegawai: "",
    loketSamsat: "",
    osAwal: 0,
    osSampai: 0,
    targetCRM: 0,
    realisasiPO: 0,
    targetRupiah: 0,
    jumlahKendaraanBayarOS: 0,
    nominalOSBayar: 0,
  });

  // peta employee_id -> loket ('kanwil' | 'dumai')
  const [empLoketMap, setEmpLoketMap] = useState({});
  const [empLoketLoading, setEmpLoketLoading] = useState(false);
  const [empLoketError, setEmpLoketError] = useState("");

  // --- helpers Supabase
  const fetchRows = async (y = year, m = month) => {
    if (!supabase) {
      setErr("Supabase belum dikonfigurasi (VITE_SUPABASE_URL/ANON_KEY).");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const { startISO, endISO } = monthRange(y, m);
      // ambil semua rekap, urut terbaru
      const { data, error } = await supabase
        .from("rekap_os")
        .select(`
          id, employee_id, nama_pegawai, loket_samsat,
          os_awal, os_sampai, target_crm, realisasi_po,
          target_rupiah, jumlah_kendaraan_bayar_os, nominal_os_bayar,
          created_at
        `)
        .gte("created_at", startISO)
        .lt("created_at", endISO)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data || []).map(r => ({
        id: r.id,
        employee_id: r.employee_id,
        namaPegawai: r.nama_pegawai,
        loketSamsat: r.loket_samsat,
        osAwal: r.os_awal,
        osSampai: r.os_sampai,
        targetCRM: r.target_crm,
        realisasiPO: r.realisasi_po,
        targetRupiah: r.target_rupiah,
        jumlahKendaraanBayarOS: r.jumlah_kendaraan_bayar_os,
        nominalOSBayar: r.nominal_os_bayar,
        created_at: r.created_at,
      })));
    } catch (e) {
      setErr(e.message || "Gagal memuat data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const insertRow = async (rowDB) => {
    const { data, error } = await supabase.from("rekap_os").insert(rowDB).select().single();
    if (error) throw error;
    return data;
  };

  const updateRow = async (id, patchDB) => {
    const { data, error } = await supabase.from("rekap_os").update(patchDB).eq("id", id).select().single();
    if (error) throw error;
    return data;
  };

  const deleteRow = async (id) => {
    const { error } = await supabase.from("rekap_os").delete().eq("id", id);
    if (error) throw error;
  };

  // initial load
  useEffect(() => {
    fetchRows(year, month);
  }, [year, month]);

  // fetch employees when modal opens
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!isModalOpen) return;
      if (!supabase) {
        setEmpError("Supabase belum dikonfigurasi.");
        return;
      }
      setEmpLoading(true);
      setEmpError("");
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("id, name")
          .order("name", { ascending: true });
        if (error) throw error;
        setEmployees(data || []);
      } catch (e) {
        setEmpError(e.message || "Gagal memuat pegawai.");
        setEmployees([]);
      } finally {
        setEmpLoading(false);
      }
    };
    fetchEmployees();
  }, [isModalOpen]);

  // filter, paging, summary sama seperti sebelumnya
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const data = rows.map((r0) => {
      const r = computeRow(r0);
      const lg = empLoketMap[r.employee_id] || "";
      return { ...r, loketGroup: lg };
    });
    if (!s) return data;
    return data.filter((r) =>
      [
        r.namaPegawai,
        r.loketSamsat,
        r.loketGroup,
        r.osAwal,
        r.osSampai,
        r.targetCRM,
        r.realisasiPO,
        r.gapPO,
        r.targetRupiah,
        r.jumlahKendaraanBayarOS,
        r.nominalOSBayar,
      ]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [rows, q, empLoketMap]);

  // urutkan: kanwil dulu, lalu dumai
  const sortByGroup = (a, b) => {
    const rank = (g) => (g === "kanwil" ? 0 : g === "dumai" ? 1 : 2);
    if (rank(a.loketGroup) !== rank(b.loketGroup)) return rank(a.loketGroup) - rank(b.loketGroup);
    return (a.namaPegawai || "").localeCompare(b.namaPegawai || "");
  };
 
  const withGroupHeaders = (arr) => {
    const out = [];
    let currentGroup = null;
    for (const item of arr.sort(sortByGroup)) {
      if (item.loketGroup !== currentGroup) {
        currentGroup = item.loketGroup;
        const title =
          currentGroup === "kanwil" ? "Loket Kantor Wilayah"
          : currentGroup === "dumai" ? "Loket Kantor Cabang Dumai"
          : "Loket (Tidak Terdefinisi)";
        out.push({ __header: true, key: `hdr-${title}-${out.length}`, title });
      }
      out.push(item);
    }
    return out;
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = [...filtered].sort(sortByGroup).slice((page - 1) * pageSize, page * pageSize);
  const pageDataWithHeaders = withGroupHeaders(pageData);

  const summary = useMemo(() => {
    const s = filtered.reduce(
      (acc, r0) => {
        const r = computeRow(r0);
        acc.osAwal += r.osAwal;
        acc.osSampai += r.osSampai;
        acc.targetCRM += r.targetCRM;
        acc.realisasiPO += r.realisasiPO;
        acc.gapPO += r.gapPO;
        acc.targetRupiah += r.targetRupiah;
        acc.jumlahKendaraanBayarOS += r.jumlahKendaraanBayarOS;
        acc.nominalOSBayar += r.nominalOSBayar;
        return acc;
      },
      {
        osAwal: 0,
        osSampai: 0,
        targetCRM: 0,
        realisasiPO: 0,
        gapPO: 0,
        targetRupiah: 0,
        jumlahKendaraanBayarOS: 0,
        nominalOSBayar: 0,
      }
    );

    const persenOS =
      s.osAwal > 0 ? s.osSampai / s.osAwal : (s.osAwal === 0 && s.osSampai === 0 ? "#DIV/0!" : "#DIV/0!");
    const persenOSBayar =
      s.targetRupiah > 0
        ? s.nominalOSBayar / s.targetRupiah
        : (s.targetRupiah === 0 && s.nominalOSBayar === 0 ? "#DIV/0!" : "#DIV/0!");

    return { ...s, persenOS, persenOSBayar, entries: filtered.length };
  }, [filtered]);

  // EDIT/HAPUS
  const onEdit = (row) => {
    setEditId(row.id);
    setEditData({
      namaPegawai: row.namaPegawai || "",
      loketSamsat: row.loketSamsat || "",
      osAwal: row.osAwal ?? 0,
      osSampai: row.osSampai ?? 0,
      targetCRM: row.targetCRM ?? 0,
      realisasiPO: row.realisasiPO ?? 0,
      targetRupiah: row.targetRupiah ?? 0,
      jumlahKendaraanBayarOS: row.jumlahKendaraanBayarOS ?? 0,
      nominalOSBayar: row.nominalOSBayar ?? 0,
    });
  };

  const onCancelEdit = () => setEditId(null);

  const onSaveEdit = async () => {
    try {
      const patchDB = {
        nama_pegawai: editData.namaPegawai,
        loket_samsat: editData.loketSamsat,
        os_awal: toNumber(editData.osAwal),
        os_sampai: toNumber(editData.osSampai),
        target_crm: toNumber(editData.targetCRM),
        realisasi_po: toNumber(editData.realisasiPO),
        target_rupiah: toNumber(editData.targetRupiah),
        jumlah_kendaraan_bayar_os: toNumber(editData.jumlahKendaraanBayarOS),
        nominal_os_bayar: toNumber(editData.nominalOSBayar),
      };
      // optimistic
      setRows((prev) => prev.map((r) => (r.id === editId ? { 
        ...r,
        ...editData,
      } : r)));
      await updateRow(editId, patchDB);
      setEditId(null);
    } catch (e) {
      alert(`Gagal menyimpan: ${e.message || e}`);
      // fallback refresh
      fetchRows();
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Hapus baris ini?")) return;
    try {
      // optimistic
      setRows((prev) => prev.filter((r) => r.id !== id));
      await deleteRow(id);
    } catch (e) {
      alert(`Gagal menghapus: ${e.message || e}`);
      fetchRows();
    }
  };

  // REKAP BARU (modal)
  const openModal = () => {
    setFormNew({ employee_id: "", namaPegawai: "", loketSamsat: "" });
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);

  const onChangeEmployee = (employee_id) => {
    const emp = employees.find((e) => e.id === employee_id);
    setFormNew((f) => ({
      ...f,
      employee_id,
      namaPegawai: emp?.name || "",
    }));
  };

  const onSaveNew = async () => {
    const nama = formNew.namaPegawai?.trim();
    const loket = formNew.loketSamsat?.trim();
    if (!formNew.employee_id) return alert("Silakan pilih Nama Pegawai.");
    if (!loket) return alert("Silakan isi Loket Samsat.");

    // Cegah duplikasi per pegawai
    if (rows.some((r) => r.employee_id === formNew.employee_id)) {
      alert("Pegawai ini sudah ada di rekap. Silakan Edit untuk mengisi/ubah data.");
      return;
    }

    const newRowDB = {
      employee_id: formNew.employee_id,
      nama_pegawai: nama,
      loket_samsat: loket,
      os_awal: 0,
      os_sampai: 0,
      target_crm: 0,
      realisasi_po: 0,
      target_rupiah: 0,
      jumlah_kendaraan_bayar_os: 0,
      nominal_os_bayar: 0,
    };

    try {
      // 1) insert ke DB
      const saved = await insertRow(newRowDB);

      // 2) map hasil DB -> bentuk UI (camelCase)
      const savedUI = {
        id: saved.id,
        employee_id: saved.employee_id,
        namaPegawai: saved.nama_pegawai,
        loketSamsat: saved.loket_samsat,
        osAwal: saved.os_awal,
        osSampai: saved.os_sampai,
        targetCRM: saved.target_crm,
        realisasiPO: saved.realisasi_po,
        targetRupiah: saved.target_rupiah,
        jumlahKendaraanBayarOS: saved.jumlah_kendaraan_bayar_os,
        nominalOSBayar: saved.nominal_os_bayar,
        created_at: saved.created_at,
      };

      // 3) update state
      setRows((prev) => [savedUI, ...prev]);
      setIsModalOpen(false);
      setPage(1);
    } catch (e) {
      alert(`Gagal menyimpan: ${e.message || e}`);
      fetchRows();
    }
  };

  // helper input untuk inline edit
  const EditInput = ({ label, name, type = "text", step = "any" }) => (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#415a77" }}>{label}</span>
      <input
        className="search"
        style={{ width: "100%" }}
        type={type}
        step={step}
        value={editData[name] ?? ""}
        onChange={(e) => setEditData((d) => ({ ...d, [name]: e.target.value }))}
      />
    </label>
  );

  const fetchEmpLoketMap = async () => {
    if (!supabase) { setEmpLoketError("Supabase belum dikonfigurasi."); return; }
    setEmpLoketLoading(true);
    setEmpLoketError("");
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, loket");
      if (error) throw error;
      const map = Object.fromEntries((data || []).map(e => [e.id, e.loket]));
      setEmpLoketMap(map);
    } catch (e) {
      setEmpLoketError(e.message || "Gagal memuat loket pegawai.");
    } finally {
      setEmpLoketLoading(false);
    }
  };

  // load sekali di awal
  useEffect(() => {
    fetchEmpLoketMap();
  }, []);

  return (
    <div className="df-list-wrap">
      <div className="df-clouds" aria-hidden />
      <header className="df-head">
        <div className="left">
          <span className="emoji" aria-hidden>📑</span>
          <h1>Rekap OS per Pegawai</h1>
        </div>
        <div className="right" style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button className="btn" onClick={openModal}>➕ Rekap Baru</button>
          <select className="search" value={month} onChange={(e)=>setMonth(Number(e.target.value))}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>
                {new Date(2000, m-1, 1).toLocaleString("id-ID", { month: "long" })}
              </option>
            ))}
          </select>
         
          <select className="search" value={year} onChange={(e)=>setYear(Number(e.target.value))}>
            {Array.from({length: 8}, (_,i)=> now.getFullYear()-4+i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button className="btn ghost" onClick={()=>fetchRows(year, month)}>Terapkan</button>
          <button className="btn" onClick={handleExportExcel}>⬇️ Unduh Excel</button>
          <input
            className="search"
            placeholder="Cari nama/loket/angka…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>
      </header>

      {/* Modal Rekap Baru */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="df-modal-backdrop"
          onClick={(e) => {
            if (e.target.classList.contains("df-modal-backdrop")) closeModal();
          }}
        >
          <div className="df-modal">
            <div className="df-modal-head">
              <h2 style={{ margin:0 }}>Rekap Baru</h2>
            </div>
            <div className="df-modal-body" style={{ display:"grid", gap:12 }}>
              <label style={{ display:"grid", gap:6 }}>
                <span style={{ fontSize:12, color:"#415a77" }}>Nama Pegawai</span>
                <select
                  className="search"
                  value={formNew.employee_id}
                  onChange={(e) => onChangeEmployee(e.target.value)}
                  disabled={empLoading || !!empError || (employees?.length ?? 0) === 0}
                >
                  <option value="">{empLoading ? "Memuat pegawai…" : "Pilih pegawai"}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <small style={{ color:"#577590" }}>
                  Tidak bisa ketik manual. Kalau mau tambah pegawai baru, silakan ke <strong>halaman RK Jadwal</strong>.
                </small>
                {empError && <small style={{ color:"#c1121f" }}>{empError}</small>}
              </label>

              <label style={{ display:"grid", gap:6 }}>
                <span style={{ fontSize:12, color:"#415a77" }}>Loket Samsat</span>
                <input
                  className="search"
                  placeholder="Contoh: Loket A / Samsat Cimahi"
                  value={formNew.loketSamsat}
                  onChange={(e) => setFormNew((f) => ({ ...f, loketSamsat: e.target.value }))}
                />
              </label>
            </div>
            <div className="df-modal-foot" style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button className="btn" onClick={onSaveNew}
                disabled={!formNew.employee_id || !formNew.loketSamsat}
              >
                Simpan
              </button>
              <button className="btn ghost" onClick={closeModal}>Batal</button>
            </div>
          </div>
        </div>
      )}

      <div className="df-card">
        {err && (
          <div className="empty" style={{ color:"#c1121f", marginBottom:8 }}>
            {err}
          </div>
        )}
        <div className="table-scroll">
          <table className="df-table">
            <thead>
              <tr>
                <th>Aksi</th>
                <th>Nama Pegawai</th>
                <th>Loket Samsat</th>
                <th>OS Awal</th>
                <th>OS Sampai</th>
                <th>Persen OS</th>
                <th>Target CRM</th>
                <th>Realisasi PO</th>
                <th>GAP PO</th>
                <th>Target Rupiah</th>
                <th>Jumlah Kendaraan yang Bayar OS</th>
                <th>Nominal OS yang Bayar</th>
                <th>Persen OS Bayar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} className="empty">Memuat data…</td></tr>
              ) : pageData.length === 0 ? (
                <tr><td className="empty" colSpan={13}>Belum ada data tersimpan</td></tr>
              ) : (
                pageDataWithHeaders.map((raw, i) => {
                  if (raw.__header) {
                    return (
                      <tr key={raw.key} className="group-header">
                        <td colSpan={13} style={{ fontWeight: 900, background: "#f0f6ff", color: "#143A59" }}>
                          {raw.title}
                        </td>
                      </tr>
                    );
                  }
                  const r = computeRow(raw);
                  return (
                    <React.Fragment key={r.id}>
                      <tr>
                        <td className="actions-cell">
                          <div className="actions">
                            <button className="btn ghost" onClick={() => onEdit(raw)}>Edit</button>
                            <button className="btn danger" onClick={() => onDelete(raw.id)}>Hapus</button>
                          </div>
                        </td>
                        <td>{r.namaPegawai || "-"}</td>
                        <td>{r.loketSamsat || "-"}</td>
                        <td className="num">{idr(r.osAwal)}</td>
                        <td className="num">{idr(r.osSampai)}</td>
                        <td className="num">{pct(r.persenOS)}</td>
                        <td className="num">{r.targetCRM ?? 0}</td>
                        <td className="num">{r.realisasiPO ?? 0}</td>
                        <td className="num">{r.gapPO ?? 0}</td>
                        <td className="num">{idr(r.targetRupiah)}</td>
                        <td className="num">{r.jumlahKendaraanBayarOS ?? 0}</td>
                        <td className="num">{idr(r.nominalOSBayar)}</td>
                        <td className="num">{pct(r.persenOSBayar)}</td>
                      </tr>

                      {editId === raw.id && (
                        <tr>
                          <td colSpan={13}>
                            <div style={{ display:"grid", gap:12, background:"#f6fbff", border:"2px solid var(--blue)", borderRadius:12, padding:12 }}>
                              <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(200px, 1fr))", gap:12 }}>
                                <EditInput label="Nama Pegawai" name="namaPegawai" />
                                <EditInput label="Loket Samsat" name="loketSamsat" />
                                <EditInput label="Target CRM" name="targetCRM" type="number" step="1" />
                                <EditInput label="Realisasi PO" name="realisasiPO" type="number" step="1" />
                                <EditInput label="OS Awal (Rp)" name="osAwal" type="number" step="1" />
                                <EditInput label="OS Sampai (Rp)" name="osSampai" type="number" step="1" />
                                <EditInput label="Target Rupiah (Rp)" name="targetRupiah" type="number" step="1" />
                                <EditInput label="Jumlah Kendaraan Bayar OS" name="jumlahKendaraanBayarOS" type="number" step="1" />
                                <EditInput label="Nominal OS yang Bayar (Rp)" name="nominalOSBayar" type="number" step="1" />
                              </div>
                              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                                <button className="btn" onClick={onSaveEdit}>Simpan</button>
                                <button className="btn ghost" onClick={onCancelEdit}>Batal</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            <tfoot>
              <tr className="strong">
                <td colSpan={3}>Subtotal (tampilan saat ini)</td>
                <td className="num">{idr(summary.osAwal)}</td>
                <td className="num">{idr(summary.osSampai)}</td>
                <td className="num">{pct(summary.persenOS)}</td>
                <td className="num">{summary.targetCRM}</td>
                <td className="num">{summary.realisasiPO}</td>
                <td className="num">{summary.gapPO}</td>
                <td className="num">{idr(summary.targetRupiah)}</td>
                <td className="num">{summary.jumlahKendaraanBayarOS}</td>
                <td className="num">{idr(summary.nominalOSBayar)}</td>
                <td className="num">{pct(summary.persenOSBayar)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="pager">
          <button className="btn ghost" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>‹ Prev</button>
          <span className="page-info">Halaman {page} / {totalPages}</span>
          <button className="btn ghost" disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Next ›</button>
        </div>
      </div>
    </div>
  );
}
