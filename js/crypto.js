// เข้ารหัส/ถอดรหัสค่าตาราง: PBKDF2-SHA256 → AES-256-GCM (Web Crypto ใช้ได้ทั้งเบราว์เซอร์และ Node 20+)
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function deriveKey(password, salt, iter) {
  if (!globalThis.crypto?.subtle) throw new Error("เบราว์เซอร์ไม่อนุญาตการถอดรหัส — เปิดเว็บผ่าน https หรือ localhost");
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptJSON(obj, password, iter = 300000) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, iter);
  // แบ่งการแปลง base64 เป็นช่วง เพื่อไม่ให้ String.fromCharCode รับอาร์กิวเมนต์มากเกินไป
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj))));
  let s = ""; for (let i = 0; i < ct.length; i += 8192) s += String.fromCharCode(...ct.subarray(i, i + 8192));
  return { format: "eit2564-enc-v1", kdf: "PBKDF2-SHA256", iter, cipher: "AES-256-GCM", salt: b64(salt), iv: b64(iv), data: btoa(s) };
}

export async function decryptJSON(box, password) {
  const key = await deriveKey(password, unb64(box.salt), box.iter);
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv) }, key, unb64(box.data));
    return JSON.parse(dec.decode(pt));
  } catch { throw new Error("รหัสผ่านไม่ถูกต้อง"); }
}
