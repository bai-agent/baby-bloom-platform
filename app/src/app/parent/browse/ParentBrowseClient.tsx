"use client";

import { useState } from "react";
import { NannyCard, NannyCardData, EmptyNannyState } from "@/components/NannyCard";
import { InterviewRequestModal } from "@/components/InterviewRequestModal";

interface ParentBrowseClientProps {
  nannies: NannyCardData[];
}

export function ParentBrowseClient({ nannies }: ParentBrowseClientProps) {
  const [selectedNannyId, setSelectedNannyId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedNanny = nannies.find((n) => n.id === selectedNannyId);

  const handleRequestInterview = (nannyId: string) => {
    setSelectedNannyId(nannyId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNannyId(null);
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {nannies.length > 0 ? (
          nannies.map((nanny) => (
            <NannyCard
              key={nanny.id}
              nanny={nanny}
              showRequestButton
              onRequestInterview={handleRequestInterview}
            />
          ))
        ) : (
          <EmptyNannyState />
        )}
      </div>

      {selectedNanny && (
        <InterviewRequestModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          nanny={selectedNanny}
        />
      )}
    </>
  );
}
