import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CommunitySubmission from "@/components/CommunitySubmission";
import { QuickMasterComparison } from "@/components/QuickMasterComparison";
import { publicCommunityExamples } from "@/lib/communityExamples";
import { pageMetadata } from "@/lib/pageMetadata";
import type { Lang } from "@/lib/types/mastering";
import styles from "./ListeningEntry.module.css";

const base="https://beatzucker.de";
export function communityMetadata(lang:Lang){
  const en=lang==="en";
  return pageMetadata({title:{absolute:en?"Community Mastering Before & After | Beatzucker":"Community-Mastering vorher und nachher | Beatzucker"},
    description:en?"Hear tracks submitted by independent artists and see which mastering settings helped. Submit your own listening comparison for review.":"Höre Original und Master von unabhängigen Künstlern und erfahre, welche Einstellungen geholfen haben. Reiche deinen eigenen Hörvergleich zur Prüfung ein.",
    alternates:{canonical:base+(en?"/en":"")+"/community-masters",languages:{"de-DE":base+"/community-masters",en:base+"/en/community-masters","x-default":base+"/community-masters"}}});
}

export default async function CommunityMastersPage({lang}:{lang:Lang}){
  const en=lang==="en",rows=await publicCommunityExamples().catch(()=>null);
  return <div className="tools-page"><Header lang={lang}/><main lang={lang}>
    <section className={styles.flow}>
      <div className={styles.row}><Link href={en?"/en/mastering-examples":"/hoervergleich"}>{en?"Listening examples":"Hörbeispiele"} →</Link>
      <Link href={en?"/community-masters":"/en/community-masters"} hrefLang={en?"de":"en"}>{en?"Deutsch":"English"}</Link></div>
      <h1 className="text-3xl font-bold mt-4">{en?"Community mastering examples":"Mastering-Hörbeispiele aus der Community"}</h1>
      <p>{en?"Hear original and master side by side and read what helped each track.":"Höre Original und Master direkt im Vergleich und lies, welche Einstellungen beim jeweiligen Track geholfen haben."}</p>
      {rows===null?<p role="status">{en?"The examples could not be loaded.":"Die Beispiele konnten nicht geladen werden."}</p>:
      !rows.length?<p>{en?"Be the first to submit a comparison.":"Reiche den ersten Community-Hörvergleich ein."}</p>:rows.map(item=><article className={styles.communityReview} key={item.id}>
        <h2>{item.track.title}</h2><p>{item.artist} · {item.track.genre}</p>
        <div lang={item.language}><p><strong>{en?"Starting problem":"Ausgangsproblem"}</strong> {item.problem}</p><p><strong>{en?"Settings that helped":"Diese Einstellungen haben geholfen"}</strong> {item.settings}</p></div>
        <QuickMasterComparison lang={lang} track={item.track} compact/>
      </article>)}
      <CommunitySubmission lang={lang}/>
    </section>
  </main><Footer lang={lang}/></div>;
}
