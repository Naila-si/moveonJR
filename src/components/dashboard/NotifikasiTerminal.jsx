import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const LS_KEY = "terminal_notifications_v1";

function loadItems() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveItems(items) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

export default function NotifikasiTerminal() {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => loadItems());
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("sentAt");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => setItems(loadItems()), []);

  const sentOnly = useMemo(() => items.filter(i => !!i.sentAt), [items]);

  const filtered = useMemo(() => {
    let data = [...sentOnly];
    if (q.trim()) {
      const s = q.toLowerCase();
      data = data.filter(it =>
        [it.keberangkatan, it.kedatangan, it.noPol, it.namaBus]
          .join(" ")
          .toLowerCase()
          .includes(s)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    data.sort((a, b) => {
      const va = (a[sortKey] ?? "").toString();
      const vb = (b[sortKey] ?? "").toString();
      return va > vb ? dir : va < vb ? -dir : 0;
    });
    return data;
  }, [sentOnly, q, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleUnsend(id) {
    setItems(prev => {
      const next = prev.map(it => (it.id === id ? { ...it, sentAt: null } : it));
      saveItems(next);
      return next;
    });
  }
  function handleDelete(id) {
    const it = items.find(x => x.id === id);
    if (!it) return;
    if (!confirm(`Hapus notifikasi untuk bus "${it.namaBus}"?`)) return;
    setItems(prev => {
      const next = prev.filter(x => x.id !== id);
      saveItems(next);
      return next;
    });
  }
  function handleClearAll() {
    if (!confirm("Hapus SEMUA notifikasi terkirim?")) return;
    setItems(prev => {
      const next = prev.filter(x => !x.sentAt);
      saveItems(next);
      return next;
    });
  }

  return (
    <div className="notif-wrap">
      {/* kawaii bg */}
      <div className="bg-sky" aria-hidden />
      <div className="bg-cloud c1" aria-hidden>☁️</div>
      <div className="bg-cloud c2" aria-hidden>☁️</div>
      <div className="bg-cloud c3" aria-hidden>☁️</div>

      <header className="topbar">
        <div className="brand">
          <span className="logo">📣</span>
          <h1>Notifikasi Terminal</h1>
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={() => navigate("/")}>🏠 Home</button>
          {/* Contoh tombol aksi massal (uncomment kalau mau dipakai)
          <button className="btn" onClick={handleClearAll}>🧹 Bersihkan Terkirim</button>
          */}
        </div>
      </header>

      <main className="container">
        {/* Pencarian */}
        <section className="card">
          <div className="card-head">
            <h2>Cari Notifikasi</h2>
            <p>Ketik keberangkatan / kedatangan / no pol / nama bus.</p>
          </div>
          <div className="search-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Contoh: Terminal A / B 1234 ABC / MoveOn"
            />
          </div>
        </section>

        {/* Tabel Notifikasi */}
        <section className="card">
          <div className="card-head">
            <h2>Daftar Notifikasi Terkirim</h2>
          </div>

          <div className="table-wrap wider">
            <table className="table long">
              <thead>
                <tr>
                  <Th label="Keberangkatan" k="keberangkatan" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Kedatangan" k="kedatangan" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Tanggal" k="tanggal" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Waktu" k="waktu" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="No. Pol" k="noPol" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Nama Bus" k="namaBus" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  <Th label="Dikirim" k="sentAt" sortKey={sortKey} sortDir={sortDir} onToggle={toggleSort} />
                  {/* <th className="sticky-right">Aksi</th> */}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td className="empty" colSpan={8}>Belum ada data terkirim.</td></tr>
                ) : filtered.map(it => (
                  <tr key={it.id}>
                    <td className="col-place">{it.keberangkatan}</td>
                    <td className="col-place">{it.kedatangan}</td>
                    <td className="col-date">{it.tanggal}</td>
                    <td className="col-time">{it.waktu}</td>
                    <td className="col-nopol">{it.noPol}</td>
                    <td className="col-bus">{it.namaBus}</td>
                    <td className="col-date" title={new Date(it.sentAt).toLocaleString()}>
                      {new Date(it.sentAt).toLocaleString()}
                    </td>
                    {/* <td className="row-actions sticky-right">
                      <button className="icon-btn" title="Batalkan kirim (kembali ke Draft)" onClick={()=>handleUnsend(it.id)}>↩️</button>
                      <button className="icon-btn" title="Hapus" onClick={()=>handleDelete(it.id)}>🗑️</button>
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="footer">
          <p>Langit pastel, info cepat ✨</p>
        </footer>

        {/* Sparkles imut */}
        <div className="sparkle" aria-hidden>
          <span style={{ left: "8%" }}>✦</span>
          <span style={{ left: "22%" }}>✧</span>
          <span style={{ left: "38%" }}>✦</span>
          <span style={{ left: "55%" }}>✧</span>
          <span style={{ left: "72%" }}>✦</span>
          <span style={{ left: "88%" }}>✧</span>
        </div>

        {/* Maskot lucu pojokan */}
        <div className="mascot" aria-live="polite">
          <div className="bubble">haiii~ info notifikasi siap ✨</div>
          <div className="chara">
            <i className="mouth" />
            <i className="meg" />
          </div>
        </div>

        {/* Maskot bus kawaii yang jalan di bawah */}
        <BusMascot matches={q ? filtered.length : sentOnly.length} />
      </main>

      <style>{`
        :root{
          /* Pastel biru muda kawaii */
          --sky:#f6fbff; --sky-2:#eef7ff; --sky-3:#e7f2ff;
          --ink:#23405c; --muted:#6f86a0; --border:#e8f0fb;
          --card:#ffffffcc; --card-solid:#fff; --stickyBg:#f7fbff;
          --primary:#69a8ff; --accent:#ffd9ec; --mint:#c8f5e5; --sun:#ffe9a3;
          --danger:#ff7c88;
          --shadow:0 10px 28px rgba(122, 170, 255, .18);
          --radius-lg:26px; --radius-md:16px; --radius-sm:12px;

          --fs-xs:12px; --fs-sm:13px; --fs-md:14px; --fs-lg:18px; --fs-xl:21px;
        }

        /* ===== Background super lembut ===== */
        .notif-wrap{min-height:100dvh;color:var(--ink);position:relative}
        .bg-sky{position:fixed;inset:0;background:
          radial-gradient(1200px 600px at 15% 10%, #fff8 0 40%, transparent 60%),
          linear-gradient(180deg,var(--sky),var(--sky-2) 70%,var(--sky-3)); z-index:-3}
        .bg-cloud{position:fixed;font-size:70px;opacity:.28;animation:float 13s ease-in-out infinite;z-index:-2;filter:drop-shadow(0 8px 12px rgba(105,168,255,.15))}
        .c1{top:10%;left:6%} .c2{top:30%;right:8%} .c3{bottom:8%;left:16%}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}

        /* ===== Sparkles (imut²) ===== */
        .sparkle{position:fixed;inset:0;pointer-events:none;z-index:-1}
        .sparkle span{
          position:absolute;font-size:18px;opacity:.6;animation:rise 9s linear infinite;
          filter:drop-shadow(0 6px 8px rgba(105,168,255,.15))
        }
        .sparkle span:nth-child(3n){animation-duration:11s}
        .sparkle span:nth-child(5n){animation-duration:13s;font-size:16px;opacity:.5}
        @keyframes rise{
          0%{transform:translateY(20px) scale(.9)}
          100%{transform:translateY(-90vh) scale(1.1)}
        }

        /* ===== Topbar ===== */
        .topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;gap:12px}
        .brand{display:flex;gap:10px;align-items:center}
        .logo{font-size:28px}
        .brand h1{font-size:var(--fs-xl);font-weight:800;letter-spacing:.2px}
        .actions{display:flex;gap:8px;flex-wrap:wrap}

        /* Buttons kawaii */
        .btn{padding:10px 14px;border-radius:18px;border:1px solid var(--border);
            background:var(--card-solid);box-shadow:var(--shadow);transition:transform .06s ease, box-shadow .2s ease}
        .btn:hover{transform:translateY(-1px)}
        .btn:active{transform:translateY(0)}
        .btn.ghost{background:linear-gradient(180deg,#fff, #fafdff)}
        .btn.danger{background:linear-gradient(180deg,#ff9aa7,#ff7c88);color:#fff;border:none}

        /* Focus ring */
        .btn:focus-visible, .search-row input:focus-visible, .icon-btn:focus-visible, .th-sort:focus-visible{
          outline:2px solid #a8c9ff; outline-offset:2px; border-radius:14px;
        }

        /* ===== Cards ===== */
        .container{max-width:1200px;margin:0 auto;padding:10px 16px 56px}
        .card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);
              padding:16px;box-shadow:var(--shadow);backdrop-filter:saturate(1.15) blur(6px);margin-bottom:16px}
        .card-head h2{margin:0;font-size:var(--fs-lg);font-weight:900}
        .card-head p{margin:6px 0 0;color:var(--muted);font-size:var(--fs-sm)}

        /* ===== Search ===== */
        .search-row{margin-top:10px}
        .search-row input{
          width:100%;border:1px solid var(--border);border-radius:14px;padding:12px 14px;background:#fff;
          font-size:var(--fs-md);transition:border-color .2s ease, box-shadow .2s ease;
          box-shadow:0 4px 14px rgba(122,170,255,.07)
        }
        .search-row input::placeholder{color:#9ab2cc}
        .search-row input:focus{border-color:#bcd7ff;box-shadow:0 0 0 5px rgba(122,170,255,.18)}

        /* ===== Table lucu ===== */
        .table-wrap{position:relative;overflow:auto;--minw: 1000px}
        .table-wrap.wider{--minw: 1200px}

        /* scroll shadow tepi */
        .table-wrap::before,.table-wrap::after{
          content:"";position:sticky;top:0;bottom:0;width:18px;pointer-events:none;z-index:2;display:block
        }
        .table-wrap::before{left:0;background:linear-gradient(90deg, rgba(122,170,255,.15), transparent)}
        .table-wrap::after{float:right;right:0;background:linear-gradient(270deg, rgba(122,170,255,.15), transparent)}

        table.table{width:100%;border-collapse:separate;border-spacing:0;min-width:var(--minw)}
        thead th{
          position:sticky;top:0;background:var(--stickyBg);backdrop-filter:saturate(1.1) blur(4px);
          border-bottom:1px solid var(--border);font-weight:800;text-align:left;padding:12px 10px;font-size:var(--fs-sm);z-index:1
        }
        tbody td{border-bottom:1px dashed var(--border);padding:12px 10px;font-size:var(--fs-md);vertical-align:middle}
        tbody tr:hover td{background:linear-gradient(90deg,#fff, #f6fbff)}
        tbody tr:nth-child(2n) td{background:linear-gradient(90deg,#fff, #f3f8ff)}

        .empty{text-align:center;padding:22px;color:var(--muted)}
        .row-actions{white-space:nowrap}
        .icon-btn{
          border:1px solid var(--border);background:#fff;border-radius:12px;padding:7px 11px;margin-right:6px;
          box-shadow:var(--shadow);transition:transform .06s ease
        }
        .icon-btn:hover{transform:translateY(-1px)}
        .sticky-right{position:sticky;right:0;background:var(--stickyBg);border-left:1px solid var(--border);z-index:1}

        /* Kolom */
        .col-place{min-width:200px}
        .col-date{min-width:150px;white-space:nowrap}
        .col-time{min-width:120px;white-space:nowrap}
        .col-nopol{min-width:150px;white-space:nowrap}
        .col-bus{min-width:200px}

        /* Header sort */
        .th-sort{cursor:pointer;user-select:none}
        .th-sort .dir{font-size:.9em;color:#88a9cc;margin-left:6px}
        .th-sort:hover{color:#3f7fe6}
        .th-sort:active{transform:translateY(1px)}

        /* ===== Footer ===== */
        .footer{display:flex;justify-content:center;color:var(--muted);font-size:var(--fs-sm);padding-top:6px}

        /* ===== Badges & util ===== */
        .badge{background:linear-gradient(180deg,var(--accent),#ffc9e4);padding:5px 10px;border-radius:999px;font-size:var(--fs-xs)}
        .hidden{display:none}

        /* ===== Scrollbar (webkit) ===== */
        .table-wrap::-webkit-scrollbar{height:12px}
        .table-wrap::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#d9e8ff,#cfe0ff);border-radius:999px;border:3px solid transparent;background-clip:content-box}
        .table-wrap::-webkit-scrollbar-track{background:transparent}

        /* ===== Mascot super lucu (pojok) ===== */
        .mascot{
          position:fixed; right:20px; bottom:22px; z-index:5;
          display:flex; align-items:flex-end; gap:10px;
        }
        .mascot .bubble{
          background:#fff; border:1px solid var(--border); border-radius:18px;
          padding:10px 12px; box-shadow:var(--shadow); font-size:13px; color:var(--ink);
          animation:bubbleIn .6s ease both .2s;
        }
        @keyframes bubbleIn{
          0%{opacity:0; transform:translateY(8px) scale(.96)}
          100%{opacity:1; transform:translateY(0) scale(1)}
        }
        .mascot .chara{
          width:64px;height:64px;border-radius:18px;background:conic-gradient(from 210deg at 50% 80%, #fff 0 40%, #f0f7ff 40% 100%);
          border:1px solid var(--border); box-shadow:var(--shadow); position:relative;
          animation:bouncy 2.1s ease-in-out infinite;
        }
        /* muka */
        .chara::before,.chara::after{content:"";position:absolute;border-radius:50%}
        .chara::before{ /* mata kiri */
          width:8px;height:8px;background:#264866;left:20px;top:26px;box-shadow:22px 0 0 #264866;
        }
        .chara::after{ /* pipi */
          width:10px;height:10px;background:#ffd4e8;left:18px;top:36px;box-shadow:24px 0 0 #ffd4e8;opacity:.9
        }
        /* mulut */
        .chara .mouth{
          position:absolute;left:28px;top:36px;width:8px;height:6px;border:2px solid #264866;border-top:none;border-radius:0 0 8px 8px;
        }
        /* pegang megaphone */
        .chara .meg{
          position:absolute; right:-8px; top:22px; width:20px; height:14px; background:linear-gradient(180deg,#ff9fd1,#ff72bd);
          border-radius:6px; transform:rotate(12deg); box-shadow:0 2px 0 #ff6bb6 inset;
        }
        .chara .meg::after{
          content:""; position:absolute; left:-8px; top:3px; width:8px; height:8px; border-radius:50%;
          background:#fff; border:2px solid #ffc1e6;
        }
        @keyframes bouncy{
          0%,100%{transform:translateY(0) scale(1)}
          50%{transform:translateY(-6px) scale(1.02)}
        }

        /* ===== BUS MASCOT KAWAII (melintas bawah) ===== */
        .bm-wrap{
          position:fixed; left:0; right:0; bottom:10px; z-index:7;
          pointer-events:none;
        }
        .bm-road{
          position:absolute; left:0; right:0; bottom:0; height:18px;
          background:linear-gradient(180deg, #dfeafe, #cbdfff);
          border-top:1px solid var(--border);
          box-shadow:0 -6px 24px rgba(122,170,255,.18) inset;
          mask:linear-gradient(180deg, transparent 0, #000 6px);
        }
        .bm-bus{
          --busW: 220px; --busH: 92px;
          position:absolute; left:-240px; bottom:16px; width:var(--busW); height:var(--busH);
          animation:bm-drive 12s linear infinite, bm-color 12s linear infinite;
          transform-origin:center bottom;
        }
        @keyframes bm-drive{
          0%   { transform:translateX(-240px) scaleX(1) }
          45%  { transform:translateX(calc(100vw - 20px - var(--busW))) scaleX(1) }
          50%  { transform:translateX(calc(100vw - 20px - var(--busW))) scaleX(-1) }
          95%  { transform:translateX(20px) scaleX(-1) }
          100% { transform:translateX(-240px) scaleX(1) }
        }
        /* warna pelan ganti2 pastel */
        @keyframes bm-color{
          0%   { filter:hue-rotate(0deg) }
          50%  { filter:hue-rotate(40deg) }
          100% { filter:hue-rotate(0deg) }
        }

        .bm-body{
          position:absolute; inset:0;
          background:
            linear-gradient(180deg, hsl(205 100% 97%), #fff) padding-box,
            radial-gradient(60% 120% at 50% 10%, #fff, transparent 60%);
          border:2px solid #b8d2ff; border-radius:20px;
          box-shadow:0 8px 20px rgba(122,170,255,.18);
        }
        .bm-door{
          position:absolute; right:18px; bottom:14px; width:28px; height:48px; border-radius:10px;
          background:linear-gradient(180deg, #fefefe, #f3f7ff);
          border:2px solid #c6dcff;
        }
        .bm-stripe{
          position:absolute; left:14px; right:60px; height:10px; border-radius:999px;
          background:linear-gradient(90deg, #ffbfe1, #c7f3e6, #ffe79f);
          opacity:.9; filter:saturate(1.1);
        }
        .bm-stripe.s1{ top:18px }
        .bm-stripe.s2{ top:36px }

        .bm-face{
          position:absolute; left:12px; top:8px; width:84px; height:66px;
          background:linear-gradient(180deg, #fff, #f0f6ff); border:2px solid #cfe0ff; border-radius:16px;
          box-shadow:inset 0 -4px 0 #eaf2ff;
        }
        .bm-eye{
          position:absolute; width:10px; height:10px; border-radius:50%; background:#264866;
          top:24px; animation:bm-blink 4.5s infinite;
        }
        .bm-eye.e1{ left:22px }
        .bm-eye.e2{ left:48px; animation-delay:.8s }
        @keyframes bm-blink{
          0%,92%,100%{ transform:scaleY(1) }
          94%,98%   { transform:scaleY(.15) }
        }
        .bm-mouth{
          position:absolute; left:36px; top:38px; width:12px; height:8px;
          border:2px solid #264866; border-top:none; border-radius:0 0 10px 10px;
        }
        .bm-blush{
          position:absolute; width:12px; height:12px; border-radius:50%; background:#ffd4e8; opacity:.9;
          bottom:8px; filter:blur(.2px)
        }
        .bm-blush.b1{ left:18px }
        .bm-blush.b2{ right:18px }

        .bm-wheel{
          --r: 18px;
          position:absolute; bottom:-10px; width:calc(var(--r)*2); height:calc(var(--r)*2); border-radius:50%;
          background:#2c3e55; border:3px solid #1f2d40; box-shadow:inset 0 0 0 4px #3a4f6b;
          animation:bm-spin 1.2s linear infinite;
        }
        .bm-wheel.w1{ left:34px }
        .bm-wheel.w2{ right:34px }
        @keyframes bm-spin{ to{ transform:rotate(360deg) } }
        .bm-cap{
          position:absolute; inset:0; margin:auto; width:14px; height:14px; border-radius:50%;
          background:#eef5ff; box-shadow:0 0 0 2px #cfe0ff inset;
        }

        .bm-smoke{
          position:absolute; bottom:4px; width:10px; height:10px; background:#e8f0fb; border-radius:50%;
          box-shadow:0 2px 0 #d6e5ff inset; filter:blur(.2px); opacity:.9;
          animation:bm-smoke 1.8s ease-out infinite;
        }
        .bm-smoke.sm1{ right:-10px; animation-delay:.1s }
        .bm-smoke.sm2{ right:-18px; animation-delay:.5s }
        @keyframes bm-smoke{
          0%{ transform:translate(0,0) scale(.8); opacity:.9 }
          100%{ transform:translate(20px,-22px) scale(1.3); opacity:0 }
        }

        .bm-bubble{
          position:absolute; left:28px; bottom:calc(16px + var(--busH));
          background:#fff; border:1px solid var(--border); border-radius:16px;
          padding:8px 12px; font-size:13px; color:var(--ink); white-space:nowrap;
          box-shadow:var(--shadow); transform:translateY(10px); opacity:0;
          animation:bm-say .8s ease both;
        }
        @keyframes bm-say{ to{ transform:translateY(0); opacity:1 } }

        .bm-stop{ position:absolute; right:16px; bottom:14px; display:flex; align-items:flex-end; gap:6px; }
        .bm-sign{
          display:inline-grid; place-items:center; width:34px; height:34px; border-radius:50%;
          background:linear-gradient(180deg,#fff,#f4f8ff); border:2px solid #cfe0ff; box-shadow:var(--shadow);
          font-size:16px;
        }
        .bm-pole{ width:6px; height:28px; background:#cfe0ff; border-radius:999px; box-shadow:inset 0 -2px 0 #b9d2ff }

        @media (max-width: 720px){
          .bm-bus{ --busW: 180px; --busH: 76px; bottom:12px }
          .bm-bubble{ font-size:12px; left:16px }
        }

        /* ===== Responsive ===== */
        @media (max-width: 960px){
          .brand h1{font-size:18px}
          .col-place{min-width:170px}
          .col-bus{min-width:170px}
        }
        @media (max-width: 720px){
          .container{padding:8px 12px 90px}
          .summary{grid-template-columns:1fr}
          .topbar{padding:12px}
          .card{padding:14px;border-radius:22px}
          thead th, tbody td{padding:10px}
          .mascot{right:12px; bottom:78px} /* naik dikit biar nggak nabrak bus */
        }
      `}</style>
    </div>
  );
}

function Th({ label, k, sortKey, sortDir, onToggle }) {
  const active = sortKey === k;
  return (
    <th className="th-sort" onClick={() => onToggle(k)} title="Urutkan">
      {label} <span className="dir">{active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
    </th>
  );
}

/* =======================
   MASKOT BUS KAWAII
   ======================= */
function BusMascot({ matches = 0 }) {
  const text =
    matches === 0
      ? "ngeng~ belum ada yg ketemu…"
      : matches === 1
      ? "ketemu 1 notifikasi! 🫶"
      : `ketemu ${matches} notifikasi! ✨`;

  return (
    <div className="bm-wrap" aria-label="maskot bus lucu">
      <div className="bm-road" aria-hidden />
      <div className="bm-bus" role="img" aria-label="bus kawaii">
        <div className="bm-face">
          <i className="bm-eye e1" />
          <i className="bm-eye e2" />
          <i className="bm-mouth" />
          <i className="bm-blush b1" />
          <i className="bm-blush b2" />
        </div>

        <div className="bm-body">
          <i className="bm-stripe s1" />
          <i className="bm-stripe s2" />
          <i className="bm-door" />
        </div>

        <div className="bm-wheel w1"><i className="bm-cap" /></div>
        <div className="bm-wheel w2"><i className="bm-cap" /></div>

        <i className="bm-smoke sm1" />
        <i className="bm-smoke sm2" />
      </div>

      <div className="bm-bubble" aria-live="polite">{text}</div>

      <div className="bm-stop" aria-hidden>
        <i className="bm-sign">🅱️</i>
        <i className="bm-pole" />
      </div>
    </div>
  );
}
