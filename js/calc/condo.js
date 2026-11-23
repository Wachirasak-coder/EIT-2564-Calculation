// ฌ. อาคารชุด — ข้อ 9.1.2, 9.1.4, 9.1.7, ตาราง 9-1 ถึง 9-6
import { requireTable, bandLookup } from "./lib.js";

// kind: residential | office | industrial ; central: มีระบบทำความเย็นส่วนกลาง
export function unitLoadVA(T, { kind, areaM2, central }) {
  const t = requireTable(T, "condo.9.1.2");
  if (kind === "residential") {
    const k = central ? t.residentialCentral.vaPerM2 : t.residentialNoCentral.vaPerM2;
    const add = bandLookup(t.residentialAdders, areaM2);
    const va = k * areaM2 + add;
    return { va, ref: "ข้อ 9.1.2.2", steps: [`${k} × ${areaM2} ตร.ม. + ${add} VA = ${va.toLocaleString()} VA`] };
  }
  const k = kind === "industrial" ? t.industrial.vaPerM2 : (central ? t.officeCentral.vaPerM2 : t.officeNoCentral.vaPerM2);
  return { va: k * areaM2, ref: kind === "industrial" ? "ข้อ 9.1.2.4" : "ข้อ 9.1.2.3", steps: [`${k} VA/ตร.ม. × ${areaM2} ตร.ม. = ${(k * areaM2).toLocaleString()} VA`] };
}

// utility: MEA | PEA ; phase: 1 | 3
export function unitMeter(T, { kind, utility, areaM2, central, phase }) {
  const id = kind === "residential" ? (utility === "MEA" ? "9-1" : "9-2") : (utility === "MEA" ? "9-3" : "9-4");
  const t = requireTable(T, "condo." + id);
  const rows = t.rows[central ? "central" : "noCentral"].filter(r => phase === 3 ? /3P|CT/.test(r[2]) : /1P/.test(r[2]));
  const row = rows.find(r => areaM2 <= r[0]);
  if (!row) return { pass: false, ref: "ตารางที่ " + id, steps: [`พื้นที่ ${areaM2} ตร.ม. เกินตาราง ${id} (${phase} เฟส) → คำนวณตามโหลดจริง`] };
  return { meter: row[2], ampsA: row[1], pass: true, ref: "ตารางที่ " + id,
    steps: [`พื้นที่ ${areaM2} ≤ ${row[0]} ตร.ม. → มิเตอร์ ${row[2]}, ${utility === "MEA" ? "โหลดสูงสุด" : "OCPD สูงสุด"} ${row[1]} A`] };
}

// loadsVA = โหลดแต่ละห้อง ; ใช้ค่าโคอินซิเดนต์ไล่จากห้องโหลดสูงสุด
export function feederWithCoincidence(T, loadsVA, kind) {
  const t = requireTable(T, "condo." + (kind === "residential" ? "9-5" : "9-6"));
  const sorted = [...loadsVA].sort((a, b) => b - a);
  let total = 0; const groups = {};
  sorted.forEach((va, i) => {
    const f = bandLookup(t.rows, i + 1);
    total += va * f; groups[f] = (groups[f] || 0) + va;
  });
  const sum = sorted.reduce((s, x) => s + x, 0);
  return { connectedVA: sum, demandVA: total, ref: kind === "residential" ? "ตารางที่ 9-5" : "ตารางที่ 9-6",
    steps: [...Object.entries(groups).map(([f, va]) => `${va.toLocaleString()} VA × ${f} = ${(va * f).toLocaleString()} VA`), `รวม = ${total.toLocaleString()} VA`] };
}
