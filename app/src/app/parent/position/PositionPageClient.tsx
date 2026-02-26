"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PositionDetailView } from "../request/renderers/PositionDetailView";
import { PositionWithChildren, closePosition } from "@/lib/actions/parent";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { TypeformFormData } from "../request/questions";

interface PositionPageClientProps {
  position: PositionWithChildren | null;
}

export function PositionPageClient({ position }: PositionPageClientProps) {
  const router = useRouter();
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleClosePosition = async () => {
    if (!position) return;
    setClosing(true);
    const result = await closePosition(position.id);
    setClosing(false);
    if (result.success) {
      setShowCloseConfirm(false);
      router.refresh();
    }
  };

  if (!position) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No active childcare position"
        description="Create a childcare position to describe your family's needs. Our matching system will help connect you with qualified nannies."
        actionLabel="Create a Childcare Position"
        actionHref="/parent/request"
      />
    );
  }

  // Extract form_data from details JSONB
  const details = position.details as Record<string, unknown> | null;
  const formData = (details?.form_data ?? {}) as Partial<TypeformFormData>;

  // If no form_data stored (old position), show fallback
  if (!details?.form_data) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Position needs updating"
        description="Please recreate your childcare position using the new form to enable editing."
        actionLabel="Recreate Position"
        actionHref="/parent/request"
      />
    );
  }

  return (
    <>
      <PositionDetailView
        initialData={formData}
        onClosePosition={() => setShowCloseConfirm(true)}
      />

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Close Position?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                Are you sure you want to close this childcare position? This
                will:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                <li>Remove your position from matching</li>
                <li>Cancel any pending interview requests</li>
                <li>Allow you to create a new position</li>
              </ul>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCloseConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleClosePosition}
                  disabled={closing}
                >
                  {closing ? "Closing..." : "Close Position"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
