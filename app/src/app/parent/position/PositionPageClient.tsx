"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PositionForm } from "@/components/forms/PositionForm";
import { PositionWithChildren, closePosition } from "@/lib/actions/parent";
import { Edit, X, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ClipboardList } from "lucide-react";

interface PositionPageClientProps {
  position: PositionWithChildren | null;
}

export function PositionPageClient({ position }: PositionPageClientProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
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

  if (!position && !showForm) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No active position"
        description="Create a nanny position to describe your family's needs. Our matching system will help connect you with qualified nannies."
        actionLabel="Create Position"
        onAction={() => setShowForm(true)}
      />
    );
  }

  if (showForm) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{position ? "Edit Position" : "Create Position"}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PositionForm
            initialData={position}
            onSuccess={() => {
              setShowForm(false);
              router.refresh();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  // Position exists - show edit/close buttons
  return (
    <>
      <div className="flex gap-3">
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit Position
        </Button>
        <Button
          onClick={() => setShowCloseConfirm(true)}
          variant="outline"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <X className="mr-2 h-4 w-4" />
          Close Position
        </Button>
      </div>

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
                Are you sure you want to close this position? This will:
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
