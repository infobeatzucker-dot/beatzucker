import ReleaseToolPage, { releaseToolMetadata } from "@/components/release-tools/ReleaseToolPage";
export const metadata = releaseToolMetadata("release-check", "en");
export default function Page() { return <ReleaseToolPage tool="release-check" lang="en"/>; }
