import React, { useMemo, useState } from "react";

/* ===== Tema Cinnamoroll + warna status ===== */
const THEME = {
  sky: "#C4DEF7",
  skySoft: "#F4F9FF",
  cloud: "#FFFFFF",
  border: "#E6F0FB",
  ink: "#143A59",
  muted: "#6C7B93",
  plan: { bg: "#FBF1CF", border: "#F1E0A7", fg: "#5f4a00", label: "Terjadwal CRM / DTD sesuai angka target" },
  done: { bg: "#BEEA85", border: "#9BD260", fg: "#0b3d16", label: "Sudah dilaksanakan sesuai jadwal & target" },
  off:  { bg: "#FFF46A", border: "#E7D93A", fg: "#5a5200", label: "Sudah dilaksanakan, namun tidak sesuai target" },
  late: { bg: "#F7B594", border: "#E89574", fg: "#5c2406", label: "Belum dilaksanakan sesuai jadwal" },
  none: { bg: "#D9DDE4", border: "#C9CED8", fg: "#2b3445", label: "Tidak ada outstanding (kosong)" },
};

/* ===== Helper tanggal ===== */
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOWS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/* ===== Data pegawai contoh ===== */
const peopleKanwil = [
  "Dimas Andaru","Siti Isrizkiah","Rahmalina","Imelda Kusumastuti","M. Abrar Anas",
  "Riska Sisilia Sirait","Astriningsih","Elvan Rahmat","Dery Sulaiman","Angga Dana",
  "Iin Indrayana","Fauzan Ramon","Tengku Fachrozi","Acep Yuhendra","Erdanata",
  "Haris Amanatillah","Akhiril Anwar","Gema Alief","Nugroho Devianto",
].map((n,i)=>({ id:`kw-${i+1}`, name:n, handle:"", loket:"kanwil" }));

const peopleDumai = [
  "Dayu","Teguh Widodo","Arridho Yunanda","Budi Pujo Santoso","Raditya Pratama","Oktariadi Fajri",
].map((n,i)=>({ id:`dm-${i+1}`, name:n, handle:"", loket:"dumai" }));

const initials = (name) => {
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] || "A") + (p[1]?.[0] || "");
};

