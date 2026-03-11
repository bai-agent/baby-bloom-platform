'use client';

import { useEffect } from 'react';
import { ClipboardList, Filter, Users, Baby } from 'lucide-react';
import { HubTile } from '@/components/hub/HubTile';
import { VerificationBanner } from '@/components/hub/VerificationBanner';
import { trackEvent } from '@/lib/analytics/trackEvent';

interface ParentHubClientProps {
  firstName: string;
  isVerified: boolean;
  hasPosition: boolean;
  connectionsCount: number;
  bsrCount: number;
}

export function ParentHubClient({
  firstName,
  isVerified,
  hasPosition,
  connectionsCount,
  bsrCount,
}: ParentHubClientProps) {
  useEffect(() => {
    trackEvent({ event_name: 'parent_hub_viewed', user_role: 'parent' });
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <h1 className="text-2xl font-bold text-slate-900">
        Welcome, {firstName}!
      </h1>

      {/* Verification Banner */}
      {!isVerified && (
        <VerificationBanner
          role="parent"
          message="Verify your identity to connect with nannies and book babysitters"
          submessage="Quick verification with your passport or driver's license"
        />
      )}

      {/* Tiles Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Position Tile */}
        <HubTile
          title={hasPosition ? 'My Position' : 'Find Your Perfect Nanny'}
          icon={<ClipboardList className="h-5 w-5" />}
          status={hasPosition ? 'active' : 'empty'}
          emptyMessage="Tell us about your family's needs and we'll match you with the perfect nanny."
          preview={
            <p className="text-sm text-slate-600">
              Your position is live and visible to nannies
            </p>
          }
          primaryCTA={
            hasPosition
              ? { label: 'View Position', href: '/parent/position', trackingEvent: 'position_tile_clicked' }
              : { label: 'Get Started', href: '/parent/request', trackingEvent: 'position_tile_empty_cta_clicked' }
          }
        />

        {/* Matchmaking Tile */}
        <HubTile
          title={hasPosition ? 'Your Matches' : 'Matchmaking'}
          icon={<Filter className="h-5 w-5" />}
          status={hasPosition ? 'active' : 'locked'}
          lockedMessage="Create a position first to get matched with qualified nannies."
          preview={
            <p className="text-sm text-slate-600">
              View your matched nannies and shortlist favorites
            </p>
          }
          primaryCTA={
            hasPosition
              ? { label: 'View Matches', href: '/parent/matches', trackingEvent: 'matchmaking_tile_clicked' }
              : { label: 'Create Position', href: '/parent/request', trackingEvent: 'matchmaking_tile_locked_cta_clicked' }
          }
        />

        {/* Connections Tile */}
        <HubTile
          title="Connections"
          icon={<Users className="h-5 w-5" />}
          status={connectionsCount > 0 ? 'active' : 'empty'}
          emptyMessage="Once you connect with nannies, your conversations will appear here."
          preview={
            <p className="text-sm text-slate-600">
              <span className="text-2xl font-bold text-violet-600">{connectionsCount}</span>{' '}
              active connection{connectionsCount !== 1 ? 's' : ''}
            </p>
          }
          primaryCTA={
            connectionsCount > 0
              ? { label: 'View Connections', href: '/parent/position', trackingEvent: 'connections_tile_clicked' }
              : { label: 'Browse Nannies', href: '/parent/browse', trackingEvent: 'connections_tile_empty_cta_clicked' }
          }
        />

        {/* Babysitting Tile */}
        <HubTile
          title="Book a Babysitter"
          icon={<Baby className="h-5 w-5" />}
          status="active"
          preview={
            bsrCount > 0 ? (
              <p className="text-sm text-slate-600">
                <span className="text-2xl font-bold text-violet-600">{bsrCount}</span>{' '}
                active request{bsrCount !== 1 ? 's' : ''}
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                Find a trusted babysitter for a one-time booking
              </p>
            )
          }
          primaryCTA={{ label: 'Find a Babysitter', href: '/parent/babysitting', trackingEvent: 'babysitting_tile_clicked' }}
        />
      </div>
    </div>
  );
}
