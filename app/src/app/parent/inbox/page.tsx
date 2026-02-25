import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Inbox, AlertCircle } from "lucide-react";
import { getInboxMessages } from "@/lib/actions/inbox";
import { ParentInboxClient } from "./ParentInboxClient";

export default async function ParentInboxPage() {
  const { data: messages, error } = await getInboxMessages();

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
          <p className="mt-1 text-slate-500">Notifications and updates</p>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
        <p className="mt-1 text-slate-500">Notifications and updates</p>
      </div>

      {messages.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Your inbox is empty"
          description="When you receive notifications about connections, verifications, or other updates, they'll appear here."
        />
      ) : (
        <ParentInboxClient messages={messages} />
      )}
    </div>
  );
}
