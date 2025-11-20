import React, { useEffect, useMemo, useState } from "react";
import "../../views/dashboard/DataFormManifest.css";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient"; // Pastikan path ini benar

const idr = (n) =>
  (Number(n) || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

// Fungsi untuk membuka gambar di tab baru
const openImageInNewTab = (dataUrl, fileName) => {
  if (!dataUrl) return;
  
  const newTab = window.open();
  if (newTab) {
    newTab.document.write(`
      <html>
        <head><title>${fileName}</title></head>
        <body style="margin:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f5f5f5;">
          <img src="${dataUrl}" alt="${fileName}" style="max-width:100%; max-height:100%;" />
        </body>
      </html>
    `);
    newTab.document.close();
  } else {
    window.open(dataUrl, '_blank');
  }
};

// Fungsi untuk download gambar
const downloadImage = (dataUrl, fileName) => {
  if (!dataUrl) return;
  
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  link.click();
};

export default function DataFromManifest() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  // Load data dari Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("manifest_submissions")
          .select(`
            *,
            iwkl:iwkl_id (
              nama_perusahaan,
              nama_kapal
            )
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading manifest data:", error);
          return;
        }

        console.log("Data loaded from Supabase:", data);
        setRows(data || []);
      } catch (error) {
        console.error("Error in fetchData:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Refresh data function
  const refreshData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("manifest_submissions")
        .select(`
          *,
          iwkl:iwkl_id (
            nama_perusahaan,
            nama_kapal
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error refreshing data:", error);
        return;
      }

      setRows(data || []);
    } catch (error) {
      console.error("Error in refreshData:", error);
    } finally {
      setLoading(false);
    }
  };

  // Delete function
  const deleteRecord = async (id) => {
    if (!window.confirm("Hapus data manifest ini?")) return;

    try {
      const { error } = await supabase
        .from("manifest_submissions")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting record:", error);
        alert("Gagal menghapus data");
        return;
      }

      // Refresh data setelah delete
      refreshData();
      alert("Data berhasil dihapus");
    } catch (error) {
      console.error("Error in deleteRecord:", error);
      alert("Gagal menghapus data");
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [
        r.tanggal ? new Date(r.tanggal).toLocaleString('id-ID') : '',
        r.kapal,
        r.rute,
        r.agen,
        r.telp,
        String(r.total_penumpang || ""),
      ]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [rows, q]);

  // ========= PERHITUNGAN UNIK =========
  const summaryStats = useMemo(() => {
    const totalEntri = filtered.length;
    
    // Hitung kapal unik (tidak duplikat)
    const uniqueKapal = new Set();
    
    // Hitung perusahaan unik (tidak duplikat)
    const uniquePerusahaan = new Set();

    // Hitung statistik integrasi
    const integrationStats = {
      totalIntegrated: 0,
      byMonth: {}
    };

    filtered.forEach(r => {
      if (r.kapal && r.kapal.trim()) uniqueKapal.add(r.kapal.trim());
      if (r.agen && r.agen.trim()) uniquePerusahaan.add(r.agen.trim());

      // Hitung yang sudah terintegrasi
      if (r.iwkl_id) {
        integrationStats.totalIntegrated++;
      }
    });
    
    // Total penumpang
    const totalPenumpang = filtered.reduce(
      (sum, r) => sum + (Number(r.total_penumpang || 0)),
      0
    );
    
    // Total premi
    const totalPremi = filtered.reduce(
      (sum, r) => sum + Number(r.jumlah_premi || 0),
      0
    );

    return {
      totalEntri,
      uniqueKapal: uniqueKapal.size,
      uniquePerusahaan: uniquePerusahaan.size,
      totalPenumpang,
      totalPremi,
      integrationStats
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Format tanggal untuk display
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportCSV = () => {
    const headers = [
      "Tanggal",
      "Kapal", 
      "Rute",
      "Total Penumpang",
      "Jumlah Premi",
      "Agen/Perusahaan",
      "Telepon"
      // "ID IWKL"
    ];

    const lines = [
      headers.join(","),
      ...filtered.map((r) =>
        [
          `"${formatDate(r.tanggal)}"`,
          `"${r.kapal || ""}"`,
          `"${r.rute || ""}"`,
          r.total_penumpang ?? 0,
          r.jumlah_premi ?? 0,
          `"${(r.agen || "").replace(/"/g, '""')}"`,
          `"${(r.telp || "").replace(/"/g, '""')}"`,
          r.iwkl_id || ""
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manifest-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="df-list-wrap">
      <div className="df-clouds" aria-hidden />
      <header className="df-head">
        <div className="left">
          <span className="emoji" aria-hidden>
            📑
          </span>
          <h1>Hasil Input Form Manifest</h1>
          {loading && <span style={{ marginLeft: 8, fontSize: 12 }}>Loading…</span>}
        </div>
        <div className="right">
          <input
            className="search"
            placeholder="Cari tanggal/kapal/rute/agen…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <div className="actions">
            <button 
              className="btn ghost" 
              type="button" 
              onClick={refreshData}
              disabled={loading}
            >
              🔄 Refresh
            </button>
            <button className="btn ghost" type="button" onClick={exportCSV}>
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <div className="df-card">
        <div className="table-scroll">
          <table className="df-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal & Waktu</th>
                <th>Kapal</th>
                <th>Rute</th>
                <th>Total Penumpang</th>
                <th>Jumlah Premi</th>
                <th>Agen/Perusahaan</th>
                <th>Telepon</th>
                {/* <th>ID IWKL</th> */}
                <th>Aksi</th>
                <th>Foto</th>
                <th>Tanda Tangan</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => (
                <tr key={r.id}>
                  <td>{(page - 1) * pageSize + i + 1}</td>
                  <td>{formatDate(r.tanggal)}</td>
                  <td>{r.kapal || "-"}</td>
                  <td>{r.rute || "-"}</td>
                  <td className="num strong">{r.total_penumpang ?? 0}</td>
                  <td className="num">{idr(r.jumlah_premi || 0)}</td>
                  <td>{r.agen || "-"}</td>
                  <td>{r.telp || "-"}</td>
                  {/* <td className="num">
                    {r.iwkl_id ? (
                      <span style={{ 
                        background: '#e3f2fd', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {r.iwkl_id}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td> */}
                  <td>
                    <button
                      className="btn danger ghost xs"
                      onClick={() => deleteRecord(r.id)}
                      disabled={loading}
                    >
                      Hapus
                    </button>
                  </td>
                  <td>
                    {r.foto_url ? (
                      <div className="thumb-actions">
                        <button
                          className="thumb-link"
                          onClick={() => openImageInNewTab(r.foto_url, `foto-${r.id}.png`)}
                        >
                          Lihat Foto
                        </button>
                        <button
                          className="thumb-download"
                          onClick={() => downloadImage(r.foto_url, `foto-${r.id}.png`)}
                        >
                          📥
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {r.sign_url ? (
                      <div className="thumb-actions">
                        <button
                          className="thumb-link"
                          onClick={() => openImageInNewTab(r.sign_url, `ttd-${r.id}.png`)}
                        >
                          Lihat TTD
                        </button>
                        <button
                          className="thumb-download"
                          onClick={() => downloadImage(r.sign_url, `ttd-${r.id}.png`)}
                        >
                          📥
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td className="empty" colSpan={12}>
                    {loading ? "Memuat data..." : "Belum ada data tersimpan"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* footer ringkas dengan statistik lengkap */}
        <div className="df-summary">
          <div>
            📊 Entri: <b>{summaryStats.totalEntri}</b>
          </div>
          <div>
            ⛴️ Kapal: <b>{summaryStats.uniqueKapal}</b>
          </div>
          <div>
            🏢 Perusahaan: <b>{summaryStats.uniquePerusahaan}</b>
          </div>
          <div>
            👥 Penumpang: <b>{summaryStats.totalPenumpang}</b>
          </div>
          <div>
            💰 Premi: <b>{idr(summaryStats.totalPremi)}</b>
          </div>
          
          {/* Info Integrasi IWKL */}
          <div style={{
            padding: "4px 8px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "600",
            background: summaryStats.integrationStats.totalIntegrated > 0 ? "#d4edda" : "#fff3cd",
            color: summaryStats.integrationStats.totalIntegrated > 0 ? "#155724" : "#856404",
            border: summaryStats.integrationStats.totalIntegrated > 0 ? "1px solid #c3e6cb" : "1px solid #ffeaa7"
          }}>
            🔄 Integrasi: <b>{summaryStats.integrationStats.totalIntegrated}</b>/{summaryStats.totalEntri}
          </div>
        </div>

        {/* pager */}
        <div className="pager">
          <button
            className="btn ghost"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ‹ Prev
          </button>
          <span className="page-info">
            Halaman {page} / {totalPages}
          </span>
          <button
            className="btn ghost"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}