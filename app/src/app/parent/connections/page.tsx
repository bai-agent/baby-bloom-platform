import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Link2, AlertCircle } from "lucide-react";
import { getParentConnectionRequests } from "@/lib/actions/connection";
import { ParentConnectionsClient } from "./ParentConnectionsClient";

export default async function ParentConnectionsPage() {
  const { data: requests, error } = await getParentConnectionRequests();

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Connections</h1>
          <p className="mt-1 text-slate-500">Track and manage your nanny connections</p>
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

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Connections</h1>
          <p className="mt-1 text-slate-500">Track and manage your nanny connections</p>
        </div>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
          {pendingCount}/5 open
        </span>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No connections yet"
          description="When you connect with nannies, they'll appear here. Start by browsing nannies and sending connection requests."
          actionLabel="Browse Nannies"
          actionHref="/parent/browse"
        />
      ) : (
        <ParentConnectionsClient requests={requests} />
      )}
    </div>
  );
}
