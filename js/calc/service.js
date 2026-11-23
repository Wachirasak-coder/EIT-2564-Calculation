// ง. เครื่องป้องกันกระแสเกิน ตัวนำประธาน เครื่องวัดฯ — ข้อ 3.5.2, ตาราง 3-4 (กฟน.), 3-5 (กฟภ.)
import { requireTable, nextStd } from "./lib.js";

export function ocpdForLoad(loadA, factor = 1.25) {
  const need = loadA * factor;
  return { minA: need, ocpdA: nextStd(need), steps: [`In ≥ ${factor} × ${loadA.toFixed(2)} = ${need.toFixed(2)} A → เลือก ${nextStd(need)} A`] };
}

export function meterMEA(T, loadA) {
  const t = requireTable(T, "service.3-4");
  const row = t.rows.find(r => loadA <= r[2]);
  if (!row) return { pass: false, steps: ["โหลดเกินตาราง 3-4 → ใช้ระบบแรงสูงหรือติดต่อ กฟน."], ref: "ตารางที่ 3-4" };
  const minOcpd = loadA * t.minOcpdFactor;
  return { meter: row[0], maxOcpdA: row[1], maxLoadA: row[2], minOcpdA: minOcpd, pass: true, ref: "ตารางที่ 3-4",
    steps: [`โหลด ${loadA.toFixed(1)} A ≤ โหลดสูงสุด ${row[2]} A → มิเตอร์ ${row[0]} A`,
      `OCPD ≤ ${row[1]} A และ ≥ ${t.minOcpdFactor} × โหลด = ${minOcpd.toFixed(1)} A`] };
}

export function meterPEA(T, loadA, phase) {
  const t = requireTable(T, "service.3-5");
  const c = t.columns;
  const rows = t.rows.map(r => Object.fromEntries(c.map((k, i) => [k, r[i]])))
    .filter(r => r.phase.includes(phase === 3 ? "3P" : "1P"));
  const row = rows.find(r => r.cbMaxA >= loadA * 1.25) || null;
  if (!row) return { pass: false, steps: ["โหลดเกินตาราง 3-5 → ติดต่อ กฟภ."], ref: "ตารางที่ 3-5" };
  return { ...row, pass: true, ref: "ตารางที่ 3-5",
    steps: [`1.25 × ${loadA.toFixed(1)} A = ${(loadA * 1.25).toFixed(1)} A ≤ CB สูงสุด ${row.cbMaxA} A → มิเตอร์ ${row.meter}`,
      `ตัวนำประธานต่ำสุด: ทองแดง ${row.cuMm2} ตร.มม. / อะลูมิเนียม ${row.alMm2} ตร.มม. (ยังไม่รวมแรงดันตก)`] };
}
