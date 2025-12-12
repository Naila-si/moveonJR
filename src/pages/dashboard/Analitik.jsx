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

// --- Supabase client (sama pola dengan file Rekap.jsx) ---
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

export default function Analitik() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [employees, setEmployees] = useState([]);
  const [rekapOS, setRekapOS] = useState([]);
  const [iwkbu, setIwkbu] = useState([]);
  const [iwkl, setIwkl] = useState([]);
  const [rkj, setRkj] = useState([]);

  // === Ambil data dari Supabase sekali di awal ===
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
        const yearStart = new Date(now.getFullYear(), 0, 1)
          .toISOString()
          .slice(0, 10); // yyyy-mm-dd

        const [empRes, rekapRes, iwkbuRes, iwklRes, rkjRes] =
          await Promise.all([
            supabase.from("employees").select("id, name, loket, created_at"),

            supabase
              .from("rekap_os")
              .select(
                "id, employee_id, os_awal, os_sampai, target_crm, realisasi_po, target_rupiah, nominal_os_bayar"
              ),

            // batasi dari awal tahun biar nggak super berat
            supabase
              .from("iwkbu")
              .select("id, nominal, outstanding, tgl_transaksi, loket")
              .gte("tgl_transaksi", yearStart)
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
  }, []);

  // === DERIVED METRICS ===

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

  // IWKBU per bulan (tahun berjalan)
  const iwkbuMonthly = useMemo(() => {
    const map = new Map();
    iwkbu.forEach((r) => {
      if (!r.tgl_transaksi) return;
      const d = new Date(r.tgl_transaksi);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const label = d.toLocaleString("id-ID", { month: "short" });
      if (!map.has(key)) {
        map.set(key, {
          key,
          month: label,
          totalNominal: 0,
          totalOutstanding: 0,
        });
      }
      const item = map.get(key);
      item.totalNominal += r.nominal;
      item.totalOutstanding += r.outstanding;
    });
    return Array.from(map.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
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

  // untuk insight otomatis
  const iwkbuTopMonth = useMemo(() => {
    if (!iwkbuMonthly.length) return null;
    return iwkbuMonthly.reduce((a, b) =>
      a.totalNominal > b.totalNominal ? a : b
    );
  }, [iwkbuMonthly]);

  const rkjTopStatus = useMemo(() => {
    if (!rkjStatus.length) return null;
    return rkjStatus.reduce((a, b) => (a.count > b.count ? a : b));
  }, [rkjStatus]);

  return (
    <div className="panel analitik-page">
      <div className="analitik-header">
        <div>
          <h2>Dasbor Analitik ✨</h2>
          <p>
            Ringkasan cepat kinerja pegawai, OS, IWKBU/IWKL, dan RK Jadwal.
          </p>
        </div>

        {loading && <span className="pill pill-loading">Memuat data…</span>}
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
            <div className="stat-label">IWKBU (tahun berjalan)</div>
          </div>
          <div className="stat-value">{idr(iwkbuSummary.totalNominal)}</div>
          <div className="stat-sub">
            Outstanding: {idr(iwkbuSummary.totalOutstanding)}
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
            <ResponsiveContainer width="100%" height="100%">
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
            Nominal IWKBU per Bulan
            <span className="chart-badge">Trend</span>
          </div>

          {iwkbuMonthly.length === 0 ? (
            <div className="chart-empty">
              Belum ada transaksi IWKBU tahun ini.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={iwkbuMonthly}>
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
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    content={
                      <CuteTooltip formatterLabel={(l) => `Bulan ${l}`} />
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
                {iwkbuTopMonth ? (
                  <>
                    📌 Bulan tertinggi: <b>{iwkbuTopMonth.month}</b> dengan
                    nominal <b>{idr(iwkbuTopMonth.totalNominal)}</b>
                  </>
                ) : (
                  "Belum ada insight."
                )}
              </div>
            </>
          )}
        </div>

        {/* Bar chart status RKJ */}
        <div className="chart-card">
          <div className="chart-title">
            Status RK Jadwal (rkj_entries)
            <span className="chart-badge">Status</span>
          </div>

          {rkjStatus.length === 0 ? (
            <div className="chart-empty">
              Belum ada entri RK Jadwal tahun ini.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rkjStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Jumlah">
                    {rkjStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="chart-insight">
                {rkjTopStatus ? (
                  <>
                    ✅ Status terbanyak: <b>{rkjTopStatus.status}</b> (
                    {rkjTopStatus.count} entri)
                  </>
                ) : (
                  "Belum ada insight."
                )}
              </div>
            </>
          )}
        </div>

        {/* Area chart aktivitas nilai RKJ per hari */}
        <div className="chart-card chart-full">
          <div className="chart-title">
            Aktivitas Nilai RKJ per Hari (tahun berjalan)
            <span className="chart-badge">Aktivitas</span>
          </div>

          {rkjDaily.length === 0 ? (
            <div className="chart-empty">
              Belum ada nilai RKJ yang tercatat tahun ini.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rkjDaily}>
                <defs>
                  <linearGradient id="gradRKJ" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS[2]} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={COLORS[2]} stopOpacity={0.06} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                    })
                  }
                />
                <YAxis />
                <Tooltip
                  content={
                    <CuteTooltip
                      formatterLabel={(d) => {
                        const dt = new Date(d);
                        return dt.toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        });
                      }}
                    />
                  }
                />

                <Area
                  type="monotone"
                  dataKey="total"
                  name="Nilai"
                  stroke={COLORS[2]}
                  fill="url(#gradRKJ)"
                  fillOpacity={1}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* <p className="analitik-footnote">
        * Data diambil langsung dari tabel <code>employees</code>,{" "}
        <code>rekap_os</code>, <code>iwkbu</code>, <code>iwkl</code>, dan{" "}
        <code>rkj_entries</code>. Kalau nanti tabel CRM / Manifest mau ikut
        ditampilkan, bisa kita tambah satu section lagi khusus CRM.
      </p> */}
    </div>
  );
}
