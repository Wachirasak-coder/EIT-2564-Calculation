// โหลดค่าตารางตามลำดับ:
// 1) data/tables.local.json (เปิดจากเครื่องตัวเอง)  2) ค่าที่ปลดล็อก/นำเข้าไว้แล้วในเบราว์เซอร์นี้
// 3) data/tables.enc.json (เข้ารหัส อยู่ใน repo) → ต้องใส่รหัสผ่านครั้งแรกบนแต่ละเครื่อง
import { decryptJSON } from "./crypto.js";
const KEY = "eit2564.tables";
let encBox = null;

export async function loadTables() {
  try {
    const res = await fetch("data/tables.local.json", { cache: "no-store" });
    if (res.ok) return { T: await res.json(), source: "ไฟล์ data/tables.local.json" };
  } catch {}
  try { const s = localStorage.getItem(KEY); if (s) return { T: JSON.parse(s), source: "ค่าที่บันทึกในเบราว์เซอร์นี้" }; } catch {}
  try {
    const res = await fetch("data/tables.enc.json", { cache: "no-cache" });
    if (res.ok) { encBox = await res.json(); return { T: null, source: null, locked: true }; }
  } catch {}
  return { T: null, source: null };
}
export const hasEncrypted = () => !!encBox;
export async function unlock(password, remember = true) {
  const T = await decryptJSON(encBox, password);
  if (remember) saveTables(T);
  return T;
}
export function saveTables(T) { try { localStorage.setItem(KEY, JSON.stringify(T)); return true; } catch { return false; } }
export function clearTables() { try { localStorage.removeItem(KEY); } catch {} }
