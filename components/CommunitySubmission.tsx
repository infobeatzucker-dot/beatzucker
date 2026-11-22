"use client";

import { useEffect,useState } from "react";
import { useSession } from "next-auth/react";
import AuthModal from "@/components/AuthModal";
import { QuickMasterComparison } from "@/components/QuickMasterComparison";
import type { Lang } from "@/lib/types/mastering";
import type { ShowcaseTrack } from "@/lib/showcaseTracks";
import { communityConsentVersion, communityReviewDays } from "@/lib/communityPolicy";
import styles from "./ListeningEntry.module.css";

type Example={id:string;publishedAt:string|null;rejectionReason:string|null;problem:string;settings:string;track:ShowcaseTrack};
const accept=".wav,.flac,.mp3,.aiff,.aif,.ogg,.m4a";
const formats=(newFile:File)=>newFile.size>0&&newFile.size<=40*1024*1024;

export default function CommunitySubmission({lang}:{lang:Lang}){
  const en=lang==="en",t=(de:string,eng:string)=>en?eng:de;
  const {status,data}=useSession();
  const userId=data?.user?.id;
  const [login,setLogin]=useState(false),[busy,setBusy]=useState(false);
  const [message,setMessage]=useState(""),[error,setError]=useState(false);
  const [examples,setExamples]=useState<Example[]>([]);
  useEffect(()=>{
    setExamples([]);
    if(!userId)return;
    const controller=new AbortController();
    fetch("/api/community/examples",{cache:"no-store",signal:controller.signal}).then(async res=>{
      if(!res.ok)throw Error();
      if(!controller.signal.aborted)setExamples((await res.json()).examples);
    }).catch(()=>{if(!controller.signal.aborted){setMessage(t("Einreichungen konnten nicht geladen werden.","Could not load submissions."));setError(true);}});
    return()=>controller.abort();
  },[userId,lang]);
  const errorMessage=(code:string)=>code==="ALIGNMENT"?
    t("Die Hörproben konnten nicht sicher ausgerichtet werden. Wähle dieselbe Passage in zwei Dateien mit mindestens 24 Sekunden ab dem Startpunkt.",
      "Could not align the excerpts reliably. Use the same passage in two files with at least 24 seconds from the starting point."):
    code==="LIMIT"?t("Die Einreichung ist derzeit begrenzt. Pro Konto sind bis zu drei Beiträge möglich.","Submission capacity is limited. Each account can have up to three entries."):
    code==="SIZE"?t("Jede Audiodatei muss zwischen 1 Byte und 40 MiB groß sein.","Each audio file must be between 1 byte and 40 MiB."):
    t("Die Einreichung konnte nicht gespeichert werden. Prüfe deine Dateien und die Angaben.","Could not save the submission. Check your files and details.");
  async function submit(form:HTMLFormElement) {
    const input=new FormData(form), original=input.get("original"), master=input.get("master");
    setBusy(true);setError(false);setMessage("");
    try {
      if(!(original instanceof File)||!(master instanceof File)||!formats(original)||!formats(master))throw Error("SIZE");
      const refs=[];
      for(const file of [original,master]){
        setMessage(t("Audiodateien werden übertragen …","Uploading audio files…"));
        const upload=new FormData();upload.set("file",file,file.name);
        const res=await fetch("/api/upload",{method:"POST",body:upload});
        if(!res.ok)throw Error("UPLOAD");
        const value=await res.json();refs.push({file_id:value.file_id,upload_token:value.upload_token});
      }
      setMessage(t("Beide 24-Sekunden-Ausschnitte werden ausgerichtet …","Aligning both 24-second excerpts…"));
      const res=await fetch("/api/community/examples",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        title:input.get("title"),artist:input.get("artist"),genre:input.get("genre"),problem:input.get("problem"),
        settings:input.get("settings"),start:Number(input.get("start")),consent:input.get("rights")==="on",
        consentVersion:communityConsentVersion,language:lang,original:refs[0],master:refs[1],
      })});
      const result=await res.json();
      if(!res.ok||!result.example)throw Error(result.error);
      setExamples(rows=>[result.example,...rows]);form.reset();
      setMessage(t("Eingereicht. Das Team prüft den Beitrag vor einer Veröffentlichung.","Submitted. The team reviews it before publication."));
    }catch(reason){setError(true);setMessage(errorMessage(reason instanceof Error?reason.message:""));}
    finally{setBusy(false);}
  }
  async function revise(id:string, form:HTMLFormElement) {
    const fields=new FormData(form);
    setBusy(true);setError(false);
    try {
      const res=await fetch("/api/community/examples",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,problem:fields.get("problem"),settings:fields.get("settings")})});
      const body=await res.json();
      if(!res.ok||!body.example)throw Error(body.error);
      setExamples(rows=>rows.map(row=>row.id===id?body.example:row));
      setMessage(t("Änderungen zur Prüfung eingereicht.","Changes submitted for review."));
    }catch(reason){setError(true);setMessage(errorMessage(reason instanceof Error?reason.message:""));}
    finally{setBusy(false);}
  }
  async function withdraw(id:string){
    if(!window.confirm(t("Dieses Beispiel zurückziehen und beide Hörproben entfernen?","Withdraw this example and remove both excerpts?")))return;
    setBusy(true);setError(false);
    try{
      const res=await fetch("/api/community/examples",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
      if(!res.ok)throw Error();
      setExamples(rows=>rows.filter(row=>row.id!==id));setMessage(t("Beitrag entfernt.","Example removed."));
    }catch{setError(true);setMessage(t("Der Beitrag konnte nicht entfernt werden.","Could not remove the example."));}
    finally{setBusy(false);}
  }
  return <section className={styles.quick} id="submit-example">
    <h2>{t("Deinen Track einreichen","Submit your track")}</h2>
    <p>{t("Teile einen 24-Sekunden-Hörvergleich und beschreibe, was beim Mastering geholfen hat. Das Team sichtet jeden Beitrag vor der Veröffentlichung. Du kannst deine Einreichung hier wieder entfernen.",
      "Share a 24-second comparison and describe what helped in mastering. The team reviews each entry before publishing. You can withdraw it here.")}</p>
    <p>{t(`Unveröffentlichte Beiträge werden nach ${communityReviewDays} Tagen ohne neue Prüfung oder Überarbeitung gelöscht.`, `Unpublished examples are deleted after ${communityReviewDays} days without a new review or revision.`)}</p>
    {status==="unauthenticated"&&<button type="button" onClick={()=>setLogin(true)}>{t("Anmelden und einreichen","Sign in to submit")}</button>}
    {userId&&<form onSubmit={event=>{event.preventDefault();void submit(event.currentTarget);}}>
      <fieldset disabled={busy||examples.length>=3} className={styles.formGrid}>
        <label>{t("Titel","Title")}<input name="title" required maxLength={90}/></label>
        <label>{t("Künstlername für die öffentliche Anzeige","Public artist name")}<input name="artist" required maxLength={70}/></label>
        <label>Genre<input name="genre" required maxLength={60}/></label>
        <label>{t("Ausschnitt ab Sekunde","Excerpt start in seconds")}<input name="start" type="number" step=".1" min={0} max={576} defaultValue={0} required/></label>
        <label>Original<input type="file" name="original" accept={accept} required/></label>
        <label>Master<input type="file" name="master" accept={accept} required/></label>
        <label className={styles.full}>{t("Ausgangsproblem","Starting problem")}<textarea name="problem" required minLength={8} maxLength={360}/></label>
        <label className={styles.full}>{t("Welche Einstellungen haben geholfen?","What settings helped?")}<textarea name="settings" required minLength={8} maxLength={500}/></label>
        <label className={styles.rights}><input type="checkbox" name="rights" required/>{t("Ich darf beide Audioausschnitte und die angegebenen Informationen einreichen und auf Beatzucker öffentlich zeigen lassen.","I have permission to submit both excerpts and the supplied details and allow Beatzucker to display them publicly.")}</label>
        <button type="submit">{busy?t("Wird verarbeitet …","Processing…"):t("Zur Prüfung einreichen","Submit for review")}</button>
      </fieldset>
      {examples.length>=3&&<p>{t("Deine drei Plätze sind belegt.","Your three submission slots are in use.")}</p>}
    </form>}
    {examples.map(item=><article className={styles.presetRow} key={item.id}><div><strong>{item.track.title}</strong>
      <p>{item.publishedAt?t("Veröffentlicht","Published"):item.rejectionReason?t("Abgelehnt","Declined"):t("Wartet auf Prüfung","Awaiting review")}</p></div>
      <QuickMasterComparison lang={lang} track={item.track} compact/>
      {item.rejectionReason&&<form className={styles.formGrid} onSubmit={event=>{event.preventDefault();void revise(item.id,event.currentTarget);}}>
        <p className={styles.full}>{item.rejectionReason}</p>
        <label>{t("Ausgangsproblem","Starting problem")}<textarea name="problem" required minLength={8} maxLength={360} defaultValue={item.problem}/></label>
        <label>{t("Welche Einstellungen haben geholfen?","What settings helped?")}<textarea name="settings" required minLength={8} maxLength={500} defaultValue={item.settings}/></label>
        <button type="submit" disabled={busy}>{t("Überarbeitet einreichen","Resubmit revisions")}</button>
      </form>}
      <button type="button" disabled={busy} onClick={()=>void withdraw(item.id)}>{t("Zurückziehen","Withdraw")}</button>
    </article>)}
    {message&&<p role={error?"alert":"status"}>{message}</p>}
    <AuthModal lang={lang} open={login} onClose={()=>setLogin(false)} returnTo={(en?"/en":"")+"/community-masters#submit-example"}/>
  </section>;
}
