import { loadTables, saveTables, clearTables } from "./data.js";
import { current, r, SIZES } from "./calc/lib.js";
import * as D from "./calc/demand.js";
import * as C from "./calc/cable.js";
import * as V from "./calc/vd.js";
import * as S from "./calc/service.js";
import * as G from "./calc/ground.js";
import * as P from "./calc/conduit.js";
import * as M from "./calc/motor.js";
import * as X from "./calc/transformer.js";
import * as K from "./calc/condo.js";

let T = null;
const $ = s => document.querySelector(s);
const nums = s => String(s || "").split(/[,\s]+/).map(Number).filter(x => isFinite(x) && x > 0);
const opt = (v, l) => ({ v, l });
const sizeOpts = () => SIZES.map(s => opt(s, s + " ตร.มม."));
const ampTables = () => Object.entries(T?.ampacity || {}).map(([id, t]) => opt(id, `ตาราง ${id} — ${t.title}`));
const ampCols = f => (T?.ampacity?.[f.tableId]?.columns || []).map((c, i) => opt(i, c.label));
const vdTables = () => Object.entries(T?.vd || {}).map(([id, t]) => opt(id, `ตาราง ${id} — ${t.title}`));
const vdCols = f => (T?.vd?.[f.vdTable]?.columns || []).map((c, i) => opt(i, c.label));
const phaseOpts = [opt(1, "1 เฟส 230 V"), opt(3, "3 เฟส 400 V")];
const V_OF = p => (+p === 3 ? 400 : 230);

