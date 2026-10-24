import Link from 'next/link';
import {CURRENT_WORKFLOW} from '@/lib/masteringLearning';
import type {Lang} from '@/lib/types/mastering';

export default function CurrentMasteringGuide({lang}:{lang:Lang}){
  const en=lang==='en';
  return <aside className="glass-panel p-6 mt-8"><div className="label mb-3">{en?'YOUR CURRENT WORKFLOW':'DEIN AKTUELLER ABLAUF'}</div><h3 className="text-xl font-bold mb-5">{en?'From your mix to your own master':'Von deinem Mix zu deinem eigenen Master'}</h3><ol className="grid md:grid-cols-2 gap-5">{CURRENT_WORKFLOW.map((step,i)=><li key={i}><h4 className="text-sm font-semibold mb-2" style={{color:'var(--accent-cyan)'}}>{step[lang].title}</h4><p className="text-sm leading-relaxed" style={{color:'var(--text-secondary)'}}>{step[lang].body}</p></li>)}</ol><p className="text-sm mt-5 flex flex-wrap gap-5"><Link href={en?'/en/knowledge/referenz-mastering-character':'/ressourcen/referenz-mastering-character'}>{en?'References, character and sections →':'Referenzen, Character und Abschnitte →'}</Link><Link href={en?'/en/tools':'/tools'}>{en?'Explore audio tools →':'Audio-Tools entdecken →'}</Link><Link href={en?'/en/help':'/help'}>{en?'Help and FAQ →':'Hilfe und FAQ →'}</Link></p></aside>;
}
