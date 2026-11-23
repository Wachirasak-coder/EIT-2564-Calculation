// ฉ. ขนาดท่อร้อยสาย — ตาราง 5-3 (ร้อยละพื้นที่), ภาคผนวก ฎ
import { requireTable } from "./lib.js";

// เส้นผ่านศูนย์กลางภายในโดยประมาณ (mm) อ้างอิง NEC Chapter 9 Table 4 — ตรวจกับผู้ผลิต
export const CONDUITS = {
  EMT: [["1/2\"", 15.8], ["3/4\"", 20.9], ["1\"", 26.6], ["1-1/4\"", 35.1], ["1-1/2\"", 40.9], ["2\"", 52.5], ["2-1/2\"", 69.4], ["3\"", 85.2], ["4\"", 110.1]],
  IMC: [["1/2\"", 16.8], ["3/4\"", 21.9], ["1\"", 28.1], ["1-1/4\"", 36.8], ["1-1/2\"", 42.7], ["2\"", 54.6], ["2-1/2\"", 64.9], ["3\"", 80.7], ["4\"", 104.6]],
};

// cables = [{od: mm, qty}]
export function conduitFill(T, cables, type = "EMT", leadSheath = false) {
  const t = requireTable(T, "conduitFill.5-3");
  const n = cables.reduce((s, c) => s + c.qty, 0);
  const tbl = leadSheath ? t.byCountLeadSheath : t.byCount;
  const pct = tbl[n <= 4 ? String(n) : "more"];
  const area = cables.reduce((s, c) => s + c.qty * Math.PI * (c.od / 2) ** 2, 0);
  const steps = [`สาย ${n} เส้น พื้นที่รวม = ${area.toFixed(1)} ตร.มม.`, `ยอมให้ไม่เกิน ${pct}% ของพื้นที่ท่อ (ตารางที่ 5-3)`];
  for (const [name, id] of CONDUITS[type]) {
    const a = Math.PI * (id / 2) ** 2;
    const fill = area / a * 100;
    if (fill <= pct) {
      steps.push(`ท่อ ${type} ${name} (ID ${id} mm, ${a.toFixed(0)} ตร.มม.) → ${fill.toFixed(1)}% ≤ ${pct}% ✔`);
      return { conduit: `${type} ${name}`, fillPct: fill, limitPct: pct, pass: true, steps, ref: "ตารางที่ 5-3" };
    }
  }
  steps.push("เกินขนาดท่อในรายการ → แยกท่อหรือใช้รางเดินสาย");
  return { conduit: null, pass: false, limitPct: pct, steps, ref: "ตารางที่ 5-3" };
}
