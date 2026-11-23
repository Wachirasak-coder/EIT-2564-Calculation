// จ. การต่อลงดิน — ข้อ 4.20, ตาราง 4-1, 4-2, ภาคผนวก ญ
import { requireTable, bandLookup } from "./lib.js";

export function groundingElectrodeConductor(T, serviceMm2) {
  const t = requireTable(T, "grounding.4-1");
  const s = bandLookup(t.rows, serviceMm2);
  return { sizeMm2: s, ref: "ตารางที่ 4-1", steps: [`ตัวนำประธาน ${serviceMm2} ตร.มม. → สายต่อหลักดิน ≥ ${s} ตร.มม. (ทองแดง)`] };
}

export function equipmentGroundingConductor(T, ocpdA, circuitLengthM = 0) {
  const t = requireTable(T, "grounding.4-2");
  const s = bandLookup(t.rows.map(([a, m]) => [a, m]), ocpdA);
  const warn = circuitLengthM > (t.longCircuitM ?? 30) ? `วงจรยาวเกิน ${t.longCircuitM} m ให้ตรวจ earth fault loop impedance ตามภาคผนวก ญ` : null;
  return { sizeMm2: s, warn, ref: "ตารางที่ 4-2", steps: [`OCPD ${ocpdA} A → สายดินบริภัณฑ์ ≥ ${s ?? "เกินตาราง"} ตร.มม. (ทองแดง)`] };
}
