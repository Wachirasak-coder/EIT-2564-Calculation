// โหลดค่าตารางตามลำดับ:
// 1) data/tables.local.json (ไฟล์แก้ไขบนเครื่องตัวเอง ไม่อยู่ใน repo)
// 2) ค่าที่นำเข้าไว้ในเบราว์เซอร์นี้
// 3) data/tables.json (ค่าตารางที่อยู่ใน repo — โหลดอัตโนมัติ)
const KEY = "eit2564.tables";
async function get(url) {
  try { const r = await fetch(url, { cache: "no-cache" }); if (r.ok) return await r.json(); } catch {}
  return null;
}
export async function loadTables() {
  let T = await get("data/tables.local.json");
  if (T) return { T, source: "ไฟล์ data/tables.local.json" };
  try { const s = localStorage.getItem(KEY); if (s) return { T: JSON.parse(s), source: "ไฟล์ที่นำเข้าในเบราว์เซอร์นี้" }; } catch {}
  T = await get("data/tables.json");
  if (T) return { T, source: "data/tables.json" };
  return { T: null, source: null };
}
export function saveTables(T) { try { localStorage.setItem(KEY, JSON.stringify(T)); return true; } catch { return false; } }
export function clearTables() { try { localStorage.removeItem(KEY); } catch {} }
