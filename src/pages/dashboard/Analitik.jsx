import React, { useEffect, useMemo, useState } from "react";
import "../../views/dashboard/Analitik.css";
import { createClient } from "@supabase/supabase-js";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase =
  supabaseUrl && supabaseAnon ? createClient(supabaseUrl, supabaseAnon) : null;

// --- helper format ---
const idr = (n) =>
  (Number(n) || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

const pct = (v) => {
  if (!Number.isFinite(v) || v <= 0) return "0%";
  return (v * 100).toFixed(1) + "%";
};

const number = (v) => (Number(v) || 0);

// warna2 untuk grafik
const COLORS = ["#1d4ed8", "#f97316", "#10b981", "#6366f1", "#ec4899"];

// Tooltip custom yang lucu + rapi
const CuteTooltip = ({ active, payload, label, formatterLabel }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="cute-tooltip">
      <div className="ct-title">
        {formatterLabel ? formatterLabel(label) : label}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="ct-row">
          <span className="ct-dot" style={{ background: p.color }} />
          <span className="ct-name">{p.name}</span>
          <b className="ct-val">{idr(p.value)}</b>
        </div>
      ))}
    </div>
  );
};

const VALID_STATUS_BAYAR = ["LUNAS", "OUTSTANDING"];

const VALID_STATUS_KENDARAAN = [
  "BEROPERASI",
  "CADANGAN",
  "RUSAK SELAMANYA",
];

const isSameMonth = (dateStr, year, month) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  return d.getFullYear() === year && d.getMonth() === month;
};

