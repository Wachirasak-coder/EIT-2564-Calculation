// โหลดค่าตาราง: 1) data/tables.local.json (เมื่อเปิดจากเครื่อง) 2) localStorage 3) ให้ผู้ใช้นำเข้าไฟล์
const KEY = "eit2564.tables";
export async function loadTables() {
  try {
    const res = await fetch("data/tables.local.json", { cache: "no-store" });
    if (res.ok) { const t = await res.json(); return { T: t, source: "ไฟล์ data/tables.local.json" }; }
  } catch {}
  try { const s = localStorage.getItem(KEY); if (s) return { T: JSON.parse(s), source: "ไฟล์ที่นำเข้าไว้ในเบราว์เซอร์" }; } catch {}
  return { T: null, source: null };
}
export function saveTables(T) { try { localStorage.setItem(KEY, JSON.stringify(T)); return true; } catch { return false; } }
export function clearTables() { try { localStorage.removeItem(KEY); } catch {} }
