import KickBassWorkspace from "@/components/release-tools/KickBassWorkspace";
import MasteringLabGuide from "@/components/MasteringLabGuide";
import { masteringLabMetadata } from "@/lib/masteringLabSeo";

export const metadata = masteringLabMetadata("de", true);

export default function KickBassSidechainPage() {
  return <KickBassWorkspace lang="de"><MasteringLabGuide lang="de" sidechain /></KickBassWorkspace>;
}
