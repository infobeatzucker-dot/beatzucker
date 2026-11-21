import MasteringLab from "@/components/mastering-lab/MasteringLab";
import MasteringLabGuide from "@/components/MasteringLabGuide";
import { masteringLabMetadata } from "@/lib/masteringLabSeo";

export const metadata = masteringLabMetadata("de");

export default function MasteringLabPage() {
  return <MasteringLab lang="de"><MasteringLabGuide lang="de" /></MasteringLab>;
}
