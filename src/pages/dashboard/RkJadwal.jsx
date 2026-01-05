import React, { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

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

const initials = (name) => {
  const p = (name || "").trim().split(/\s+/);
  return (p[0]?.[0] || "A") + (p[1]?.[0] || "");
};

const ensureSamsat = async (name, loket) => {
  if (!name?.trim()) return null;

  // cek dulu apakah sudah ada
  const { data: existing } = await supabase
    .from("samsat")
    .select("id")
    .ilike("name", name.trim())
    .maybeSingle();

  if (existing?.id) return existing.id;

  // kalau belum ada → insert baru
  const { data, error } = await supabase
    .from("samsat")
    .insert({
      name: name.trim(),
      loket: loket || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Gagal insert samsat:", error);
    return null;
  }

  return data.id;
};

export default function RKJadwal() {
  // waktu
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const tableRef = useRef(null);
  const headerLeftRef = useRef(null);
  const headerGridRef = useRef(null);
  const firstGridRef = useRef(null);  

  // helper: apakah tanggal = hari ini pada bulan yg sedang dilihat
  const isToday = (y, m, d) =>
    y === today.getFullYear() && m === today.getMonth() && d === today.getDate();

  // daftar tahun ±100
  const YEARS = useMemo(() => {
    const start = today.getFullYear() - 100;
    return Array.from({ length: 201 }, (_, i) => start + i);
  }, []);

  // ==== STATE dari Supabase ====
  const [people, setPeople] = useState([]);
  const [entries, setEntries] = useState([]);
  const [samsats, setSamsats] = useState([]);
  const normalizePeople = (rows = []) =>
  rows.map(p => ({
    ...p,
    loket: p.samsat?.loket || p.loket,
    samsat_name: p.samsat?.name || null,
  }));

  // UI & filter
  const [loketTab, setLoketTab] = useState("kanwil");
  const [statusFilter, setStatusFilter] = useState("all");

  // modal entry
  const [entryModal, setEntryModal] = useState(null);

  // modal tambah pegawai
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSamsatId, setNewSamsatId] = useState("");
  const [newSamsatText, setNewSamsatText] = useState("");
  const [newLoket, setNewLoket] = useState("");  
  const selectedSamsat = useMemo(
    () => samsats.find(s => String(s.id) === String(newSamsatId)),
    [samsats, newSamsatId]
  );

  useEffect(() => {
    if (selectedSamsat?.loket) {
      setNewLoket(selectedSamsat.loket);
    }
  }, [selectedSamsat]);

  // modal edit pegawai
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLoket, setEditLoket] = useState("kanwil");
  const [editSamsatId, setEditSamsatId] = useState("");
  const [editSamsatText, setEditSamsatText] = useState("");
  const selectedEditSamsat = useMemo(
    () => samsats.find(s => String(s.id) === String(editSamsatId)),
    [samsats, editSamsatId]
  );

  useEffect(() => {
    if (selectedEditSamsat?.loket) {
      setEditLoket(selectedEditSamsat.loket);
    }
  }, [selectedEditSamsat]);

  // modal confirm hapus pegawai
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // {id, name}

  const totalDays = daysInMonth(year, month);
  const daysArr = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays]);

  const shownPeople = useMemo(() => people.filter(p => p.loket === loketTab), [people, loketTab]);

  useEffect(() => {
    const isCurrentMonth =
      year === today.getFullYear() && month === today.getMonth();
    const idx = (isCurrentMonth ? today.getDate() : 1) - 1;

    // PRIORITAS: scroll ke sel BODY baris pertama
    const targetBody = firstGridRef.current?.children?.[idx];
    if (targetBody && typeof targetBody.scrollIntoView === "function") {
      requestAnimationFrame(() => {
        targetBody.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" });
      });
      return; // selesai
    }

    // fallback (kalau belum ada baris): pakai header
    const targetHead = headerGridRef.current?.children?.[idx];
    if (targetHead && typeof targetHead.scrollIntoView === "function") {
      requestAnimationFrame(() => {
        targetHead.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" });
      });
    }
  }, [year, month, shownPeople.length]);

  // map entri
  const entryMap = useMemo(() => {
    const m = new Map();
    for (const e of entries) m.set(`${e.pid}|${e.date}`, e);
    return m;
  }, [entries]);

  const isStatusShown = (status) => (statusFilter === "all" ? true : status === statusFilter);

  /* ====== SUPABASE LOADERS ====== */
  const loadPeople = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select(`
        id,
        name,
        handle,
        loket,
        samsat:samsat_id (
          id,
          name,
          loket
        )
      `)
      .order("name", { ascending: true });
    if (error) {
      console.error("loadPeople error:", error);
      return;
    }
    setPeople(normalizePeople(data));
  };

  const loadEntriesForMonth = async (y, m) => {
    const startISO = new Date(y, m, 1).toISOString().slice(0,10);
    const endISO   = new Date(y, m + 1, 1).toISOString().slice(0,10);
    const { data, error } = await supabase
      .from("rkj_entries")
      .select("id,pid,date,status,value,note")
      .gte("date", startISO)
      .lt("date", endISO);
    if (error) {
      console.error("loadEntries error:", error);
      return;
    }
    setEntries(data || []);
  };

  const loadSamsat = async () => {
    const { data, error } = await supabase
      .from("samsat")
      .select("id,name,loket")
      .order("name", { ascending: true });

    if (error) {
      console.error("loadSamsat error:", error);
      return;
    }

    setSamsats(data || []);
  };

  useEffect(() => {
    loadPeople();
    loadSamsat();
  }, []);
  useEffect(() => { loadEntriesForMonth(year, month); }, [year, month]);

  /* ===== CRUD entry (Supabase) ===== */
  const openCreate = (pid, d) => setEntryModal({ mode:"create", pid, y:year, m:month, d, status:"plan", value:"", note:"" });
  const openEdit   = (pid, d, e) => setEntryModal({ mode:"edit", id:e.id, pid, y:year, m:month, d, status:e.status, value:String(e.value ?? ""), note:e.note ?? "" });
  const closeModal = () => setEntryModal(null);

  const saveEntry = async (ev) => {
    ev.preventDefault();
    if (!entryModal) return;
    const { mode, id, pid, y, m, d, status } = entryModal;
    const valueNum = Number(entryModal.value || 0);
    const dk = dateKey(y, m, d);

    if (mode === "create") {
      // upsert by (pid,date)
      const { error } = await supabase
        .from("rkj_entries")
        .upsert({ pid, date: dk, status, value: valueNum, note: entryModal.note }, { onConflict: "pid,date" });
      if (error) {
        console.error("upsert entry error:", error);
      } else {
        await loadEntriesForMonth(year, month);
      }
    } else {
      const { error } = await supabase
        .from("rkj_entries")
        .update({ status, value: valueNum, note: entryModal.note })
        .eq("id", id);
      if (error) {
        console.error("update entry error:", error);
      } else {
        setEntries(prev => prev.map(en => en.id===id ? { ...en, status, value:valueNum, note:entryModal.note } : en));
      }
    }
    closeModal();
  };

  const deleteEntry = async () => {
    if (!entryModal?.id) return;
    const { error } = await supabase.from("rkj_entries").delete().eq("id", entryModal.id);
    if (error) {
      console.error("delete entry error:", error);
    } else {
      setEntries(prev => prev.filter(en => en.id !== entryModal.id));
    }
    closeModal();
  };

  const addPerson = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (!newLoket) {
      alert("Loket wajib diisi");
      return;
    }

    let samsatIdFinal = newSamsatId;

    if (!samsatIdFinal && newSamsatText.trim()) {
      samsatIdFinal = await ensureSamsat(newSamsatText, newLoket);
      await loadSamsat();
    }

    const payload = {
      name: newName.trim(),
      handle: "",
      samsat_id: samsatIdFinal || null,
      loket: newLoket,
    };

    const { data, error } = await supabase
      .from("employees")
      .insert(payload)
      .select();

    if (error) {
      console.error("add person error:", error);
      return;
    }

    if (data?.length) setPeople((prev) => [...prev, data[0]]);

    setNewName("");
    setNewSamsatId("");
    setNewSamsatText("");
    setNewLoket("");
    setAddOpen(false);
  };

  const editPerson = (pid) => {
    const p = people.find(x => x.id === pid);
    if (!p) return;

    setEditId(pid);
    setEditName(p.name || "");
    setEditLoket(p.loket || "");
    setEditSamsatId(p.samsat_id || "");
    setEditSamsatText(p.samsat_name || "");
    setEditOpen(true);
  };

  const updatePerson = async (e) => {
    e.preventDefault();
    if (!editId || !editName.trim()) return;
    if (!editLoket) {
      alert("Loket wajib diisi");
      return;
    }

    let samsatIdFinal = editSamsatId;

    // 👉 kalau manual diketik
    if (!samsatIdFinal && editSamsatText.trim()) {
      samsatIdFinal = await ensureSamsat(editSamsatText, editLoket);
      await loadSamsat(); // refresh opsi
    }

    const payload = {
      name: editName.trim(),
      loket: editLoket,
      samsat_id: samsatIdFinal || null,
    };

    const { error } = await supabase
      .from("employees")
      .update(payload)
      .eq("id", editId);

    if (error) {
      console.error("update person error:", error);
      return;
    }

    setPeople((prev) =>
      prev.map((p) =>
        p.id === editId ? { ...p, ...payload } : p
      )
    );

    setEditOpen(false);
    setEditId(null);
    setEditName("");
    setEditLoket("");
    setEditSamsatId("");
    setEditSamsatText("");
  };

  const deletePerson = (pid) => {
    const p = people.find(x => x.id === pid);
    if (!p) return;

    setDeleteTarget({ id: pid, name: p.name });
    setDeleteOpen(true);
  };

  const confirmDeletePerson = async () => {
    if (!deleteTarget?.id) return;

    const pid = deleteTarget.id;

    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", pid);

    if (error) {
      console.error("delete person error:", error);
      return;
    }

    // update UI
    setPeople(prev => prev.filter(x => x.id !== pid));
    setEntries(prev => prev.filter(e => e.pid !== pid));

    // close modal & reset
    setDeleteOpen(false);
    setDeleteTarget(null);

    // kalau lagi buka modal edit dan yang dihapus itu orangnya → tutup juga
    if (editId === pid) {
      setEditOpen(false);
      setEditId(null);
      setEditName("");
      setEditLoket("kanwil");
    }
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
      {/* === style inline kamu tetap dipertahankan persis === */}
      {/* ... (style block kamu yang panjang) ... */}
      <style>{`
:root{
  --ink:${THEME.ink}; --muted:${THEME.muted}; --sky:${THEME.sky}; --cloud:${THEME.cloud}; --border:${THEME.border}; --skySoft:${THEME.skySoft};
  --cellW:72px;
  --nameCol: calc(var(--cellW) * 4);
}
*{ box-sizing:border-box; }
.wrap{ display:grid; gap:14px; max-width:1200px; margin:0 auto; padding:12px; }
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
.table{ border:1px solid var(--border); border-radius:18px; overflow:auto; background:var(--cloud); box-shadow:0 14px 34px rgba(20,58,89,.05); max-height:70vh; }
.header, .row{ display:grid; grid-template-columns: var(--nameCol) 1fr 120px; }
.header{ border-bottom:1px solid var(--border); background:var(--skySoft); }
.h-left{ position: sticky; left: 0; z-index: 8; padding:10px; font-weight:900; color:var(--ink); border-right:1px solid var(--border); background: var(--skySoft); }
.h-grid, .grid{ width: calc(var(--cellW) * var(--cols)); display:grid; grid-template-columns: repeat(var(--cols), var(--cellW)); border-left: 1px solid var(--border); }
.hcell, .cell{ border-left:1px solid var(--border); }
.h-grid > .hcell:first-child,
.grid  > .cell:first-child{
  border-left: none;
}
.hcell{ padding:8px 6px; text-align:center; font-weight:900; color:var(--ink); background:var(--skySoft); }
.hsub{ display:block; color:var(--muted); font-size:11px }
.h-total{ padding:10px; font-weight:900; color:var(--ink); border-left:1px solid var(--border); background:var(--skySoft) }
.left{ background:linear-gradient(180deg,#f7fbff,var(--cloud)); border-right:1px solid var(--border); position: sticky; left: 0; z-index: 6; }
.pers{ display:grid; grid-template-columns: 34px 1fr auto; align-items:center; gap:10px; padding:10px }
.ava{ width:30px; height:30px; border-radius:999px; border:2px solid var(--sky); background:var(--skySoft); display:grid; place-items:center; font-weight:900; color:#1a4a75 }
.name{ font-weight:900; color:var(--ink) }
.handle{ font-size:12px; color:var(--muted) }
.p-actions{ display:flex; gap:6px; }
.p-btn{ border:1px solid var(--border); background:var(--cloud); border-radius:8px; padding:6px 8px; font-weight:900; color:#1a4a75; cursor:pointer; }
.p-btn.danger{ color:#b91c1c; }
.cell{ height:44px; position:relative; cursor:pointer; background:#fff; }
.cell:nth-child(odd){ background:#fbfdff; }
.cell:hover{ background:#f0f7ff; }
.badge{ position:absolute; left:4px; right:4px; top:7px; height:30px; border-radius:10px; border:1px solid; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:12px }
.total{ padding:10px; border-left:1px solid var(--border); font-weight:900; color:var(--ink); text-align:center; background:#fff }
.modal{ position:fixed; inset:0; display:grid; place-items:center; background:rgba(0,0,0,.25); z-index:70 }
.sheet{ width:420px; background:var(--cloud); border:1px solid var(--border); border-radius:16px; padding:14px; box-shadow:0 28px 80px rgba(20,58,89,.2) }
.sheet h3{ margin:4px 0 10px; color:var(--ink) }
.field{ display:flex; flex-direction:column; gap:6px; margin-bottom:10px }
.label{ font-weight:900; color:var(--ink) }
.note{ border:1px solid var(--border); border-radius:10px; padding:8px 10px; min-height:90px; resize:vertical }
.actions{ display:flex; gap:8px; justify-content:flex-end }
.table::-webkit-scrollbar{ height:10px; width:10px; }
.table::-webkit-scrollbar-thumb{ background:#93c5fd; border-radius:999px; }
.table::-webkit-scrollbar-track{ background:#e0f2fe; border-radius:999px; }
.header, .row{
  grid-template-columns: var(--nameCol) minmax(0, 1fr) 120px;
}

/* middle column nge-clip isi yang kepanjangan */
.h-right, .right{
  overflow-x: auto;   /* kalau mau bisa scroll horizontal */
  overflow-y: hidden;
  min-width: 0;       /* penting untuk minmax(0,1fr) */
}

@media (max-width: 980px){
  .table{ max-height: 60vh; }
  :root{ --cellW: 64px; }
}
.header{ position: sticky; top: 0; z-index: 7; background: var(--skySoft); border-bottom: 1px solid var(--border); }
.header::after{ content:""; position:absolute; left:0; right:0; bottom:-1px; height:1px; background: var(--border); }
/* highlight kolom hari ini agar jelas */
.hcell.today,
.cell.today { position: relative; }

.hcell.today::after,
.cell.today::after{
  content:"";
  position:absolute; inset:0;
  background: rgba(147,197,253,.22); /* biru muda transparan */
  pointer-events:none;
}

/* pastikan header tetap 1:1 dengan grid body */
.h-grid, .grid{
  width: calc(var(--cellW) * var(--cols));
  display:grid;
  grid-template-columns: repeat(var(--cols), var(--cellW));
}
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
        <div className="table" style={{"--cols": totalDays}} ref={tableRef}>
          {/* header */}
          <div className="header">
            <div className="h-left" ref={headerLeftRef}>Nama Pegawai</div>
            <div className="h-right">
              <div className="h-grid" ref={headerGridRef} style={{ gridTemplateColumns: `repeat(${totalDays}, var(--cellW))` }}>
                {daysArr.map(d=> (
                  <div className={`hcell ${isToday(year, month, d) ? "today" : ""}`} key={d}>
                    {d}
                    <span className="hsub">{DOWS[new Date(year, month, d).getDay()]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-total">Total Target (PO)</div>
          </div>

          {/* baris */}
          {shownPeople.map((p, i)=>(
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
                <div
                  className="grid"
                  ref={i === 0 ? firstGridRef : null}
                  style={{
                    gridTemplateColumns: `repeat(${totalDays}, var(--cellW))`,
                    gap: 0,
                    columnGap: 0,
                    rowGap: 0,
                    width: "fit-content",
                    justifyContent: "start",
                  }}
                >
                  {daysArr.map((d)=>{
                    const dk = dateKey(year, month, d);
                    const entry = entryMap.get(`${p.id}|${dk}`);
                    const show = entry ? isStatusShown(entry.status) : statusFilter==="all" || statusFilter==="none";
                    return (
                      <div
                        key={`${p.id}-${dk}`}
                        className={`cell ${isToday(year, month, d) ? "today" : ""}`}
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
                <label className="label">Samsat</label>

                <select
                  className="select"
                  value={newSamsatId}
                  onChange={(e) => {
                    setNewSamsatId(e.target.value);
                    setNewSamsatText("");
                  }}
                >
                  <option value="">-- Pilih Samsat (opsional) --</option>
                  {samsats.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <input
                  className="input"
                  placeholder="Atau ketik samsat manual"
                  value={newSamsatText}
                  onChange={(e) => {
                    setNewSamsatText(e.target.value);
                    setNewSamsatId("");
                  }}
                />
              </div>
              <div className="field">
                <label className="label">Loket</label>
                <select
                  className="select"
                  value={newLoket}
                  onChange={(e)=>setNewLoket(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Loket --</option>
                  <option value="kanwil">Loket Kanwil</option>
                  <option value="dumai">Loket Dumai</option>
                </select>

                <small style={{ color: THEME.muted }}>
                  Loket bisa otomatis dari samsat, tapi tetap bisa diubah
                </small>
              </div>
              <div className="actions">
                <button className="btn" type="button" onClick={()=>setAddOpen(false)}>Batal</button>
                <button className="btn primary" type="submit">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal edit pegawai */}
      {editOpen && (
        <div className="modal" onClick={()=>setEditOpen(false)}>
          <div className="sheet" onClick={(e)=>e.stopPropagation()}>
            <h3>Edit Pegawai</h3>
            <form onSubmit={updatePerson}>
              <div className="field">
                <label className="label">Nama lengkap</label>
                <input
                  className="input"
                  value={editName}
                  onChange={(e)=>setEditName(e.target.value)}
                  placeholder="Nama lengkap"
                />
              </div>
              <div className="field">
                <label className="label">Samsat</label>

                <select
                  className="select"
                  value={editSamsatId}
                  onChange={(e) => {
                    setEditSamsatId(e.target.value);
                    setEditSamsatText("");
                  }}
                >
                  <option value="">-- Pilih Samsat (opsional) --</option>
                  {samsats.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <input
                  className="input"
                  placeholder="Atau ketik samsat manual"
                  value={editSamsatText}
                  onChange={(e) => {
                    setEditSamsatText(e.target.value);
                    setEditSamsatId("");
                  }}
                />
              </div>
              <div className="field">
                <label className="label">Loket</label>
                <select
                  className="select"
                  value={editLoket}
                  onChange={(e)=>setEditLoket(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Loket --</option>
                  <option value="kanwil">Loket Kanwil</option>
                  <option value="dumai">Loket Dumai</option>
                </select>

                <small style={{ color: THEME.muted }}>
                  Loket bisa otomatis dari samsat, tapi tetap bisa diubah
                </small>
              </div>

              <div className="actions">
                <button
                  className="btn"
                  type="button"
                  onClick={()=>setEditOpen(false)}
                >
                  Batal
                </button>
                <button className="btn primary" type="submit">
                  Perbarui
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal konfirmasi hapus pegawai (kawaii) */}
      {deleteOpen && deleteTarget && (
        <div className="modal" onClick={() => setDeleteOpen(false)}>
          <div className="sheet" onClick={(e)=>e.stopPropagation()}>
            <h3 style={{ display:"flex", alignItems:"center", gap:8 }}>
              🧁 Hapus Pegawai?
            </h3>

            <div style={{ color: THEME.muted, marginBottom: 12, lineHeight: 1.5 }}>
              Kamu yakin mau hapus
              {" "}
              <strong style={{ color: THEME.ink }}>{deleteTarget.name}</strong>?
              <br />
              Semua entri jadwal pegawai ini juga akan ikut terhapus.
            </div>

            <div className="actions">
              <button
                className="btn"
                type="button"
                onClick={() => setDeleteOpen(false)}
              >
                Batal
              </button>

              <button
                className="btn primary"
                type="button"
                onClick={confirmDeletePerson}
                style={{ background:"#F7B594", borderColor:"#F7B594", color:"#5c2406" }}
              >
                Ya, hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
