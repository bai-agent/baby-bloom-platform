import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Calendar, AlertCircle } from "lucide-react";
import { getNannyInterviewRequests } from "@/lib/actions/interview";
import { NannyInterviewsClient } from "./NannyInterviewsClient";

export default async function NannyInterviewsPage() {
  const { data: requests, error } = await getNannyInterviewRequests();

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interview Requests</h1>
          <p className="mt-1 text-slate-500">Manage interview requests from families</p>
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
  const otherRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Interview Requests</h1>
        <p className="mt-1 text-slate-500">
          Manage interview requests from families
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No interview requests yet"
          description="When families request interviews with you, they'll appear here. Complete your verification to start receiving requests."
          actionLabel="Complete Verification"
          actionHref="/nanny/verification"
        />
      ) : (
        <>
          {pendingRequests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Pending Requests ({pendingRequests.length})
              </h2>
              <NannyInterviewsClient requests={pendingRequests} />
            </div>
          )}

          {otherRequests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-700">
                Past Requests ({otherRequests.length})
              </h2>
              <div className="grid gap-4">
                {otherRequests.map((request) => (
                  <Card key={request.id} className="opacity-75">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {request.parent?.first_name} {request.parent?.last_name[0]}.
                        </CardTitle>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            request.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : request.status === "declined"
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      <CardDescription>{request.parent?.suburb}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {request.selected_time && (
                        <p className="text-sm">
                          <span className="text-slate-500">Interview:</span>{" "}
                          {new Date(request.selected_time).toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
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
