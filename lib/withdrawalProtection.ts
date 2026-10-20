import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { isIP } from "net";

export const WITHDRAWAL_MIN_AGE = 2000;
export const WITHDRAWAL_MAX_AGE = 60*60_000;
export const validWithdrawalKey = (key: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);
function sign(value: string) {
  const secret=process.env.NEXTAUTH_SECRET;
  if(!secret || secret.length<32)throw Error("Withdrawal protection unavailable");
  return createHmac("sha256",secret).update("withdrawal:v1:"+value).digest("hex");
}
export function withdrawalChallenge(key:string,now=Date.now()) {
  if(!validWithdrawalKey(key))throw Error("Invalid submission key");
  const payload=`${key}.${now}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}
export function checkWithdrawalChallenge(token:unknown,key:string,now=Date.now()):"ok"|"invalid"|"early" {
  if(typeof token!=="string" || token.length>250)return "invalid";
  const parts=token.split(".");
  if(parts.length!==4 || parts[0]!==key || !validWithdrawalKey(key) || !/^\d{13}$/.test(parts[1]) || !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3]))return "invalid";
  const signature=Buffer.from(sign(parts.slice(0,3).join(".")),"hex");
  if(!timingSafeEqual(signature,Buffer.from(parts[3],"hex")))return "invalid";
  const age=now-Number(parts[1]);
  if(age<0 || age>WITHDRAWAL_MAX_AGE)return "invalid";
  return age<WITHDRAWAL_MIN_AGE?"early":"ok";
}
/** Production port is loopback-only; Nginx overwrites X-Real-IP. Never trust X-Forwarded-For. No raw IP persisted. */
export function withdrawalClientKey(headers:Headers) {
  const ip=headers.get("x-real-ip")?.trim();
  return ip && isIP(ip) ? sign("client:"+ip) : null;
}
