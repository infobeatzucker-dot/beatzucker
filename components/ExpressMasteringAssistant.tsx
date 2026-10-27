"use client";

import {useEffect,useId,useRef,type ReactNode} from "react";
import {ArrowLeft,ArrowRight,Check,CheckCircle2,Disc3,Download,Headphones,Music2,SlidersHorizontal,Sparkles,UploadCloud,X} from "lucide-react";
import {EXPRESS_GENRES,EXPRESS_STEPS,EXPRESS_TARGETS,expressReferenceCount} from "@/lib/expressMastering";
import type {AnalysisData,Lang,Platform,Preset,ReferenceInput,UploadedFile} from "@/lib/types/mastering";
import ExpressResultPlayer from "@/components/ExpressResultPlayer";
import type {UploadStatus} from "./UploadZone";
import "./express-mastering.css";

interface Props {
  open:boolean;step:number;onStep:(step:number)=>void;onClose:()=>void;lang:Lang;
  file:UploadedFile|null;analysis:AnalysisData|null;upload:UploadStatus;
  onSelectFile:()=>void;onDropFile:(file:File)=>void;onReset:()=>void;
  authenticated:boolean;onSignIn:()=>void;
  platform:Platform;onPlatform:(p:Platform)=>void;customLufs:number;
  preset:Preset;onPreset:(p:Preset)=>void;character:number;onCharacter:(n:number)=>void;
  intensity:number;onIntensity:(n:number)=>void;format:string;onFormat:(s:string)=>void;
  formats:readonly {key:string;label:string}[];reference:ReferenceInput|null;
  onClearReference:()=>void;referenceEditor:ReactNode;referenceBusy:boolean;
  canStart:boolean;limitReached:boolean;error:string|null;onStart:()=>void;
  hasResult:boolean;onResult:()=>void;onManual:()=>void;
}

