'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  initializeSeasonSimulation,
  simulateSeasonBatch,
  completeSeasonSimulation,
  getSeasonState,
} from '@/lib/actions/game';
import { formatCurrency } from '@/lib/utils/format';
import { useRouter } from 'next/navigation';

interface SeasonTabProps {
  gameId: string;
  currentYear: number;
  currentTier: string;
  teamName: string;
}

interface SeasonProgress {
  gamesPlayed: number;
  wins: number;
  losses: number;
  homeGames: number;
  awayGames: number;
  totalAttendance: number;
  isComplete: boolean;
}

interface SeasonEvent {
  game: number;
  type: 'win' | 'loss' | 'milestone' | 'injury' | 'development';
  description: string;
}

interface SeasonResults {
  wins: number;
  losses: number;
  winPercentage: number;
  leagueRank: number;
  totalAttendance: number;
  avgAttendance: number;
  revenueTotal: number;
  expenseTotal: number;
  netIncome: number;
  playerGrowth: Array<{
    playerId: string;
    playerName: string;
    ratingChange: number;
    newRating: number;
  }>;
  cityChanges: {
    prideChange: number;
    recognitionChange: number;
    buildingsUpgraded: number;
  };
  madePlayoffs: boolean;
  tierPromotionEligible: boolean;
}

