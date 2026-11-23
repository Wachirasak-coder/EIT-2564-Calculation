// ค. แรงดันตก — ข้อ 3.6 (รวม ≤ 5%), ภาคผนวก ฐ ตาราง ฐ.1–ฐ.4
import { requireTable, SIZES } from "./lib.js";

export function vdTableValue(T, tableId, column, size) {
  const t = requireTable(T, "vd." + tableId);
  const v = t.rows[String(size)]?.[column];
  if (v == null) throw new Error(`ตาราง ${tableId} ไม่มีค่าสำหรับขนาด ${size} ตร.มม.`);
  return { mVAm: v, phase: t.columns[column].phase };
}

// วิธีตาราง: Vd = mV/A/m × I × L / 1000
export function vdByTable(T, { tableId, column, size, currentA, lengthM, systemV }) {
  const { mVAm } = vdTableValue(T, tableId, column, size);
  const vd = mVAm * currentA * lengthM / 1000;
  const pct = vd / systemV * 100;
  return { vd, pct, mVAm, steps: [
    `mV/A/m = ${mVAm} (ตารางที่ ${tableId}, ${size} ตร.มม.)`,
    `Vd = ${mVAm} × ${currentA} A × ${lengthM} m / 1000 = ${vd.toFixed(2)} V`,
    `%Vd = ${vd.toFixed(2)} / ${systemV} × 100 = ${pct.toFixed(2)} %`], ref: `ภาคผนวก ฐ ตาราง ${tableId}` };
}

// วิธีสูตร: Vd = k·I·L·(R cosφ + X sinφ), k = 2 (1 เฟส) หรือ √3 (3 เฟส, line-line) ; R, X เป็น Ω/km
export function vdByImpedance({ phase, currentA, lengthM, rOhmKm, xOhmKm = 0, pf = 0.85, systemV }) {
  const k = phase === 3 ? Math.sqrt(3) : 2;
  const sin = Math.sqrt(1 - pf * pf);
  const vd = k * currentA * (lengthM / 1000) * (rOhmKm * pf + xOhmKm * sin);
  const pct = vd / systemV * 100;
  return { vd, pct, steps: [
    `Vd = ${phase === 3 ? "√3" : "2"} × I × L × (R cosφ + X sinφ)`,
    `   = ${k.toFixed(3)} × ${currentA} × ${(lengthM / 1000).toFixed(3)} km × (${rOhmKm}×${pf} + ${xOhmKm}×${sin.toFixed(3)}) = ${vd.toFixed(2)} V`,
    `%Vd = ${pct.toFixed(2)} %`], ref: "ภาคผนวก ฐ (สมการ IR cosφ + IX sinφ)" };
}

export function checkTotal(T, segmentsPct) {
  const lim = T?.vdLimit?.totalPct ?? 5;
  const total = segmentsPct.reduce((s, x) => s + x, 0);
  return { total, limit: lim, pass: total <= lim + 1e-9, ref: "ข้อ 3.6.1 / 3.6.2" };
}

// หาขนาดสายเล็กสุดที่ %Vd ไม่เกินค่าที่ยอมให้สำหรับช่วงนี้
export function minSizeForVd(T, { tableId, column, currentA, lengthM, systemV, allowPct, startSize }) {
  const t = requireTable(T, "vd." + tableId);
  const start = Math.max(0, SIZES.indexOf(String(startSize ?? "1")));
  for (const s of SIZES.slice(start)) {
    const v = t.rows[s]?.[column];
    if (v == null) continue;
    const pct = v * currentA * lengthM / 1000 / systemV * 100;
    if (pct <= allowPct) return { size: s, pct };
  }
  return { size: null };
}
