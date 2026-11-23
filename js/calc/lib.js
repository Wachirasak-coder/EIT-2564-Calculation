// ฟังก์ชันช่วยทั่วไป (ไม่มีค่าจากมาตรฐาน)
export const SIZES = ["1","1.5","2.5","4","6","10","16","25","35","50","70","95","120","150","185","240","300","400","500"];

// ขนาดพิกัดมาตรฐานของเครื่องป้องกันกระแสเกิน (IEC 60898-1 / IEC 60947-2 ค่าที่ใช้ทั่วไป)
export const STD_OCPD = [6,10,16,20,25,32,40,50,63,80,100,125,160,200,225,250,315,350,400,500,630,800,1000,1250,1600,2000,2500,3200,4000,5000,6300];

export function nextStd(value, list = STD_OCPD) {
  for (const v of list) if (v >= value - 1e-9) return v;
  return null;
}

export function requireTable(T, path) {
  const i = path.indexOf(".");
  const parts = i < 0 ? [path] : [path.slice(0, i), path.slice(i + 1)];
  let cur = T;
  for (const p of parts) {
    if (cur == null || !(p in cur)) throw new TableMissingError(path);
    cur = cur[p];
  }
  return cur;
}
export class TableMissingError extends Error {
  constructor(path) { super(`ยังไม่มีข้อมูลตาราง ${path} — นำเข้าไฟล์ค่าตารางก่อน`); this.name = "TableMissingError"; this.path = path; }
}

// rows = [[upTo, value], ...] upTo=null คือ "เกินค่าก่อนหน้า"
export function bandLookup(rows, x) {
  for (const [upTo, v] of rows) if (upTo == null || x <= upTo) return v;
  return null;
}
// rows = [[lo, hi, values[]], ...]
export function rangeLookup(rows, x) {
  for (const [lo, hi, v] of rows) if (x >= lo && x <= hi) return v;
  return null;
}
// คิดอัตราแบบขั้นบันได tiers = [[upTo, pct], ...] คืน {total, steps}
export function tiered(amount, tiers) {
  let prev = 0, total = 0; const steps = [];
  for (const [upTo, pct] of tiers) {
    const cap = upTo == null ? Infinity : upTo;
    if (amount <= prev) break;
    const part = Math.min(amount, cap) - prev;
    const val = part * pct / 100;
    steps.push({ from: prev, to: Math.min(amount, cap), part, pct, val });
    total += val; prev = cap;
  }
  return { total, steps };
}

export function current(P_VA, V, phase) {
  return phase === 3 ? P_VA / (Math.sqrt(3) * V) : P_VA / V;
}
export const r = (x, d = 2) => (x == null || !isFinite(x)) ? "-" : Number(x.toFixed(d)).toLocaleString("th-TH", { maximumFractionDigits: d });
