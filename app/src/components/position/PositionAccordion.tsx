"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Briefcase,
  Baby,
} from "lucide-react";

export interface PositionAccordionData {
  scheduleType: string | null;
  hoursPerWeek: number | null;
  daysRequired: string[] | null;
  schedule: Record<string, string[]> | null;
  levelOfSupport: string[] | null;
  hourlyRate: number | null;
  children: { ageMonths: number; gender: string | null }[];
  urgency: string | null;
  startDate: string | null;
  placementLength: string | null;
  reasonForNanny: string[] | null;
  languagePreference: string | null;
  qualificationRequirement: string | null;
  certificateRequirements: string[] | null;
  vaccinationRequired: boolean | null;
  driversLicenseRequired: boolean | null;
  carRequired: boolean | null;
  comfortableWithPetsRequired: boolean | null;
  nonSmokerRequired: boolean | null;
  otherRequirements: string | null;
  suburb: string | null;
  description: string | null;
}

function ageLabel(months: number): string {
  if (months < 24) return `${months}mths`;
  return `${Math.floor(months / 12)}yrs`;
}

function genderLabel(gender: string | null): string | null {
  if (!gender || gender === "Rather Not Say") return null;
  if (gender === "Male") return "Boy";
  if (gender === "Female") return "Girl";
  return null;
}

export function PositionAccordion({ position }: { position: PositionAccordionData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200">
      {/* Header — always visible, click to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3"
      >
        <p className="text-xs font-medium text-slate-600 flex items-center gap-1">
          <Briefcase className="h-3 w-3" /> Position Details
        </p>
        <span className="text-xs text-violet-600 flex items-center gap-1">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-200 pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {position.hoursPerWeek && (
              <div>
                <span className="text-slate-400">Hours</span>
                <p className="font-medium text-slate-700">{position.hoursPerWeek}h/week</p>
              </div>
            )}
            {position.hourlyRate && (
              <div>
                <span className="text-slate-400">Rate</span>
                <p className="font-medium text-slate-700">${position.hourlyRate}/hr</p>
              </div>
            )}
            {position.scheduleType && (
              <div className="col-span-2">
                <span className="text-slate-400">Schedule</span>
                <p className="font-medium text-slate-700 capitalize">{position.scheduleType}</p>
              </div>
            )}
            {position.schedule && Object.keys(position.schedule).length > 0 ? (
              <div className="col-span-2">
                <span className="text-slate-400">Days</span>
                <div className="space-y-0.5 mt-0.5">
                  {Object.entries(position.schedule).map(([day, brackets]) => (
                    <p key={day} className="font-medium text-slate-700 capitalize">
                      {day}: <span className="font-normal text-slate-500 capitalize">{brackets.join(", ")}</span>
                    </p>
                  ))}
                </div>
              </div>
            ) : position.daysRequired && position.daysRequired.length > 0 ? (
              <div className="col-span-2">
                <span className="text-slate-400">Days</span>
                <p className="font-medium text-slate-700">{position.daysRequired.join(", ")}</p>
              </div>
            ) : null}
            {position.children.length > 0 && (
              <div className="col-span-2">
                <span className="text-slate-400 flex items-center gap-1"><Baby className="h-3 w-3" /> Children</span>
                <div className="space-y-0.5 mt-0.5">
                  {position.children.map((c, i) => {
                    const g = genderLabel(c.gender);
                    return (
                      <p key={i} className="font-medium text-slate-700">
                        {g ?? "Child"} <span className="font-normal text-slate-500">{ageLabel(c.ageMonths)}</span>
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {position.description && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Description</p>
              <p className="text-xs text-slate-700">{position.description}</p>
            </div>
          )}
          {position.urgency && (
            <div>
              <p className="text-xs text-slate-400">Start</p>
              <p className="text-xs text-slate-700 font-medium">{position.urgency}{position.startDate ? ` — ${position.startDate}` : ""}</p>
            </div>
          )}
          {position.placementLength && (
            <div>
              <p className="text-xs text-slate-400">Duration</p>
              <p className="text-xs text-slate-700 font-medium">{position.placementLength}</p>
            </div>
          )}
          {position.levelOfSupport && position.levelOfSupport.length > 0 && (
            <div>
              <p className="text-xs text-slate-400">Support Level</p>
              <p className="text-xs text-slate-700 font-medium">{position.levelOfSupport.join(", ")}</p>
            </div>
          )}
          {position.reasonForNanny && position.reasonForNanny.length > 0 && (
            <div>
              <p className="text-xs text-slate-400">Reason for Nanny</p>
              <p className="text-xs text-slate-700 font-medium">{position.reasonForNanny.join(", ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
