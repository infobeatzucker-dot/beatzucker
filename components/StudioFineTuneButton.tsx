import { ArrowRight } from "lucide-react";

export default function StudioFineTuneButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="beta-fine-tune-key" type="button" aria-controls="beta-manual" onClick={onClick}>
      <span className="beta-fine-tune-art" aria-hidden="true"><i /><i /><i /></span>
      <span>{label}</span>
      <ArrowRight size={16} className="beta-fine-tune-arrow" aria-hidden="true" />
    </button>
  );
}
