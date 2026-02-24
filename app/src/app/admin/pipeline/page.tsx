import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter, Users, UserCheck, ShieldCheck, Star, Briefcase, FileText, MessageSquare } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface PipelineStage {
  stage: string;
  label: string;
  icon: LucideIcon;
  count: number;
  color: string;
}

// Define nanny stages in order
const nannyStageDefinitions = [
  { stage: 'nanny_signup', label: 'Signed Up', icon: Users, color: 'bg-slate-100 text-slate-600' },
  { stage: 'nanny_profile_created', label: 'Profile Created', icon: UserCheck, color: 'bg-blue-100 text-blue-600' },
  { stage: 'nanny_verification_started', label: 'Verification Started', icon: FileText, color: 'bg-yellow-100 text-yellow-600' },
  { stage: 'nanny_tier2_achieved', label: 'Tier 2 Achieved', icon: ShieldCheck, color: 'bg-violet-100 text-violet-600' },
  { stage: 'nanny_tier3_achieved', label: 'Tier 3 Achieved', icon: Star, color: 'bg-purple-100 text-purple-600' },
  { stage: 'nanny_first_interview_received', label: 'First Interview', icon: MessageSquare, color: 'bg-indigo-100 text-indigo-600' },
  { stage: 'nanny_first_hire', label: 'First Hire', icon: Briefcase, color: 'bg-green-100 text-green-600' },
];

// Define parent stages in order
const parentStageDefinitions = [
  { stage: 'parent_signup', label: 'Signed Up', icon: Users, color: 'bg-slate-100 text-slate-600' },
  { stage: 'parent_browsing', label: 'Browsing', icon: UserCheck, color: 'bg-blue-100 text-blue-600' },
  { stage: 'parent_position_created', label: 'Position Created', icon: FileText, color: 'bg-yellow-100 text-yellow-600' },
  { stage: 'parent_first_interview_requested', label: 'First Interview', icon: MessageSquare, color: 'bg-violet-100 text-violet-600' },
  { stage: 'parent_first_hire', label: 'First Hire', icon: Briefcase, color: 'bg-green-100 text-green-600' },
];

async function getPipelineData() {
  const supabase = createClient();

  // Get all user progress entries grouped by stage
  const { data: progressData, error } = await supabase
    .from('user_progress')
    .select('stage');

  if (error || !progressData) {
    return { nannyCounts: {}, parentCounts: {} };
  }

  // Count occurrences of each stage
  const stageCounts: Record<string, number> = {};
  progressData.forEach((row) => {
    const stage = row.stage;
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
  });

  // Separate nanny and parent counts
  const nannyCounts: Record<string, number> = {};
  const parentCounts: Record<string, number> = {};

  Object.entries(stageCounts).forEach(([stage, count]) => {
    if (stage.startsWith('nanny_')) {
      nannyCounts[stage] = count;
    } else if (stage.startsWith('parent_')) {
      parentCounts[stage] = count;
    }
  });

  return { nannyCounts, parentCounts };
}

function buildPipelineStages(
  definitions: typeof nannyStageDefinitions,
  counts: Record<string, number>
): PipelineStage[] {
  return definitions.map((def) => ({
    ...def,
    count: counts[def.stage] || 0,
  }));
}

export default async function AdminPipelinePage() {
  const { nannyCounts, parentCounts } = await getPipelineData();

  const nannyStages = buildPipelineStages(nannyStageDefinitions, nannyCounts);
  const parentStages = buildPipelineStages(parentStageDefinitions, parentCounts);

  // Calculate totals
  const totalNannies = nannyStages[0]?.count || 0;
  const totalParents = parentStages[0]?.count || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Pipeline</h1>
        <p className="mt-1 text-slate-500">
          Track user progression through verification stages
        </p>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-violet-500" />
            Conversion Funnel Overview
          </CardTitle>
          <CardDescription>
            User counts at each stage of the pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Nanny Funnel */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700">Nanny Pipeline</h3>
              {nannyStages.map((stage, index) => {
                const Icon = stage.icon;
                const widthPercent = totalNannies > 0
                  ? Math.max((stage.count / totalNannies) * 100, 5)
                  : 100 - (index * 12);
                return (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-slate-500" />
                        <span className="font-medium">{stage.label}</span>
                      </div>
                      <span className="font-bold text-slate-700">{stage.count}</span>
                    </div>
                    <div className="h-6 rounded-md bg-slate-100">
                      <div
                        className={`h-full rounded-md ${stage.color} flex items-center justify-center text-xs font-medium transition-all`}
                        style={{ width: `${widthPercent}%` }}
                      >
                        {stage.count > 0 && stage.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Parent Funnel */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700">Parent Pipeline</h3>
              {parentStages.map((stage, index) => {
                const Icon = stage.icon;
                const widthPercent = totalParents > 0
                  ? Math.max((stage.count / totalParents) * 100, 5)
                  : 100 - (index * 15);
                return (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-slate-500" />
                        <span className="font-medium">{stage.label}</span>
                      </div>
                      <span className="font-bold text-slate-700">{stage.count}</span>
                    </div>
                    <div className="h-6 rounded-md bg-slate-100">
                      <div
                        className={`h-full rounded-md ${stage.color} flex items-center justify-center text-xs font-medium transition-all`}
                        style={{ width: `${widthPercent}%` }}
                      >
                        {stage.count > 0 && stage.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nanny Pipeline Details</CardTitle>
            <CardDescription>
              Nanny progression through verification tiers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nannyStages.map((stage, index) => {
                const Icon = stage.icon;
                const prevCount = index > 0 ? nannyStages[index - 1].count : null;
                const conversionRate = prevCount && prevCount > 0
                  ? Math.round((stage.count / prevCount) * 100)
                  : null;

                return (
                  <div
                    key={stage.stage}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${stage.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-medium">{stage.label}</span>
                        {conversionRate !== null && (
                          <p className="text-xs text-slate-500">
                            {conversionRate}% from previous
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">
                      {stage.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parent Pipeline Details</CardTitle>
            <CardDescription>
              Parent progression through signup and hiring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {parentStages.map((stage, index) => {
                const Icon = stage.icon;
                const prevCount = index > 0 ? parentStages[index - 1].count : null;
                const conversionRate = prevCount && prevCount > 0
                  ? Math.round((stage.count / prevCount) * 100)
                  : null;

                return (
                  <div
                    key={stage.stage}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${stage.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-medium">{stage.label}</span>
                        {conversionRate !== null && (
                          <p className="text-xs text-slate-500">
                            {conversionRate}% from previous
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">
                      {stage.count}
                    </span>
                  </div>
                );
              })}
              <div className="rounded-lg border border-dashed bg-slate-50 p-3 text-center text-sm text-slate-500">
                Parents don&apos;t require Tier 2/3 verification
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Summary */}
      <Card className="border-violet-200 bg-violet-50">
        <CardHeader>
          <CardTitle className="text-violet-900">Conversion Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Nannies at Signup</p>
              <p className="text-2xl font-bold text-slate-900">{totalNannies}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Nannies at Tier 2</p>
              <p className="text-2xl font-bold text-slate-900">
                {nannyStages.find(s => s.stage === 'nanny_tier2_achieved')?.count || 0}
              </p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Parents at Signup</p>
              <p className="text-2xl font-bold text-slate-900">{totalParents}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Parents Hired</p>
              <p className="text-2xl font-bold text-slate-900">
                {parentStages.find(s => s.stage === 'parent_first_hire')?.count || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
