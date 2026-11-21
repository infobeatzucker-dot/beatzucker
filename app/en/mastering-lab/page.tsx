import MasteringLab from "@/components/mastering-lab/MasteringLab";
import MasteringLabGuide from "@/components/MasteringLabGuide";
import { masteringLabMetadata } from "@/lib/masteringLabSeo";

export const metadata = masteringLabMetadata("en");

export default function MasteringLabPage() {
  return <MasteringLab lang="en"><MasteringLabGuide lang="en" /></MasteringLab>;
}
