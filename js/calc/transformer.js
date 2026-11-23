// ซ. หม้อแปลงระบบแรงสูง — ข้อ 6.4, ตาราง 6-5
import { requireTable, bandLookup } from "./lib.js";

export function transformerProtection(T, { kva, hvV, lvV, zPct }) {
  const t = requireTable(T, "transformer.6-5");
  const row = bandLookup(t.rows, zPct);
  if (!row) throw new Error("อิมพีแดนซ์เกิน 10% อยู่นอกตาราง 6-5");
  const Ip = kva * 1000 / (Math.sqrt(3) * hvV), Is = kva * 1000 / (Math.sqrt(3) * lvV);
  const lvSide = lvV > 1000 ? [row[2], row[3]] : [row[4], row[4]];
  return { Ip, Is, ref: "ตารางที่ 6-5",
    primaryCbA: Ip * row[0] / 100, primaryFuseA: Ip * row[1] / 100,
    secondaryCbA: Is * lvSide[0] / 100, secondaryFuseA: Is * lvSide[1] / 100,
    steps: [`Ip = ${kva} kVA / (√3 × ${hvV} V) = ${Ip.toFixed(2)} A`, `Is = ${kva} kVA / (√3 × ${lvV} V) = ${Is.toFixed(2)} A`,
      `ด้านไฟเข้า: CB ≤ ${row[0]}% = ${(Ip * row[0] / 100).toFixed(1)} A, ฟิวส์ ≤ ${row[1]}% = ${(Ip * row[1] / 100).toFixed(1)} A`,
      `ด้านไฟออก: CB ≤ ${lvSide[0]}% = ${(Is * lvSide[0] / 100).toFixed(1)} A, ฟิวส์ ≤ ${lvSide[1]}% = ${(Is * lvSide[1] / 100).toFixed(1)} A`] };
}
