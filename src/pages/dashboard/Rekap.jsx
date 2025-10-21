import React, { useMemo, useState, useEffect, useRef } from "react";

/**
 * REKAP — Stabil di berbagai zoom
 * - Sticky header + 2 kolom kiri
 * - Kolom angka pakai clamp(min, ideal, max) → rapi, dan scroll-X bila sempit
 * - Toolbar, filter chips, density toggle, export CSV
 */

const RK_CSS = `
:root{
  --rk-bg:#f6f7fb; --rk-card:#fff; --rk-card-2:#fbfcff; --rk-border:#e5e8f0; --rk-soft:#f2f5fb;
  --rk-muted:#6b7280; --rk-ink:#0f172a; --rk-blue:#2563eb;

  /* lebar kolom sticky kiri */
  --col1: 12rem;     /* Nama pegawai */
  --col2: 9rem;      /* Loket */

  /* jumlah kolom non-sticky (set sesuai jumlah kolom angka) */
  --free-cols: 12;

  /* guardrail lebar kolom bebas */
  --free-min: 8rem;   /* naikkan jika masih sempit */
  --free-max: 14rem;  /* batas maksimal agar tak kelewat lebar */

  --radius: 12px;
  --shadow-1: 0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08);
}
*{box-sizing:border-box}
html,body,#root{height:100%}
button,input{font:inherit}

.rk-page{
  min-height:100%;
  background:radial-gradient(1100px 420px at 10% -10%,#e5f2ff 0%,rgba(229,242,255,0) 60%) var(--rk-bg);
  color:var(--rk-ink);
  font:12px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial,sans-serif;
}

/* Header */
.rk-header{position:sticky;top:0;z-index:40;backdrop-filter:saturate(120%) blur(8px);background:rgba(255,255,255,.88);border-bottom:1px solid var(--rk-border)}
.rk-header__inner{display:flex;gap:.75rem;align-items:center;padding:.6rem 1rem;font-weight:700}
.rk-badge{font-size:.7rem;font-weight:600;color:#0369a1;background:#e0f2fe;border:1px solid #bae6fd;border-radius:999px;padding:.1rem .45rem}

/* Layout */
.rk-body{display:flex;min-height:0;height:calc(100vh - 98px)}
.rk-sidebar{width:220px;border-right:1px solid var(--rk-border);background:linear-gradient(180deg,#fff,#fbfcff);overflow:auto}
.rk-main{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;min-width:0}

/* Toolbar */
.rk-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;padding:.7rem 1rem .6rem}
.rk-toolbar__right{margin-left:auto;display:flex;align-items:center;gap:.4rem}
.rk-label{font-size:.8rem;color:var(--rk-muted)}
.rk-input{height:30px;border:1px solid var(--rk-border);border-radius:10px;padding:.25rem .5rem;background:#fff}
.rk-btn{display:inline-flex;align-items:center;gap:.4rem;height:30px;padding:0 .65rem;border:1px solid var(--rk-border);border-radius:999px;background:#fff;cursor:pointer;box-shadow:var(--shadow-1)}
.rk-btn.primary{background:#0f172a;color:#fff;border-color:#0f172a}
.rk-btn.ghost{background:transparent}
.rk-icon{width:16px;height:16px}
.rk-chip{display:inline-flex;align-items:center;gap:.35rem;height:26px;padding:0 .55rem;border:1px solid var(--rk-border);border-radius:999px;background:#fff}
.rk-chip input{accent-color:var(--rk-blue)}

/* Sidebar list */
.rk-sec{padding:.65rem 1rem;font-size:.7rem;color:var(--rk-muted);letter-spacing:.04em}
.rk-li{display:flex;gap:.6rem;align-items:center;padding:.45rem 1rem;border:0;background:none;width:100%;text-align:left;cursor:pointer}
.rk-li:hover{background:var(--rk-soft)}
.rk-tag{font-size:.68rem;color:#0ea5a3;background:#e6fffb;border:1px solid #99f6e4;padding:.02rem .35rem;border-radius:6px}

/* Pad */
.rk-pad{padding:1rem;display:flex;flex-direction:column;gap:.8rem;min-height:0;min-width:0}
.rk-h2{font-size:1rem;font-weight:800;margin:0}
.rk-sub{color:var(--rk-muted);font-size:.8rem}

/* ===== Tabel (stabil) ===== */
.rk-tablewrap{
  position:relative;border:1px solid var(--rk-border);border-radius:var(--radius);
  background:var(--rk-card);box-shadow:var(--shadow-1);
  width:100%;max-width:100%;min-width:0;
  overflow-y:auto;
  overflow-x:auto;                 /* scroll horizontal jika sempit */
  scrollbar-gutter: stable both-edges;
}

/* fixed layout → kolom mengikuti width yg ditetapkan */
.rk-table{
  width:100%;
  table-layout:fixed;
  border-collapse:separate;border-spacing:0;

  /* total min-width hormati 2 kolom sticky + semua kolom bebas */
  min-width: calc(var(--col1) + var(--col2) + (var(--free-cols) * var(--free-min)));
}

/* header */
.rk-th{
  position:sticky;top:0;z-index:25;
  background:rgba(255,255,255,.96);backdrop-filter:blur(6px);
  border-bottom:1px solid var(--rk-border);
  font-weight:700;padding:.4rem .5rem;
  white-space:normal;line-height:1.25;font-size:12px;
  word-break:keep-all;
}

/* body */
.rk-tr:nth-child(even){background:var(--rk-card-2)}
.rk-tr:hover{background:#f6fbff}
.rk-td{
  padding:.35rem .5rem;border-bottom:1px solid var(--rk-border);
  white-space:nowrap;font-size:12px;overflow:hidden;text-overflow:ellipsis;
}
.rk-td.num,.rk-th.num{ text-align:right; font-variant-numeric:tabular-nums }

/* Sticky kiri */
.rk-sticky-1{position:sticky;left:0;z-index:30;background:inherit;box-shadow:1px 0 0 var(--rk-border), 6px 0 12px rgba(15,23,42,.06); width:var(--col1)}
.rk-sticky-2{position:sticky;left:var(--col1);z-index:30;background:inherit;box-shadow:1px 0 0 var(--rk-border), 6px 0 12px rgba(15,23,42,.06); width:var(--col2)}
.rk-w56{width:var(--col1)} .rk-w52{width:var(--col2)}

/* Kolom non-sticky: clamp(min, ideal, max) → anti “remuk” */
.rk-free{
  width: clamp(
    var(--free-min),
    calc((100% - var(--col1) - var(--col2)) / var(--free-cols)),
    var(--free-max)
  );
}

/* Grup & seleksi */
.rk-group td{background:#f2f6ff;color:#334155;font-weight:700;border-bottom-color:#d9e2f5}
.rk-tr.sel td{background:#fff8e1}

/* Checkbox kecil */
.rk-cb{width:14px;height:14px}
`;

