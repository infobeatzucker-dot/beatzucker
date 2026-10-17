import { pageMetadata } from "@/lib/pageMetadata";
import type { Metadata } from "next";
import Header from "@/components/Header"; import Footer from "@/components/Footer"; import ScrollToTop from "@/components/ScrollToTop"; import ToolsHub from "@/components/ToolsHub"; import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
export const metadata: Metadata = pageMetadata({ title:{absolute:"Free Online Audio Tools for Musicians | Beatzucker"}, description:"Free online audio tools for streaming loudness, mix checks and release preparation.", alternates:{canonical:"https://beatzucker.de/en/tools",languages:{"de-DE":"https://beatzucker.de/tools",en:"https://beatzucker.de/en/tools","x-default":"https://beatzucker.de/tools"}} });
export default function ToolsPage(){return <div className="tools-page"><BreadcrumbJsonLd name="Audio Tools" url="https://beatzucker.de/en/tools"/><Header lang="en"/><main><ToolsHub lang="en"/></main><Footer lang="en"/><ScrollToTop lang="en"/></div>}
