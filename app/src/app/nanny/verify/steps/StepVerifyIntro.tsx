"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StepProps } from "../IDVerificationFunnel";

export function StepVerifyIntro({ goNext }: StepProps) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-slate-800">
          Verify Your Identity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pb-8">
        <p className="text-slate-600">
          Before you begin please have the following items ready:
        </p>

        <ul className="space-y-4 text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full bg-violet-500 mt-2" />
            <span>
              <span className="font-medium">Current valid passport</span> — photo of the information page; must be clear, colour, with all corners visible.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full bg-violet-500 mt-2" />
            <span>
              <span className="font-medium">Recent passport-style photo</span> — clear colour headshot; no hats, sunglasses, or face coverings.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-0.5 flex-shrink-0 w-2 h-2 rounded-full bg-violet-500 mt-2" />
            <div className="space-y-2">
              <span className="font-medium">One WWCC verification item</span> — choose one of the following:
              <ul className="mt-2 space-y-1.5 pl-1">
                <li className="flex gap-2 text-slate-600">
                  <span className="text-violet-400 font-bold">–</span>
                  <span>
                    <span className="font-medium text-slate-700">WWCC Grant Email PDF</span> from{" "}
                    <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      WWCCNotification@ocg.nsw.gov.au
                    </span>
                  </span>
                </li>
                <li className="flex gap-2 text-slate-600">
                  <span className="text-violet-400 font-bold">–</span>
                  <span>
                    <span className="font-medium text-slate-700">Service NSW app WWCC screenshot</span> from within your Service NSW wallet
                  </span>
                </li>
                <li className="flex gap-2 text-slate-600">
                  <span className="text-violet-400 font-bold">–</span>
                  <span>
                    <span className="font-medium text-slate-700">WWCC credentials</span> — your WWCC number (not application number)
                  </span>
                </li>
              </ul>
            </div>
          </li>
        </ul>

        <div className="pt-2 flex justify-center">
          <Button
            onClick={goNext}
            className="bg-violet-600 hover:bg-violet-700 text-white px-10 py-2.5 text-base font-medium rounded-lg"
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
