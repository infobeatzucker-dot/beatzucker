import KickBassWorkspace from "@/components/release-tools/KickBassWorkspace";
import MasteringLabGuide from "@/components/MasteringLabGuide";
import { masteringLabMetadata } from "@/lib/masteringLabSeo";

export const metadata = masteringLabMetadata("en", true);

export default function KickBassSidechainPage() {
  return <KickBassWorkspace lang="en"><MasteringLabGuide lang="en" sidechain /></KickBassWorkspace>;
}
