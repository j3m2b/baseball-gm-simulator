'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  getSeasonSummary,
  advanceToNextSeason,
  type SeasonSummaryData,
  type AdvanceSeasonResult,
} from '@/lib/actions/game';
import { formatCurrency } from '@/lib/utils/format';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface SeasonReviewProps {
  gameId: string;
  onAdvance?: () => void;
}

export default function SeasonReview({ gameId, onAdvance }: SeasonReviewProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<SeasonSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [advanceResult, setAdvanceResult] = useState<AdvanceSeasonResult | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getSeasonSummary(gameId);
      if (result.success && result.summary) {
        setSummary(result.summary);
      }
    } catch (err) {
      toast.error('Failed to load season summary');
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleAdvanceToNextSeason = async () => {
    if (isAdvancing) return;

    setIsAdvancing(true);
    try {
      const result = await advanceToNextSeason(gameId);

      if (result.success) {
        setAdvanceResult(result);
        toast.success(`Welcome to Year ${result.newYear}!`, {
          description: `Draft position: #${result.offseasonSummary?.playerDraftPosition}`,
          duration: 5000,
        });

        // Notify parent and refresh
        onAdvance?.();
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to advance season');
      }
    } catch (err) {
      toast.error('Failed to advance to next season');
    } finally {
      setIsAdvancing(false);
    }
  };

  function formatTier(tier: string) {
    const tiers: Record<string, string> = {
      LOW_A: 'Low-A',
      HIGH_A: 'High-A',
      DOUBLE_A: 'Double-A',
      TRIPLE_A: 'Triple-A',
      MLB: 'MLB',
    };
    return tiers[tier] || tier;
  }

  function getPlayoffResultColor(result: string) {
    switch (result) {
      case 'Champion':
        return 'bg-yellow-600';
      case 'Finals':
        return 'bg-gray-400';
      case 'Semifinals':
        return 'bg-amber-700';
      default:
        return 'bg-gray-600';
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-12 text-center">
          <div className="animate-pulse text-gray-400">Loading season review...</div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-12 text-center text-gray-400">
          Season data not available
        </CardContent>
      </Card>
    );
  }

  // Show advance result screen
  if (advanceResult?.success && advanceResult.offseasonSummary) {
    const os = advanceResult.offseasonSummary;
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-green-900/30 to-green-800/10 border-green-700">
          <CardHeader>
            <CardTitle className="text-2xl text-green-400 text-center">
              Welcome to Year {os.newYear}!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Draft Position */}
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">
                #{os.playerDraftPosition}
              </div>
              <p className="text-gray-400">Your Draft Position</p>
            </div>

            {/* Winter Development */}
            {os.winterDevelopment.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Winter Development</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {os.winterDevelopment.map((dev) => (
                    <div
                      key={dev.playerId}
                      className={`p-2 rounded text-sm ${
                        dev.ratingChange > 0 ? 'bg-green-900/30' : 'bg-red-900/30'
                      }`}
                    >
                      <div className="font-medium text-white truncate">{dev.playerName}</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Age {dev.age}</span>
                        <span className={dev.ratingChange > 0 ? 'text-green-400' : 'text-red-400'}>
                          {dev.ratingChange > 0 ? '+' : ''}{dev.ratingChange} OVR
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Departing Free Agents */}
            {os.departingFreeAgents.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-3">Departing Free Agents</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {os.departingFreeAgents.map((fa) => (
                    <div key={fa.playerId} className="p-2 rounded bg-red-900/20 text-sm">
                      <div className="font-medium text-white truncate">{fa.playerName}</div>
                      <div className="text-xs text-gray-400">
                        {fa.position} - {fa.previousRating} OVR
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center pt-4">
              <p className="text-gray-400 mb-4">
                The draft is ready. Build your roster for the new season!
              </p>
              <Button
                onClick={() => router.refresh()}
                className="bg-green-600 hover:bg-green-500 px-8"
              >
                Continue to Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Championship Result */}
      <Card className={`border-2 ${
        summary.playoffResult === 'Champion'
          ? 'bg-gradient-to-r from-yellow-900/40 to-yellow-800/20 border-yellow-500'
          : 'bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700'
      }`}>
        <CardHeader>
          <div className="text-center">
            {summary.playoffResult === 'Champion' && (
              <div className="text-5xl mb-4">🏆</div>
            )}
            <CardTitle className="text-2xl">
              Year {summary.year} Season Complete
            </CardTitle>
            <p className="text-gray-400 mt-1">
              {summary.teamName} - {formatTier(summary.tier)}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {/* Record & Standing */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-3xl font-bold text-white">
                {summary.wins}-{summary.losses}
              </div>
              <p className="text-sm text-gray-400">Final Record</p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-3xl font-bold text-white">
                {(summary.winPct * 100).toFixed(1)}%
              </div>
              <p className="text-sm text-gray-400">Win Pct</p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="text-3xl font-bold text-white">
                #{summary.leagueRank}
              </div>
              <p className="text-sm text-gray-400">League Rank</p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <Badge className={`text-lg ${getPlayoffResultColor(summary.playoffResult)}`}>
                {summary.playoffResult === 'Missed' ? 'Missed Playoffs' : summary.playoffResult}
              </Badge>
            </div>
          </div>

          {/* Championship Result */}
          {summary.madePlayoffs && summary.finalsMatchup && (
            <div className="text-center p-4 bg-gray-800/30 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Championship</h3>
              <p className="text-xl">
                <span className={summary.championName === summary.teamName ? 'text-yellow-400 font-bold' : 'text-white'}>
                  {summary.finalsMatchup.team1}
                </span>
                <span className="text-gray-500 mx-3">vs</span>
                <span className={summary.championName === summary.teamName ? 'text-yellow-400 font-bold' : 'text-white'}>
                  {summary.finalsMatchup.team2}
                </span>
              </p>
              {summary.championName && (
                <p className="text-lg text-yellow-400 mt-2">
                  Champion: {summary.championName}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Season Financials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <p className="text-sm text-gray-400">Revenue</p>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-400">
                {formatCurrency(summary.totalExpenses)}
              </div>
              <p className="text-sm text-gray-400">Expenses</p>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${summary.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(summary.netIncome)}
              </div>
              <p className="text-sm text-gray-400">Net Income</p>
            </div>
          </div>
          <Separator className="my-4 bg-gray-700" />
          <div className="text-center">
            <div className="text-lg text-white">{summary.avgAttendance.toLocaleString()}</div>
            <p className="text-sm text-gray-400">Avg. Home Attendance</p>
          </div>
        </CardContent>
      </Card>

      {/* MVP & Top Performers */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Season Awards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary.mvpPlayer && (
            <div className="flex items-center justify-between p-3 bg-yellow-900/20 rounded-lg border border-yellow-700/50">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🏅</div>
                <div>
                  <div className="font-semibold text-yellow-400">Team MVP</div>
                  <div className="text-white">{summary.mvpPlayer.name}</div>
                </div>
              </div>
            </div>
          )}

          <h4 className="text-sm font-medium text-gray-400 pt-2">Top Performers</h4>
          <div className="space-y-2">
            {summary.topPerformers.map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-2 bg-gray-800/50 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 w-5">{idx + 1}.</span>
                  <div>
                    <div className="font-medium text-white">{player.name}</div>
                    <div className="text-xs text-gray-400">{player.position} - {player.rating} OVR</div>
                  </div>
                </div>
                <div className="text-sm text-gray-400">{player.keyStats}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expiring Contracts Warning */}
      {summary.expiringContracts.length > 0 && (
        <Card className="bg-red-900/20 border-red-800">
          <CardHeader>
            <CardTitle className="text-lg text-red-400">
              Expiring Contracts ({summary.expiringContracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 mb-3">
              These players will become free agents after the offseason:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {summary.expiringContracts.map((player) => (
                <div key={player.id} className="p-2 bg-gray-800 rounded text-sm">
                  <div className="font-medium text-white truncate">{player.name}</div>
                  <div className="text-xs text-gray-400">
                    {player.position} - {player.rating} OVR
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advance Button */}
      <Card className="bg-gradient-to-r from-blue-900/30 to-blue-800/10 border-blue-700">
        <CardContent className="py-8 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">
            Ready for Year {summary.year + 1}?
          </h3>
          <p className="text-gray-400 mb-6">
            Advance to the offseason to process contracts, player development, and prepare for the draft.
          </p>
          <Button
            onClick={handleAdvanceToNextSeason}
            disabled={isAdvancing}
            className="bg-blue-600 hover:bg-blue-500 px-12 py-6 text-lg"
          >
            {isAdvancing ? (
              <>
                <span className="animate-spin mr-2">&#9696;</span>
                Processing Offseason...
              </>
            ) : (
              `Start Year ${summary.year + 1} Season`
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
