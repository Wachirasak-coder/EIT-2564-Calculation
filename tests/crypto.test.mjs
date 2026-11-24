import test from "node:test";
import assert from "node:assert/strict";
import { encryptJSON, decryptJSON } from "../js/crypto.js";

test("เข้ารหัสแล้วถอดกลับได้ และรหัสผิดถูกปฏิเสธ", async () => {
  const obj = { a: [1, 2.5, null], b: "ไทย" };
  const box = await encryptJSON(obj, "correct-horse-1", 1000);
  assert.deepEqual(await decryptJSON(box, "correct-horse-1"), obj);
  await assert.rejects(decryptJSON(box, "wrong-horse-11"), /รหัสผ่านไม่ถูกต้อง/);
  assert.ok(!box.data.includes("ไทย"));
});
