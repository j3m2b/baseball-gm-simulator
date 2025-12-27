'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OverviewTab from './tabs/OverviewTab';
import RosterTab from './tabs/RosterTab';
import DraftTab from './tabs/DraftTab';
import SeasonTab from './tabs/SeasonTab';
import CityTab from './tabs/CityTab';
import FinancesTab from './tabs/FinancesTab';
import HistoryTab from './tabs/HistoryTab';
import RecentEvents from './dashboard/RecentEvents';
import { formatCurrency } from '@/lib/utils/format';

interface GameDashboardProps {
  game: {
    id: string;
    city_name: string;
    team_name: string;
    current_year: number;
    current_tier: string;
    current_phase: string;
    current_franchise: {
      tier: string;
      budget: number;
      reserves: number;
      stadium_name: string;
      stadium_capacity: number;
      stadium_quality: number;
      ticket_price: number;
      hitting_coach_salary: number;
      pitching_coach_salary: number;
      development_coord_salary: number;
    } | null;
    city_states: {
      population: number;
      median_income: number;
      unemployment_rate: number;
      team_pride: number;
      national_recognition: number;
      occupancy_rate: number;
      buildings: unknown; // JSON type from database
    } | null;
  };
  roster: Array<{
    id: string;
    first_name: string;
    last_name: string;
    age: number;
    position: string;
    player_type: string;
    current_rating: number;
    potential: number;
    morale: number;
    tier: string;
    salary: number;
  }>;
  draftState: {
    id: string;
    year: number;
    current_round: number;
    current_pick: number;
    is_complete: boolean;
    player_draft_position: number;
    total_rounds: number;
  } | null;
  prospects: Array<{
    id: string;
    first_name: string;
    last_name: string;
    age: number;
    position: string;
    player_type: string;
    current_rating: number;
    potential: number;
    scouted_rating: number | null;
    scouted_potential: number | null;
    scouting_accuracy: string | null;
    media_rank: number;
    archetype: string;
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
}

export default function GameDashboard({
  game,
  roster,
  draftState,
  prospects,
  events,
}: GameDashboardProps) {
  const [activeTab, setActiveTab] = useState(() => {
    // Default to appropriate tab based on phase
    if (game.current_phase === 'draft') return 'draft';
    if (game.current_phase === 'season') return 'season';
    return 'overview';
  });

  const franchise = game.current_franchise;
  const city = game.city_states;

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

  function formatPhase(phase: string) {
    const phases: Record<string, string> = {
      pre_season: 'Pre-Season',
      draft: 'Draft',
      season: 'Season',
      post_season: 'Playoffs',
      off_season: 'Off-Season',
    };
    return phases[phase] || phase;
  }

  function getPhaseColor(phase: string) {
    const colors: Record<string, string> = {
      draft: 'bg-blue-600',
      season: 'bg-green-600',
      post_season: 'bg-purple-600',
      off_season: 'bg-gray-600',
      pre_season: 'bg-yellow-600',
    };
    return colors[phase] || 'bg-gray-600';
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top Bar */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">{game.team_name}</h1>
                <p className="text-sm text-gray-400">{game.city_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Year & Phase */}
              <div className="text-right">
                <div className="text-lg font-semibold text-white">Year {game.current_year}</div>
                <Badge className={`${getPhaseColor(game.current_phase)} text-white`}>
                  {formatPhase(game.current_phase)}
                </Badge>
              </div>

              {/* Tier */}
              <div className="text-right">
                <div className="text-sm text-gray-400">Tier</div>
                <div className="text-lg font-semibold text-amber-500">
                  {formatTier(game.current_tier)}
                </div>
              </div>

              {/* Budget */}
              {franchise && (
                <div className="text-right">
                  <div className="text-sm text-gray-400">Reserves</div>
                  <div className={`text-lg font-semibold ${franchise.reserves >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(franchise.reserves)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar Stats */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* City Stats Card */}
              {city && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">City Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Population</span>
                      <span className="text-sm font-medium text-white">
                        {city.population.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Team Pride</span>
                      <span className="text-sm font-medium text-white">{city.team_pride}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Unemployment</span>
                      <span className="text-sm font-medium text-white">
                        {city.unemployment_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Occupancy</span>
                      <span className="text-sm font-medium text-white">
                        {(city.occupancy_rate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Franchise Stats Card */}
              {franchise && (
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">Franchise</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Budget</span>
                      <span className="text-sm font-medium text-white">
                        {formatCurrency(franchise.budget)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Stadium</span>
                      <span className="text-sm font-medium text-white">
                        {franchise.stadium_capacity.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Ticket Price</span>
                      <span className="text-sm font-medium text-white">
                        ${franchise.ticket_price}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-400">Roster Size</span>
                      <span className="text-sm font-medium text-white">{roster.length}/25</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Events */}
              <RecentEvents events={events} maxEvents={3} compact />
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-gray-900 border border-gray-800 mb-6">
                <TabsTrigger value="overview" className="data-[state=active]:bg-gray-800">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="roster" className="data-[state=active]:bg-gray-800">
                  Roster ({roster.length})
                </TabsTrigger>
                <TabsTrigger
                  value="draft"
                  className="data-[state=active]:bg-gray-800"
                  disabled={game.current_phase !== 'draft'}
                >
                  Draft
                  {game.current_phase === 'draft' && !draftState?.is_complete && (
                    <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="season"
                  className="data-[state=active]:bg-gray-800"
                  disabled={game.current_phase !== 'season'}
                >
                  Season
                  {game.current_phase === 'season' && (
                    <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="city" className="data-[state=active]:bg-gray-800">
                  City
                </TabsTrigger>
                <TabsTrigger value="finances" className="data-[state=active]:bg-gray-800">
                  Finances
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-gray-800">
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <OverviewTab
                  game={game}
                  franchise={franchise}
                  city={city}
                  roster={roster}
                  events={events}
                />
              </TabsContent>

              <TabsContent value="roster">
                <RosterTab roster={roster} gameId={game.id} />
              </TabsContent>

              <TabsContent value="draft">
                {draftState && (
                  <DraftTab
                    gameId={game.id}
                    draftState={draftState}
                    prospects={prospects}
                    reserves={franchise?.reserves || 0}
                    roster={roster}
                  />
                )}
              </TabsContent>

              <TabsContent value="season">
                <SeasonTab
                  gameId={game.id}
                  currentYear={game.current_year}
                  currentTier={game.current_tier}
                  teamName={game.team_name}
                />
              </TabsContent>

              <TabsContent value="city">
                <CityTab
                  city={city}
                  cityName={game.city_name}
                  teamName={game.team_name}
                />
              </TabsContent>

              <TabsContent value="finances">
                <FinancesTab
                  franchise={franchise}
                  roster={roster}
                  gameId={game.id}
                  currentYear={game.current_year}
                />
              </TabsContent>

              <TabsContent value="history">
                <HistoryTab
                  gameId={game.id}
                  currentYear={game.current_year}
                  events={events}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
