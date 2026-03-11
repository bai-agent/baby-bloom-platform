'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/dashboard/UserAvatar';
import { HubTile } from '@/components/hub/HubTile';
import { VerificationBanner } from '@/components/hub/VerificationBanner';
import { trackEvent } from '@/lib/analytics/trackEvent';

interface NannyHubClientProps {
  firstName: string;
  lastName: string;
  profilePictureUrl: string | null;
  suburb: string;
  verificationLevel: number;
  visibleInBsr: boolean;
  aiHeadline: string | null;
  aiParentPitch: string | null;
  shareStatus: number;
  connectionsCount: number;
  bsrCount: number;
}

export function NannyHubClient({
  firstName,
  lastName,
  profilePictureUrl,
  suburb,
  verificationLevel,
  visibleInBsr,
  aiHeadline,
  aiParentPitch,
  shareStatus,
  connectionsCount,
  bsrCount,
}: NannyHubClientProps) {
  const fullName = `${firstName} ${lastName}`.trim();
  const isVerified = verificationLevel >= 3;
  const isShareCompleted = visibleInBsr || shareStatus >= 50;

  useEffect(() => {
    trackEvent({ event_name: 'nanny_hub_viewed', user_role: 'nanny' });
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <h1 className="text-2xl font-bold text-slate-900">
        Welcome back, {firstName}!
      </h1>

      {/* Verification Banner */}
      {!isVerified && (
        <VerificationBanner
          role="nanny"
          message="Complete your verification to start receiving connections and appearing in matchmaking"
          submessage="Upload your WWCC and passport to get verified"
        />
      )}

      {/* Hero Tile — Profile Summary */}
      <Card className="bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <UserAvatar
              name={fullName}
              imageUrl={profilePictureUrl || undefined}
              className="h-16 w-16"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-slate-900">{fullName}</h2>
              {suburb && (
                <p className="text-sm text-slate-500">{suburb}</p>
              )}
              {aiHeadline && (
                <p className="mt-1 text-sm font-medium text-violet-600">{aiHeadline}</p>
              )}
              {aiParentPitch && (
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{aiParentPitch}</p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Button asChild className="bg-violet-600 hover:bg-violet-700 text-white">
              <Link
                href="/nanny/profile"
                onClick={() => trackEvent({ event_name: 'hero_tile_profile_clicked', user_role: 'nanny' })}
              >
                View &amp; Edit Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tiles Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Positions Tile */}
        <HubTile
          title="Your Positions"
          icon={<Award className="h-5 w-5" />}
          status={isVerified ? (connectionsCount > 0 ? 'active' : 'empty') : 'locked'}
          lockedMessage="Complete verification to start receiving position connections from families."
          emptyMessage="No active positions yet. Once families match with you, they'll appear here."
          preview={
            <p className="text-sm text-slate-600">
              <span className="text-2xl font-bold text-violet-600">{connectionsCount}</span>{' '}
              active connection{connectionsCount !== 1 ? 's' : ''}
            </p>
          }
          primaryCTA={
            isVerified
              ? { label: 'View Positions', href: '/nanny/positions', trackingEvent: 'positions_tile_clicked' }
              : { label: 'Complete Verification', href: '/nanny/verification', trackingEvent: 'positions_tile_locked_cta_clicked' }
          }
        />

        {/* Babysitting Tile */}
        <HubTile
          title="Babysitting"
          icon={<Briefcase className="h-5 w-5" />}
          status={isShareCompleted ? (bsrCount > 0 ? 'active' : 'empty') : 'locked'}
          lockedMessage="Share your profile to unlock babysitting job notifications."
          emptyMessage="No babysitting notifications yet. Jobs from nearby families will appear here."
          preview={
            <p className="text-sm text-slate-600">
              <span className="text-2xl font-bold text-violet-600">{bsrCount}</span>{' '}
              new notification{bsrCount !== 1 ? 's' : ''}
            </p>
          }
          primaryCTA={
            isShareCompleted
              ? { label: 'View Babysitting', href: '/nanny/babysitting', trackingEvent: 'babysitting_tile_clicked' }
              : { label: 'Unlock Babysitting', href: '/nanny/share', trackingEvent: 'babysitting_tile_locked_cta_clicked' }
          }
        />
      </div>
    </div>
  );
}
