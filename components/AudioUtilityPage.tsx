import Header from "./Header";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import AudioCutterTool from "./AudioCutterTool";
import Mp3ConverterTool from "./Mp3ConverterTool";
import SpeechCleanerTool from "./SpeechCleanerTool";
import type { Lang } from "@/lib/types/mastering";
import "./audio-utilities.css";
import "./speech-cleaner.css";
export default function AudioUtilityPage({ lang, tool }: { lang: Lang; tool: "wav-to-mp3" | "audio-cutter" | "speech-cleaner" }) {
  return <div className="tools-page"><Header lang={lang}/><main>{tool==="speech-cleaner"?<SpeechCleanerTool lang={lang}/>:tool==="wav-to-mp3"?<Mp3ConverterTool lang={lang}/>:<AudioCutterTool lang={lang}/>}</main><Footer lang={lang}/><ScrollToTop lang={lang}/></div>;
}