const formatIDR = (n) =>
  (n ?? 0).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function demoMetric(osAwal, osSd){
  const osPercent = osSd / Math.max(osAwal, 1);
  const targetCRM = Math.round(20 + Math.random()*10);
  const realisasi = Math.round(targetCRM * (0.6 + Math.random()*0.6));
  const gap = targetCRM - realisasi;
  const targetRupiah = Math.round(osAwal * 0.25);
  const realisasiOSBayar = Math.round(targetRupiah * (0.6 + Math.random()*0.6));
  const jumlahKend = Math.round(50 + Math.random()*60);
  const osBayarPercent = realisasiOSBayar / Math.max(targetRupiah, 1);
  const pemeliharaanKend = Math.round(2 + Math.random()*5);
  const pemeliharaanNom = Math.round(1_000_000 + Math.random()*5_000_000);
  return { osAwal, osSd, osPercent, targetCRM, realisasi, gap, targetRupiah, realisasiOSBayar, jumlahKend, osBayarPercent, pemeliharaanKend, pemeliharaanNom };
}

const SAMPLE = [
  { id: "1", group: "KANWIL", nama: "Aulia Rahman", loket: "KANWIL 1", metrics: demoMetric(120_000_000, 90_000_000) },
  { id: "2", group: "KANWIL", nama: "Dina Pratama", loket: "KANWIL 2", metrics: demoMetric(95_000_000, 72_500_000) },
  { id: "3", group: "DUMAI",  nama: "Budi Santoso", loket: "DUMAI A",  metrics: demoMetric(140_000_000, 110_000_000) },
  { id: "4", group: "DUMAI",  nama: "Citra Lestari", loket: "DUMAI B", metrics: demoMetric(80_000_000,  64_000_000) },
];

