// รัน: node --test tests/  
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { tiered, bandLookup, nextStd, TableMissingError } from "../js/calc/lib.js";
import * as D from "../js/calc/demand.js";
import * as C from "../js/calc/cable.js";
import * as V from "../js/calc/vd.js";
import * as S from "../js/calc/service.js";
import * as G from "../js/calc/ground.js";
import * as P from "../js/calc/conduit.js";
import * as M from "../js/calc/motor.js";
import * as X from "../js/calc/transformer.js";
import * as K from "../js/calc/condo.js";

const path = new URL("../data/tables.json", import.meta.url);
const T = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : null;
const t = (name, fn) => test(name, { skip: !T && "ไม่มี data/tables.json" }, fn);
const near = (a, b, e = 0.01) => assert.ok(Math.abs(a - b) <= e, `${a} ≠ ${b}`);

test("helpers", () => {
  assert.equal(nextStd(41), 50); assert.equal(nextStd(32), 32);
  assert.equal(bandLookup([[10, 1], [null, 2]], 11), 2);
  near(tiered(15000, [[10000, 100], [null, 50]]).total, 12500);
  assert.throws(() => D.lightingDemand({}, "other", 1), TableMissingError);
});

t("ก ดีมานด์แสงสว่างที่พักอาศัย 10,000 VA", () => {
  // 3000×100% + 7000×35% = 5450
  near(D.lightingDemand(T, "residential", 10000).demandVA, 5450);
});
t("ก เต้ารับ 80 จุด", () => {
  // 14,400 VA → 10,000 + 4,400×50% = 12,200
  near(D.receptacleDemand(T, 80).demandVA, 12200);
});
t("ก เครื่องใช้ไฟฟ้าที่อยู่อาศัย", () => {
  const r = D.applianceDemand(T, "residential", { cooking: [20], waterHeaters: [15, 10, 8], ac: [10] });
  near(r.cook, 13); near(r.waterHeater, 27); near(r.ac, 10);
});
t("ก ลิฟต์ 3 ตัว / นิวทรัล", () => {
  near(D.elevatorDemand(T, [40, 40, 40]).demandA, 108);
  near(D.neutralCurrent(T, 300).neutralA, 270);
});
t("ข ขนาดสาย PVC ในท่อ 3 เฟส 40 A ที่ 40°C", () => {
  // ตาราง 5-20 คอลัมน์กลุ่ม 2 · 3 ตัวนำ · แกนเดียว (index 6): 10 ตร.มม. = 44 A ≥ 40
  const r = C.sizeCable(T, { tableId: "5-20", column: 6, designA: 38, ambientC: 40, circuits: 1 });
  assert.equal(r.ocpd, 40); assert.equal(r.size, "10");
});
t("ข ตัวคูณกลุ่ม 3 วงจร + 45°C", () => {
  const r = C.sizeCable(T, { tableId: "5-20", column: 6, designA: 38, ambientC: 45, circuits: 3 });
  // k = 0.91×0.70 = 0.637 → 16: 59×0.637 = 37.6 <40 ; 25: 77×0.637 = 49.0 ✔
  assert.equal(r.size, "25");
});
t("ค แรงดันตก ตาราง ฐ.2 PVC หลายแกน 3 เฟส", () => {
  // 16 ตร.มม. 2.4 mV/A/m × 50 A × 60 m = 7.2 V = 1.8% ของ 400 V
  const r = V.vdByTable(T, { tableId: "ฐ.2", column: 1, size: "16", currentA: 50, lengthM: 60, systemV: 400 });
  near(r.vd, 7.2); near(r.pct, 1.8);
  assert.equal(V.checkTotal(T, [1.8, 3.5]).pass, false);
});
t("ค สูตร R/X", () => {
  const r = V.vdByImpedance({ phase: 1, currentA: 10, lengthM: 100, rOhmKm: 7.41, pf: 1, systemV: 230 });
  near(r.vd, 14.82);
});
t("ง มิเตอร์ กฟน./กฟภ.", () => {
  assert.equal(S.meterMEA(T, 60).meter, "30(100)");
  assert.equal(S.meterPEA(T, 35, 1).meter, "15(45)");
});
t("จ สายดิน", () => {
  assert.equal(G.groundingElectrodeConductor(T, 70).sizeMm2, 25);
  assert.equal(G.equipmentGroundingConductor(T, 63).sizeMm2, 6);
  assert.equal(G.equipmentGroundingConductor(T, 100).sizeMm2, 10);
});
t("ฉ ท่อร้อยสาย", () => {
  const r = P.conduitFill(T, [{ od: 4.9, qty: 4 }], "EMT");
  // 4×18.86 = 75.4 mm² ; 1/2" = 196 mm² → 38.5% ✔
  assert.equal(r.conduit, 'EMT 1/2"');
});
t("ช มอเตอร์", () => {
  near(M.motorBranchConductorA(T, 20).ampacityA, 25);
  near(M.motorFeederConductorA([{ flcA: 20 }, { flcA: 10 }]).ampacityA, 35);
  const sc = M.motorShortCircuitProtection(T, 20, "squirrel", 3);
  near(sc.rawA, 50); assert.equal(sc.ratingA, 50);
});
t("ซ หม้อแปลง 1000 kVA 22 kV/400 V Z=6%", () => {
  const r = X.transformerProtection(T, { kva: 1000, hvV: 22000, lvV: 400, zPct: 6 });
  near(r.Ip, 26.24); near(r.primaryCbA, 157.46, 0.05);
});
t("ฌ อาคารชุด", () => {
  near(K.unitLoadVA(T, { kind: "residential", areaM2: 50, central: false }).va, 6000);
  assert.equal(K.unitMeter(T, { kind: "residential", utility: "MEA", areaM2: 50, central: false, phase: 1 }).meter, "15(45) A 1P");
  const f = K.feederWithCoincidence(T, Array(12).fill(6000), "residential");
  near(f.demandVA, 10 * 6000 * 0.9 + 2 * 6000 * 0.8);
});
