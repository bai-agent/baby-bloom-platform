"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createConnectionRequest } from "@/lib/actions/connection";
import { X, Loader2, MapPin, Check, Phone, Send, UserCheck, Clock } from "lucide-react";

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  nanny: {
    id: string;
    first_name: string;
    last_name: string;
    suburb: string;
    hourly_rate_min: number | null;
    profile_picture_url?: string | null;
  };
  pendingRequestCount: number;
}

export function ConnectModal({ isOpen, onClose, nanny, pendingRequestCount }: ConnectModalProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const atLimit = pendingRequestCount >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (atLimit) {
      setError("You have reached the maximum of 5 open requests.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await createConnectionRequest(nanny.id, message || undefined);

    setSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        router.push('/parent/connections');
      }, 2000);
    } else {
      setError(result.error || "Failed to send request");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connect with {nanny.first_name}</CardTitle>
              <CardDescription>
                Request a 15-minute intro
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center py-8">
              <div className="mb-4 rounded-full bg-green-100 p-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Request Sent!</h3>
              <p className="mt-2 text-center text-slate-500">
                {nanny.first_name} will be notified and can respond from their inbox.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nanny Info */}
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                    <span className="text-lg font-semibold text-violet-600">
                      {nanny.first_name[0]}{nanny.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{nanny.first_name} {nanny.last_name[0]}.</p>
                    <p className="flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="h-3 w-3" />
                      {nanny.suburb}
                    </p>
                  </div>
                </div>
              </div>

              {/* Open Requests Counter */}
              <div className="flex items-center justify-between rounded-lg bg-violet-50 px-4 py-2">
                <span className="text-sm text-violet-700">Open requests</span>
                <span className={`text-sm font-semibold ${atLimit ? 'text-red-600' : 'text-violet-700'}`}>
                  {pendingRequestCount}/5
                </span>
              </div>

              {/* How It Works */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">How it works</p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">1</div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Send className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                      <span>You send a connection request</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">2</div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <UserCheck className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                      <span>{nanny.first_name} reviews and accepts or declines</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">3</div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                      <span>You pick a call time and their number is shared</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  {nanny.first_name} has 3 days to respond to your request.
                </p>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label htmlFor="connect-message" className="text-sm font-medium text-slate-700">Message (optional)</label>
                <textarea
                  id="connect-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Introduce yourself and share any details about your family..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-violet-500 hover:bg-violet-600"
                  disabled={submitting || atLimit}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    `Connect with ${nanny.first_name}`
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