export default function SeasonTab({ gameId, currentYear, currentTier, teamName }: SeasonTabProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState<SeasonProgress | null>(null);
  const [totalGames, setTotalGames] = useState(132);
  const [recentEvents, setRecentEvents] = useState<SeasonEvent[]>([]);
  const [results, setResults] = useState<SeasonResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tierGameCounts: Record<string, number> = {
    LOW_A: 132,
    HIGH_A: 132,
    DOUBLE_A: 138,
    TRIPLE_A: 144,
    MLB: 162,
  };

  const loadSeasonState = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await getSeasonState(gameId);
      if (state) {
        setProgress(state.progress);
        setTotalGames(state.totalGames);
      } else {
        // Initialize new season
        const initResult = await initializeSeasonSimulation(gameId);
        if ('error' in initResult && initResult.error) {
          setError(initResult.error);
        } else if ('progress' in initResult && initResult.progress) {
          setProgress(initResult.progress);
          setTotalGames(tierGameCounts[currentTier] || 132);
        }
      }
    } catch (err) {
      setError('Failed to load season state');
    } finally {
      setIsLoading(false);
    }
  }, [gameId, currentTier, tierGameCounts]);

  useEffect(() => {
    loadSeasonState();
  }, [loadSeasonState]);

  async function handleSimulateBatch(gamesToSim: number) {
    if (isSimulating) return;

    setIsSimulating(true);
    setError(null);

    try {
      const result = await simulateSeasonBatch(gameId, gamesToSim);

      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }

      if ('progress' in result && result.progress) {
        setProgress(result.progress);
        if (result.events) {
          setRecentEvents(prev => [...result.events!, ...prev].slice(0, 20));
        }
        if (result.totalGames) {
          setTotalGames(result.totalGames);
        }
      }
    } catch (err) {
      setError('Failed to simulate games');
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleCompleteSeason() {
    if (isSimulating) return;

    setIsSimulating(true);
    setError(null);

    try {
      const result = await completeSeasonSimulation(gameId);

      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }

      if ('results' in result && result.results) {
        setResults(result.results);
        router.refresh();
      }
    } catch (err) {
      setError('Failed to complete season');
    } finally {
      setIsSimulating(false);
    }
  }

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

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-12 text-center">
          <div className="animate-pulse text-gray-400">Loading season...</div>
        </CardContent>
      </Card>
    );
  }

  // Show season results if complete
  if (results) {
    return (
      <div className="space-y-6">
        <Card className="bg-gradient-to-r from-amber-900/30 to-amber-800/10 border-amber-800">
          <CardHeader>
            <CardTitle className="text-xl text-amber-500">
              Year {currentYear} Season Complete!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div>
                <div className="text-3xl font-bold text-white">
                  {results.wins}-{results.losses}
                </div>
                <p className="text-sm text-gray-400">Final Record</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">
                  {(results.winPercentage * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-400">Win Percentage</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">
                  #{results.leagueRank}
                </div>
                <p className="text-sm text-gray-400">League Rank</p>
              </div>
              <div>
                <Badge className={results.madePlayoffs ? 'bg-green-600' : 'bg-gray-600'}>
                  {results.madePlayoffs ? 'Made Playoffs!' : 'Missed Playoffs'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Financials */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Season Financials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Revenue</span>
                    <span className="text-green-500">{formatCurrency(results.revenueTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expenses</span>
                    <span className="text-red-500">{formatCurrency(results.expenseTotal)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700 pt-2">
                    <span className="text-white font-medium">Net Income</span>
                    <span className={results.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatCurrency(results.netIncome)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* City Impact */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">City Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pride Change</span>
                    <span className={results.cityChanges.prideChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {results.cityChanges.prideChange >= 0 ? '+' : ''}{results.cityChanges.prideChange}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Recognition</span>
                    <span className={results.cityChanges.recognitionChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {results.cityChanges.recognitionChange >= 0 ? '+' : ''}{results.cityChanges.recognitionChange}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Buildings Upgraded</span>
                    <span className="text-amber-500">{results.cityChanges.buildingsUpgraded}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Attendance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total</span>
                    <span className="text-white">{results.totalAttendance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg/Game</span>
                    <span className="text-white">{results.avgAttendance.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Player Development */}
            {results.playerGrowth.length > 0 && (
              <Card className="bg-gray-800 border-gray-700 mt-6">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-400">Player Development</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {results.playerGrowth.slice(0, 8).map((player) => (
                      <div key={player.playerId} className="flex justify-between items-center bg-gray-900 rounded p-2">
                        <span className="text-sm text-white truncate">{player.playerName}</span>
                        <span className={`text-sm font-mono ${player.ratingChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {player.ratingChange >= 0 ? '+' : ''}{player.ratingChange}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {results.tierPromotionEligible && (
              <Card className="bg-gradient-to-r from-green-900/30 to-green-800/10 border-green-800 mt-6">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-600">Promotion Eligible!</Badge>
                    <span className="text-green-400">
                      Your team qualifies for promotion to the next tier!
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const gamesPlayed = progress?.gamesPlayed || 0;
  const wins = progress?.wins || 0;
  const losses = progress?.losses || 0;
  const winPct = gamesPlayed > 0 ? (wins / gamesPlayed) : 0;
  const progressPct = (gamesPlayed / totalGames) * 100;
  const isSeasonComplete = gamesPlayed >= totalGames;

  return (
    <div className="space-y-6">
      {/* Season Header */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl">
                Year {currentYear} - {formatTier(currentTier)} Season
              </CardTitle>
              <p className="text-sm text-gray-400 mt-1">{teamName}</p>
            </div>
            <Badge className="bg-green-600 text-white">In Progress</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Games: {gamesPlayed} / {totalGames}</span>
              <span>{progressPct.toFixed(0)}% Complete</span>
            </div>
            <Progress value={progressPct} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{wins}</div>
              <p className="text-sm text-gray-400">Wins</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{losses}</div>
              <p className="text-sm text-gray-400">Losses</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{(winPct * 100).toFixed(1)}%</div>
              <p className="text-sm text-gray-400">Win %</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{progress?.homeGames || 0}</div>
              <p className="text-sm text-gray-400">Home Games</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {(progress?.totalAttendance || 0).toLocaleString()}
              </div>
              <p className="text-sm text-gray-400">Total Attendance</p>
            </div>
          </div>

          {/* Simulation Controls */}
          <div className="flex flex-wrap gap-3">
            {!isSeasonComplete ? (
              <>
                <Button
                  onClick={() => handleSimulateBatch(1)}
                  disabled={isSimulating}
                  variant="outline"
                  className="border-gray-700"
                >
                  {isSimulating ? 'Simulating...' : 'Sim 1 Game'}
                </Button>
                <Button
                  onClick={() => handleSimulateBatch(10)}
                  disabled={isSimulating}
                  variant="outline"
                  className="border-gray-700"
                >
                  {isSimulating ? 'Simulating...' : 'Sim 10 Games'}
                </Button>
                <Button
                  onClick={() => handleSimulateBatch(totalGames - gamesPlayed)}
                  disabled={isSimulating}
                  className="bg-amber-600 hover:bg-amber-500"
                >
                  {isSimulating ? 'Simulating...' : 'Sim Rest of Season'}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleCompleteSeason}
                disabled={isSimulating}
                className="bg-green-600 hover:bg-green-500"
              >
                {isSimulating ? 'Completing...' : 'Complete Season & View Results'}
              </Button>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 mt-4">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Recent Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentEvents.map((event, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-2 rounded ${
                    event.type === 'win' ? 'bg-green-900/20' : 'bg-red-900/20'
                  }`}
                >
                  <Badge className={event.type === 'win' ? 'bg-green-600' : 'bg-red-600'}>
                    {event.type === 'win' ? 'W' : 'L'}
                  </Badge>
                  <span className="text-sm text-gray-300">{event.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Season Guide */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Season Guide</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400 space-y-2">
          <p>
            Simulate games to progress through the season. Your team's performance depends on
            roster strength, coaching quality, and a bit of luck.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Win percentage determines playoff eligibility (top 4 teams)</li>
            <li>Attendance affects revenue and city growth</li>
            <li>Players develop throughout the season based on coaching</li>
            <li>A winning season boosts city pride and recognition</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
