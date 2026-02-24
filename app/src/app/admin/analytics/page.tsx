import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { BarChart3, Users, Calendar, TrendingUp, Activity, Briefcase, UserCheck } from "lucide-react";

async function getAnalyticsData() {
  const supabase = createClient();

  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch all analytics data in parallel
  const [
    // Total counts
    totalUsersResult,
    totalNanniesResult,
    totalParentsResult,
    totalAdminsResult,

    // Signup trends
    signupsThisWeekResult,
    signupsLastWeekResult,

    // Verification stats
    pendingVerificationsResult,
    tier2NanniesResult,
    tier3NanniesResult,

    // Activity stats
    activeNanniesResult,
    inactiveNanniesResult,
    activeParentsResult,

    // Placement stats
    totalPlacementsResult,
    activePlacementsResult,
    endedPlacementsResult,

    // Interview stats this month
    interviewsThisMonthResult,

    // Nanny positions
    activePositionsResult,
  ] = await Promise.all([
    // Total counts
    supabase.from('user_roles').select('*', { count: 'exact', head: true }),
    supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'nanny'),
    supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'parent'),
    supabase.from('user_roles').select('*', { count: 'exact', head: true }).in('role', ['admin', 'super_admin']),

    // Signup trends
    supabase.from('user_roles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo.toISOString()),
    supabase.from('user_roles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', oneWeekAgo.toISOString()),

    // Verification stats
    supabase.from('verifications')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending'),
    supabase.from('nannies')
      .select('*', { count: 'exact', head: true })
      .eq('wwcc_verified', true)
      .eq('identity_verified', true),
    supabase.from('nannies')
      .select('*', { count: 'exact', head: true })
      .eq('visible_in_bsr', true),

    // Activity stats
    supabase.from('nannies')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase.from('nannies')
      .select('*', { count: 'exact', head: true })
      .in('status', ['inactive', 'deactivated']),
    supabase.from('parents')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),

    // Placement stats
    supabase.from('nanny_placements').select('*', { count: 'exact', head: true }),
    supabase.from('nanny_placements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase.from('nanny_placements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ended'),

    // Interview stats
    supabase.from('interview_requests')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thisMonthStart.toISOString()),

    // Nanny positions
    supabase.from('nanny_positions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
  ]);

  // Calculate trends
  const thisWeekSignups = signupsThisWeekResult.count ?? 0;
  const lastWeekSignups = signupsLastWeekResult.count ?? 0;
  const signupTrend = lastWeekSignups > 0
    ? Math.round(((thisWeekSignups - lastWeekSignups) / lastWeekSignups) * 100)
    : thisWeekSignups > 0 ? 100 : 0;

  // Calculate verification completion rate
  const totalNannies = totalNanniesResult.count ?? 0;
  const tier2Nannies = tier2NanniesResult.count ?? 0;
  const verificationRate = totalNannies > 0
    ? Math.round((tier2Nannies / totalNannies) * 100)
    : 0;

  return {
    // Totals
    totalUsers: totalUsersResult.count ?? 0,
    totalNannies,
    totalParents: totalParentsResult.count ?? 0,
    totalAdmins: totalAdminsResult.count ?? 0,

    // Signups
    signupsThisWeek: thisWeekSignups,
    signupsLastWeek: lastWeekSignups,
    signupTrend,
    signupTrendIsPositive: signupTrend >= 0,

    // Verifications
    pendingVerifications: pendingVerificationsResult.count ?? 0,
    tier2Nannies,
    tier3Nannies: tier3NanniesResult.count ?? 0,
    verificationRate,

    // Activity
    activeNannies: activeNanniesResult.count ?? 0,
    inactiveNannies: inactiveNanniesResult.count ?? 0,
    activeParents: activeParentsResult.count ?? 0,

    // Placements
    totalPlacements: totalPlacementsResult.count ?? 0,
    activePlacements: activePlacementsResult.count ?? 0,
    endedPlacements: endedPlacementsResult.count ?? 0,

    // Interviews
    interviewsThisMonth: interviewsThisMonthResult.count ?? 0,

    // Positions
    activePositions: activePositionsResult.count ?? 0,
  };
}

export default async function AdminAnalyticsPage() {
  const data = await getAnalyticsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-slate-500">
          Platform metrics and insights
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Users}
          value={data.totalUsers}
          label="Total Users"
          iconColor="text-violet-500"
          iconBgColor="bg-violet-100"
        />
        <StatsCard
          icon={Calendar}
          value={data.interviewsThisMonth}
          label="Interviews This Month"
          iconColor="text-blue-500"
          iconBgColor="bg-blue-100"
        />
        <StatsCard
          icon={TrendingUp}
          value={data.totalPlacements}
          label="Total Placements"
          iconColor="text-green-500"
          iconBgColor="bg-green-100"
        />
        <StatsCard
          icon={Briefcase}
          value={data.activePositions}
          label="Open Positions"
          iconColor="text-yellow-500"
          iconBgColor="bg-yellow-100"
        />
      </div>

      {/* Signup Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-500" />
            Signup Trends
          </CardTitle>
          <CardDescription>
            Weekly comparison of new user registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">This Week</p>
              <p className="text-3xl font-bold text-slate-900">{data.signupsThisWeek}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Last Week</p>
              <p className="text-3xl font-bold text-slate-900">{data.signupsLastWeek}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Week-over-Week</p>
              <p className={`text-3xl font-bold ${data.signupTrendIsPositive ? 'text-green-600' : 'text-red-600'}`}>
                {data.signupTrendIsPositive ? '+' : ''}{data.signupTrend}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* User Growth Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-violet-500" />
              User Growth
            </CardTitle>
            <CardDescription>
              New user registrations over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg bg-slate-50">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm text-slate-500">Chart coming soon</p>
                <p className="text-xs text-slate-400">
                  User growth trends will appear here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-violet-500" />
              Platform Activity
            </CardTitle>
            <CardDescription>
              Daily active users and interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg bg-slate-50">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm text-slate-500">Chart coming soon</p>
                <p className="text-xs text-slate-400">
                  Activity metrics will appear here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-violet-500" />
              Nanny Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Nannies</span>
              <span className="font-medium">{data.totalNannies}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Active Nannies</span>
              <span className="font-medium">{data.activeNannies}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Tier 2 Verified</span>
              <span className="font-medium">{data.tier2Nannies}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Tier 3 Verified</span>
              <span className="font-medium">{data.tier3Nannies}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Verification Rate</span>
              <span className="font-medium">{data.verificationRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Parent Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Parents</span>
              <span className="font-medium">{data.totalParents}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Active Parents</span>
              <span className="font-medium">{data.activeParents}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Open Positions</span>
              <span className="font-medium">{data.activePositions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Interviews Requested</span>
              <span className="font-medium">{data.interviewsThisMonth}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Avg. Hire Time</span>
              <span className="font-medium text-slate-400">-</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-green-500" />
              Matching Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Total Placements</span>
              <span className="font-medium">{data.totalPlacements}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Active Placements</span>
              <span className="font-medium">{data.activePlacements}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Ended Placements</span>
              <span className="font-medium">{data.endedPlacements}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Pending Verifications</span>
              <span className="font-medium">{data.pendingVerifications}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Avg. Match Score</span>
              <span className="font-medium text-slate-400">-</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon */}
      <Card className="border-violet-200 bg-violet-50">
        <CardHeader>
          <CardTitle className="text-violet-900">Advanced Analytics Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-violet-800 sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Conversion funnel analysis
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Cohort retention reports
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Geographic heat maps
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Revenue forecasting
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