export default function ExpressMasteringAssistant(p:Props) {
  const en=p.lang==="en",id=useId(),dialog=useRef<HTMLDialogElement>(null),heading=useRef<HTMLHeadingElement>(null),body=useRef<HTMLDivElement>(null);
  const onClose=useRef(p.onClose);onClose.current=p.onClose;
  useEffect(()=>{
    if(!p.open)return;
    const node=dialog.current;if(!node)return;
    const previous=document.activeElement,overflow=document.body.style.overflow;
    node.showModal();document.body.style.overflow="hidden";
    heading.current?.focus({preventScroll:true});
    return ()=>{node.close();document.body.style.overflow=overflow;if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};
  },[p.open]);
  useEffect(()=>{if(p.open){heading.current?.focus({preventScroll:true});body.current?.scrollTo({top:0});}},[p.open,p.step]);
  const count=expressReferenceCount(p.reference),ready=!!p.file&&!!p.analysis&&!p.upload.busy;
  const target=EXPRESS_TARGETS.find(t=>t.id===p.platform)?.name??({tidal:"Tidal",amazon:"Amazon Music",deezer:"Deezer",tiktok:"TikTok",soundcloud:"SoundCloud",broadcast:en?"Broadcast / TV":"Rundfunk / TV",custom:en?"Custom":"Benutzerdefiniert"} as Partial<Record<Platform,string>>)[p.platform]??p.platform;
  const titles=en?["Let’s start with your song.","Where will your song be heard?","Choose the feel. We’ll handle the details.","A reference? Only if you want one.","Everything ready. You’re in control.","Your master is ready."]:["Alles beginnt mit deinem Song.","Wo soll dein Song gehört werden?","Du wählst den Klang. Wir kümmern uns um die Details.","Eine Referenz? Nur wenn du möchtest.","Alles bereit. Du entscheidest.","Dein Master ist fertig."];
  const descriptions=en?["Upload your finished mix. We’ll analyze it before you continue.","This chooses a loudness target, not a distribution service. It doesn’t publish your song.","Auto uses your track’s measurements. You don’t need to know about compressors or EQs.","Use another song as a tonal guide. Your own loudness target stays independent.","Review your choices. Nothing is mastered until you press the button below.","Compare the original and master, download your file or fine-tune the sound."]:["Lade deinen fertigen Mix hoch. Wir analysieren ihn, bevor du weitergehst.","Du wählst ein Lautheitsziel, keinen Vertrieb. Dein Song wird dadurch nicht veröffentlicht.","Auto nutzt die Messwerte deines Tracks. Du musst dich nicht mit Kompressoren oder EQs auskennen.","Nutze einen anderen Song als klangliche Orientierung. Dein eigenes Lautheitsziel bleibt unabhängig.","Prüfe deine Auswahl. Erst dein Klick auf den Startknopf löst das Mastering aus.","Vergleiche Original und Master, lade deine Datei herunter oder passe den Klang noch an."];
  return <dialog ref={dialog} className="express-dialog" aria-labelledby={id+"-title"} aria-describedby={id+"-description"}
    onCancel={e=>{e.preventDefault();onClose.current();}} onKeyDown={e=>{
      // Do not leak console shortcuts (M / A / B / Space) through the modal.
      e.stopPropagation();
      if(e.key!=="Tab")return;
      const items=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex]:not([tabindex="-1"])')).filter(el=>el.getClientRects().length>0&&!el.closest('[inert]'));
      const first=items[0],last=items[items.length-1],current=document.activeElement;
      if(!first){e.preventDefault();heading.current?.focus();return;}
      if(e.shiftKey&&(current===first||!items.includes(current as HTMLElement))){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&(current===last||!items.includes(current as HTMLElement))){e.preventDefault();first.focus();}
    }}>
    <div className="express-shell">
      <aside className="express-rail">
        <div className="express-brand"><span className="express-brand-icon"><Sparkles size={22}/></span><div><b>BEATZUCKER</b><span>{en?"EXPRESS ASSISTANT":"EXPRESS-ASSISTENT"}</span></div></div>
        <div className="express-rail-copy"><span>{en?"YOUR SOUND. ONE STEP AT A TIME.":"DEIN SOUND. SCHRITT FÜR SCHRITT."}</span><h2>{en?"Great sound.\nSimple steps.":"Guter Sound.\nGanz einfach."}</h2><p>{en?"No audio jargon. No second mastering engine. Just a little guidance.":"Ohne Fachchinesisch. Ohne andere Mastering-Routine. Einfach mit ein bisschen Unterstützung."}</p></div>
        <ol className="express-steps" aria-label={en?"Mastering steps":"Mastering-Schritte"}>{EXPRESS_STEPS.map((s,i)=><li key={s.en} aria-current={i===p.step?"step":undefined} className={i===p.step?"active":i<p.step?"complete":""}><span>{i<p.step?<Check size={13}/>:String(i+1).padStart(2,"0")}</span><b>{s[p.lang]}{i===3&&<small>{en?"optional":"freiwillig"}</small>}</b></li>)}</ol>
        <div className="express-rail-foot"><Headphones size={16}/><span>{en?"Same sound. Simpler workflow.":"Gleicher Sound. Einfacherer Weg."}</span></div>
      </aside>
      <div className="express-main">
        <header className="express-top"><span>{en?"Step":"Schritt"} {p.step+1} / {EXPRESS_STEPS.length}</span><button type="button" className="express-close" onClick={p.onClose} aria-label={en?"Close assistant":"Assistent schließen"}><X size={20}/></button></header>
        <div className="express-body" ref={body}>
          <div className="express-step-heading"><span className="express-eyebrow">{p.step===5?(en?"READY TO LISTEN":"BEREIT ZUM ANHÖREN"):(en?"LET’S MAKE IT SOUND LIKE YOU":"DEIN SOUND. DEINE ENTSCHEIDUNG.")}</span><h2 ref={heading} tabIndex={-1} id={id+"-title"}>{titles[p.step]}</h2><p id={id+"-description"}>{descriptions[p.step]}</p></div>
          {p.step===0&&<>
            {!p.authenticated?<div className="express-upload"><UploadCloud size={40}/><h3>{en?"A free account gets you started.":"Mit einem kostenlosen Konto geht’s los."}</h3><p>{en?"Your uploads and downloads belong to your account.":"Deine Uploads und Downloads gehören zu deinem Konto."}</p><button type="button" className="express-primary" onClick={p.onSignIn}>{en?"Sign in / register":"Anmelden / registrieren"}<ArrowRight size={16}/></button></div>:
            <div className={`express-upload ${ready?"is-ready":""}`} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f&&!p.upload.busy)p.onDropFile(f);}}>
              {p.upload.busy?<div className="express-analysis-motion" aria-hidden="true"><span className="express-analysis-ring"/><div>{Array.from({length:19},(_,index)=><i key={index} style={{height:12+((index*17)%43),animationDelay:`${index*-.13}s`}}/>)}</div><Sparkles size={18}/></div>:ready?<CheckCircle2 size={42}/>:<UploadCloud size={42}/>}
              <h3>{p.upload.busy?(p.file?(en?"Analyzing your song …":"Dein Song wird analysiert …"):(en?"Uploading your song …":"Dein Song wird hochgeladen …")):ready?(en?"Your song has been analyzed.":"Dein Song ist analysiert."):(en?"Drop your song here.":"Zieh deinen Song hier hinein.")}</h3>
              {p.file&&<p className="express-filename">{p.file.filename}</p>}
              {p.upload.busy?<p role="status">{en?"Uploading or analyzing. You can close this assistant; processing continues in the console.":"Upload oder Analyse läuft. Du kannst den Assistenten schließen; die Verarbeitung läuft in der Konsole weiter."}</p>:ready?<button type="button" className="express-text-button" onClick={p.onReset}>{en?"Choose a different song":"Anderen Song wählen"}</button>:<><p>WAV · FLAC · MP3 · AIFF · OGG · M4A<br/>{en?"Up to 200 MB · Audio limits are checked on upload.":"Bis 200 MB · Audiolimits werden beim Upload geprüft."}</p><button type="button" className="express-primary" onClick={p.onSelectFile}>{en?"Choose audio file":"Audiodatei auswählen"}<ArrowRight size={16}/></button></>}
            </div>}
            {p.upload.error&&<p role="alert" className="express-error">{p.upload.error}</p>}
            {p.file&&!p.analysis&&!p.upload.busy&&<p className="express-tip">{en?"Please select the file again if its analysis didn’t finish.":"Bitte wähle die Datei erneut, falls die Analyse nicht abgeschlossen wurde."}</p>}
            <p className="express-tip">{en?"Use a finished stereo mix. Mastering can’t replace mixing or repair every recording problem.":"Nutze einen fertigen Stereo-Mix. Mastering ersetzt keinen Mix und kann nicht jedes Aufnahmeproblem reparieren."}</p>
          </>}
          {p.step===1&&<><div className="express-options">{EXPRESS_TARGETS.map(t=><button key={t.id} type="button" aria-pressed={p.platform===t.id} className="express-option" onClick={()=>p.onPlatform(t.id)}><span className="express-option-icon">{t.id==='club'?<Disc3 size={22}/>:<Headphones size={22}/>}</span><strong>{t.name}</strong><span>{t[p.lang]}</span>{p.platform===t.id&&<Check size={16} className="express-option-check"/>}</button>)}</div><button type="button" className="express-text-button" onClick={()=>p.onPlatform('spotify')}>{en?"Not sure? Use the Spotify target.":"Unsicher? Spotify-Ziel verwenden."}</button><p className="express-tip">{en?"Selected target:":"Gewähltes Ziel:"} <b>{target}{p.platform==='custom'?` (${p.customLufs} LUFS)`:''}</b>. {en?"All other targets remain available in the console.":"Alle weiteren Ziele bleiben in der Konsole verfügbar."}</p></>}
          {p.step===2&&<>
            <label className="express-label" htmlFor={id+'-genre'}>{en?"What kind of song is it?":"Was für ein Song ist es?"}</label>
            <select id={id+'-genre'} value={p.preset} onChange={e=>p.onPreset(e.target.value as Preset)}>{EXPRESS_GENRES.map(g=><option key={g.id} value={g.id}>{g.id==='auto'?(en?"Auto — recommended if unsure":"Auto — empfohlen, wenn du unsicher bist"):g.id==='classical'&&!en?'Klassik':g.name}</option>)}</select>
            <fieldset className="express-character"><legend>{en?"How should it feel?":"Wie soll es sich anfühlen?"}</legend><div className="express-three">{[{n:.2,de:'Transparent',en:'Transparent',dDe:'Zurückhaltend und offen',dEn:'Restrained and open'},{n:.5,de:'Ausgewogen',en:'Balanced',dDe:'Unser Ausgangspunkt',dEn:'Our starting point'},{n:.8,de:'Druckvoll',en:'Punchy',dDe:'Mehr Dichte und Färbung',dEn:'More density and color'}].map(c=><button key={c.n} type="button" aria-pressed={Math.abs(p.character-c.n)<.001} onClick={()=>p.onCharacter(c.n)}><span className="express-character-glyph" aria-hidden="true">{c.n===.2?'◌':c.n===.5?'◉':'✦'}</span><strong>{c[p.lang]}</strong><span>{en?c.dEn:c.dDe}</span></button>)}</div></fieldset>
            <p className="express-tip">{en?"Character":"Charakter"}: {Math.round(p.character*100)} %. {en?"Opening this assistant doesn’t reset your console settings.":"Beim Öffnen werden deine Konsolen-Einstellungen nicht zurückgesetzt."}</p>
            <details className="express-details"><summary>{en?"Optional: adjust processing intensity":"Optional: Stärke der Bearbeitung anpassen"}</summary><label className="express-label" htmlFor={id+'-intensity'}>{en?'Intensity':'Intensität'} <output>{p.intensity} %</output></label><input id={id+'-intensity'} type="range" min={0} max={100} step={1} value={p.intensity} onChange={e=>p.onIntensity(Number(e.target.value))}/><p>{en?"65% is the default starting point. More is not always better; this is not a volume knob.":"65 % ist die Standardeinstellung. Mehr ist nicht immer besser; das ist kein Lautstärkeregler."}</p></details>
          </>}
          {p.step===3&&<><div className="express-reference-intro"><Music2 size={34}/><h3>{count?(en?`${count} reference(s) selected`:`${count} Referenz(en) ausgewählt`):(en?"You can make a master without a reference.":"Du kannst auch ohne Referenz mastern.")}</h3><p>{en?"A reference helps guide tonal balance. It doesn’t copy the song or guarantee the same sound.":"Eine Referenz hilft bei der klanglichen Orientierung. Sie kopiert den Song nicht und garantiert keinen identischen Klang."}</p></div><details className="express-details"><summary>{count?(en?"Review or change references":"Referenzen ansehen oder ändern"):(en?"I’d like to add a reference":"Ich möchte eine Referenz hinzufügen")}</summary>{p.referenceEditor}</details>{count>0&&<button type="button" className="express-text-button" onClick={p.onClearReference}>{en?"Continue without references instead":"Stattdessen ohne Referenzen fortfahren"}</button>}</>}
          {p.step===4&&<>
            <div className="express-summary"><div className="express-summary-file"><span><Music2 size={24}/></span><div><small>{en?"YOUR SONG":"DEIN SONG"}</small><strong>{p.file?.filename}</strong></div></div><dl><div><dt>{en?'Target':'Ziel'}</dt><dd>{target}{p.platform==='custom'?` · ${p.customLufs} LUFS`:''}</dd></div><div><dt>Genre</dt><dd>{EXPRESS_GENRES.find(g=>g.id===p.preset)?.name??p.preset}</dd></div><div><dt>{en?'Character / intensity':'Charakter / Intensität'}</dt><dd>{Math.round(p.character*100)} % / {p.intensity} %</dd></div><div><dt>{en?'References':'Referenzen'}</dt><dd>{count|| (en?'None — that’s fine':'Keine — das ist völlig okay')}</dd></div></dl></div>
            <label className="express-label" htmlFor={id+'-format'}>{en?"Your download format":"Dein Downloadformat"}</label><select id={id+'-format'} value={p.format} onChange={e=>p.onFormat(e.target.value)}>{p.formats.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select><p className="express-tip">{en?"MP3 320 is handy for listening and sharing. WAV 24-bit is a lossless choice for further production. The selected format is exported; your original stays unchanged.":"MP3 320 eignet sich zum Anhören und Teilen. WAV 24-bit ist eine verlustfreie Wahl für die Weiterverarbeitung. Das gewählte Format wird exportiert; dein Original bleibt unverändert."}</p>
            {p.limitReached&&<p role="alert" className="express-error">{en?"Your daily mastering allowance is used up. Try again when it resets.":"Dein tägliches Mastering-Kontingent ist aufgebraucht. Versuche es nach dem Zurücksetzen erneut."}</p>}
            {p.error&&<p role="alert" className="express-error">{p.error}</p>}
            {!ready&&<p role="status" className="express-error">{en?"Please finish uploading and analyzing your song first.":"Bitte lade deinen Song zuerst hoch und schließe die Analyse ab."}</p>}
            <p className="express-tip">{en?"After completion, downloads remain available for 24 hours. Mastering uses your daily allowance; the assistant itself is free.":"Nach Fertigstellung sind Downloads 24 Stunden verfügbar. Mastering nutzt dein Tageskontingent; der Assistent selbst ist kostenlos."}</p>
          </>}
          {p.step===5&&p.hasResult&&<div className="express-finished"><h3>{p.file?.filename}</h3><ExpressResultPlayer lang={p.lang} active={p.open}/><button type="button" className="express-secondary" onClick={p.onManual}><SlidersHorizontal size={17}/>{en?"Fine-tune manually":"Manuell nachjustieren"}</button><p className="express-tip">{en?"The original console and all its controls remain available.":"Die ursprüngliche Konsole und alle ihre Regler bleiben verfügbar."}</p></div>}
        </div>
        <footer className="express-footer"><button type="button" className="express-secondary" disabled={p.referenceBusy} onClick={()=>p.step>0&&p.step<5?p.onStep(p.step-1):p.onClose()}><ArrowLeft size={15}/>{p.step>0&&p.step<5?(en?'Back':'Zurück'):(en?'To console':'Zur Konsole')}</button>{p.step<4?<button type="button" className="express-primary" disabled={(p.step===0&&!ready)||p.referenceBusy} onClick={()=>p.onStep(p.step+1)}>{p.referenceBusy?(en?'Analyzing reference …':'Referenz wird analysiert …'):p.step===3&&count===0?(en?'Skip reference':'Referenz überspringen'):(en?'Continue':'Weiter')}<ArrowRight size={16}/></button>:p.step===4?<button type="button" className="express-primary" disabled={!p.canStart||p.upload.busy} onClick={p.onStart}><Sparkles size={17}/>{en?'Master my song':'Jetzt meinen Song mastern'}</button>:<button type="button" className="express-primary" onClick={p.onResult}><Download size={18}/>{en?'Listen & download':'Anhören & herunterladen'}</button>}</footer>
      </div>
    </div>
  </dialog>;
}
