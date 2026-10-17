"use client";
import { useEffect, useRef, useState } from "react";
import { useUiLanguage } from "@/lib/useUiLanguage";
import type { ShowcaseTrack } from "@/lib/showcaseTracks";
type Publication = { revision: number; tracks: ShowcaseTrack[] };
export default function ShowcaseManager() {
  const en = useUiLanguage() === "en";
  const [data,setData]=useState<Publication|null>(null),[id,setId]=useState<string|null>(null),[title,setTitle]=useState(""),[genre,setGenre]=useState(""),[position,setPosition]=useState(1),[start,setStart]=useState(0);
  const [original,setOriginal]=useState<File|null>(null),[master,setMaster]=useState<File|null>(null),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState(false);
  const lock=useRef(false),uploads=useRef<Record<string,{file:File;data:{file_id:string;upload_token:string}}>>({});
  function choose(next:string|null,publication=data){
    const track=publication?.tracks.find(track=>track.id===next);setId(next);setTitle(track?.title||"");setGenre(track?.genre||"");setPosition(track ? publication!.tracks.indexOf(track)+1 : (publication?.tracks.length||0)+1);setStart(track?.sourceStart||0);setOriginal(null);setMaster(null);setConsent(false);uploads.current={};
  }
  async function reload(){
    if(lock.current)return;
    try{const response=await fetch('/api/admin/showcase',{cache:'no-store'});if(!response.ok)throw Error(en?'Could not load examples.':'Hörbeispiele konnten nicht geladen werden.');const next=await response.json();setData(next);choose(next.tracks[0]?.id??null,next);setMessage('');}
    catch(failure){setError(true);setMessage(failure instanceof Error?failure.message:'Error');}
  }
  useEffect(()=>{void reload();},[]);
  async function save(action:'metadata'|'replace'|'delete'){
    if(lock.current||!data)return;
    if(action==='delete'&&!confirm(en?'Remove this public comparison?':'Diesen öffentlichen Hörvergleich entfernen?'))return;
    lock.current=true;setBusy(true);setError(false);setMessage('');
    try{
      let input:Record<string,unknown>={action,id,title,genre,position,revision:data.revision};
      if(action==='replace'){
        if(!original||!master||!consent)throw Error(en?'Choose both files and confirm publication rights.':'Bitte beide Dateien auswählen und Veröffentlichungsrechte bestätigen.');
        const upload=async(side:string,file:File)=>{
          if(uploads.current[side]?.file===file)return uploads.current[side].data;
          setMessage(en?`Uploading ${side}…`:`${side==='original'?'Original':'Master'} wird hochgeladen…`);
          const form=new FormData();form.append('file',file);const response=await fetch('/api/upload',{method:'POST',body:form});const value=await response.json();if(!response.ok)throw Error(value.error||'Upload failed');uploads.current[side]={file,data:value};return value;
        };
        const a=await upload('original',original),b=await upload('master',master);
        input={...input,original:{file_id:a.file_id,upload_token:a.upload_token},master:{file_id:b.file_id,upload_token:b.upload_token},start,publishConsent:consent};
        setMessage(en?'Aligning, preparing and checking both excerpts… Existing examples stay online.':'Beide Hörproben werden ausgerichtet, erstellt und geprüft… Vorhandene Beispiele bleiben online.');
      }
      const response=await fetch('/api/admin/showcase',{method:action==='replace'?'POST':'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
      const next=await response.json();if(!response.ok)throw Error(next.error||'Save failed');
      setData(next);choose(action==='delete'?next.tracks[0]?.id??null:id??next.tracks.at(-1)?.id,next);
      setMessage(en?'Published. New page visits show the updated examples.':'Veröffentlicht. Neue Seitenaufrufe zeigen die aktualisierten Hörbeispiele.');
    }catch(failure){setError(true);setMessage(failure instanceof Error?failure.message:(en?'Save could not be confirmed. Please reload.':'Speichern konnte nicht bestätigt werden. Bitte neu laden.'));}
    finally{lock.current=false;setBusy(false);}
  }
  const selected=data?.tracks.find(track=>track.id===id);
  const field:React.CSSProperties={width:'100%',padding:'9px 10px',border:'1px solid #a496d240',borderRadius:8,background:'#111a2d',color:'#d9e5f6'};
  const button:React.CSSProperties={padding:'10px 13px',border:'1px solid #a496d250',borderRadius:8,background:'#263249',color:'#d9e5f6',cursor:'pointer'};
  return <section className="admin-showcase" style={{margin:'28px 0',padding:22,border:'1px solid #a496d230',borderRadius:16,background:'#10172a'}}>
    <h2 style={{fontSize:19,fontWeight:650}}>{en?'Public listening examples':'Öffentliche Hörbeispiele'} <small style={{color:'#93a4c0',fontSize:12}}>{data?.tracks.length??'–'} / 5</small></h2>
    <p style={{color:'#9babc5',fontSize:12,margin:'9px 0 18px'}}>{en?'Edit titles, genres and order, or replace both sides. Only aligned 24-second MP3 excerpts are published, never complete uploads.':'Titel, Genre und Reihenfolge ändern oder beide Seiten austauschen. Veröffentlicht werden nur ausgerichtete MP3-Hörproben mit 24 Sekunden, niemals die vollständigen Uploads.'}</p>
    <button type="button" onClick={()=>void reload()} disabled={busy} style={button}>{en?'Reload list':'Liste neu laden'}</button>
    {data&&<fieldset disabled={busy} style={{border:0,padding:0,marginTop:16,minWidth:0}}>
      <label style={{display:'block',marginBottom:14}}>{en?'Example':'Hörbeispiel'}<select aria-label={en?'Select example':'Hörbeispiel auswählen'} style={field} value={id??'new'} onChange={event=>{choose(event.target.value==='new'?null:event.target.value);setMessage('');}}>{data.tracks.map((track,index)=><option key={track.id} value={track.id}>{index+1}. {track.title}</option>)}{data.tracks.length<5&&<option value="new">+ {en?'Add a fifth/new example':'Neues Hörbeispiel hinzufügen'}</option>}</select></label>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12}}>
        <label>{en?'Title':'Titel'}<input style={field} maxLength={90} value={title} onChange={event=>setTitle(event.target.value)} /></label>
        <label>Genre<input style={field} maxLength={60} value={genre} onChange={event=>setGenre(event.target.value)} /></label>
        {id&&<label>{en?'Position':'Reihenfolge'}<input style={field} type="number" min={1} max={data.tracks.length} value={position} onChange={event=>setPosition(Number(event.target.value))}/></label>}
      </div>
      {id&&<div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:13}}><button style={button} type="button" onClick={()=>void save('metadata')}>{en?'Save details / order':'Angaben / Reihenfolge speichern'}</button><button style={button} type="button" disabled={data.tracks.length<=1} onClick={()=>void save('delete')}>{en?'Remove example':'Beispiel entfernen'}</button></div>}
      {selected&&<div style={{display:'flex',flexWrap:'wrap',gap:14,marginTop:16}}>{(['original','master']as const).map(side=><label key={side} style={{fontSize:12}}>{side==='original'?'Original':'Master'}<audio controls preload="none" src={selected[side].url} style={{display:'block',maxWidth:'100%',height:36,marginTop:5}}/></label>)}</div>}
      <h3 style={{margin:'22px 0 12px',fontWeight:600}}>{en?'Upload a new pair':'Neues Dateipaar hochladen'}</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>{(['original','master']as const).map(side=><label key={side} style={{fontSize:12}}>{side==='original'?'Original':'Master'}<input type="file" accept=".wav,.flac,.mp3,.aiff,.ogg,.m4a" style={{...field,fontSize:11}} onChange={event=>{const file=event.target.files?.[0]??null;(side==='original'?setOriginal:setMaster)(file);delete uploads.current[side];}}/></label>)}<label style={{fontSize:12}}>{en?'Excerpt start (seconds)':'Ausschnitt ab Sekunde'}<input style={field} type="number" min={0} max={600} step={.1} value={start} onChange={event=>setStart(Number(event.target.value))}/></label></div>
      <label style={{display:'flex',gap:9,alignItems:'start',margin:'15px 0',fontSize:12,color:'#abbad1'}}><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/>{en?'I may publish both audio excerpts on this website. Both files contain the same song section.':'Ich darf beide Audioausschnitte auf dieser Webseite veröffentlichen. Beide Dateien enthalten denselben Songabschnitt.'}</label>
      <button type="button" style={button} disabled={!original||!master||!consent||!title.trim()||!genre.trim()} onClick={()=>void save('replace')}>{en?(id?'Prepare and replace pair':'Prepare and publish example'):(id?'Dateipaar prüfen und ersetzen':'Hörbeispiel prüfen und veröffentlichen')}</button>
    </fieldset>}
    {message&&<p role={error?'alert':'status'} style={{marginTop:14,fontSize:13,color:error?'#fca5a5':'#a4dece'}}>{message}</p>}
  </section>;
}
