// ก. โหลดและดีมานด์แฟกเตอร์ — บทที่ 3 ข้อ 3.2, ตาราง 3-1, 3-2, 3-3, 10-2, ภาคผนวก ฌ
import { requireTable, tiered, bandLookup } from "./lib.js";

export function lightingDemand(T, buildingType, va) {
  const t = requireTable(T, "demand.3-1");
  const type = t.types[buildingType];
  if (!type) throw new Error("ไม่รู้จักประเภทอาคาร: " + buildingType);
  const { total, steps } = tiered(va, type.tiers);
  return { demandVA: total, steps: steps.map(s => `${s.part.toLocaleString()} VA × ${s.pct}% = ${s.val.toLocaleString()} VA`), ref: "ตารางที่ 3-1" };
}

export function receptacleDemand(T, outlets, extraVA = 0) {
  const t = requireTable(T, "demand.3-2");
  const va = outlets * t.vaPerOutlet + extraVA;
  const { total, steps } = tiered(va, t.tiers);
  return { connectedVA: va, demandVA: total,
    steps: [`โหลดเต้ารับ = ${outlets} จุด × ${t.vaPerOutlet} VA${extraVA ? ` + ${extraVA} VA` : ""} = ${va.toLocaleString()} VA (ข้อ 3.1.6.3)`,
      ...steps.map(s => `${s.part.toLocaleString()} VA × ${s.pct}% = ${s.val.toLocaleString()} VA`)], ref: "ตารางที่ 3-2" };
}

// รายการเครื่องใช้ไฟฟ้าเป็นกระแส (A)
export function applianceDemand(T, buildingType, { cooking = [], waterHeaters = [], ac = [] }) {
  const t = requireTable(T, "demand.3-3");
  let p = t[buildingType];
  if (!p) throw new Error("ไม่รู้จักประเภทอาคาร: " + buildingType);
  if (p.sameAs) p = { ...t[p.sameAs], ...p };
  const desc = a => [...a].sort((x, y) => y - x);
  const sum = a => a.reduce((s, x) => s + x, 0);
  const steps = [];
  let cook = 0;
  const c = desc(cooking);
  if (c.length) {
    if (p.cookingFirstA != null) {
      const tot = sum(c);
      cook = Math.min(tot, p.cookingFirstA) + Math.max(0, tot - p.cookingFirstA) * p.cookingRestPct / 100;
      steps.push(`หุงต้ม: ${p.cookingFirstA} A + ${p.cookingRestPct}% ของส่วนเกิน (${tot} A) = ${cook.toFixed(2)} A`);
    } else {
      cook = (c[0] || 0) * p.cookingLargestPct / 100 + (c[1] || 0) * p.cookingSecondPct / 100 + sum(c.slice(2)) * p.cookingRestPct / 100;
      steps.push(`หุงต้ม: ตัวใหญ่สุด ${p.cookingLargestPct}% + ตัวรอง ${p.cookingSecondPct}% + ที่เหลือ ${p.cookingRestPct}% = ${cook.toFixed(2)} A`);
    }
  }
  const w = desc(waterHeaters);
  const wh = sum(w.slice(0, p.waterHeaterFullCount)) + sum(w.slice(p.waterHeaterFullCount)) * p.waterHeaterRestPct / 100;
  if (w.length) steps.push(`ทำน้ำร้อน: ${p.waterHeaterFullCount} ตัวใหญ่สุด 100% + ที่เหลือ ${p.waterHeaterRestPct}% = ${wh.toFixed(2)} A`);
  const acA = sum(ac) * p.acPct / 100;
  if (ac.length) steps.push(`เครื่องปรับอากาศแยกส่วน: ${sum(ac)} A × ${p.acPct}% = ${acA.toFixed(2)} A`);
  return { demandA: cook + wh + acA, cook, waterHeater: wh, ac: acA, steps, ref: "ตารางที่ 3-3" };
}

export function centralAcDemand(T, chillersKW = [], ahusKW = []) {
  const t = requireTable(T, "demand.ฌ.1");
  const d = a => [...a].sort((x, y) => y - x);
  const ch = d(chillersKW), ah = d(ahusKW);
  const chil = (ch[0] || 0) * t.chillerFirstPct / 100 + ch.slice(1).reduce((s, x) => s + x, 0) * t.chillerRestPct / 100;
  const ahu = ah.slice(0, t.ahuFullCount).reduce((s, x) => s + x, 0) + ah.slice(t.ahuFullCount).reduce((s, x) => s + x, 0) * t.ahuRestPct / 100;
  return { demandKW: chil + ahu, chiller: chil, ahu, steps: [
    `Chiller: เครื่องแรก ${t.chillerFirstPct}% + ที่เหลือ ${t.chillerRestPct}% = ${chil.toFixed(2)} kW`,
    `AHU/FCU: ${t.ahuFullCount} เครื่องแรก 100% + ที่เหลือ ${t.ahuRestPct}% = ${ahu.toFixed(2)} kW`], ref: "ภาคผนวก ฌ ตารางที่ ฌ.1" };
}

export function elevatorDemand(T, ratedA = []) {
  const t = requireTable(T, "demand.10-2");
  const n = ratedA.length;
  const last = t.rows[t.rows.length - 1];
  const pct = n >= last[0] ? last[1] : (t.rows.find(x => x[0] === n) || [0, 100])[1];
  const sum = ratedA.reduce((s, x) => s + x, 0);
  return { count: n, pct, demandA: sum * pct / 100, steps: [`ลิฟต์ ${n} ตัว รวม ${sum} A × ${pct}% = ${(sum * pct / 100).toFixed(2)} A`], ref: "ตารางที่ 10-2" };
}

export function neutralCurrent(T, maxUnbalancedA) {
  const t = requireTable(T, "demand.3.2.4");
  const I = maxUnbalancedA <= t.thresholdA ? maxUnbalancedA : t.thresholdA + (maxUnbalancedA - t.thresholdA) * t.excessPct / 100;
  return { neutralA: I, ref: "ข้อ 3.2.4", steps: [maxUnbalancedA <= t.thresholdA
    ? `กระแสไม่สมดุล ≤ ${t.thresholdA} A → นิวทรัล ≥ ${maxUnbalancedA} A`
    : `${t.thresholdA} A + ${t.excessPct}% × (${maxUnbalancedA} − ${t.thresholdA}) = ${I.toFixed(1)} A`] };
}
