import { pageMetadata } from "@/lib/pageMetadata";
import AudioUtilityPage from "@/components/AudioUtilityPage";
export const metadata=pageMetadata({title:{absolute:"Audio-Rauschen entfernen – Podcast & Sprache bereinigen kostenlos | Beatzucker"},description:"Sprachaufnahmen online bereinigen: Hintergrundrauschen reduzieren, Rumpeln filtern und Pegel ausgleichen. Kostenlos mit A/B-Vorschau und WAV-Download, bis 5 Minuten.",alternates:{canonical:"https://beatzucker.de/tools/speech-cleaner",languages:{"de-DE":"https://beatzucker.de/tools/speech-cleaner",en:"https://beatzucker.de/en/tools/speech-cleaner","x-default":"https://beatzucker.de/tools/speech-cleaner"}}});
export default function Page(){return <AudioUtilityPage lang="de" tool="speech-cleaner"/>}
