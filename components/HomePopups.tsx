"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Heart, Layers3, Server, X } from "lucide-react";
import { DONATE_URL } from "@/lib/constants";
import type { Lang } from "@/lib/types/mastering";
import PromoPopup from "./PromoPopup";
import "./donation-popup.css";

const dismissalKey = "beatzucker-donation-welcome-dismissed";
let dismissedHere = false;

function wasDismissed() {
  try { return dismissedHere || localStorage.getItem(dismissalKey) === "1"; }
  catch { return dismissedHere; }
}

function MixerGraphic({ lang }: { lang: Lang }) {
  const names = lang === "en" ? ["Vocals", "Drums", "Bass", "Other"] : ["Stimme", "Drums", "Bass", "Übrige"];
  return <div className="bz-support-art" aria-hidden="true">
    <div className="bz-support-rings"/>
    <div className="bz-support-mixer">
      <div className="bz-support-mixer-head"><Layers3 size={18}/> <strong>BEATZUCKER</strong><i/></div>
      <div className="bz-support-channels">
        {names.map((name, index) => <div className="bz-support-channel" key={name}
          style={{ "--channel": index, "--fader-top": `${[38, 54, 44, 59][index]}%`, "--fader-rest": `${[33, 60, 48, 56][index]}%`, "--meter-start": [.66,.45,.64,.38][index] } as CSSProperties}>
          <b>{name}</b>
          <div className="bz-support-led"><span/></div>
          <div className="bz-support-slot"><i/></div>
          <div className="bz-support-keys"><i>M</i><i>S</i></div>
        </div>)}
      </div>
    </div>
  </div>;
}

function DonationDialog({ lang, onDismiss }: { lang: Lang; onDismiss: () => void }) {
  const modal = useRef<HTMLDialogElement>(null);
  const titleId = useId(), introId = useId();
  const en = lang === "en";

  useEffect(() => {
    const dialog = modal.current;
    if (dialog && !dialog.open && !document.querySelector("dialog[open]")) dialog.showModal();
  }, []);

  function dismiss() {
    modal.current?.close();
    onDismiss();
  }

  return <dialog ref={modal} className="bz-support-dialog" aria-labelledby={titleId} aria-describedby={introId}
    onCancel={event => { event.preventDefault(); dismiss(); }} onClick={event => { if (event.target === event.currentTarget) dismiss(); }}>
    <div className="bz-support-layout">
      <button type="button" className="bz-support-close" aria-label={en ? "Close donation popup" : "Spenden-Popup schließen"} onClick={dismiss}><X size={21}/></button>
      <MixerGraphic lang={lang}/>
      <div className="bz-support-copy">
        <h2 id={titleId}>{en ? "Help keep Beatzucker free" : "Hilf mit, Beatzucker kostenlos zu halten"}</h2>
        <p id={introId}>{en
          ? "If Beatzucker helps with your music, a voluntary donation helps us keep online mastering free and continue developing the site."
          : "Wenn dir Beatzucker bei deiner Musik hilft, kannst du mit einer freiwilligen Spende dazu beitragen, dass Online-Mastering kostenlos bleibt und wir die Seite weiterentwickeln."}</p>
        <ul>
          <li><Server size={18} aria-hidden="true"/>{en ? "Expand server capacity and fund ongoing costs." : "Serverkapazität ausbauen und laufende Kosten tragen."}</li>
          <li><Layers3 size={18} aria-hidden="true"/>{en ? "Improve Stem Separation and Vocal Remover." : "Stem Separation und Vocal Remover weiter ausbauen."}</li>
        </ul>
        <div className="bz-support-actions">
          <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(dismiss, 0)}><Heart size={17} aria-hidden="true"/>{en ? "Donate via PayPal" : "Über PayPal spenden"}<ArrowUpRight size={16} aria-hidden="true"/></a>
          <button type="button" onClick={dismiss}>{en ? "Continue to Beatzucker" : "Weiter zu Beatzucker"}</button>
        </div>
      </div>
    </div>
  </dialog>;
}

export default function HomePopups({ lang }: { lang: Lang }) {
  const [choice, setChoice] = useState<"pending" | "donation" | "promo" | "closed">("pending");

  useEffect(() => {
    if (wasDismissed()) { setChoice("promo"); return; }
    const controller = new AbortController();
    let delay: ReturnType<typeof setTimeout> | undefined;
    let eligible = false, cookieNoticeClosed = false;
    try { cookieNoticeClosed = localStorage.getItem("beatzucker_cookie_consent") !== null; } catch { /* Wait for the notice event. */ }
    function openWhenReady() {
      if (!eligible || !cookieNoticeClosed || delay) return;
      delay = setTimeout(() => {
        if (!controller.signal.aborted) setChoice(wasDismissed() ? "promo" : "donation");
      }, 450);
    }
    function noticeClosed() { cookieNoticeClosed = true; openWhenReady(); }
    window.addEventListener("beatzucker-cookie-notice-closed", noticeClosed);
    void fetch("/api/donation-popup", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const value = response.ok ? await response.json() : null;
        if (controller.signal.aborted) return;
        if (value?.enabled !== true) { setChoice("promo"); return; }
        eligible = true;
        openWhenReady();
      }).catch(() => { if (!controller.signal.aborted) setChoice("promo"); });
    return () => {
      controller.abort();
      clearTimeout(delay);
      window.removeEventListener("beatzucker-cookie-notice-closed", noticeClosed);
    };
  }, []);

  if (choice === "promo") return <PromoPopup/>;
  if (choice !== "donation") return null;
  return <DonationDialog lang={lang} onDismiss={() => {
    dismissedHere = true;
    try { localStorage.setItem(dismissalKey, "1"); } catch { /* In-memory fallback for this visit. */ }
    setChoice("closed");
  }}/>;
}
