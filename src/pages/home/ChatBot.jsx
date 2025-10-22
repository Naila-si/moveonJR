// src/pages/home/ChatBot.jsx
import React, { useEffect, useRef, useState } from "react";
import "../../views/home/ChatBot.css";
import { ChatIconKawaiiRobot } from "../../components/icons/ChatIconKawaiiRobot";

/** =========================
 *  KONTAK WHATSAPP ADMIN
 *  Isi dengan format internasional TANPA tanda +.
 *  Contoh: 0812xxxx -> "62812xxxx"
 *  ========================= */
const WA_ESGA = "6281322181769"; 
const WA_ETA  = "6281221901810"; 

const waLink = (num, who, preset = "") =>
  `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(
    preset || `Halo Admin ${who}, saya butuh bantuan terkait MOVEON.`
  )}`;

const SUGGESTIONS = [
  "Apa itu MOVEON",
  "Form CRM",
  "Form Manifest",
  "Cara Login",
  "Register Akun",
  "Lupa Password",
  "Status Pengajuan",
  "Ekspor Data",
  "Filter & Pencarian",
  "Cetak / PDF",
  "Peran & Hak Akses",
  "Edit/Hapus Data",
  "Lampiran / Upload",
  "Jam Operasional",
  "Kebijakan Data",
  "Bantuan Teknis",
  "Browser Support",
  "Hubungi Admin",
];

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  // load riwayat dari localStorage (jika ada)
  const [messages, setMessages] = useState(() => {
    try {
      const saved =
        typeof window !== "undefined" && localStorage.getItem("moveon_chat_v2");
      return saved
        ? JSON.parse(saved)
        : [
            { from: "bot", text: "Hai! Aku **MOVEON Bot** ✨" },
            {
              from: "bot",
              text:
                "Aku bisa bantu panduan cepat untuk petugas. Coba ketik: *Apa itu MOVEON*, *Form CRM*, *Form Manifest*, *Cara Login*, *Status Pengajuan*, *Ekspor Data*, atau *Hubungi Admin*.",
            },
          ];
    } catch {
      return [
        { from: "bot", text: "Hai! Aku **MOVEON Bot** ✨" },
        {
          from: "bot",
          text:
            "Coba ketik: *Apa itu MOVEON*, *Form CRM*, *Form Manifest*, *Cara Login*, *Status Pengajuan*, *Ekspor Data*, atau *Hubungi Admin*.",
        },
      ];
    }
  });

  // simpan ke localStorage setiap ada perubahan
  useEffect(() => {
    try {
      localStorage.setItem("moveon_chat_v2", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  const bodyRef = useRef(null);
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, open]);

  const includesAny = (q, keys) => keys.some((k) => q.includes(k));

  const contactBlock = () =>
    `Kalau masih butuh bantuan, **hubungi WhatsApp**:<br/>` +
    `• <a href="${waLink(WA_ESGA, "Esga", "Halo Admin Esga, saya butuh bantuan MOVEON...")}" target="_blank" rel="noopener">Admin Esga</a><br/>` +
    `• <a href="${waLink(WA_ETA, "Eta", "Halo Admin Eta, saya butuh bantuan MOVEON...")}" target="_blank" rel="noopener">Admin Eta</a>`;

  const getBotReply = (raw) => {
    const q = raw.toLowerCase();

    // ——— Informasi umum
    if (includesAny(q, ["apa itu moveon", "moveon itu apa", "tentang moveon", " moveon"])) {
      return (
        "**MOVEON** (*Mobility Operation and Voyage Engagement Network*) adalah sistem digital untuk pengelolaan data transportasi & perjalanan (CRM, Manifest, dll) agar proses lebih cepat, aman, dan terpantau. 🚀\n\n" +
        contactBlock()
      );
    }
    // ——— CRM
    if (includesAny(q, ["crm", "kendaraan", "nopol", "plat"])) {
      return (
        "**Form CRM** digunakan untuk input & pengelolaan data kendaraan. 🚘\n" +
        "Langkah ringkas:\n" +
        "1) Buka **Form CRM** di panel kiri\n" +
        "2) Isi field wajib ➜ simpan\n" +
        "3) Cek daftar CRM untuk status terkini\n\n" +
        contactBlock()
      );
    }
    // ——— Manifest
    if (includesAny(q, ["manifest", "kapal", "penumpang", "voyage"])) {
      return (
        "**Form Manifest** untuk data manifest kapal/penumpang. ⛴️\n" +
        "Tips: pastikan jadwal & tujuan benar, isi data penumpang lengkap, lalu simpan ➜ verifikasi di daftar.\n\n" +
        contactBlock()
      );
    }
    // ——— Login / Register / Lupa Password
    if (includesAny(q, ["login", "masuk"])) {
      return "Untuk **Login**, klik tombol *Login* (navbar atau panel kanan). Jika belum punya akun, pilih **Register**. 🔐\n\n" + contactBlock();
    }
    if (includesAny(q, ["register", "daftar", "akun baru"])) {
      return "Buat akun lewat **Register**. Pastikan email/HP aktif untuk verifikasi. ✍️\n\n" + contactBlock();
    }
    if (includesAny(q, ["lupa password", "reset password", "ubah password"])) {
      return (
        "Jika **lupa password**:\n" +
        "1) Buka halaman **Login**\n" +
        "2) Klik *Lupa Password* ➜ masukkan email/nomor terdaftar\n" +
        "3) Ikuti instruksi untuk setel ulang kata sandi 🔑\n\n" +
        contactBlock()
      );
    }
    // ——— Status / Verifikasi
    if (includesAny(q, ["status", "progress", "progres", "verifikasi", "validasi", "tracking"])) {
      return (
        "Cek **status pengajuan/validasi** dari daftar data (CRM/Manifest) di kolom status. Untuk percepatan atau revisi manual, hubungi admin. 📊\n\n" +
        contactBlock()
      );
    }
    // ——— Ekspor / Cetak / PDF
    if (includesAny(q, ["ekspor", "export", "download", "unduh", "csv", "pdf", "print", "cetak"])) {
      return (
        "Ekspor tersedia di halaman daftar (ikon *Export/Download*). Kamu bisa **Export CSV/PDF** atau **Cetak**. 🧾\n\n" +
        contactBlock()
      );
    }
    // ——— Filter & Search
    if (includesAny(q, ["filter", "pencarian", "search", "cari", "keyword"])) {
      return (
        "**Filter & Pencarian**: gunakan kolom pencarian atau filter tanggal/status untuk mempersempit hasil. 🔎\n" +
        "Untuk performa terbaik, gunakan kata kunci spesifik (mis. *nopol*, tanggal, atau status).\n\n" +
        contactBlock()
      );
    }
    // ——— Peran & Akses
    if (includesAny(q, ["role", "peran", "hak akses", "akses", "otorisasi"])) {
      return (
        "**Peran & Hak Akses**: akses fitur mengikuti peran (mis. Admin, Petugas, Viewer). 🔐\n" +
        "Jika butuh perubahan peran/akses, minta persetujuan atasan lalu hubungi admin.\n\n" +
        contactBlock()
      );
    }
    // ——— Edit / Hapus Data
    if (includesAny(q, ["edit", "ubah", "perbarui", "hapus", "delete"])) {
      return (
        "Edit/Hapus data mengikuti kebijakan & perizinan. ✏️🗑️\n" +
        "Riwayat perubahan dicatat (audit trail). Untuk perubahan sensitif, hubungi admin agar sesuai SOP.\n\n" +
        contactBlock()
      );
    }
    // ——— Upload / Lampiran
    if (includesAny(q, ["lampiran", "unggah", "upload", "dokumen", "berkas", "file"])) {
      return (
        "**Lampiran / Upload**: gunakan tombol *Unggah* di form terkait. 📎\n" +
        "Jika gagal unggah, pastikan ukuran/format sesuai kebijakan unit. Bila tetap gagal, kirimkan tangkapan layar ke admin.\n\n" +
        contactBlock()
      );
    }
    // ——— Jam Operasional
    if (includesAny(q, ["jam", "operasional", "buka", "tutup"])) {
      return "Admin aktif **Senin–Jumat 08.00–17.00 WIB** (di luar jam tsb *best effort*). ⏰\n\n" + contactBlock();
    }
    // ——— Kebijakan Data
    if (includesAny(q, ["privasi", "keamanan", "data", "gdpr", "retensi"])) {
      return (
        "MOVEON menjaga **keamanan & privasi** data. Akses dibatasi per peran, perubahan tercatat (audit trail). 🔒\n" +
        "Untuk permintaan retensi/penghapusan data, ikuti SOP dan koordinasi dengan admin.\n\n" +
        contactBlock()
      );
    }
    // ——— Teknis
    if (includesAny(q, ["bantuan teknis", "teknis", "troubleshoot", "troubleshooting", "gagal", "error", "bug"])) {
      return (
        "Coba langkah berikut:\n" +
        "• *Refresh* / *re-login*\n" +
        "• Hapus cache browser\n" +
        "• Coba browser lain (Chrome/Edge)\n" +
        "• Matikan ekstensi yang mengganggu\n" +
        "Jika belum beres, kirim tangkapan layar & detail langkah ke admin. 🛠️\n\n" +
        contactBlock()
      );
    }
    // ——— Browser
    if (includesAny(q, ["browser", "chrome", "edge", "mozilla", "safari"])) {
      return "Rekomendasi: **Chrome** / **Edge** versi terbaru untuk performa & keamanan terbaik. 🌐\n\n" + contactBlock();
    }
    // ——— Hubungi Admin
    if (includesAny(q, ["admin", "kontak", "hubungi", "whatsapp", "wa", "cs", "narahubung"])) {
      return contactBlock();
    }

    // ——— Default
    return (
      "Baik! Coba gunakan kata kunci berikut ya:\n" +
      "• *Apa itu MOVEON*, *Form CRM*, *Form Manifest*\n" +
      "• *Cara Login*, *Register Akun*, *Lupa Password*\n" +
      "• *Status Pengajuan*, *Ekspor Data*, *Filter & Pencarian*\n" +
      "• *Peran & Hak Akses*, *Edit/Hapus Data*, *Lampiran / Upload*\n" +
      "• *Jam Operasional*, *Kebijakan Data*, *Bantuan Teknis*, *Browser Support*\n\n" +
      contactBlock()
    );
  };

  const send = (text) => {
    const t = (text ?? input).trim();
    if (!t) return;

    // perintah khusus
    if (t.toLowerCase() === "/clear") {
      setMessages([{ from: "bot", text: "Riwayat chat dihapus ✅" }]);
      setInput("");
      return;
    }
    if (t.toLowerCase() === "/help") {
      setMessages((m) => [
        ...m,
        { from: "user", text: t },
        {
          from: "bot",
          text:
            "**Bantuan**\n" +
            "• Gunakan kata kunci: *Form CRM*, *Form Manifest*, *Cara Login*, *Lupa Password*, *Ekspor Data*, *Status Pengajuan*, *Peran & Hak Akses*, *Lampiran / Upload*\n" +
            "• Perintah: */help* (bantuan), */clear* (hapus riwayat)\n\n" +
            contactBlock(),
        },
      ]);
      setInput("");
      return;
    }

    setMessages((m) => [...m, { from: "user", text: t }]);
    setInput("");

    setTimeout(() => {
      setMessages((m) => [...m, { from: "bot", text: getBotReply(t) }]);
    }, 260);
  };

  return (
    <>
      {/* FAB */}
      <button
        aria-label={open ? "Tutup chat" : "Buka chat"}
        className={`chat-fab ${open ? "active" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <ChatIconKawaiiRobot size={22} />
        <span className="badge" aria-hidden>•</span>
      </button>

      {/* PANEL */}
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat MOVEON">
          <header className="chat-header">
            <div className="bot-avatar">🚌</div>
            <div className="title">
              <strong>Chat MOVEON</strong>
              <small className="muted">Online</small>
            </div>
            <button
              className="close"
              onClick={() => setOpen(false)}
              aria-label="Tutup"
            >
              ✕
            </button>
          </header>

          {/* BODY (scroll area) */}
          <div className="chat-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.from}`}>
                {m.from === "bot" && <div className="avatar">🤖</div>}
                <div
                  className="bubble"
                  dangerouslySetInnerHTML={{
                    __html: m.text
                      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
                      .replace(/\*(.+?)\*/g, "<i>$1</i>")
                      .replace(/\n/g, "<br/>"),
                  }}
                />
              </div>
            ))}
          </div>

          {/* QUICK CHIPS (docked – tidak menutup chat) */}
          <div className="quick">
            {SUGGESTIONS.map((q) => (
              <button key={q} className="chip" onClick={() => send(q)}>
                {q}
              </button>
            ))}
            <button className="chip danger" onClick={() => send("/clear")}>
              /clear
            </button>
            <button className="chip" onClick={() => send("/help")}>
              /help
            </button>
          </div>

          {/* INPUT */}
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Tulis pesan…  (ketik /help untuk bantuan)"
              aria-label="Ketik pesan"
            />
            <button type="submit" className="send">
              Kirim
            </button>
          </form>
        </div>
      )}
    </>
  );
}
