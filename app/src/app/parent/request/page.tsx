import { ParentRequestFunnel } from "./ParentRequestFunnel";

export default function ParentRequestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nanny Request</h1>
        <p className="mt-1 text-slate-500">
          Tell us about your family&apos;s needs and we&apos;ll match you with the right nanny
        </p>
      </div>
      <ParentRequestFunnel />
    </div>
  );
}
