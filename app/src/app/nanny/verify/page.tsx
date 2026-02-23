import { IDVerificationFunnel } from "./IDVerificationFunnel";

export default function NannyVerifyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Identity Verification</h1>
        <p className="mt-1 text-slate-500">
          Verify your identity to unlock matching and babysitting features
        </p>
      </div>
      <IDVerificationFunnel />
    </div>
  );
}
