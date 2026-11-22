"use client";

import { useEffect,useState } from "react";
import { useUiLanguage } from "@/lib/useUiLanguage";
import { QuickMasterComparison } from "@/components/QuickMasterComparison";
import type { ShowcaseTrack } from "@/lib/showcaseTracks";
import styles from "@/components/ListeningEntry.module.css";
type Example={id:string;artist:string;problem:string;settings:string;publishedAt:string|null;rejectionReason:string|null;createdAt:string;track:ShowcaseTrack};

export default function CommunityExamplesManager() {
  const lang=useUiLanguage(),en=lang==="en";
  const [rows,setRows]=useState<Example[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState(false);
  const [rejecting,setRejecting]=useState<string>();
  async function refresh(){
    const res=await fetch("/api/admin/community",{cache:"no-store"});
    if(!res.ok)throw Error();
    setRows((await res.json()).examples);
  }
  useEffect(()=>{void refresh().catch(()=>{setError(true);setMessage(en?"Could not load submissions.":"Einreichungen konnten nicht geladen werden.");});},[en]);
  async function moderate(id:string,action:"publish"|"unpublish"|"reject"|"remove",reason?:string){
    if(action==="remove"&&!confirm(en?"Permanently remove this submission?":"Diesen Beitrag dauerhaft entfernen?"))return;
    setBusy(true);setError(false);setMessage("");
    try{
      const res=await fetch("/api/admin/community",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action,reason})});
      if(!res.ok)throw Error();
      await refresh();setRejecting(undefined);setMessage(en?"Saved.":"Gespeichert.");
    }catch{setMessage(en?"Could not save the decision. Check the public gallery limit.":"Entscheidung konnte nicht gespeichert werden. Prüfe das Veröffentlichungs-Limit.");setError(true);}
    finally{setBusy(false);}
  }
  return <section className={styles.quick} aria-label="Community">
    <h2>{en?"Community listening submissions":"Community-Hörbeispiele"}</h2>
    {!rows.length&&<p>{en?"No submissions to review.":"Keine Einreichungen zur Prüfung."}</p>}
    {rows.map(item=><article key={item.id} className={styles.communityReview}>
      <strong>{item.artist} · {item.track.title} · {item.track.genre}</strong>
      <small>{new Date(item.createdAt).toLocaleDateString(en?"en-GB":"de-DE")}</small>
      <p>{item.problem}</p><p>{item.settings}</p>
      {item.rejectionReason&&<p>{en?"Declined":"Abgelehnt"} · {item.rejectionReason}</p>}
      <QuickMasterComparison lang={lang} track={item.track} compact/>
      <div className={styles.row}>
        <button disabled={busy} onClick={()=>void moderate(item.id,item.publishedAt?"unpublish":"publish")}>{item.publishedAt?(en?"Unpublish":"Veröffentlichung zurücknehmen"):(en?"Publish example":"Beispiel veröffentlichen")}</button>
        {!item.publishedAt&&<button type="button" disabled={busy} onClick={()=>setRejecting(item.id)}>{en?"Decline with explanation":"Mit Begründung ablehnen"}</button>}
        <button disabled={busy} onClick={()=>void moderate(item.id,"remove")}>{en?"Remove submission":"Einreichung entfernen"}</button>
      </div>
      {rejecting===item.id&&<form className={styles.formGrid} onSubmit={event=>{
        event.preventDefault();
        void moderate(item.id,"reject",String(new FormData(event.currentTarget).get("reason")??""));
      }}>
        <label>{en?"Private explanation":"Private Begründung"}<textarea name="reason" minLength={8} maxLength={400} required /></label>
        <button type="submit" disabled={busy}>{en?"Send decision":"Entscheidung speichern"}</button>
        <button type="button" onClick={()=>setRejecting(undefined)}>{en?"Cancel":"Abbrechen"}</button>
      </form>}
    </article>)}
    {message&&<p role={error?"alert":"status"}>{message}</p>}
  </section>;
}
