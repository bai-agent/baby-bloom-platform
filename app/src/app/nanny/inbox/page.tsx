import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Inbox, AlertCircle } from "lucide-react";
import { getNannyConnectionRequests } from "@/lib/actions/connection";
import { getInboxMessages } from "@/lib/actions/inbox";
import { NannyInboxClient } from "./NannyInboxClient";

export default async function NannyInboxPage() {
  const [connectionsResult, inboxResult] = await Promise.all([
    getNannyConnectionRequests(),
    getInboxMessages(),
  ]);

  if (connectionsResult.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
          <p className="mt-1 text-slate-500">Connection requests and notifications</p>
        </div>
        <Card>
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-600">{connectionsResult.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingRequests = connectionsResult.data.filter((r) => r.status === "pending");
  const pastConnections = connectionsResult.data.filter((r) => r.status !== "pending");
  const notifications = inboxResult.data.filter(
    (msg) => !msg.reference_type || msg.reference_type !== "connection_request" || !["connection_request"].includes(msg.type)
  );

  const isEmpty = pendingRequests.length === 0 && notifications.length === 0 && pastConnections.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
        <p className="mt-1 text-slate-500">Connection requests and notifications</p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Inbox}
          title="Your inbox is empty"
          description="When families send connection requests or you receive notifications, they'll appear here."
        />
      ) : (
        <NannyInboxClient
          pendingRequests={pendingRequests}
          notifications={notifications}
          pastConnections={pastConnections}
        />
      )}
    </div>
  );
}
