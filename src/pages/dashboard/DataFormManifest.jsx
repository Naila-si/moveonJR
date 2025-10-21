import React, { useEffect, useMemo, useState } from "react";
import "../../views/dashboard/dataFormManifest.css";
import { Link, useNavigate } from "react-router-dom";

const LS_KEY = "manifest_submissions";

const idr = (n) =>
  (Number(n) || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

export default function DataFromManifest() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setRows(JSON.parse(raw));
    } catch (e) {
      console.error("Load manifest_submissions failed", e);
    }
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [
        r.tanggal,
        r.kapal,
        r.asal,
        r.agen,
        r.telp,
        String(r.dewasa),
        String(r.anak),
      ]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const clearAll = () => {
    if (!confirm("Hapus SEMUA data manifest tersimpan di perangkat ini?")) return;
    localStorage.removeItem(LS_KEY);
    setRows([]);
  };

  const exportCSV = () => {
    const headers = [
      "Tanggal",
      "Kapal",
      "Asal",
      "Dewasa",
      "Anak",
      "Total",
      "Premi/Orang",
      "Jumlah Premi",
      "Agen",
      "Telepon",
    ];
    const lines = [
      headers.join(","),
      ...filtered.map((r) =>
        [
          `"${r.tanggal || ""}"`,
          `"${r.kapal || ""}"`,
          `"${r.asal || ""}"`,
          r.dewasa ?? 0,
          r.anak ?? 0,
          (r.total ?? 0),
          r.premiPerOrang ?? 0,
          r.jumlahPremi ?? 0,
          `"${(r.agen || "").replace(/"/g, '""')}"`,
          `"${(r.telp || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([lines], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manifest-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="df-list-wrap">
      <div className="df-clouds" aria-hidden />
      <header className="df-head">
        <div className="left">
          <span className="emoji" aria-hidden>📑</span>
          <h1>Hasil Input Form Manifest</h1>
        </div>
        <div className="right">
          <input
            className="search"
            placeholder="Cari tanggal/kapal/asal/agen…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
          <button className="btn ghost" onClick={exportCSV}>Export CSV</button>
          <button className="btn danger" onClick={clearAll}>Hapus Semua</button>
          <Link className="btn primary" to="/dashboard/admin/manifest/data">
            + Tambah Manifest
          </Link>
        </div>
      </header>

      <div className="df-card">
        <div className="table-scroll">
          <table className="df-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Kapal</th>
                <th>Asal</th>
                <th>Dewasa</th>
                <th>Anak</th>
                <th>Total</th>
                <th>Premi / Orang</th>
                <th>Jumlah Premi</th>
                <th>Agen</th>
                <th>Telepon</th>
                <th>Foto</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => (
                <tr key={r.id || `${r.tanggal}-${i}`}>
                  <td>{(page - 1) * pageSize + i + 1}</td>
                  <td>{r.tanggal?.replace("T", " ") || "-"}</td>
                  <td>{r.kapal || "-"}</td>
                  <td>{r.asal || "-"}</td>
                  <td className="num">{r.dewasa ?? 0}</td>
                  <td className="num">{r.anak ?? 0}</td>
                  <td className="num strong">{r.total ?? (Number(r.dewasa||0)+Number(r.anak||0))}</td>
                  <td className="num">{idr(r.premiPerOrang || 0)}</td>
                  <td className="num">{idr(r.jumlahPremi || 0)}</td>
                  <td>{r.agen || "-"}</td>
                  <td>{r.telp || "-"}</td>
                  <td>
                    {r.fotoUrl ? (
                      <a href={r.fotoUrl} target="_blank" rel="noreferrer" className="thumb-link">Lihat</a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td className="empty" colSpan={12}>Belum ada data tersimpan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* footer ringkas */}
        <div className="df-summary">
          <div>Entri: <b>{filtered.length}</b></div>
          <div>
            Total penumpang:{" "}
            <b>
              {filtered.reduce((sum, r) => sum + (Number(r.dewasa||0) + Number(r.anak||0)), 0)}
            </b>
          </div>
          <div>
            Total premi:{" "}
            <b>
              {idr(filtered.reduce((sum, r) => sum + Number(r.jumlahPremi||0), 0))}
            </b>
          </div>
        </div>

        {/* pager */}
        <div className="pager">
          <button className="btn ghost" disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>‹ Prev</button>
          <span className="page-info">Halaman {page} / {totalPages}</span>
          <button className="btn ghost" disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Next ›</button>
        </div>
      </div>
    </div>
  );
}
