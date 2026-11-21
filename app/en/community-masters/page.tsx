import CommunityMastersPage, { communityMetadata } from "@/components/CommunityMastersPage";
export const dynamic="force-dynamic";
export const metadata=communityMetadata("en");
export default function Page(){return <CommunityMastersPage lang="en"/>;}
