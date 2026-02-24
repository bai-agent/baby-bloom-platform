import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Calendar, AlertCircle, MapPin, DollarSign, Check, Clock } from "lucide-react";
import { getParentInterviewRequests } from "@/lib/actions/interview";
import { ParentInterviewsClient } from "./ParentInterviewsClient";

export default async function ParentInterviewsPage() {
  const { data: requests, error } = await getParentInterviewRequests();

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interviews</h1>
          <p className="mt-1 text-slate-500">Track and manage your interview requests</p>
        </div>
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const acceptedRequests = requests.filter((r) => r.status === "accepted");
  const otherRequests = requests.filter((r) => r.status !== "pending" && r.status !== "accepted");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Interviews</h1>
        <p className="mt-1 text-slate-500">
          Track and manage your interview requests
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No interviews scheduled"
          description="When you request interviews with nannies, they'll appear here. Start by browsing nannies and sending interview requests."
          actionLabel="Browse Nannies"
          actionHref="/parent/browse"
        />
      ) : (
        <>
          {/* Accepted Interviews */}
          {acceptedRequests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                <Check className="h-5 w-5" />
                Scheduled Interviews ({acceptedRequests.length})
              </h2>
              <div className="grid gap-4">
                {acceptedRequests.map((request) => (
                  <Card key={request.id} className="border-green-200 bg-green-50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {request.nanny?.first_name} {request.nanny?.last_name[0]}.
                        </CardTitle>
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Confirmed
                        </span>
                      </div>
                      <CardDescription className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {request.nanny?.suburb}
                        </span>
                        {request.nanny?.hourly_rate_min && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${request.nanny.hourly_rate_min}/hr
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg bg-white p-3 border border-green-200">
                        <p className="text-sm font-medium text-green-800">
                          {request.selected_time && new Date(request.selected_time).toLocaleString("en-AU", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-yellow-700 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Awaiting Response ({pendingRequests.length})
              </h2>
              <ParentInterviewsClient requests={pendingRequests} />
            </div>
          )}

          {/* Past Requests */}
          {otherRequests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-500">
                Past Requests ({otherRequests.length})
              </h2>
              <div className="grid gap-4">
                {otherRequests.map((request) => (
                  <Card key={request.id} className="opacity-60">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {request.nanny?.first_name} {request.nanny?.last_name[0]}.
                        </CardTitle>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            request.status === "declined"
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      <CardDescription>{request.nanny?.suburb}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-slate-400">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
