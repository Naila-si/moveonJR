import React, { useMemo, useState, useEffect } from "react";
import "../../views/dashboard/Iwkl.css";

const LOKET_OPTS = ["DUMAI", "BENGKALIS", "SELAT PANJANG"];
const KELAS_OPTS = ["PLATINUM", "GOLD", "SILVER"];

// kolom default
const BASE_COLUMNS = [
  { key: "loket", label: "Loket" },
  { key: "kelas", label: "Kelas" },
  { key: "namaPerusahaan", label: "Nama Perusahaan" },
  { key: "namaPemilik", label: "Nama Pemilik" },
  { key: "alamat", label: "Alamat" },
  { key: "noKontak", label: "No. Kontak" },
  { key: "tglLahir", label: "Tanggal Lahir" },
];

export default function Iwkl() {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState(BASE_COLUMNS);
  const [q, setQ] = useState("");

  // modal tambah kolom
  const [showColModal, setShowColModal] = useState(false);
  const [newColLabel, setNewColLabel] = useState("");

  // ring menu & rename
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const [renamingKey, setRenamingKey] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [
        r.loket,
        r.kelas,
        r.namaPerusahaan,
        r.namaPemilik,
        r.alamat,
        r.noKontak,
      ]
        .join(" ")
        .toLowerCase()
        .includes(s)
    );
  }, [rows, q]);

  const addRow = () => {
    const blank = { id: Date.now() };
    columns.forEach((c) => {
      if (c.key === "loket") blank[c.key] = LOKET_OPTS[0];
      else if (c.key === "kelas") blank[c.key] = KELAS_OPTS[0];
      else if (c.key === "tglLahir") blank[c.key] = "";
      else blank[c.key] = "";
    });
    setRows((prev) => [blank, ...prev]);
  };

  const addColumn = () => {
    const label = newColLabel.trim();
    if (!label) return;
    // buat key aman dari label (camelCase sederhana)
    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+(\w)/g, (_, c) => c.toUpperCase())
      .replace(/[^a-z0-9]/g, "");
    // cegah duplikasi key
    if (columns.some((c) => c.key === key)) {
      alert("Kolom dengan nama itu sudah ada.");
      return;
    }
    const col = { key, label };
    setColumns((prev) => [...prev, col]);
    setRows((prev) => prev.map((r) => ({ ...r, [key]: "" })));
    setShowColModal(false);
    setNewColLabel("");
  };

  const updateCell = (id, key, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

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

  const moveRightByKey = (key) => {
    const i = indexOfKey(key);
    if (i === -1) return;
    const to = (i + 1) % columns.length; // melingkar
    moveColumnByIndex(i, to);
  };

  const moveLeftByKey = (key) => {
    const i = indexOfKey(key);
    if (i === -1) return;
    const to = (i - 1 + columns.length) % columns.length;
    moveColumnByIndex(i, to);
  };

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

  const toggleMenu = (key) => {
    setOpenMenuKey((cur) => (cur === key ? null : key));
  };

  // tutup ring bila klik di luar header
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
          <span className="emoji" aria-hidden>📋</span>
          <h1>Data IWKL</h1>
        </div>

        <div className="actions">
          <input
            className="search"
            placeholder="Cari perusahaan/pemilik/alamat…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn ghost" onClick={() => setShowColModal(true)}>
            + Tambah Kolom
          </button>
          <button className="btn primary" onClick={addRow}>
            + Tambah Baris
          </button>
        </div>
      </header>

      <div className="card">
        <div className="table-scroll">
          <table className="kawaii-table">
            <thead>
              <tr>
                <th>No</th>
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
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename();
                              if (e.key === 'Escape') setRenamingKey(null);
                            }}
                          />
                        </div>
                      ) : (
                        <button
                          className="th-toggle"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMenu(c.key);
                          }}
                          aria-haspopup="true"
                          aria-expanded={openMenuKey === c.key}
                        >
                          {c.label}
                        </button>
                      )}

                      {/* RING CONTROL CANTIK + ORBIT LUAR */}
                      {openMenuKey === c.key && (
                        <>
                          {/* RING UTAMA */}
                          <div className="th-ring pretty" role="group" aria-label={`Atur kolom ${c.label}`}>
                            <div className="ring-aura" aria-hidden />
                            <button className="ring-btn ring-top" onClick={() => moveStart(c.key)} aria-label="Ke awal">⏮</button>
                            <button className="ring-btn ring-left" onClick={() => moveLeftByKey(c.key)} aria-label="Geser kiri">◀</button>
                            <button className="ring-btn ring-right" onClick={() => moveRightByKey(c.key)} aria-label="Geser kanan">▶</button>
                            <button className="ring-btn ring-bottom" onClick={() => moveEnd(c.key)} aria-label="Ke akhir">⏭</button>
                          </div>

                          {/* ORBIT LUAR UNTUK CHIP AKSI */}
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
              {filtered.map((r, idx) => (
                <tr key={r.id}>
                  <td>{idx + 1}</td>

                  {columns.map((c) => {
                    if (c.key === "loket") {
                      return (
                        <td key={c.key}>
                          <select
                            value={r.loket}
                            onChange={(e) => updateCell(r.id, "loket", e.target.value)}
                          >
                            {LOKET_OPTS.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </td>
                      );
                    }
                    if (c.key === "kelas") {
                      return (
                        <td key={c.key}>
                          <select
                            value={r.kelas}
                            onChange={(e) => updateCell(r.id, "kelas", e.target.value)}
                          >
                            {KELAS_OPTS.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </td>
                      );
                    }
                    if (c.key === "tglLahir") {
                      return (
                        <td key={c.key}>
                          <input
                            type="date"
                            value={r.tglLahir || ""}
                            onChange={(e) => updateCell(r.id, "tglLahir", e.target.value)}
                          />
                        </td>
                      );
                    }
                    if (c.key === "noKontak") {
                      return (
                        <td key={c.key}>
                          <input
                            type="tel"
                            pattern="[0-9+\\-\\s]+"
                            value={r.noKontak || ""}
                            onChange={(e) => updateCell(r.id, "noKontak", e.target.value)}
                            placeholder="08xx…"
                          />
                        </td>
                      );
                    }
                    // default: text input
                    return (
                      <td key={c.key}>
                        <input
                          type="text"
                          value={r[c.key] ?? ""}
                          onChange={(e) => updateCell(r.id, c.key, e.target.value)}
                          placeholder={c.label}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td className="empty" colSpan={columns.length + 1}>
                    Tidak ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal tambah kolom */}
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
              <button className="btn ghost" onClick={() => setShowColModal(false)}>
                Batal
              </button>
              <button className="btn primary" onClick={addColumn}>
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
