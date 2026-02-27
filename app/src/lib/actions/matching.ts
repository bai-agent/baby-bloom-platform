'use server';

import { getParentId, getPosition } from './parent';
import { runMatchmaking } from '@/lib/matching/engine';
import type { MatchResult } from '@/lib/matching/types';

export interface MatchesResponse {
  data: {
    matches: MatchResult[];
    stats: {
      totalEligible: number;
      returned: number;
    };
  } | null;
  error: string | null;
}

export async function getMatchesForPosition(): Promise<MatchesResponse> {
  const parentId = await getParentId();
  if (!parentId) {
    return { data: null, error: 'Not authenticated as parent' };
  }

  // Get active position
  const { data: position, error: positionError } = await getPosition();
  if (positionError || !position) {
    return { data: null, error: positionError || 'No active position found' };
  }

  // Run matching
  const { matches, totalEligible } = await runMatchmaking(position.id);

  return {
    data: {
      matches,
      stats: {
        totalEligible,
        returned: matches.length,
      },
    },
    error: null,
  };
}
