"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types/mastering";

export default function WithdrawalForm({ lang = "de" }: { lang?: Lang }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [mailSent, setMailSent] = useState(false);
  const submission = useRef<{ key: string; details: string } | null>(null);
  const challenge=useRef<{key:string;token:string;expires:number}|null>(null);
  const protectionRequest=useRef<AbortController|null>(null);
  const [ready,setReady]=useState(false);
  const en = lang === "en";

  async function prepare(key:string) {
    protectionRequest.current?.abort();const task=new AbortController();protectionRequest.current=task;
    setReady(false);
    const response=await fetch(`/api/withdrawal?key=${encodeURIComponent(key)}`,{cache:"no-store",signal:task.signal});
    if(!response.ok)throw Error("Form protection unavailable");
    const body=await response.json();
    if(typeof body.token!=="string" || typeof body.waitMs!=="number" || body.waitMs<0 || body.waitMs>5000)throw Error("Invalid form protection");
    await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{task.signal.removeEventListener("abort",abort);resolve()},body.waitMs+100);const abort=()=>{clearTimeout(timer);reject(Error("Cancelled"))};task.signal.addEventListener("abort",abort,{once:true});if(task.signal.aborted)abort();});
    task.signal.throwIfAborted();challenge.current={key,token:body.token,expires:Date.now()+55*60_000};setReady(true);
    return challenge.current;
  }
  useEffect(()=>{void prepare(crypto.randomUUID()).catch(()=>{if(!protectionRequest.current?.signal.aborted)setError(en?"Form protection could not load. Please retry or use email below.":"Spamschutz konnte nicht geladen werden. Bitte erneut laden oder unten die E-Mail-Adresse nutzen.");});return()=>protectionRequest.current?.abort();},[en]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy||!ready)return; setBusy(true); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const details = { name: data.get("name"), email: data.get("email"), contractReference: data.get("contractReference"), lang };
    const fingerprint = JSON.stringify(details);
    try {
    if(!submission.current)submission.current={key:challenge.current?.key||crypto.randomUUID(),details:fingerprint};
    else if(submission.current.details!==fingerprint)submission.current={key:crypto.randomUUID(),details:fingerprint};
    const proof=challenge.current?.key===submission.current.key&&challenge.current.expires>Date.now()?challenge.current:await prepare(submission.current.key);
    const response = await fetch("/api/withdrawal", {
      method: "POST", headers: { "Content-Type": "application/json", "Accept-Language": lang },
      body: JSON.stringify({ ...details, idempotencyKey: submission.current.key,formToken:proof.token,website:data.get("website")||"" }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { if(response.status===400)await prepare(submission.current.key);setError(result.error || (en ? "Submission failed." : "Übermittlung fehlgeschlagen.")); return; }
    setReceipt(result.receiptId || "OK"); setMailSent(result.mailStatus === "sent"); form.reset();
    } catch {
      setError(en ? "Network error. Please try again." : "Netzwerkfehler. Bitte versuche es erneut.");
    } finally { setBusy(false); }
  }

  if (receipt) return <div className="withdrawal-success" role="status"><strong>{en ? "Withdrawal received" : "Widerruf eingegangen"}</strong><p>{mailSent ? (en ? "Your email confirmation has been submitted for delivery." : "Deine E-Mail-Bestätigung wurde zum Versand übergeben.") : (en ? "Your withdrawal has been stored. Email confirmation is queued; failed sending attempts will be retried automatically." : "Dein Widerruf wurde gespeichert. Die E-Mail-Bestätigung ist zum Versand vorgemerkt; bei Versandproblemen versuchen wir es automatisch erneut.")}</p><code>{receipt}</code></div>;

  return <form className="withdrawal-form" onSubmit={submit}>
    <div aria-hidden="true" style={{position:"absolute",left:"-10000px",width:1,height:1,overflow:"hidden"}}><label>Website<input name="website" type="text" tabIndex={-1} autoComplete="off" maxLength={200}/></label></div>
    <label>{en ? "Full name" : "Vor- und Nachname"}<input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
    <label>{en ? "Email address used for the service" : "Für den Dienst verwendete E-Mail-Adresse"}<input name="email" required type="email" maxLength={255} autoComplete="email" /></label>
    <label>{en ? "Contract or account reference (optional)" : "Vertrags- oder Kontoreferenz (optional)"}<input name="contractReference" maxLength={200} placeholder={en ? "e.g. account email or date" : "z. B. Konto-E-Mail oder Datum"} /></label>
    <label className="withdrawal-confirm"><input type="checkbox" required /> <span>{en ? "I unequivocally withdraw the contract identified above." : "Ich widerrufe den oben bezeichneten Vertrag eindeutig."}</span></label>
    {error && <p className="withdrawal-error" role="alert">{error}</p>}
    {!ready&&<p role="status">{en?"Preparing spam protection…":"Spamschutz wird vorbereitet…"}</p>}
    {!ready&&!busy&&error&&<button type="button" onClick={()=>{setError("");void prepare(submission.current?.key||crypto.randomUUID()).catch(()=>setError(en?"Please use the email address below if the form remains unavailable.":"Bitte nutze die E-Mail-Adresse unten, falls das Formular nicht verfügbar ist."));}}>{en?"Reload protection":"Spamschutz neu laden"}</button>}
    <button type="submit" disabled={busy||!ready}>{busy ? (en ? "Sending…" : "Wird gesendet…") : (en ? "Withdraw contract" : "Vertrag widerrufen")}</button>
    <small>{en?"Alternatively, email your statement to ":"Alternativ kannst du deine Erklärung per E-Mail senden an "}<a href="mailto:info@re-beatz.com">info@re-beatz.com</a>.</small>
    <small>{en ? "Your statement is stored before confirmation is sent by email. Please keep the receipt ID." : "Deine Erklärung wird vor dem Versand der E-Mail-Bestätigung gespeichert. Bitte bewahre die Eingangs-ID auf."}</small>
  </form>;
}
