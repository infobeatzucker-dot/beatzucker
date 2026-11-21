"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/types/mastering";
import type { Settings } from "./mastering-lab/settings";
import type { AccountLabPreset } from "@/lib/labPresetValidation";
import styles from "./ListeningEntry.module.css";

export default function AccountLabPresets({lang,current,onApply}: {lang:Lang;current?:{settings:Settings;target:number|null};onApply?:(preset:AccountLabPreset)=>void}) {
  const en=lang==="en",t=(de:string,english:string)=>en?english:de;
  const {status,data}=useSession();
  const account=data?.user?.id;
  const [rows,setRows]=useState<AccountLabPreset[]>([]),[name,setName]=useState(""),[selected,select]=useState("");
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState(false);
  const [renaming,setRenaming]=useState<string>();
  useEffect(()=>{
    setRows([]);select("");setName("");setRenaming(undefined);setMessage("");
    if(!account)return;
    const controller=new AbortController();
    fetch("/api/account/lab-presets",{cache:"no-store",signal:controller.signal}).then(async res=>{
      if(!res.ok)throw Error("Load");
      const list=(await res.json()).presets as AccountLabPreset[];
      if(!controller.signal.aborted)setRows(list);
    }).catch(()=>{if(!controller.signal.aborted){setMessage(t("Presets konnten nicht geladen werden.","Could not load presets."));setError(true);}});
    return()=>controller.abort();
  },[account,lang]);
  const chosen=rows.find(row=>row.id===selected);
  useEffect(()=>{
    if(!onApply||!rows.length)return;
    const linkId=new URL(window.location.href).searchParams.get("preset");
    const row=rows.find(item=>item.id===linkId);
    if(row){select(row.id);onApply(row);const address=new URL(window.location.href);address.searchParams.delete("preset");window.history.replaceState(window.history.state,"",address);}
  },[rows,onApply]);
  async function change(method:"POST"|"PATCH"|"DELETE", body:object) {
    if(busy)return;
    setBusy(true);setMessage("");setError(false);
    try {
      const res=await fetch("/api/account/lab-presets",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const result=await res.json();
      if(!res.ok)throw Error(result.error);
      if(method==="POST" && result.preset){
        setRows(previous=>[result.preset,...previous]);select(result.preset.id);setName("");
      }else if(method==="DELETE" && "id" in body){
        setRows(previous=>previous.filter(item=>item.id!==body.id));if(selected===body.id)select("");
      }else if(method==="PATCH" && "id" in body && "name" in body&&typeof body.name==="string"){
        setRows(previous=>previous.map(item=>item.id===body.id?{...item,name:String(body.name).trim(),updatedAt:new Date().toISOString()}:item));
        setRenaming(undefined);setName("");
      }
      setMessage(t("Gespeichert.","Saved."));
    }catch(reason){
      setError(true);
      setMessage(reason instanceof Error && reason.message==="DUPLICATE"
        ?t("Der Name ist bereits vergeben.","This name is already in use.")
        :reason instanceof Error&&reason.message==="LIMIT"?t("Deine 30 Speicherplätze sind belegt.","All 30 preset slots are in use.")
          :t("Die Änderung konnte nicht gespeichert werden.","Could not save the change."));
    }finally{setBusy(false);}
  }
  return <section className={styles.quick} aria-label={t("Meine Lab-Presets","My Lab presets")}>
    <h2>{t("Meine Lab-Presets","My Lab presets")}</h2>
    {status==="unauthenticated"&&<p>{t("Melde dich an, um eigene Einstellungen im Konto zu speichern.","Sign in to save your own settings to your account.")} <Link href={en?"/en":"/"}>{t("Zur Anmeldung","Go to sign-in")} →</Link></p>}
    {account&&onApply&&<>
      <div className={styles.row}>
        <select aria-label={t("Eigenes Preset auswählen","Choose saved preset")} value={selected} onChange={e=>select(e.target.value)}>
          <option value="">{t("Gespeichertes Preset wählen","Choose a saved preset")}</option>
          {rows.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}
        </select>
        <button type="button" disabled={!chosen} onClick={()=>chosen&&onApply(chosen)}>{t("Ins Lab laden","Load into Lab")}</button>
      </div>
      <form className={styles.row} onSubmit={e=>{e.preventDefault();if(current&&name.trim())void change("POST",{name,...current});}}>
        <input aria-label={t("Preset-Name","Preset name")} maxLength={70} value={name} onChange={e=>setName(e.target.value)} placeholder={t("z. B. Mein Techno-Master","e.g. My techno master")} />
        <button disabled={busy||!name.trim()} type="submit">{t("Aktuelle Einstellungen speichern","Save current settings")}</button>
        <Link href={"/dashboard/presets?lang="+lang}>{t("Im Dashboard verwalten","Manage in Dashboard")} →</Link>
      </form>
    </>}
    {account&&!onApply&&<>
      {!rows.length&&<p>{t("Speichere im Lab eine eigene Einstellung, um sie hier wiederzufinden.","Save settings in the Lab to find them here.")}</p>}
      <ul>{rows.map(row=><li key={row.id} className={styles.presetRow}>
        {renaming===row.id?<form className={styles.row} onSubmit={e=>{e.preventDefault();if(name.trim())void change("PATCH",{id:row.id,name});}}>
          <input aria-label={t("Neuer Name","New name")} value={name} maxLength={70} onChange={e=>setName(e.target.value)}/>
          <button disabled={busy||!name.trim()}>{t("Speichern","Save")}</button><button type="button" onClick={()=>setRenaming(undefined)}>{t("Abbrechen","Cancel")}</button>
        </form>:<><strong>{row.name}</strong><div className={styles.row}>
          <Link href={(en?"/en":"")+"/mastering-lab?preset="+encodeURIComponent(row.id)}>{t("Ins Lab laden","Load into Lab")} →</Link>
          <button type="button" disabled={busy} onClick={()=>{setName(row.name);setRenaming(row.id);}}>{t("Umbenennen","Rename")}</button>
          <button type="button" disabled={busy} onClick={()=>{if(window.confirm(t("Dieses Preset löschen?","Delete this preset?")))void change("DELETE",{id:row.id});}}>{t("Löschen","Delete")}</button>
        </div></>}
      </li>)}</ul>
      <Link href={(en?"/en":"")+"/mastering-lab"}>{t("Mastering Lab öffnen","Open Mastering Lab")} →</Link>
    </>}
    {message&&<p role={error?"alert":"status"}>{message}</p>}
  </section>;
}
