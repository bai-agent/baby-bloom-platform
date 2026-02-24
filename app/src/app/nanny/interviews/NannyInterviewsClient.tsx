"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InterviewRequestWithDetails, acceptInterviewRequest, declineInterviewRequest } from "@/lib/actions/interview";
import { MapPin, Clock, MessageSquare, Check, X, Loader2 } from "lucide-react";

interface NannyInterviewsClientProps {
  requests: InterviewRequestWithDetails[];
}

export function NannyInterviewsClient({ requests }: NannyInterviewsClientProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedTimes, setSelectedTimes] = useState<Record<string, string>>({});

  const handleAccept = async (requestId: string) => {
    const selectedTime = selectedTimes[requestId];
    if (!selectedTime) return;

    setProcessingId(requestId);
    const result = await acceptInterviewRequest(requestId, selectedTime);
    setProcessingId(null);

    if (result.success) {
      router.refresh();
    }
  };

  const handleDecline = async (requestId: string) => {
    setProcessingId(requestId);
    const result = await declineInterviewRequest(requestId);
    setProcessingId(null);

    if (result.success) {
      router.refresh();
    }
  };

  return (
    <div className="grid gap-4">
      {requests.map((request) => (
        <Card key={request.id} className="border-violet-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {request.parent?.first_name} {request.parent?.last_name[0]}.
              </CardTitle>
              <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                Pending
              </span>
            </div>
            <CardDescription className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {request.parent?.suburb}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.message && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                  <MessageSquare className="h-3 w-3" />
                  Message
                </p>
                <p className="text-sm text-slate-700">{request.message}</p>
              </div>
            )}

            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Clock className="h-4 w-4" />
                Proposed Times (select one to accept)
              </p>
              <div className="space-y-2">
                {request.proposed_times.map((time, index) => (
                  <label
                    key={index}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedTimes[request.id] === time
                        ? "border-violet-500 bg-violet-50"
                        : "hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`time-${request.id}`}
                      value={time}
                      checked={selectedTimes[request.id] === time}
                      onChange={() => setSelectedTimes({ ...selectedTimes, [request.id]: time })}
                      className="h-4 w-4 text-violet-600"
                    />
                    <span className="text-sm">
                      {new Date(time).toLocaleString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleDecline(request.id)}
                disabled={processingId === request.id}
              >
                {processingId === request.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Decline
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleAccept(request.id)}
                disabled={processingId === request.id || !selectedTimes[request.id]}
              >
                {processingId === request.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Accept
              </Button>
            </div>

            <p className="text-xs text-slate-400">
              Requested {new Date(request.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