export default function Analitik() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [employees, setEmployees] = useState([]);
  const [rekapOS, setRekapOS] = useState([]);
  const [iwkbu, setIwkbu] = useState([]);
  const [iwkl, setIwkl] = useState([]);
  const [rkj, setRkj] = useState([]);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const yearOptions = useMemo(() => {
    const startYear = 2000;
    const endYear = new Date().getFullYear();

    const years = [];
    for (let y = endYear; y >= startYear; y--) {
      years.push(y);
    }
    return years;
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      if (!supabase) {
        setErr(
          "Supabase belum dikonfigurasi (cek VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY)."
        );
        setLoading(false);
        return;
      }
      setLoading(true);
      setErr("");

      try {
        const now = new Date();
        const yearStart = new Date(selectedYear, 0, 1)
          .toISOString()
          .slice(0, 10);

        const yearEnd = new Date(selectedYear + 1, 0, 1)
          .toISOString()
          .slice(0, 10);

        const [empRes, rekapRes, iwkbuRes, iwklRes, rkjRes] =
          await Promise.all([
            supabase.from("employees").select("id, name, loket, created_at"),

            supabase
              .from("rekap_os")
              .select(
                "id, employee_id, os_awal, os_sampai, target_crm, realisasi_po, target_rupiah, nominal_os_bayar"
              ),

            supabase
              .from("iwkbu")
              .select("id, pic, nominal, outstanding, tgl_transaksi, loket, status_bayar, status_kendaraan, masa_berlaku")
              .gte("tgl_transaksi", yearStart)
              .lt("tgl_transaksi", yearEnd)
              .limit(5000),

            supabase
              .from("iwkl")
              .select(
                "id, potensi_per_bulan, total_perhitungan, status_pks, status_pembayaran, status_kapal, created_at"
              )
              .limit(5000),

            supabase
              .from("rkj_entries")
              .select("id, date, status, value")
              .gte("date", yearStart)
              .lt("date", yearEnd)
              .limit(5000),
          ]);

        if (empRes.error) throw empRes.error;
        if (rekapRes.error) throw rekapRes.error;
        if (iwkbuRes.error) throw iwkbuRes.error;
        if (iwklRes.error) throw iwklRes.error;
        if (rkjRes.error) throw rkjRes.error;

        setEmployees(empRes.data || []);

        setRekapOS(
          (rekapRes.data || []).map((r) => ({
            ...r,
            os_awal: number(r.os_awal),
            os_sampai: number(r.os_sampai),
            target_crm: number(r.target_crm),
            realisasi_po: number(r.realisasi_po),
            target_rupiah: number(r.target_rupiah),
            nominal_os_bayar: number(r.nominal_os_bayar),
          }))
        );

        setIwkbu(
          (iwkbuRes.data || []).map((r) => ({
            ...r,
            nominal: number(r.nominal),
            outstanding: number(r.outstanding),
          }))
        );

        setIwkl(
          (iwklRes.data || []).map((r) => ({
            ...r,
            potensi_per_bulan: number(r.potensi_per_bulan),
            total_perhitungan: number(r.total_perhitungan),
          }))
        );

        setRkj(
          (rkjRes.data || []).map((r) => ({
            ...r,
            value: number(r.value),
          }))
        );
      } catch (e) {
        console.error(e);
        setErr(e.message || "Gagal memuat data analitik.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [selectedYear]);

  // Pegawai
  const employeeStats = useMemo(() => {
    const total = employees.length;
    const perLoket = employees.reduce(
      (acc, e) => {
        const key = e.loket || "lainnya";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { kanwil: 0, dumai: 0 }
    );
    return { total, perLoket };
  }, [employees]);

  // Rekap OS (total keseluruhan)
  const osSummary = useMemo(() => {
    let osAwal = 0,
      osSampai = 0,
      targetCRM = 0,
      realisasiPO = 0,
      targetRupiah = 0,
      nominalOSBayar = 0;

    rekapOS.forEach((r) => {
      osAwal += r.os_awal;
      osSampai += r.os_sampai;
      targetCRM += r.target_crm;
      realisasiPO += r.realisasi_po;
      targetRupiah += r.target_rupiah;
      nominalOSBayar += r.nominal_os_bayar;
    });

    const persenOS = osAwal > 0 ? osSampai / osAwal : 0;
    const persenOSBayar =
      targetRupiah > 0 ? nominalOSBayar / targetRupiah : 0;

    return {
      osAwal,
      osSampai,
      targetCRM,
      realisasiPO,
      targetRupiah,
      nominalOSBayar,
      persenOS,
      persenOSBayar,
    };
  }, [rekapOS]);

  const iwkbuDueThisMonth = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-11

    const map = new Map();

    iwkbu.forEach((r) => {
      if (!r.masa_berlaku) return;

      const d = new Date(r.masa_berlaku);
      if (isNaN(d)) return;

      // 👉 hanya yang jatuh tempo BULAN INI
      if (d.getFullYear() !== curYear || d.getMonth() !== curMonth) return;

      const dayLabel = d.getDate().toString().padStart(2, "0"); // 01, 02, dst

      if (!map.has(dayLabel)) {
        map.set(dayLabel, {
          day: dayLabel,
          totalNominal: 0,
          totalOutstanding: 0,
        });
      }

      const item = map.get(dayLabel);
      item.totalNominal += Number(r.nominal || 0);
      item.totalOutstanding += Number(r.outstanding || 0);
    });

    return Array.from(map.values()).sort(
      (a, b) => Number(a.day) - Number(b.day)
    );
  }, [iwkbu]);

  const iwkbuSummary = useMemo(() => {
    let totalNominal = 0;
    let totalOutstanding = 0;
    iwkbu.forEach((r) => {
      totalNominal += r.nominal;
      totalOutstanding += r.outstanding;
    });
    return { totalNominal, totalOutstanding };
  }, [iwkbu]);

  const iwkbuFilteredSummary = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    let totalNominal = 0;
    let totalOutstanding = 0;
    let countKendaraan = 0;

    iwkbu.forEach((r) => {
      const statusBayar = String(r.status_bayar || "").toUpperCase();
      const statusKend = String(r.status_kendaraan || "").toUpperCase();

      if (!VALID_STATUS_BAYAR.includes(statusBayar)) return;
      if (!VALID_STATUS_KENDARAAN.includes(statusKend)) return;
      if (!isSameMonth(r.masa_berlaku, curYear, curMonth)) return;

      totalNominal += Number(r.nominal || 0);

      if (statusBayar === "OUTSTANDING") {
        totalOutstanding += Number(r.outstanding || 0);
      }

      countKendaraan += 1;
    });

    return {
      totalNominal,
      totalOutstanding,
      countKendaraan,
    };
  }, [iwkbu]);

  // IWKL: kapal aktif / nonaktif + potensi per bulan
  const iwklSummary = useMemo(() => {
    const total = iwkl.length;
    let aktif = 0;
    let nonAktif = 0;
    let potensi = 0;

    iwkl.forEach((r) => {
      const status =
        (r.status_kapal || r.status_pks || "").toString().toLowerCase();
      if (status.includes("aktif")) aktif += 1;
      else nonAktif += 1;
      potensi += r.potensi_per_bulan || 0;
    });

    return { total, aktif, nonAktif, potensi };
  }, [iwkl]);

  // RKJ: distribusi status + tren nilai per hari
  const rkjStatus = useMemo(() => {
    const map = new Map();
    rkj.forEach((r) => {
      const k = r.status || "none";
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([status, count]) => ({
      status,
      count,
    }));
  }, [rkj]);

  const rkjDaily = useMemo(() => {
    const map = new Map();
    rkj.forEach((r) => {
      if (!r.date) return;
      const key = r.date; // sudah yyyy-mm-dd
      if (!map.has(key)) {
        map.set(key, { date: key, total: 0 });
      }
      const item = map.get(key);
      item.total += r.value || 0;
    });
    return Array.from(map.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [rkj]);

  const iwkbuTopDay = useMemo(() => {
    if (!iwkbuDueThisMonth.length) return null;
    return iwkbuDueThisMonth.reduce((a, b) =>
      a.totalNominal > b.totalNominal ? a : b
    );
  }, [iwkbuDueThisMonth]);

  const rkjTopStatus = useMemo(() => {
    if (!rkjStatus.length) return null;
    return rkjStatus.reduce((a, b) => (a.count > b.count ? a : b));
  }, [rkjStatus]);

  const iwkbuByPIC = useMemo(() => {
    const map = new Map();

    iwkbu.forEach((r) => {
      const pic = r.pic
        ? `${r.pic} (${r.loket || "-"})`
        : "Tanpa Petugas";

      if (!map.has(pic)) {
        map.set(pic, {
          pic,
          lunas: 0,
          outstanding: 0,
          beroperasi: 0,
          cadangan: 0,
          rusakSementara: 0,
          totalPotensi: 0,
        });
      }

      const item = map.get(pic);

      const statusBayar = String(r.status_bayar || "").toUpperCase();
      const statusKend = String(r.status_kendaraan || "").toUpperCase();

      // hitung status bayar
      if (statusBayar === "LUNAS") item.lunas += 1;
      if (statusBayar === "OUTSTANDING") item.outstanding += 1;

      // hitung status kendaraan
      if (statusKend === "BEROPERASI") item.beroperasi += 1;
      if (statusKend === "CADANGAN") item.cadangan += 1;
      if (statusKend === "RUSAK SEMENTARA") item.rusakSementara += 1;

      // total potensi (nominal)
      item.totalPotensi += Number(r.nominal || 0);
    });

    return Array.from(map.values());
  }, [iwkbu]);

  return (
    <div className="panel analitik-page">
      <div className="analitik-header">
      <div>
        <h2>Dasbor Analitik ✨</h2>
        <p>
          Ringkasan cepat kinerja pegawai, OS, IWKBU/IWKL, dan RK Jadwal.
        </p>
      </div>

      <div className="analitik-actions">
        <select
          className="year-filter"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              Tahun {y}
            </option>
          ))}
        </select>

        {loading && <span className="pill pill-loading">Memuat data…</span>}
      </div>
    </div>

      {err && <div className="alert-error">{err}</div>}

      {/* === Kartu ringkasan utama === */}
      <section className="grid-cards">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-emoji">👩‍💼</div>
            <div className="stat-label">Total Pegawai</div>
          </div>
          <div className="stat-value">{employeeStats.total}</div>
          <div className="stat-sub">
            Kanwil: {employeeStats.perLoket.kanwil || 0} • Dumai:{" "}
            {employeeStats.perLoket.dumai || 0}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-emoji">💸</div>
            <div className="stat-label">Total OS Awal</div>
          </div>
          <div className="stat-value">{idr(osSummary.osAwal)}</div>
          <div className="stat-sub">
            OS Sampai: {idr(osSummary.osSampai)} ({pct(osSummary.persenOS)})
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-emoji">🚌</div>
            <div className="stat-label">IWKBU Jatuh Tempo (Bulan Berjalan)</div>
          </div>
          <div className="stat-value">
            {idr(iwkbuFilteredSummary.totalNominal)}
          </div>

          <div className="stat-sub">
            🚗 {iwkbuFilteredSummary.countKendaraan} kendaraan •
            OS: {idr(iwkbuFilteredSummary.totalOutstanding)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-emoji">🚢</div>
            <div className="stat-label">Potensi IWKL / bulan</div>
          </div>
          <div className="stat-value">{idr(iwklSummary.potensi)}</div>
          <div className="stat-sub">
            Kapal aktif: {iwklSummary.aktif} / {iwklSummary.total}
          </div>
        </div>
      </section>

      {/* === Grafik utama === */}
      <section className="grid-charts">
        {/* Pie distribusi pegawai per loket */}
        <div className="chart-card">
          <div className="chart-title">
            Distribusi Pegawai per Loket
            <span className="chart-badge">Distribusi</span>
          </div>

          {employeeStats.total === 0 ? (
            <div className="chart-empty">Belum ada data pegawai.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={[
                    {
                      name: "Kantor Wilayah",
                      value: employeeStats.perLoket.kanwil || 0,
                    },
                    {
                      name: "Kantor Cabang Dumai",
                      value: employeeStats.perLoket.dumai || 0,
                    },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label
                >
                  {[0, 1].map((idx) => (
                    <Cell key={idx} fill={COLORS[idx]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Area chart nominal IWKBU per bulan */}
        <div className="chart-card">
          <div className="chart-title">
            Nominal IWKBU Jatuh Tempo Bulan Ini
            <span className="chart-badge">Trend</span>
          </div>

          {iwkbuDueThisMonth.length === 0 ? (
            <div className="chart-empty">
              Belum ada jatuh tempo IWKBU bulan ini.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={iwkbuDueThisMonth}>
                  <defs>
                    <linearGradient id="gradNominal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={COLORS[0]} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS[1]} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={COLORS[1]} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" label={{ value: "Tanggal", position: "insideBottom", offset: -5 }} />
                  <YAxis />
                  <Tooltip
                    content={
                      <CuteTooltip formatterLabel={(l) => `Tanggal ${l}`} />
                    }
                  />
                  <Legend />

                  <Area
                    type="monotone"
                    dataKey="totalNominal"
                    name="Nominal"
                    stroke={COLORS[0]}
                    fill="url(#gradNominal)"
                    strokeWidth={2.5}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalOutstanding"
                    name="Outstanding"
                    stroke={COLORS[1]}
                    fill="url(#gradOut)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <div className="chart-insight">
                {iwkbuTopDay ? (
                  <>
                    📌 Tertinggi jatuh tempo tanggal <b>{iwkbuTopDay.day}</b> dengan
                    nominal <b>{idr(iwkbuTopDay.totalNominal)}</b>
                  </>
                ) : (
                  "Belum ada jatuh tempo bulan ini."
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="grid-charts">
        {iwkbuByPIC.length === 0 ? (
          <div className="chart-empty">Belum ada data IWKBU per PIC.</div>
        ) : (
          iwkbuByPIC.map((p, idx) => (
            <div className="chart-card" key={idx}>
              <div className="chart-title pic-title">
                <span>Kinerja IWKBU – {p.pic}</span>
                <span className="pic-potensi">
                  {idr(p.totalPotensi)}
                </span>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={[
                    {
                      name: "Status",
                      Lunas: p.lunas,
                      Outstanding: p.outstanding,
                      Beroperasi: p.beroperasi,
                      Cadangan: p.cadangan,
                      Rusak: p.rusakSementara,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />

                  <Bar dataKey="Lunas" fill={COLORS[2]} />
                  <Bar dataKey="Outstanding" fill={COLORS[1]} />
                  <Bar dataKey="Beroperasi" fill={COLORS[0]} />
                  <Bar dataKey="Cadangan" fill={COLORS[3]} />
                  <Bar dataKey="Rusak" fill={COLORS[4]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="chart-insight">
                💰 Total potensi IWKBU: <b>{idr(p.totalPotensi)}</b>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
