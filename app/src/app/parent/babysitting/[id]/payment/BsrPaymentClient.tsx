'use client';

import { Button } from '@/components/ui/button';
import { Gift, MapPin, Calendar, Baby, DollarSign } from 'lucide-react';
import type { PublicBsrProfile } from '@/lib/actions/babysitting';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

function ageDisplay(months: number): string {
  if (months < 12) return `${months}mths`;
  const years = Math.floor(months / 12);
  return `${years}yr`;
}

export default function BsrPaymentClient({ bsr }: { bsr: PublicBsrProfile }) {
  const estimatedTotal = bsr.hourly_rate && bsr.estimated_hours
    ? Math.round(bsr.hourly_rate * bsr.estimated_hours)
    : 0;

  const childrenSummary = bsr.children.map(c => {
    const g = c.gender?.toLowerCase();
    const gender = g === 'male' || g === 'boy' ? 'boy' : g === 'female' || g === 'girl' ? 'girl' : 'child';
    return `${gender} (${ageDisplay(c.ageMonths)})`;
  }).join(', ');

  return (
    <div className="mx-auto max-w-lg space-y-4 py-4 px-1">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-800">Your Babysitting Request</h1>
        <p className="text-xs text-slate-500 mt-0.5">Review your request and choose how to proceed</p>
      </div>

      {/* Order Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Job Details */}
        <div className="px-4 py-3 space-y-1.5">
          <h2 className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Job Summary</h2>

          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
            <span>{bsr.suburb}</span>
          </div>

          {bsr.time_slots.map((slot, i) => {
            const [sh, sm] = slot.start_time.split(':').map(Number);
            const [eh, em] = slot.end_time.split(':').map(Number);
            const mins = (eh * 60 + em) - (sh * 60 + sm);
            const hrs = Math.round(mins / 60 * 10) / 10;
            return (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <Calendar className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                <span>{formatDate(slot.slot_date)}, {formatTime(slot.start_time)} – {formatTime(slot.end_time)} ({hrs}hrs)</span>
              </div>
            );
          })}

          <div className="flex items-start gap-2 text-sm text-slate-600">
            <Baby className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
            <span>{childrenSummary}</span>
          </div>

          {bsr.hourly_rate && (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <DollarSign className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
              <span>${bsr.hourly_rate}/hr {bsr.estimated_hours ? `· ${bsr.estimated_hours}hrs total` : ''}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* Pricing */}
        <div className="px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Est. Babysitter fee</span>
            <span className="text-slate-400">${estimatedTotal}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>Placement fee</span>
            <span>$50.00</span>
          </div>
          <div className="border-t border-dashed border-slate-200 pt-1.5 mt-1.5">
            <div className="flex justify-between font-semibold text-slate-800">
              <span>Total fee</span>
              <span>$50.00</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            You pay the babysitter directly. The placement fee is for sourcing your babysitter.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5">
        <Button
          disabled
          className="w-full bg-slate-200 text-slate-400 cursor-not-allowed h-11 text-sm"
        >
          Pay Now
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-slate-50 px-3 text-slate-400 uppercase tracking-wider">or</span>
          </div>
        </div>

        <Button
          onClick={() => {
            window.location.href = `/parent/babysitting/${bsr.id}/share`;
          }}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11 text-sm font-semibold"
        >
          <Gift className="mr-2 h-4 w-4" />
          Claim your FREE placement!
        </Button>
      </div>
    </div>
  );
}
