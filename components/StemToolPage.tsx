import Header from "./Header";
import Footer from "./Footer";
import StemTool from "./StemTool";
import type { Lang } from "@/lib/types/mastering";
export default function StemToolPage({ lang, tool }: { lang: Lang; tool: "vocal-remover" | "stem-separation" }) {
  return <div className="tools-page"><Header lang={lang}/><main><StemTool lang={lang} tool={tool}/></main><Footer lang={lang}/></div>;
}
