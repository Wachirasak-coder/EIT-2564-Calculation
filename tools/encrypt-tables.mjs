// ใช้: node tools/encrypt-tables.mjs <รหัสผ่าน> [data/tables.local.json] [data/tables.enc.json]
// สร้างไฟล์ค่าตารางแบบเข้ารหัสที่ commit ขึ้น repo สาธารณะได้ (ไม่มีรหัสผ่าน อ่านค่าไม่ได้)
import fs from "node:fs";
import { encryptJSON, decryptJSON } from "../js/crypto.js";
const [pw, src = "data/tables.local.json", out = "data/tables.enc.json"] = process.argv.slice(2);
if (!pw || pw.length < 10) { console.error("ต้องระบุรหัสผ่านอย่างน้อย 10 ตัวอักษร"); process.exit(1); }
const T = JSON.parse(fs.readFileSync(src, "utf8"));
const box = await encryptJSON(T, pw);
const back = await decryptJSON(box, pw);
if (JSON.stringify(back) !== JSON.stringify(T)) throw new Error("ตรวจถอดรหัสไม่ผ่าน");
fs.writeFileSync(out, JSON.stringify(box));
console.log(`เขียน ${out} แล้ว (${fs.statSync(out).size} bytes)`);
