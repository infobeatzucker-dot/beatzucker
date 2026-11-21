import ReleaseToolPage, { releaseToolMetadata } from "@/components/release-tools/ReleaseToolPage";
export const metadata = releaseToolMetadata("release-check", "de");
export default function Page() { return <ReleaseToolPage tool="release-check" lang="de"/>; }