/* ------- Header ------- */
function StickyHeader() {
  return (
    <header className="rk-header">
      <div className="rk-header__inner">
        REKAP <span className="rk-badge">OS</span>
        <div style={{marginLeft:"auto", fontWeight:500, color:"var(--rk-muted)"}}>Dashboard</div>
      </div>
    </header>
  );
}

/* ------- Small UI atoms ------- */
const Input = (props) => <input className="rk-input" {...props} />;
const Button = ({ className = "", children, ...rest }) => (
  <button className={`rk-btn ${className}`} {...rest}>{children}</button>
);
const Checkbox = ({ checked, onChange }) => (
  <input type="checkbox" className="rk-cb" checked={checked} onChange={onChange} readOnly={!onChange}/>
);
const IconSearch = (p)=>(
  <svg className="rk-icon" viewBox="0 0 24 24" {...p}>
    <path d="M21 21l-4.35-4.35m1.1-4.4a6.75 6.75 0 11-13.5 0 6.75 6.75 0 0113.5 0z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconLayout = (p)=>(
  <svg className="rk-icon" viewBox="0 0 24 24" {...p}>
    <rect x="3" y="4" width="8" height="16" rx="2" stroke="currentColor" fill="none"/>
    <rect x="13" y="4" width="8" height="7.5" rx="2" stroke="currentColor" fill="none"/>
    <rect x="13" y="12.5" width="8" height="7.5" rx="2" stroke="currentColor" fill="none"/>
  </svg>
);
const IconDownload = (p)=>(
  <svg className="rk-icon" viewBox="0 0 24 24" {...p}>
    <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ================== MAIN COMPONENT ================== */
export default function Rekap() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date(); const mm = String(d.getMonth()+1).padStart(2,"0");
    return `${d.getFullYear()}-${mm}`;
  });
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState({ KANWIL: true, DUMAI: true });
  const [checked, setChecked] = useState(new Set());
  const [density, setDensity] = useState("compact"); // default rapat

  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => el.classList.toggle("is-scrolled", el.scrollTop > 2);
    onScroll(); el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const monthTitleShort = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
  }, [selectedMonth]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return SAMPLE
      .filter(r => visible[r.group])
      .filter(r => term ? r.nama.toLowerCase().includes(term) || r.loket.toLowerCase().includes(term) : true)
      .filter(r => (checked.size ? checked.has(r.id) : true));
  }, [q, visible, checked]);

  const grouped = useMemo(
    () => rows.reduce((acc, r) => { (acc[r.group] ||= []).push(r); return acc; }, { KANWIL: [], DUMAI: [] }),
    [rows]
  );

  const toggleCheck = (id) =>
    setChecked(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const clearChecks = () => setChecked(new Set());
  const selectedCount = checked.size;

  const exportCSV = () => {
    const visibleRows = rows;
    const header = [
      "Nama Pegawai","Loket Samsat","Rp OS Awal","Rp OS s.d.","% OS","Target CRM (PO)",
      "Realisasi","GAP","Target Rupiah (Min)","Realisasi OS Bayar","Jml Kend",
      "% OS Bayar","Pemeliharaan Kend","Pemeliharaan Nom (Rp)"
    ];
    const body = visibleRows.map(r => [
      r.nama, r.loket,
      r.metrics.osAwal, r.metrics.osSd, (r.metrics.osPercent * 100).toFixed(2) + "%",
      r.metrics.targetCRM, r.metrics.realisasi, r.metrics.gap,
      r.metrics.targetRupiah, r.metrics.realisasiOSBayar,
      r.metrics.jumlahKend, (r.metrics.osBayarPercent * 100).toFixed(2) + "%",
      r.metrics.pemeliharaanKend, r.metrics.pemeliharaanNom
    ]);
    const csv = [header, ...body].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekap_${selectedMonth}.csv`;  // ← tanpa backslash
    a.click();
    URL.revokeObjectURL(url);
  };

  const tdPad = density === "compact" ? ".35rem .5rem" : ".55rem .65rem";
  const thPad = density === "compact" ? ".4rem .5rem" : ".6rem .7rem";

  return (
    <div className="rk-page">
      <style>{RK_CSS}</style>
      <StickyHeader/>

      {/* Toolbar */}
      <div className="rk-toolbar">
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <label className="rk-label">Bulan</label>
          <Input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={{ width:160 }}/>
        </div>

        <div style={{ position:"relative" }}>
          <IconSearch style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", opacity:.55 }}/>
          <Input placeholder="Cari pegawai / loket" value={q} onChange={e=>setQ(e.target.value)} style={{ paddingLeft:30, width:220 }}/>
        </div>

        <div className="rk-toolbar__right">
          <label className="rk-chip" title="Tampil/Hide Loket Kanwil">
            <input type="checkbox" checked={visible.KANWIL} onChange={e=>setVisible(g=>({ ...g, KANWIL:e.target.checked }))}/>
            Kanwil
          </label>
          <label className="rk-chip" title="Tampil/Hide Loket Dumai">
            <input type="checkbox" checked={visible.DUMAI} onChange={e=>setVisible(g=>({ ...g, DUMAI:e.target.checked }))}/>
            Dumai
          </label>

          <Button className="ghost" onClick={()=> setDensity(density==='cozy' ? 'compact' : 'cozy')} title="Ubah kerapatan baris">
            <IconLayout/> {density==='cozy' ? 'Compact' : 'Cozy'}
          </Button>

          {selectedCount>0 && (
            <Button onClick={clearChecks} title="Hapus pilihan">
              Hapus Pilihan ({selectedCount})
            </Button>
          )}

          <Button className="primary" onClick={exportCSV}><IconDownload/> Ekspor CSV</Button>
        </div>
      </div>

      <div className="rk-body">
        {/* Sidebar */}
        <aside className="rk-sidebar">
          <div className="rk-sec">LOKET KANWIL</div>
          {SAMPLE.filter(x=>x.group==='KANWIL').map(r=> (
            <button key={r.id} className="rk-li" onClick={()=>toggleCheck(r.id)} title="Pilih untuk batas tampilan">
              <Checkbox checked={checked.has(r.id)} onChange={()=>toggleCheck(r.id)}/>
              <div>
                <div style={{fontWeight:700,lineHeight:1.15}}>{r.nama}</div>
                <div style={{fontSize:11,color:'var(--rk-muted)',lineHeight:1.1}}>
                  @{r.loket.toLowerCase()} <span className="rk-tag">KANWIL</span>
                </div>
              </div>
            </button>
          ))}
          <div className="rk-sec" style={{borderTop:'1px solid var(--rk-border)'}}>LOKET DUMAI</div>
          {SAMPLE.filter(x=>x.group==='DUMAI').map(r=> (
            <button key={r.id} className="rk-li" onClick={()=>toggleCheck(r.id)}>
              <Checkbox checked={checked.has(r.id)} onChange={()=>toggleCheck(r.id)}/>
              <div>
                <div style={{fontWeight:700,lineHeight:1.15}}>{r.nama}</div>
                <div style={{fontSize:11,color:'var(--rk-muted)',lineHeight:1.1}}>
                  @{r.loket.toLowerCase()} <span className="rk-tag">DUMAI</span>
                </div>
              </div>
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="rk-main">
          <div className="rk-pad">
            <div>
              <h2 className="rk-h2">OS {monthTitleShort}</h2>
              <div className="rk-sub">{rows.length} baris tampil • {selectedCount} dipilih</div>
            </div>

            <div ref={scrollRef} className="rk-tablewrap">
              <table className="rk-table">
                <thead>
                  <tr>
                    <th className="rk-th rk-w56 rk-sticky-1" style={{textAlign:'left', padding: thPad}}>Nama Pegawai</th>
                    <th className="rk-th rk-w52 rk-sticky-2" style={{textAlign:'left', padding: thPad}}>Loket Samsat</th>

                    {/* kolom non-sticky pakai rk-free */}
                    <th className="rk-th num rk-free" style={{padding: thPad}}>Rp OS Awal</th>
                    <th className="rk-th num rk-free" style={{padding: thPad}}>Rp OS s.d. 11 ({monthTitleShort})</th>
                    <th className="rk-th num rk-free" style={{padding: thPad}}>% OS</th>
                    <th className="rk-th num rk-free" style={{padding: thPad}}>Target CRM (PO)</th>
                    <th className="rk-th num rk-free" style={{padding: thPad}}>Realisasi</th>
                    <th className="rk-th num rk-free" style={{padding: thPad}}>GAP</th>
                    <th className="rk-th num rk-free" style={{padding: thPad}}>Target Rupiah (Min)</th>
                    <th className="rk-th num rk-free" style={{padding: thPad}}>Realisasi OS Bayar</th>
                    <th className="rk-th num rk-free" style={{padding: thPad}}>Jml Kend</th>
                    <th className="rk-th num rk-free" style={{padding: thPad}}>% OS Bayar</th>
                    <th className="rk-th num rk-free" style={{padding: thPad}}>Pemeliharaan Kend</th>
                    <th className="rk-th num rk-free" style={{padding: thPad}}>Pemeliharaan Nom (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.KANWIL && grouped.KANWIL.length>0 && (
                    <tr className="rk-group">
                      <td className="rk-td rk-sticky-1 rk-w56" colSpan={2} style={{padding: tdPad}}>LOKET KANWIL</td>
                      {/* Hapus rk-free di cell colSpan */}
                      <td className="rk-td" colSpan={12} style={{padding: tdPad}}></td>
                    </tr>
                  )}
                  {visible.KANWIL && grouped.KANWIL.map(r=> (
                    <tr key={r.id} className={["rk-tr", checked.has(r.id)?'sel':''].join(' ')}>
                      <td className="rk-td rk-sticky-1 rk-w56" style={{zIndex:10, padding: tdPad}}>{r.nama}</td>
                      <td className="rk-td rk-sticky-2 rk-w52" style={{zIndex:10, padding: tdPad}}>{r.loket}</td>

                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{formatIDR(r.metrics.osAwal)}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{formatIDR(r.metrics.osSd)}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{(r.metrics.osPercent*100).toFixed(2)}%</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{r.metrics.targetCRM}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{r.metrics.realisasi}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{r.metrics.gap}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{formatIDR(r.metrics.targetRupiah)}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{formatIDR(r.metrics.realisasiOSBayar)}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{r.metrics.jumlahKend}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{(r.metrics.osBayarPercent*100).toFixed(2)}%</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{r.metrics.pemeliharaanKend}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{formatIDR(r.metrics.pemeliharaanNom)}</td>
                    </tr>
                  ))}

                  {visible.DUMAI && grouped.DUMAI.length>0 && (
                    <tr className="rk-group">
                      <td className="rk-td rk-sticky-1 rk-w56" colSpan={2} style={{padding: tdPad}}>LOKET DUMAI</td>
                      <td className="rk-td" colSpan={12} style={{padding: tdPad}}></td>
                    </tr>
                  )}
                  {visible.DUMAI && grouped.DUMAI.map(r=> (
                    <tr key={r.id} className={["rk-tr", checked.has(r.id)?'sel':''].join(' ')}>
                      <td className="rk-td rk-sticky-1 rk-w56" style={{zIndex:10, padding: tdPad}}>{r.nama}</td>
                      <td className="rk-td rk-sticky-2 rk-w52" style={{zIndex:10, padding: tdPad}}>{r.loket}</td>

                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{formatIDR(r.metrics.osAwal)}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{formatIDR(r.metrics.osSd)}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{(r.metrics.osPercent*100).toFixed(2)}%</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{r.metrics.targetCRM}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{r.metrics.realisasi}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{r.metrics.gap}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{formatIDR(r.metrics.targetRupiah)}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{formatIDR(r.metrics.realisasiOSBayar)}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{r.metrics.jumlahKend}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{(r.metrics.osBayarPercent*100).toFixed(2)}%</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{r.metrics.pemeliharaanKend}</td>
                      <td className="rk-td num rk-free" style={{padding: tdPad}}>{formatIDR(r.metrics.pemeliharaanNom)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