const MODULES = [
  { id: "demand", name: "ก. โหลด/ดีมานด์", desc: "ดีมานด์แฟกเตอร์ของสายป้อน (ข้อ 3.2) ตาราง 3-1, 3-2, 3-3, 10-2, ภาคผนวก ฌ",
    fields: [
      { k: "bt", l: "ประเภทอาคาร (แสงสว่าง)", t: "select", o: () => Object.entries(T?.demand?.["3-1"]?.types || {}).map(([k, v]) => opt(k, v.label)), d: "residential" },
      { k: "light", l: "โหลดแสงสว่างรวม (VA)", d: 10000 },
      { k: "outlets", l: "จำนวนจุดเต้ารับ (ไม่ใช่ที่อยู่อาศัย)", d: 0 },
      { k: "at", l: "ประเภทอาคาร (เครื่องใช้ไฟฟ้า)", t: "select", o: () => [opt("residential", "ที่อยู่อาศัย"), opt("commercial", "สำนักงาน/ร้านค้า/ห้าง"), opt("hotel", "โรงแรม/อื่นๆ")], d: "residential" },
      { k: "cook", l: "เครื่องหุงต้ม (A) คั่นด้วย ,", t: "list", d: "" },
      { k: "wh", l: "เครื่องทำน้ำร้อน (A)", t: "list", d: "" },
      { k: "ac", l: "เครื่องปรับอากาศแยกส่วน (A)", t: "list", d: "" },
      { k: "lift", l: "ลิฟต์ในสายป้อนเดียวกัน (A ต่อตัว)", t: "list", d: "" },
      { k: "phase", l: "ระบบไฟ", t: "select", o: () => phaseOpts, d: 3 },
    ],
    run(f) {
      const V0 = V_OF(f.phase), steps = []; const refs = [];
      const L = D.lightingDemand(T, f.bt, +f.light); steps.push("แสงสว่าง:", ...L.steps); refs.push(L.ref);
      let va = L.demandVA;
      if (+f.outlets > 0) { const R = D.receptacleDemand(T, +f.outlets); steps.push("เต้ารับ:", ...R.steps); va += R.demandVA; refs.push(R.ref); }
      let amps = current(va, V0, +f.phase);
      steps.push(`รวม ${r(va, 0)} VA → ${r(amps)} A ที่ ${V0} V`);
      const A = D.applianceDemand(T, f.at, { cooking: nums(f.cook), waterHeaters: nums(f.wh), ac: nums(f.ac) });
      if (A.steps.length) { steps.push(...A.steps); amps += A.demandA; refs.push(A.ref); }
      const lifts = nums(f.lift);
      if (lifts.length) { const E = D.elevatorDemand(T, lifts); steps.push(...E.steps); amps += E.demandA; refs.push(E.ref); }
      return { big: `กระแสความต้องการ ≈ ${r(amps)} A`, steps, ref: refs.join(", "), note: "กระแสเครื่องใช้ไฟฟ้าบวกเป็นค่าต่อเฟสอย่างง่าย ตรวจการจัดเฟสอีกครั้ง; ดีมานด์ใช้กับสายป้อนเท่านั้น (ข้อ 3.2.3.6)" };
    } },
  { id: "cable", name: "ข. ขนาดสาย", desc: "เลือกขนาดสายจากพิกัดกระแส ตัวคูณอุณหภูมิ (5-43/5-44) และจำนวนวงจร (5-8) แล้วตรวจแรงดันตก",
    fields: [
      { k: "ib", l: "กระแสออกแบบ Ib (A)", d: 38 },
      { k: "ocpd", l: "พิกัด OCPD (A) เว้นว่าง = เลือกให้", d: "" },
      { k: "tableId", l: "ตารางพิกัดกระแส", t: "select", o: ampTables, d: "5-20", re: true },
      { k: "col", l: "รูปแบบ/จำนวนตัวนำ", t: "select", o: ampCols, d: 6 },
      { k: "amb", l: "อุณหภูมิโดยรอบ (°C)", d: 40 },
      { k: "n", l: "จำนวนกลุ่มวงจรในช่องเดินสาย", d: 1 },
      { k: "surf", l: "การเดินสายหลายวงจร", t: "select", o: () => [opt(0, "ในช่องเดินสายเดียวกัน"), opt(1, "บนผิว/เกาะผนัง")], d: 0 },
      { k: "len", l: "ความยาวสาย (m) — 0 = ไม่ตรวจ Vd", d: 50 },
      { k: "vdTable", l: "ตารางแรงดันตก", t: "select", o: vdTables, d: "ฐ.1", re: true },
      { k: "vdCol", l: "คอลัมน์แรงดันตก", t: "select", o: vdCols, d: 3 },
      { k: "phase", l: "ระบบไฟ", t: "select", o: () => phaseOpts, d: 3 },
      { k: "vdAllow", l: "%Vd ที่ยอมให้ช่วงนี้", d: 2.5 },
    ],
    run(f) {
      const res = C.sizeCable(T, { tableId: f.tableId, column: +f.col, designA: +f.ib, ocpdA: f.ocpd ? +f.ocpd : undefined, ambientC: +f.amb, circuits: +f.n, surface: +f.surf === 1 });
      const steps = [...res.steps]; let size = res.size, pass = res.pass;
      if (size && +f.len > 0) {
        const v = V.minSizeForVd(T, { tableId: f.vdTable, column: +f.vdCol, currentA: +f.ib, lengthM: +f.len, systemV: V_OF(f.phase), allowPct: +f.vdAllow, startSize: size });
        if (!v.size) { steps.push("ไม่มีขนาดสายที่ทำให้ %Vd ผ่าน"); pass = false; }
        else { if (v.size !== size) steps.push(`เพิ่มขนาดเป็น ${v.size} ตร.มม. เพื่อให้ %Vd = ${r(v.pct)}% ≤ ${f.vdAllow}% (ภาคผนวก ฐ, ข้อ 3.6)`);
          else steps.push(`%Vd = ${r(v.pct)}% ≤ ${f.vdAllow}% ✔ (ตาราง ${f.vdTable})`); size = v.size; }
      }
      return { big: size ? `ใช้สาย ${size} ตร.มม. · OCPD ${res.ocpd} A` : "ไม่พบขนาดที่เหมาะสม", pass, steps, ref: `${res.ref}, ข้อ 5.25.1.10` };
    } },
  { id: "vd", name: "ค. แรงดันตก", desc: "แรงดันตกรวมจากเครื่องวัดฯ/บริภัณฑ์ประธานถึงจุดใช้ไฟต้องไม่เกิน 5% (ข้อ 3.6)",
    fields: [
      { k: "method", l: "วิธีคำนวณ", t: "select", o: () => [opt("table", "ตาราง mV/A/m (ภาคผนวก ฐ)"), opt("rx", "สูตร R, X")], d: "table" },
      { k: "phase", l: "ระบบไฟ", t: "select", o: () => phaseOpts, d: 3 },
      { k: "i", l: "กระแส (A)", d: 50 }, { k: "len", l: "ความยาว (m)", d: 60 },
      { k: "vdTable", l: "ตาราง (วิธีตาราง)", t: "select", o: vdTables, d: "ฐ.2", re: true },
      { k: "vdCol", l: "คอลัมน์", t: "select", o: vdCols, d: 1 },
      { k: "size", l: "ขนาดสาย", t: "select", o: sizeOpts, d: "16" },
      { k: "R", l: "R (Ω/km) (วิธีสูตร)", d: 1.38 }, { k: "X", l: "X (Ω/km)", d: 0.08 }, { k: "pf", l: "PF", d: 0.85 },
      { k: "prev", l: "%Vd ช่วงก่อนหน้า (สายป้อน)", d: 0 },
    ],
    run(f) {
      const sysV = V_OF(f.phase);
      const res = f.method === "table"
        ? V.vdByTable(T, { tableId: f.vdTable, column: +f.vdCol, size: f.size, currentA: +f.i, lengthM: +f.len, systemV: sysV })
        : V.vdByImpedance({ phase: +f.phase, currentA: +f.i, lengthM: +f.len, rOhmKm: +f.R, xOhmKm: +f.X, pf: +f.pf, systemV: sysV });
      const tot = V.checkTotal(T, [res.pct, +f.prev]);
      return { big: `Vd = ${r(res.vd)} V (${r(res.pct)}%) · รวม ${r(tot.total)}%`, pass: tot.pass,
        steps: [...res.steps, `รวมกับช่วงก่อนหน้า ${f.prev}% = ${r(tot.total)}% ${tot.pass ? "≤" : ">"} ${tot.limit}%`], ref: `${res.ref}, ${tot.ref}` };
    } },
  { id: "service", name: "ง. OCPD/มิเตอร์", desc: "ขนาดเครื่องวัดหน่วยไฟฟ้า เครื่องป้องกันกระแสเกิน และตัวนำประธาน (ข้อ 3.5.2)",
    fields: [
      { k: "kva", l: "โหลดความต้องการ (kVA)", d: 20 },
      { k: "phase", l: "ระบบไฟ", t: "select", o: () => phaseOpts, d: 3 },
      { k: "ut", l: "การไฟฟ้า", t: "select", o: () => [opt("MEA", "กฟน. (ตาราง 3-4)"), opt("PEA", "กฟภ. (ตาราง 3-5)")], d: "MEA" },
    ],
    run(f) {
      const I = current(+f.kva * 1000, V_OF(f.phase), +f.phase);
      const res = f.ut === "MEA" ? S.meterMEA(T, I) : S.meterPEA(T, I, +f.phase);
      return { big: res.pass ? `มิเตอร์ ${res.meter} A · โหลด ${r(I)} A` : "เกินตาราง", pass: res.pass, steps: [`I = ${r(I)} A`, ...res.steps], ref: res.ref + ", ข้อ 3.5.2" };
    } },
  { id: "ground", name: "จ. สายดิน", desc: "สายต่อหลักดิน (ตาราง 4-1) และสายดินบริภัณฑ์ไฟฟ้า (ตาราง 4-2)",
    fields: [{ k: "svc", l: "ขนาดตัวนำประธาน (ตร.มม.)", d: 70 }, { k: "ocpd", l: "พิกัด OCPD ของวงจร (A)", d: 63 }, { k: "len", l: "ความยาววงจร (m)", d: 20 }],
    run(f) {
      const a = G.groundingElectrodeConductor(T, +f.svc), b = G.equipmentGroundingConductor(T, +f.ocpd, +f.len);
      return { big: `สายต่อหลักดิน ${a.sizeMm2} ตร.มม. · สายดินบริภัณฑ์ ${b.sizeMm2} ตร.มม.`, steps: [...a.steps, ...b.steps], note: b.warn, ref: "ตารางที่ 4-1, 4-2, ภาคผนวก ญ" };
    } },
  { id: "conduit", name: "ฉ. ท่อร้อยสาย", desc: "พื้นที่สายรวมเทียบพื้นที่ท่อ (ตาราง 5-3) — กรอกเส้นผ่านศูนย์กลางนอกของสายจากผู้ผลิต",
    fields: [
      { k: "list", l: "สาย: OD(mm)×จำนวน เช่น 7.8x3, 5.6x1", t: "text", d: "7.8x3, 5.6x1" },
      { k: "type", l: "ชนิดท่อ", t: "select", o: () => [opt("EMT", "EMT"), opt("IMC", "IMC")], d: "EMT" },
      { k: "lead", l: "สายมีปลอกตะกั่ว", t: "select", o: () => [opt(0, "ไม่ใช่"), opt(1, "ใช่")], d: 0 },
    ],
    run(f) {
      const cables = String(f.list).split(",").map(s => s.trim().split(/x|×|\*/i)).filter(a => a.length === 2).map(([od, q]) => ({ od: +od, qty: +q }));
      const res = P.conduitFill(T, cables, f.type, +f.lead === 1);
      return { big: res.conduit ? `ใช้ท่อ ${res.conduit}` : "เกินรายการท่อ", pass: res.pass, steps: res.steps, ref: res.ref, note: "ขนาดภายในท่อเป็นค่าประมาณ (NEC Ch.9 Tbl.4) ตรวจกับผู้ผลิต" };
    } },
  { id: "motor", name: "ช. มอเตอร์", desc: "สายวงจรย่อย (ข้อ 6.3.5.1, ตาราง 6-1) สายป้อน (ข้อ 6.3.7) และเครื่องป้องกันลัดวงจร (ตาราง 6-3)",
    fields: [
      { k: "flc", l: "กระแสโหลดเต็มที่ FLC มอเตอร์ที่ออกแบบ (A)", d: 20 },
      { k: "mt", l: "ชนิดมอเตอร์", t: "select", o: () => Object.entries(T?.motor?.["6-3"]?.rows || {}).map(([k, v]) => opt(k, v.label)), d: "squirrel" },
      { k: "dev", l: "เครื่องป้องกัน", t: "select", o: () => (T?.motor?.["6-3"]?.columns || []).map((c, i) => opt(i, c)), d: 3 },
      { k: "duty", l: "ลักษณะใช้งาน", t: "select", o: () => [opt("", "ต่อเนื่อง"), ...Object.entries(T?.motor?.["6-1"]?.rows || {}).map(([k, v]) => opt(k, v.label))], d: "" },
      { k: "dcol", l: "พิกัดเวลาใช้งาน (ถ้าไม่ต่อเนื่อง)", t: "select", o: () => (T?.motor?.["6-1"]?.columns || []).map((c, i) => opt(i, c)), d: 0 },
      { k: "others", l: "FLC มอเตอร์ตัวอื่นในสายป้อน (A)", t: "list", d: "10, 7.5" },
    ],
    run(f) {
      const b = M.motorBranchConductorA(T, +f.flc, f.duty || null, +f.dcol);
      const sc = M.motorShortCircuitProtection(T, +f.flc, f.mt, +f.dev);
      const others = nums(f.others);
      const fd = M.motorFeederConductorA([{ flcA: +f.flc, ampacityA: f.duty ? b.ampacityA : undefined }, ...others.map(x => ({ flcA: x }))]);
      const fp = M.motorFeederProtection(sc.ratingA, others);
      return { big: `สายวงจรย่อย ≥ ${r(b.ampacityA)} A · ป้องกันลัดวงจร ${sc.ratingA} A`, steps: ["วงจรย่อย:", ...b.steps, "เครื่องป้องกันลัดวงจร:", ...sc.steps, "สายป้อน:", ...fd.steps, "ป้องกันสายป้อน:", ...fp.steps], ref: [b.ref, sc.ref, fd.ref, fp.ref].join(", ") };
    } },
  { id: "tx", name: "ซ. หม้อแปลง", desc: "ขนาดปรับตั้งสูงสุดของเครื่องป้องกันกระแสเกินหม้อแปลงระบบแรงสูง (ตาราง 6-5)",
    fields: [{ k: "kva", l: "พิกัด (kVA)", d: 1000 }, { k: "hv", l: "แรงดันด้านไฟเข้า (V)", d: 22000 }, { k: "lv", l: "แรงดันด้านไฟออก (V)", d: 400 }, { k: "z", l: "อิมพีแดนซ์ (%)", d: 6 }],
    run(f) {
      const res = X.transformerProtection(T, { kva: +f.kva, hvV: +f.hv, lvV: +f.lv, zPct: +f.z });
      return { big: `Ip ${r(res.Ip)} A · Is ${r(res.Is)} A`, steps: res.steps, ref: res.ref, note: T?.transformer?.["6-5"]?.note };
    } },
  { id: "condo", name: "ฌ. อาคารชุด", desc: "โหลดห้องชุดจากพื้นที่ (ข้อ 9.1.2) มิเตอร์ (ตาราง 9-1 ถึง 9-4) และโคอินซิเดนต์แฟกเตอร์สายป้อน (ตาราง 9-5, 9-6)",
    fields: [
      { k: "kind", l: "ประเภทห้องชุด", t: "select", o: () => [opt("residential", "อยู่อาศัย"), opt("office", "สำนักงาน/ร้านค้า"), opt("industrial", "อุตสาหกรรม")], d: "residential" },
      { k: "central", l: "ระบบทำความเย็นส่วนกลาง", t: "select", o: () => [opt(0, "ไม่มี"), opt(1, "มี")], d: 0 },
      { k: "ut", l: "การไฟฟ้า", t: "select", o: () => [opt("MEA", "กฟน."), opt("PEA", "กฟภ.")], d: "MEA" },
      { k: "phase", l: "มิเตอร์", t: "select", o: () => [opt(1, "1 เฟส"), opt(3, "3 เฟส")], d: 1 },
      { k: "areas", l: "พื้นที่แต่ละห้อง (ตร.ม.) คั่นด้วย ,", t: "list", d: "35, 50, 50, 65, 80" },
    ],
    run(f) {
      const areas = nums(f.areas); const steps = []; const loads = [];
      areas.forEach((a, i) => {
        const u = K.unitLoadVA(T, { kind: f.kind, areaM2: a, central: +f.central === 1 }); loads.push(u.va);
        const m = f.kind === "industrial" ? null : K.unitMeter(T, { kind: f.kind, utility: f.ut, areaM2: a, central: +f.central === 1, phase: +f.phase });
        steps.push(`ห้อง ${i + 1} (${a} ตร.ม.): ${u.steps[0]}${m ? " · " + m.steps[0] : ""}`);
      });
      const fd = K.feederWithCoincidence(T, loads, f.kind === "residential" ? "residential" : "office");
      const I = current(fd.demandVA, 400, 3);
      return { big: `สายป้อนห้องชุด ${r(fd.demandVA / 1000)} kVA ≈ ${r(I)} A (3 เฟส 400 V)`, steps: [...steps, "สายป้อน:", ...fd.steps], ref: `ข้อ 9.1.2, ${fd.ref}` };
    } },
];

