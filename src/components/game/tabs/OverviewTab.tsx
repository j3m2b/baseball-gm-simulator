'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { advancePhase } from '@/lib/actions/game';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils/format';
import RecentEvents from '../dashboard/RecentEvents';
import LeagueLeaders from '../dashboard/LeagueLeaders';
import TeamStandings from '../dashboard/TeamStandings';
import NewsFeed from '../dashboard/NewsFeed';
import type { NewsStory } from '@/lib/types';

interface SeasonStats {
  // Batter stats (optional)
  games?: number;
  atBats?: number;
  hits?: number;
  homeRuns?: number;
  rbi?: number;
  battingAvg?: number;
  ops?: number;
  war?: number;
  // Pitcher stats (optional)
  wins?: number;
  losses?: number;
  era?: number;
  strikeouts?: number;
  inningsPitched?: number;
}

interface SeasonRecord {
  wins: number;
  losses: number;
  winPct: number;
  divisionRank: number;
  gamesBack: number;
  expectedWins: number;
  expectedLosses: number;
  pythagoreanLuck: number;
}

interface OverviewTabProps {
  game: {
    id: string;
    city_name: string;
    team_name: string;
    current_year: number;
    current_tier: string;
    current_phase: string;
  };
  franchise: {
    tier: string;
    budget: number;
    reserves: number;
    stadium_name: string;
    stadium_capacity: number;
    stadium_quality: number;
    ticket_price: number;
  } | null;
  city: {
    population: number;
    median_income: number;
    unemployment_rate: number;
    team_pride: number;
    national_recognition: number;
    occupancy_rate: number;
  } | null;
  roster: Array<{
    id: string;
    first_name: string;
    last_name: string;
    current_rating: number;
    potential: number;
    position: string;
    player_type: string;
    season_stats?: SeasonStats | null;
  }>;
  events: Array<{
    id: string;
    year: number;
    type: string;
    title: string;
    description: string;
    is_read: boolean;
    effects?: unknown;
    duration_years?: number | null;
  }>;
  seasonRecord?: SeasonRecord | null;
  newsStories?: NewsStory[];
}

