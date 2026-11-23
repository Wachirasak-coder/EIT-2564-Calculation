// ข. ขนาดสายไฟฟ้า — ข้อ 5.25, ตาราง 5-20 ถึง 5-42, ตัวคูณ 5-8, 5-43, 5-44
import { requireTable, rangeLookup, bandLookup, nextStd, SIZES } from "./lib.js";

export function listAmpacityTables(T) {
  return Object.entries(T?.ampacity || {}).map(([id, t]) => ({ id, title: t.title, columns: t.columns.map(c => c.label) }));
}

export function tempFactor(T, location, insulationCol, ambientC) {
  const id = location === "ground" ? "5-44" : "5-43";
  const t = requireTable(T, "tempFactor." + id);
  const ci = t.columns.indexOf(insulationCol);
  if (ci < 0) throw new Error(`ตาราง ${id} ไม่มีคอลัมน์ ${insulationCol}`);
  const row = rangeLookup(t.rows, Math.round(ambientC));
  const f = row ? row[ci] : null;
  if (f == null) throw new Error(`ตาราง ${id}: ไม่มีตัวคูณที่ ${ambientC}°C สำหรับ ${insulationCol}`);
  return { factor: f, ref: "ตารางที่ " + id };
}

export function groupFactor(T, circuits, surface = false) {
  if (circuits <= 1) return { factor: 1, ref: "ตารางที่ 5-8" };
  const t = requireTable(T, "groupFactor.5-8");
  const row = rangeLookup(t.rows, circuits);
  if (!row) throw new Error("จำนวนกลุ่มวงจรเกินตาราง 5-8");
  return { factor: row[surface ? 1 : 0], ref: "ตารางที่ 5-8" };
}

function insulationColumn(table, col) {
  const ins = table.columns[col].insulation || table.insulation;
  if (ins === "XLPE") return "XLPE90";
  return "PVC70";
}

/**
 * เลือกขนาดสายเล็กสุดที่ Iz × Ca × Cg ≥ In (In = พิกัด OCPD)
 * opts: {tableId, column, designA, ocpdA?, ambientC, circuits, surface, minSize}
 */
export function sizeCable(T, opts) {
  const table = requireTable(T, "ampacity." + opts.tableId);
  const col = opts.column;
  const ocpd = opts.ocpdA ?? nextStd(opts.designA);
  const ca = tempFactor(T, table.location, insulationColumn(table, col), opts.ambientC ?? table.ambientBase);
  const cg = groupFactor(T, opts.circuits ?? 1, opts.surface);
  const k = ca.factor * cg.factor;
  const steps = [
    `กระแสออกแบบ Ib = ${opts.designA.toFixed(2)} A`,
    `เลือกเครื่องป้องกันกระแสเกิน In = ${ocpd} A (≥ Ib)`,
    `ตัวคูณอุณหภูมิ Ca = ${ca.factor} (${ca.ref}, ${opts.ambientC ?? table.ambientBase}°C)`,
    `ตัวคูณกลุ่มวงจร Cg = ${cg.factor} (${cg.ref}, ${opts.circuits ?? 1} วงจร)`,
  ];
  const minIdx = opts.minSize ? SIZES.indexOf(String(opts.minSize)) : 0;
  for (const s of SIZES.slice(Math.max(0, minIdx))) {
    const iz = table.rows[s]?.[col];
    if (iz == null) continue;
    const izc = iz * k;
    if (izc >= ocpd) {
      steps.push(`ขนาด ${s} ตร.มม.: Iz = ${iz} × ${k.toFixed(3)} = ${izc.toFixed(1)} A ≥ In ${ocpd} A ✔ (ตารางที่ ${opts.tableId})`);
      return { size: s, iz, izCorrected: izc, ocpd, ca: ca.factor, cg: cg.factor, steps, pass: true, ref: `ตารางที่ ${opts.tableId}` };
    }
  }
  steps.push("ไม่มีขนาดสายในตารางที่รับกระแสได้ — ใช้สายขนานหรือเปลี่ยนวิธีติดตั้ง");
  return { size: null, ocpd, steps, pass: false, ref: `ตารางที่ ${opts.tableId}` };
}
