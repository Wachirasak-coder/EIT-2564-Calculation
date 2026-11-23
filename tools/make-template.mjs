// สร้าง data/tables.template.json จาก tables.local.json โดยลบตัวเลขทั้งหมดออก (เก็บแค่โครงสร้าง)
import fs from "node:fs";
const keep = new Set(["title", "label", "note", "columns", "insulation", "location", "groupingTable", "phase", "core", "clause", "name", "version"]);
const strip = (v, k) => {
  if (keep.has(k)) return v;
  if (Array.isArray(v)) return v.map(x => strip(x, null));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([kk, x]) => [kk, strip(x, kk)]));
  return null;
};
const T = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const out = strip(T, null);
out.meta = { name: "แม่แบบค่าตาราง วสท. 022001-22 — กรอกค่าจากมาตรฐานฉบับจริง", version: "template-1" };
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