function field(f, val) {
  const id = "f_" + f.k;
  if (f.t === "select") {
    const opts = f.o(state()).map(o => `<option value="${o.v}" ${String(o.v) === String(val) ? "selected" : ""}>${o.l}</option>`).join("");
    return `<label>${f.l}<select id="${id}" data-k="${f.k}" ${f.re ? 'data-re="1"' : ""}>${opts}</select></label>`;
  }
  return `<label>${f.l}<input id="${id}" data-k="${f.k}" ${f.t === "list" || f.t === "text" ? "" : 'type="number" step="any"'} value="${val ?? ""}"></label>`;
}
let current_ = MODULES[0], vals = {};
function state() { return vals[current_.id] || {}; }
function render() {
  $("#tabs").innerHTML = MODULES.map(m => `<button data-id="${m.id}" aria-current="${m === current_}">${m.name}</button>`).join("") + `<button data-id="data" aria-current="${current_ === "data"}">ตารางข้อมูล</button>`;
  if (current_ === "data") return renderData();
  const m = current_;
  vals[m.id] = vals[m.id] || Object.fromEntries(m.fields.map(f => [f.k, f.d]));
  const v = vals[m.id];
  $("#view").innerHTML = `<div class="card"><h2>${m.name}</h2><p class="sub">${m.desc}</p>
    <div class="grid">${m.fields.map(f => field(f, v[f.k])).join("")}</div>
    <div class="btns"><button class="btn" id="go">คำนวณ</button><button class="btn ghost" id="print">พิมพ์ / PDF</button></div></div><div id="out"></div>`;
  document.querySelectorAll("#view [data-k]").forEach(el => el.addEventListener("change", () => {
    v[el.dataset.k] = el.value;
    if (el.dataset.re) { render(); }
  }));
  $("#go").onclick = () => { document.querySelectorAll("#view [data-k]").forEach(el => v[el.dataset.k] = el.value); compute(m, v); };
  $("#print").onclick = () => window.print();
}
function compute(m, v) {
  const out = $("#out");
  if (!T) { out.innerHTML = `<div class="card result fail"><p class="err">ยังไม่มีค่าตาราง — ไปที่แท็บ "ตารางข้อมูล" เพื่อนำเข้าไฟล์</p></div>`; return; }
  try {
    const res = m.run(v);
    const cls = res.pass === undefined ? "" : res.pass ? "pass" : "fail";
    out.innerHTML = `<div class="card result ${cls}">
      ${res.pass === undefined ? "" : `<span class="badge ${cls}">${res.pass ? "ผ่าน" : "ไม่ผ่าน"}</span>`}
      <p class="big">${res.big}</p>
      <ol class="steps">${res.steps.map(s => `<li>${s}</li>`).join("")}</ol>
      ${res.note ? `<p class="warn">หมายเหตุ: ${res.note}</p>` : ""}
      <p class="ref">อ้างอิง: วสท. 022001-22 ${res.ref}</p></div>`;
  } catch (e) { out.innerHTML = `<div class="card result fail"><p class="err">${e.message}</p></div>`; }
}
function renderData() {
  const list = T ? Object.entries(T).filter(([k]) => k !== "meta").flatMap(([g, o]) => typeof o === "object" ? Object.entries(o).map(([id, t]) => `<tr><td>${g}</td><td>${id}</td><td>${t?.title ?? ""}</td></tr>`) : []).join("") : "";
  $("#view").innerHTML = `<div class="card"><h2>ตารางข้อมูล</h2>
    <p class="sub">เว็บโหลดค่าตารางจาก <code>data/tables.json</code> อัตโนมัติ ถ้าต้องการใช้ค่าที่แก้ไขเอง นำเข้าไฟล์ JSON ได้ (เก็บในเบราว์เซอร์นี้เท่านั้น และใช้แทนค่าเริ่มต้นจนกว่าจะล้าง) ตรวจทานค่ากับมาตรฐานฉบับจริงก่อนใช้งาน</p>
    <div class="btns"><label class="btn">นำเข้าไฟล์ JSON<input type="file" id="imp" accept=".json,application/json" hidden></label>
    <button class="btn ghost" id="exp" ${T ? "" : "disabled"}>ส่งออกไฟล์</button><button class="btn ghost" id="clr">ล้างไฟล์ที่นำเข้า</button></div>
    ${T ? `<p>แหล่งข้อมูล: ${T.meta?.name ?? ""} (${T.meta?.version ?? ""})</p><div class="tablewrap"><table><thead><tr><th>กลุ่ม</th><th>ตาราง/ข้อ</th><th>ชื่อ</th></tr></thead><tbody>${list}</tbody></table></div>` : `<p class="err">ยังไม่มีข้อมูล</p>`}</div>`;
  $("#imp").onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { T = JSON.parse(await file.text()); saveTables(T); status("ไฟล์ที่นำเข้า"); render(); } catch (err) { alert("อ่านไฟล์ไม่ได้: " + err.message); }
  };
  $("#exp").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(T, null, 1)], { type: "application/json" })); a.download = "tables.local.json"; a.click(); };
  $("#clr").onclick = () => { clearTables(); location.reload(); };
}
function status(src) {
  const el = $("#dataStatus");
  el.className = "status " + (T ? "ok" : "bad");
  el.textContent = T ? `ค่าตาราง: ${src}` : "ยังไม่มีค่าตาราง — นำเข้าที่แท็บ \"ตารางข้อมูล\"";
}
$("#tabs").addEventListener("click", e => {
  const id = e.target.dataset?.id; if (!id) return;
  current_ = id === "data" ? "data" : MODULES.find(m => m.id === id); render();
});
$("#pjDate").valueAsDate = new Date();
const { T: t0, source } = await loadTables();
T = t0; status(source);
if (!T) current_ = "data";
render();