export default function OverviewTab({ game, franchise, city, roster, events, seasonRecord, newsStories = [] }: OverviewTabProps) {
  const router = useRouter();
  const [isAdvancing, setIsAdvancing] = useState(false);

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

  function getNextPhaseLabel(phase: string) {
    const next: Record<string, string> = {
      pre_season: 'Start Draft',
      draft: 'Complete Draft & Start Season',
      season: 'Advance to Playoffs',
      post_season: 'Enter Off-Season',
      off_season: 'Start Year ' + (game.current_year + 1),
    };
    return next[phase] || 'Advance';
  }

  async function handleAdvance() {
    setIsAdvancing(true);
    try {
      await advancePhase(game.id);
      router.refresh();
    } finally {
      setIsAdvancing(false);
    }
  }

  // Calculate roster stats
  const avgRating = roster.length > 0
    ? Math.round(roster.reduce((sum, p) => sum + p.current_rating, 0) / roster.length)
    : 0;
  const avgPotential = roster.length > 0
    ? Math.round(roster.reduce((sum, p) => sum + p.potential, 0) / roster.length)
    : 0;

  // Count by position type
  const pitchers = roster.filter(p => p.position === 'SP' || p.position === 'RP').length;
  const hitters = roster.length - pitchers;

  // Filter events for current year (narrative events)
  const currentYearEvents = events.filter(e =>
    e.year === game.current_year &&
    ['economic', 'team', 'city', 'story'].includes(e.type)
  );

  return (
    <div className="space-y-6">
      {/* News Feed with Breaking News Ticker (Season phase only) */}
      {newsStories.length > 0 && (
        <NewsFeed
          stories={newsStories}
          maxStories={5}
          showTicker={game.current_phase === 'season'}
        />
      )}

      {/* Narrative Events for Current Year */}
      {currentYearEvents.length > 0 && (
        <RecentEvents events={currentYearEvents} maxEvents={3} />
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{formatTier(game.current_tier)}</div>
            <p className="text-sm text-gray-400">Current Tier</p>
            <div className="mt-2 text-xs text-gray-500">
              {game.current_tier === 'MLB' ? 'Top tier!' : 'Work your way up'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{roster.length}/25</div>
            <p className="text-sm text-gray-400">Roster Size</p>
            <div className="mt-2 text-xs text-gray-500">
              {pitchers}P / {hitters}H
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{avgRating}</div>
            <p className="text-sm text-gray-400">Avg Rating</p>
            <div className="mt-2 text-xs text-gray-500">
              Potential: {avgPotential}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${(franchise?.reserves || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(franchise?.reserves || 0)}
            </div>
            <p className="text-sm text-gray-400">Cash Reserves</p>
            <div className="mt-2 text-xs text-gray-500">
              Budget: {formatCurrency(franchise?.budget || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Season Record & Team Leaders Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Standings with Pythagorean Luck */}
        <TeamStandings
          seasonRecord={seasonRecord || null}
          teamName={game.team_name}
          tier={game.current_tier}
        />

        {/* League Leaders */}
        <LeagueLeaders roster={roster} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - City & Stadium */}
        <div className="lg:col-span-2 space-y-6">
          {/* City Card */}
          {city && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">{game.city_name} Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {city.population.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-400">Population</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(city.median_income)}
                    </div>
                    <p className="text-sm text-gray-400">Median Income</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {city.team_pride}%
                    </div>
                    <p className="text-sm text-gray-400">Team Pride</p>
                    <div className="mt-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all"
                        style={{ width: `${city.team_pride}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {(city.occupancy_rate * 100).toFixed(0)}%
                    </div>
                    <p className="text-sm text-gray-400">Building Occupancy</p>
                    <div className="mt-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${city.occupancy_rate * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stadium Card */}
          {franchise && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">{franchise.stadium_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {franchise.stadium_capacity.toLocaleString()}
                    </div>
                    <p className="text-sm text-gray-400">Capacity</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {franchise.stadium_quality}
                    </div>
                    <p className="text-sm text-gray-400">Quality Rating</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      ${franchise.ticket_price}
                    </div>
                    <p className="text-sm text-gray-400">Ticket Price</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Actions & Next Steps */}
        <div className="space-y-6">
          {/* Phase Action Card */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">Current Phase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Badge className="bg-blue-600 text-white mb-2">
                  {game.current_phase === 'draft' ? 'Draft' : game.current_phase.replace('_', ' ').toUpperCase()}
                </Badge>
                {game.current_phase === 'draft' && (
                  <p className="text-sm text-gray-400">
                    Build your roster through the draft. Scout players to reveal their true potential.
                  </p>
                )}
                {game.current_phase === 'season' && (
                  <p className="text-sm text-gray-400">
                    The season is underway. Your players are developing and the wins are counting.
                  </p>
                )}
              </div>

              {/* Only show advance button for non-draft phases */}
              {game.current_phase !== 'draft' && (
                <Button
                  onClick={handleAdvance}
                  disabled={isAdvancing}
                  className="w-full bg-amber-600 hover:bg-amber-500"
                >
                  {isAdvancing ? 'Advancing...' : getNextPhaseLabel(game.current_phase)}
                </Button>
              )}

              {game.current_phase === 'draft' && (
                <p className="text-xs text-gray-500">
                  Complete the draft in the Draft tab to advance to the season.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tier Progression Card */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">Tier Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {['LOW_A', 'HIGH_A', 'DOUBLE_A', 'TRIPLE_A', 'MLB'].map((tier, idx) => {
                  const isCurrentTier = tier === game.current_tier;
                  const isPassed = ['LOW_A', 'HIGH_A', 'DOUBLE_A', 'TRIPLE_A', 'MLB'].indexOf(game.current_tier) > idx;

                  return (
                    <div
                      key={tier}
                      className={`flex items-center gap-3 p-2 rounded ${
                        isCurrentTier ? 'bg-amber-900/30 border border-amber-800' : ''
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isPassed
                            ? 'bg-green-500'
                            : isCurrentTier
                            ? 'bg-amber-500'
                            : 'bg-gray-700'
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          isCurrentTier
                            ? 'text-amber-500 font-medium'
                            : isPassed
                            ? 'text-green-500'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatTier(tier)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
