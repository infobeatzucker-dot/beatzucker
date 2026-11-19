"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Flag, Mail, X } from "lucide-react";
import { APP_VERSION } from "@/lib/releases";
import "./problem-report.css";

const contact = "info@re-beatz.com";
const englishPaths = new Set(["/privacy", "/terms", "/legal-notice", "/cancellation-policy"]);

export default function ProblemReport() {
  const pathname = usePathname();
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const [englishAccount, setEnglishAccount] = useState(false);
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [notice, setNotice] = useState("");
  const accountPage = /^\/(dashboard|account|admin)(\/|$)/.test(pathname);
  const en = /^\/en(\/|$)/.test(pathname) || englishPaths.has(pathname) || (accountPage && englishAccount);

  useEffect(() => {
    if (!accountPage) return;
    const sync = () => {
      const language = new URLSearchParams(location.search).get("lang");
      setEnglishAccount(language ? language === "en" : document.documentElement.lang === "en");
    };
    sync();
    const listener = new MutationObserver(sync);
    listener.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => listener.disconnect();
  }, [pathname, accountPage]);

  const label = en ? "Report a problem" : "Problem melden";
  const subject = en ? "Beatzucker problem report" : "Beatzucker-Fehlermeldung";
  const body = [
    `${en ? "Page" : "Seite"}: ${pathname}`,
    `Beatzucker: v${APP_VERSION}`,
    "",
    en ? "What happened?" : "Was ist passiert?",
    description.trim(),
    ...(steps.trim() ? ["", en ? "Steps to reproduce:" : "Schritte zum Nachstellen:", steps.trim()] : []),
  ].join("\n");
  const ready = description.trim().length >= 10;
  const draft = new URLSearchParams({ subject, body }).toString().replaceAll("+", "%20");

  return <>
    <button ref={launcher} type="button" className="bz-report-launch" aria-label={label} aria-haspopup="dialog" onClick={() => {
      setNotice("");
      dialog.current?.showModal();
      dialog.current?.querySelector("textarea")?.focus();
    }}>
      <Flag size={16} aria-hidden="true"/><span>{label}</span>
    </button>
    <dialog ref={dialog} className="bz-report-dialog" aria-labelledby={titleId} onClose={() => launcher.current?.focus()}>
      <div className="bz-report-heading">
        <h2 id={titleId}>{label}</h2>
        <button type="button" aria-label={en ? "Close" : "Schließen"} onClick={() => dialog.current?.close()}><X size={19}/></button>
      </div>
      <p>{en ? "Tell us what went wrong. You can review and send the report in your email app." : "Beschreib kurz, was schiefgelaufen ist. Du kannst die Meldung anschließend in deinem E-Mail-Programm prüfen und abschicken."}</p>
      <label>{en ? "What happened?" : "Was ist passiert?"}
        <textarea rows={4} maxLength={1200} value={description} onChange={event => setDescription(event.target.value)}
          placeholder={en ? "Include the error message if you saw one." : "Falls eine Fehlermeldung angezeigt wurde, füge sie gern ein."}/>
      </label>
      <label>{en ? "Steps to reproduce (optional)" : "Schritte zum Nachstellen (optional)"}
        <textarea rows={2} maxLength={400} value={steps} onChange={event => setSteps(event.target.value)}/>
      </label>
      <p className="bz-report-meta">{en ? "The page path and app version are added to the draft. Leave out passwords or private access links." : "Seitenpfad und App-Version stehen im Entwurf. Lass Passwörter und private Zugangslinks weg."}</p>
      <div className="bz-report-actions">
        {ready ? <a href={`mailto:${contact}?${draft}`}><Mail size={16}/>{en ? "Open email draft" : "E-Mail-Entwurf öffnen"}</a>
          : <button type="button" disabled><Mail size={16}/>{en ? "Open email draft" : "E-Mail-Entwurf öffnen"}</button>}
        <button type="button" disabled={!ready} onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${subject}\n\n${body}`);
            setNotice(en ? "Report copied." : "Meldung kopiert.");
          } catch {
            setNotice(en ? "Could not copy. You can open the email draft." : "Kopieren fehlgeschlagen. Du kannst den E-Mail-Entwurf öffnen.");
          }
        }}>{en ? "Copy report" : "Meldung kopieren"}</button>
      </div>
      <p className="bz-report-contact">{en ? "Email address" : "E-Mail-Adresse"} <a href={`mailto:${contact}`}>{contact}</a></p>
      {notice && <p role="status">{notice}</p>}
    </dialog>
  </>;
}
