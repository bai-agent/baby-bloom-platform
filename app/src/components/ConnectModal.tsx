"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createConnectionRequest } from "@/lib/actions/connection";
import { X, Loader2, Calendar, MapPin, Check, Phone } from "lucide-react";

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
  const [times, setTimes] = useState<string[]>(["", "", ""]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const allTimesFilled = times.every((t) => t.trim() !== "");
  const atLimit = pendingRequestCount >= 5;

  // Min: 24 hours from now, Max: 7 days from now
  const now = new Date();
  const minDateTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const maxDateTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allTimesFilled) {
      setError("Please fill in all 3 time slots.");
      return;
    }

    if (atLimit) {
      setError("You have reached the maximum of 5 open requests.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await createConnectionRequest(nanny.id, times, message || undefined);

    setSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
        router.refresh();
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
                Propose 3 times for a 15-minute intro call
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
                  {nanny.hourly_rate_min && (
                    <div className="ml-auto text-right">
                      <p className="font-bold">${nanny.hourly_rate_min}</p>
                      <p className="text-xs text-slate-500">/hour</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Open Requests Counter */}
              <div className="flex items-center justify-between rounded-lg bg-violet-50 px-4 py-2">
                <span className="text-sm text-violet-700">Open requests</span>
                <span className={`text-sm font-semibold ${atLimit ? 'text-red-600' : 'text-violet-700'}`}>
                  {pendingRequestCount}/5
                </span>
              </div>

              {/* Intro Call Info */}
              <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <Phone className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  This is a 15-minute phone call. If {nanny.first_name} accepts, their phone number will be shared with you.
                </p>
              </div>

              {/* Proposed Times */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Propose 3 Times
                </Label>
                <p className="text-sm text-slate-500">
                  Choose 3 times in the next 7 days (at least 24 hours from now). {nanny.first_name} will pick one.
                </p>
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-8 text-sm text-slate-500">#{index + 1}</span>
                    <Input
                      type="datetime-local"
                      value={times[index]}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                      min={minDateTime}
                      max={maxDateTime}
                      required
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="connect-message">Message (optional)</Label>
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
                  disabled={submitting || !allTimesFilled || atLimit}
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
