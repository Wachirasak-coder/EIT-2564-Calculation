// ช. วงจรมอเตอร์ — ข้อ 6.3.5, 6.3.7, 6.3.21, ตาราง 6-1, 6-3
import { requireTable, nextStd } from "./lib.js";

export function motorBranchConductorA(T, flcA, duty = null, dutyCol = null) {
  if (duty) {
    const t = requireTable(T, "motor.6-1");
    const pct = t.rows[duty].v[dutyCol];
    if (pct == null) throw new Error("ไม่มีค่าในตาราง 6-1 สำหรับเงื่อนไขนี้");
    return { ampacityA: flcA * pct / 100, ref: "ตารางที่ 6-1", steps: [`มอเตอร์ใช้งานไม่ต่อเนื่อง: ${flcA} A × ${pct}% = ${(flcA * pct / 100).toFixed(2)} A`] };
  }
  const pct = requireTable(T, "motor.6.3.5.1").branchPct;
  return { ampacityA: flcA * pct / 100, ref: "ข้อ 6.3.5.1", steps: [`สายวงจรย่อยมอเตอร์ ≥ ${pct}% × ${flcA} A = ${(flcA * pct / 100).toFixed(2)} A`] };
}

// motors = [{flcA, ampacityA?}] ampacityA = ค่าจากตาราง 6-1 ถ้าใช้งานไม่ต่อเนื่อง
export function motorFeederConductorA(motors, otherLoadA = 0) {
  const vals = motors.map(m => m.ampacityA ?? m.flcA);
  const max = Math.max(...vals);
  const rest = vals.reduce((s, x) => s + x, 0) - max;
  const I = 1.25 * max + rest + otherLoadA;
  return { ampacityA: I, ref: "ข้อ 6.3.7.3 / 6.3.8", steps: [`1.25 × ${max} + ${rest.toFixed(2)}${otherLoadA ? ` + โหลดอื่น ${otherLoadA}` : ""} = ${I.toFixed(2)} A`] };
}

// device: 0 ฟิวส์ไว, 1 ฟิวส์หน่วงเวลา, 2 CB ปลดทันที, 3 CB เวลาผกผัน
export function motorShortCircuitProtection(T, flcA, motorType, device) {
  const t = requireTable(T, "motor.6-3");
  const pct = t.rows[motorType].v[device];
  const raw = flcA * pct / 100;
  const L = requireTable(T, "motor.6.3.21");
  const chosen = nextStd(raw);
  let maxPct = null;
  if (device === 0) maxPct = raw > L.fuseBigA ? L.fastFuseBigMaxPct : L.fastFuseMaxPct;
  if (device === 1) maxPct = L.timeDelayFuseMaxPct;
  if (device === 3) maxPct = (chosen ?? raw) > L.itcbBigA ? L.itcbBigMaxPct : L.itcbSmallMaxPct;
  return { pct, rawA: raw, ratingA: chosen, maxIfNotStartA: maxPct ? flcA * maxPct / 100 : null, ref: "ตารางที่ 6-3, ข้อ 6.3.21",
    steps: [`${pct}% × ${flcA} A = ${raw.toFixed(1)} A → ขนาดมาตรฐานถัดไป ${chosen} A`,
      ...(maxPct ? [`ถ้ามอเตอร์สตาร์ทไม่ได้ เพิ่มได้ไม่เกิน ${maxPct}% = ${(flcA * maxPct / 100).toFixed(1)} A (ข้อ 6.3.21)`] : [])] };
}

// ป้องกันสายป้อนมอเตอร์: พิกัด SC ของมอเตอร์ตัวใหญ่สุด + ผลรวม FLC ตัวอื่น
export function motorFeederProtection(largestScA, otherFlcA = []) {
  const I = largestScA + otherFlcA.reduce((s, x) => s + x, 0);
  return { maxA: I, ref: "ข้อ 6.3.22 ข)", steps: [`${largestScA} + ${otherFlcA.join(" + ") || 0} = ${I} A (ไม่เกินค่านี้ ใช้ขนาดมาตรฐานที่ต่ำกว่า)`] };
}