export default function RKJadwal() {
  // waktu
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // daftar tahun ±100
  const YEARS = useMemo(() => {
    const start = today.getFullYear() - 100;
    return Array.from({ length: 201 }, (_, i) => start + i);
  }, []);

  // data
  const [people, setPeople] = useState([...peopleKanwil, ...peopleDumai]);
  // entri: { id, pid, date, status, value, note }
  const [entries, setEntries] = useState([]);

  // UI & filter
  const [loketTab, setLoketTab] = useState("kanwil");
  const [statusFilter, setStatusFilter] = useState("all");

  // modal entry
  const [entryModal, setEntryModal] = useState(null);
  // modal tambah pegawai
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLoket, setNewLoket] = useState("kanwil");

  const totalDays = daysInMonth(year, month);
  const daysArr = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays]);

  const shownPeople = useMemo(() => people.filter(p => p.loket === loketTab), [people, loketTab]);

  // map entri
  const entryMap = useMemo(() => {
    const m = new Map();
    for (const e of entries) m.set(`${e.pid}|${e.date}`, e);
    return m;
  }, [entries]);

  const isStatusShown = (status) => (statusFilter === "all" ? true : status === statusFilter);

  /* ===== CRUD entry ===== */
  const openCreate = (pid, d) => setEntryModal({ mode:"create", pid, y:year, m:month, d, status:"plan", value:"", note:"" });
  const openEdit   = (pid, d, e) => setEntryModal({ mode:"edit", id:e.id, pid, y:year, m:month, d, status:e.status, value:String(e.value ?? ""), note:e.note ?? "" });
  const closeModal = () => setEntryModal(null);

  const saveEntry = (ev) => {
    ev.preventDefault();
    if (!entryModal) return;
    const { mode, id, pid, y, m, d, status } = entryModal;
    const valueNum = Number(entryModal.value || 0);
    const dk = dateKey(y, m, d);

    if (mode === "create") {
      const exist = entries.find(en => en.pid===pid && en.date===dk);
      if (exist) {
        setEntries(prev => prev.map(en => en.id===exist.id ? { ...exist, status, value:valueNum, note:entryModal.note } : en));
      } else {
        setEntries(prev => [...prev, { id:`e-${Date.now()}`, pid, date:dk, status, value:valueNum, note:entryModal.note }]);
      }
    } else {
      setEntries(prev => prev.map(en => en.id===id ? { ...en, status, value:valueNum, note:entryModal.note } : en));
    }
    closeModal();
  };

  const deleteEntry = () => {
    if (!entryModal?.id) return;
    setEntries(prev => prev.filter(en => en.id !== entryModal.id));
    closeModal();
  };

  /* ===== CRUD people ===== */
  const addPerson = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const id = `np-${Date.now()}`;
    setPeople(prev => [...prev, { id, name:newName.trim(), handle:"", loket:newLoket }]);
    setNewName(""); setNewLoket("kanwil"); setAddOpen(false);
  };

  const editPerson = (pid) => {
    const p = people.find(x => x.id === pid);
    if (!p) return;
    const newLabel = window.prompt("Ubah nama pegawai:", p.name);
    if (newLabel && newLabel.trim()) {
      setPeople(prev => prev.map(x => x.id === pid ? { ...x, name:newLabel.trim() } : x));
    }
  };

  const deletePerson = (pid) => {
    const p = people.find(x => x.id === pid);
    if (!p) return;
    const ok = window.confirm(`Hapus pegawai "${p.name}"? Semua entri terkait juga akan dihapus.`);
    if (!ok) return;
    setPeople(prev => prev.filter(x => x.id !== pid));
    setEntries(prev => prev.filter(e => e.pid !== pid));
  };

  /* ===== Style helper ===== */
  const statusStyle = (status) => ({
    background: THEME[status].bg,
    color: THEME[status].fg,
    border: `1px solid ${THEME[status].border}`,
  });

  // total per pegawai
  const totalFor = (pid) => {
    let sum = 0;
    for (let d of daysArr) {
      const dk = dateKey(year, month, d);
      const e = entryMap.get(`${pid}|${dk}`);
      if (e && typeof e.value === "number") sum += e.value;
    }
    return sum;
  };

  return (
    <>
      <style>{`
:root{
  --ink:${THEME.ink}; --muted:${THEME.muted}; --sky:${THEME.sky}; --cloud:${THEME.cloud}; --border:${THEME.border}; --skySoft:${THEME.skySoft};
  --cellW:72px;
  --nameCol: calc(var(--cellW) * 4);
}
*{ box-sizing:border-box; }

.wrap{ display:grid; gap:14px; max-width:1200px; margin:0 auto; padding:12px; }

/* Topbar tetap boleh sticky, tapi minta kamu tadi sticky kiri dihapus */
.topbar{ position:sticky; top:12px; z-index:60; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px; background:linear-gradient(180deg,var(--cloud),var(--skySoft)); border:1px solid var(--border); border-radius:18px; box-shadow:0 14px 34px rgba(20,58,89,.06); }
.tabs{ display:flex; gap:8px; }
.tab{ border:1px solid var(--border); background:var(--cloud); border-radius:999px; padding:8px 12px; font-weight:900; color:#1a4a75; cursor:pointer }
.tab.active{ background:var(--sky); border-color:var(--sky) }
.filters{ display:flex; gap:8px; flex-wrap:wrap; align-items:center }
.select,.input{ border:1px solid var(--border); background:var(--cloud); border-radius:10px; padding:8px 10px; font-weight:700; color:#1a4a75 }
.input{ min-width:200px }

.card{ background:linear-gradient(180deg,var(--cloud),var(--skySoft)); border:1px solid var(--border); border-radius:18px; padding:12px; box-shadow:0 14px 34px rgba(20,58,89,.06) }
.legend{ display:flex; gap:18px; flex-wrap:wrap }
.litem{ display:flex; align-items:center; gap:8px; color:var(--ink) }
.box{ width:18px; height:12px; border-radius:6px; border:1px solid var(--border) }

.btn{ border:1px solid var(--border); background:var(--cloud); border-radius:12px; padding:8px 12px; font-weight:900; color:#1a4a75; cursor:pointer }
.btn.primary{ background:var(--sky); border-color:var(--sky) }

/* ===== Tabel ===== */
.table{
  border:1px solid var(--border); border-radius:18px; overflow:auto; background:var(--cloud);
  box-shadow:0 14px 34px rgba(20,58,89,.05);
  max-height:70vh;
}
/* header & rows share column scheme */
.header, .row{ display:grid; grid-template-columns: var(--nameCol) 1fr 120px; }
.header{ border-bottom:1px solid var(--border); background:var(--skySoft); }
.h-left{ padding:10px; font-weight:900; color:var(--ink); border-right:1px solid var(--border); /* sticky removed */ }
.h-right{ overflow:visible; }
.h-grid, .grid{ min-width: calc(var(--cellW) * var(--cols)); display:grid; grid-template-columns: repeat(var(--cols), var(--cellW)); }
.hcell, .cell{ border-left:1px solid var(--border); }
.hcell{ padding:8px 6px; text-align:center; font-weight:900; color:var(--ink); background:var(--skySoft); }
.hsub{ display:block; color:var(--muted); font-size:11px }
.h-total{ padding:10px; font-weight:900; color:var(--ink); border-left:1px solid var(--border); background:var(--skySoft) }

/* Row kiri: sticky DIHAPUS -> static */
.left{ background:linear-gradient(180deg,#f7fbff,var(--cloud)); border-right:1px solid var(--border); }
.pers{ display:grid; grid-template-columns: 34px 1fr auto; align-items:center; gap:10px; padding:10px }
.ava{ width:30px; height:30px; border-radius:999px; border:2px solid var(--sky); background:var(--skySoft); display:grid; place-items:center; font-weight:900; color:#1a4a75 }
.name{ font-weight:900; color:var(--ink) }
.handle{ font-size:12px; color:var(--muted) }
.p-actions{ display:flex; gap:6px; }
.p-btn{ border:1px solid var(--border); background:var(--cloud); border-radius:8px; padding:6px 8px; font-weight:900; color:#1a4a75; cursor:pointer; }
.p-btn.danger{ color:#b91c1c; }

.right{ overflow:visible; }
.grid{ }
.cell{ height:44px; position:relative; cursor:pointer; background:#fff; }
.cell:nth-child(odd){ background:#fbfdff; }
.cell:hover{ background:#f0f7ff; }

.badge{ position:absolute; left:4px; right:4px; top:7px; height:30px; border-radius:10px; border:1px solid; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:12px }

.total{ padding:10px; border-left:1px solid var(--border); font-weight:900; color:var(--ink); text-align:center; background:#fff }

/* Modal */
.modal{ position:fixed; inset:0; display:grid; place-items:center; background:rgba(0,0,0,.25); z-index:70 }
.sheet{ width:420px; background:var(--cloud); border:1px solid var(--border); border-radius:16px; padding:14px; box-shadow:0 28px 80px rgba(20,58,89,.2) }
.sheet h3{ margin:4px 0 10px; color:var(--ink) }
.field{ display:flex; flex-direction:column; gap:6px; margin-bottom:10px }
.label{ font-weight:900; color:var(--ink) }
.note{ border:1px solid var(--border); border-radius:10px; padding:8px 10px; min-height:90px; resize:vertical }
.actions{ display:flex; gap:8px; justify-content:flex-end }

/* Scrollbar (opsional, WebKit) */
.table::-webkit-scrollbar{ height:10px; width:10px; }
.table::-webkit-scrollbar-thumb{ background:#93c5fd; border-radius:999px; }
.table::-webkit-scrollbar-track{ background:#e0f2fe; border-radius:999px; }

@media (max-width: 980px){
  .table{ max-height: 60vh; }
  :root{ --cellW: 64px; }
}

/* ==== NO-STICKY MODE ==== */
.topbar{ position: static !important; }
.h-left,
.left{ position: static !important; }

/* ==== Grid alignment hardening ==== */
.h-grid, .grid{
  /* kita set kolom via inline style (JSX) */
  min-width: auto !important;
  column-gap: 0;
}
.hcell, .cell{
  box-sizing: border-box;
  border-left: 1px solid var(--border);
}
.hcell:last-child,
.cell:last-child{
  border-right: 1px solid var(--border);
}

/* padding header & body seragam biar visual sejajar */
.hcell{ padding: 8px 6px; }
.cell { padding: 0; }          /* biar badge pas di tengah track */
.badge{ left:4px; right:4px; } /* tetap rapi di dalam track */

/* === BALIKKAN STICKY NAMA PEGAWAI (header & body) === */
.h-left,
.left{
  position: sticky !important;
  left: 0;
  z-index: 5;                    /* di atas grid tanggal */
  background: linear-gradient(180deg,#f7fbff,var(--cloud));
  border-right: 1px solid var(--border);
}

/* header nama sedikit di atas body supaya garisnya nggak ketutup */
.h-left{ z-index: 6; background: var(--skySoft); }

/* garis bayangan halus di sisi kanan biar kontras saat scroll */
.h-left::after,
.left::after{
  content: "";
  position: absolute;
  top: 0; right: -1px; bottom: 0; width: 1px;
  background: var(--border);
}
/* === STICKY HEADER: baris tanggal nempel di atas saat scroll === */
.table{ position: relative; } /* konteks buat sticky */

.header{
  position: sticky;
  top: 0;
  z-index: 7;                          /* di atas isi grid & kolom nama */
  background: var(--skySoft);          /* sama seperti sebelumnya */
  border-bottom: 1px solid var(--border);
}

/* perkuat kontras batas bawah header */
.header::after{
  content:"";
  position:absolute;
  left:0; right:0; bottom:-1px; height:1px;
  background: var(--border);
}

/* pastikan sel header tanggal tampil solid & sejajar garis grid */
.hcell{
  background: var(--skySoft);
  border-left: 1px solid var(--border);
}
.hcell:last-child{ border-right: 1px solid var(--border); }

/* body cell tetap pakai garis yang sama biar lurus */
.cell{
  border-left: 1px solid var(--border);
}
.cell:last-child{ border-right: 1px solid var(--border); }

      `}</style>

      <div className="wrap">
        {/* Top */}
        <div className="topbar">
          <div className="tabs">
            <button className={`tab ${loketTab==="kanwil"?"active":""}`} onClick={()=>setLoketTab("kanwil")}>📍 Loket Kanwil</button>
            <button className={`tab ${loketTab==="dumai"?"active":""}`} onClick={()=>setLoketTab("dumai")}>📍 Loket Dumai</button>
          </div>
          <div className="filters">
            <select className="select" value={month} onChange={(e)=>setMonth(+e.target.value)}>
              {MONTHS.map((m,i)=><option value={i} key={m}>{m}</option>)}
            </select>
            <select className="select" value={year} onChange={(e)=>setYear(+e.target.value)}>
              {YEARS.map(y=> <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="select" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}>
              <option value="all">Semua status</option>
              <option value="plan">Terjadwal</option>
              <option value="done">Sesuai target</option>
              <option value="off">Tak sesuai target</option>
              <option value="late">Belum sesuai jadwal</option>
              <option value="none">Tidak ada outstanding</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="card">
          <div className="legend">
            <div className="litem"><span className="box" style={{background:THEME.plan.bg, borderColor:THEME.plan.border}} />{THEME.plan.label}</div>
            <div className="litem"><span className="box" style={{background:THEME.done.bg, borderColor:THEME.done.border}} />{THEME.done.label}</div>
            <div className="litem"><span className="box" style={{background:THEME.off.bg, borderColor:THEME.off.border}} />{THEME.off.label}</div>
            <div className="litem"><span className="box" style={{background:THEME.late.bg, borderColor:THEME.late.border}} />{THEME.late.label}</div>
            <div className="litem"><span className="box" style={{background:THEME.none.bg, borderColor:THEME.none.border}} />{THEME.none.label}</div>
          </div>
        </div>

        {/* Tambah pegawai */}
        <div className="card" style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <strong style={{color:THEME.ink}}>Pegawai</strong>
          <button className="btn primary" onClick={()=>setAddOpen(true)}>+ Tambah Pegawai</button>
        </div>

        {/* Tabel jadwal */}
        <div className="table" style={{"--cols": totalDays}}>
          {/* header */}
          <div className="header">
            <div className="h-left">Nama Pegawai</div>
            <div className="h-right">
              <div className="h-grid" style={{ gridTemplateColumns: `repeat(${totalDays}, var(--cellW))` }}>
                {daysArr.map(d=> (
                  <div className="hcell" key={d}>
                    {d}
                    <span className="hsub">{DOWS[new Date(year, month, d).getDay()]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-total">Total Target (PO)</div>
          </div>

          {/* baris */}
          {shownPeople.map((p)=>(
            <div className="row" key={p.id}>
              <div className="left">
                <div className="pers">
                  <div className="ava">{initials(p.name)}</div>
                  <div>
                    <div className="name">{p.name}</div>
                    {p.handle ? <div className="handle">{p.handle}</div> : null}
                  </div>
                  {/* Aksi edit/delete pegawai */}
                  <div className="p-actions">
                    <button className="p-btn" onClick={()=>editPerson(p.id)}>Edit</button>
                    <button className="p-btn danger" onClick={()=>deletePerson(p.id)}>Delete</button>
                  </div>
                </div>
              </div>

              <div className="right">
                <div className="grid" style={{ gridTemplateColumns: `repeat(${totalDays}, var(--cellW))` }}>
                  {daysArr.map((d)=>{
                    const dk = dateKey(year, month, d);
                    const entry = entryMap.get(`${p.id}|${dk}`);
                    const show = entry ? isStatusShown(entry.status) : statusFilter==="all" || statusFilter==="none";
                    return (
                      <div
                        key={`${p.id}-${dk}`}
                        className="cell"
                        onClick={()=>{ if(!entry) openCreate(p.id, d); }}
                        title={entry ? `${THEME[entry.status].label}${entry.value?` — ${entry.value}`:""}${entry.note?` • ${entry.note}`:""}` : "Klik untuk menambah entri"}
                      >
                        {entry && show && (
                          <div
                            className="badge"
                            style={statusStyle(entry.status)}
                            onClick={(ev)=>{ev.stopPropagation(); openEdit(p.id, d, entry);}}
                          >
                            {entry.value ?? ""}
                          </div>
                        )}
                        {!entry && statusFilter==="none" && (
                          <div className="badge" style={statusStyle("none")} onClick={(ev)=>{ev.stopPropagation(); openCreate(p.id, d);}} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="total">{totalFor(p.id)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal entri */}
      {entryModal && (
        <div className="modal" onClick={closeModal}>
          <div className="sheet" onClick={(e)=>e.stopPropagation()}>
            <h3>{entryModal.mode==="create" ? "Buat Entri" : "Ubah Entri"}</h3>
            <div style={{color:THEME.muted, marginBottom:10}}>
              {MONTHS[entryModal.m]} {entryModal.d}, {entryModal.y}
            </div>

            <form onSubmit={saveEntry}>
              <div className="field">
                <label className="label">Status</label>
                <select
                  className="select"
                  value={entryModal.status}
                  onChange={(e)=>setEntryModal(s=>({...s, status:e.target.value}))}
                >
                  <option value="plan">{THEME.plan.label}</option>
                  <option value="done">{THEME.done.label}</option>
                  <option value="off">{THEME.off.label}</option>
                  <option value="late">{THEME.late.label}</option>
                  <option value="none">{THEME.none.label}</option>
                </select>
              </div>

              <div className="field">
                <label className="label">Angka (PO)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="contoh: 1, 2, 3…"
                  value={entryModal.value}
                  onChange={(e)=>setEntryModal(s=>({...s, value:e.target.value}))}
                />
              </div>

              <div className="field">
                <label className="label">Keterangan</label>
                <textarea
                  className="note"
                  placeholder="opsional"
                  value={entryModal.note}
                  onChange={(e)=>setEntryModal(s=>({...s, note:e.target.value}))}
                />
              </div>

              <div className="actions">
                {entryModal.mode==="edit" && (
                  <button className="btn" type="button" onClick={deleteEntry} style={{color:"#b91c1c"}}>Hapus</button>
                )}
                <button className="btn" type="button" onClick={closeModal}>Batal</button>
                <button className="btn primary" type="submit">{entryModal.mode==="create" ? "Simpan" : "Perbarui"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal tambah pegawai */}
      {addOpen && (
        <div className="modal" onClick={()=>setAddOpen(false)}>
          <div className="sheet" onClick={(e)=>e.stopPropagation()}>
            <h3>Tambah Pegawai</h3>
            <form onSubmit={addPerson}>
              <div className="field">
                <label className="label">Nama lengkap</label>
                <input className="input" value={newName} onChange={(e)=>setNewName(e.target.value)} placeholder="Nama lengkap" />
              </div>
              <div className="field">
                <label className="label">Loket</label>
                <select className="select" value={newLoket} onChange={(e)=>setNewLoket(e.target.value)}>
                  <option value="kanwil">Loket Kanwil</option>
                  <option value="dumai">Loket Dumai</option>
                </select>
              </div>
              <div className="actions">
                <button className="btn" type="button" onClick={()=>setAddOpen(false)}>Batal</button>
                <button className="btn primary" type="submit">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
