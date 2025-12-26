'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/format';
import { createClient } from '@/lib/supabase/client';

interface HistoryTabProps {
  gameId: string;
  currentYear: number;
  events: Array<{
    id: string;
    year: number;
    type: string;
    title: string;
    description: string;
  }>;
}

interface SeasonRecord {
  year: number;
  tier: string;
  wins: number;
  losses: number;
  win_pct: number;
  league_rank: number;
  made_playoffs: boolean;
  total_attendance: number;
  net_income: number;
}

interface DraftPickRecord {
  id: string;
  round: number;
  pick_number: number;
  player: {
    first_name: string;
    last_name: string;
    position: string;
    current_rating: number;
  };
}

export default function HistoryTab({ gameId, currentYear, events }: HistoryTabProps) {
  const [seasons, setSeasons] = useState<SeasonRecord[]>([]);
  const [draftHistory, setDraftHistory] = useState<Map<number, DraftPickRecord[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'seasons' | 'drafts' | 'events'>('seasons');

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      const supabase = createClient();

      // Load season history
      const { data: seasonData } = await supabase
        .from('seasons')
        .select('*')
        .eq('game_id', gameId)
        .order('year', { ascending: false });

      if (seasonData) {
        setSeasons(seasonData as unknown as SeasonRecord[]);
      }

      // Load draft history - get picks where team_id is 'player'
      const { data: draftPickData } = await supabase
        .from('draft_picks')
        .select(`
          id,
          round,
          pick_number,
          players (
            first_name,
            last_name,
            position,
            current_rating
          )
        `)
        .eq('game_id', gameId)
        .eq('team_id', 'player')
        .order('pick_number', { ascending: true });

      if (draftPickData) {
        // Group by year (we'll need to get the draft year from the draft table)
        const { data: draftData } = await supabase
          .from('drafts')
          .select('id, year')
          .eq('game_id', gameId);

        if (draftData) {
          const drafts = draftData as Array<{ id: string; year: number }>;
          const draftYears = new Map(drafts.map(d => [d.id, d.year]));

          // For now, group all picks by current year since we don't have draft_id in the response
          const picksByYear = new Map<number, DraftPickRecord[]>();
          (draftPickData as Array<any>).forEach((pick) => {
            const year = currentYear; // Simplified - in production, get from draft relationship
            const existingPicks = picksByYear.get(year) || [];
            existingPicks.push({
              id: pick.id,
              round: pick.round,
              pick_number: pick.pick_number,
              player: pick.players,
            });
            picksByYear.set(year, existingPicks);
          });

          setDraftHistory(picksByYear);
        }
      }

      setIsLoading(false);
    }

    loadHistory();
  }, [gameId, currentYear]);

  function formatTier(tier: string): string {
    const tiers: Record<string, string> = {
      LOW_A: 'Low-A',
      HIGH_A: 'High-A',
      DOUBLE_A: 'Double-A',
      TRIPLE_A: 'Triple-A',
      MLB: 'MLB',
    };
    return tiers[tier] || tier;
  }

  function getEventTypeColor(type: string): string {
    switch (type) {
      case 'season_complete': return 'bg-green-600';
      case 'draft_complete': return 'bg-blue-600';
      case 'promotion': return 'bg-amber-600';
      case 'city_growth': return 'bg-purple-600';
      case 'economic_milestone': return 'bg-cyan-600';
      default: return 'bg-gray-600';
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-12 text-center">
          <div className="animate-pulse text-gray-400">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView('seasons')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeView === 'seasons'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Season Records
        </button>
        <button
          onClick={() => setActiveView('drafts')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeView === 'drafts'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Draft History
        </button>
        <button
          onClick={() => setActiveView('events')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeView === 'events'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Events
        </button>
      </div>

      {/* Season Records View */}
      {activeView === 'seasons' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Season Records</CardTitle>
          </CardHeader>
          <CardContent>
            {seasons.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                No season history yet. Complete a season to see records here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400">Year</TableHead>
                    <TableHead className="text-gray-400">Tier</TableHead>
                    <TableHead className="text-gray-400">Record</TableHead>
                    <TableHead className="text-gray-400">Win %</TableHead>
                    <TableHead className="text-gray-400">Rank</TableHead>
                    <TableHead className="text-gray-400">Attendance</TableHead>
                    <TableHead className="text-gray-400">Net Income</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seasons.map((season) => (
                    <TableRow key={season.year} className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell className="font-medium text-white">
                        {season.year}
                        {season.made_playoffs && (
                          <Badge className="ml-2 bg-green-600 text-xs">Playoffs</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-300">{formatTier(season.tier)}</TableCell>
                      <TableCell className="text-gray-300">
                        {season.wins}-{season.losses}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {((season.win_pct || 0) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-gray-300">#{season.league_rank || '-'}</TableCell>
                      <TableCell className="text-gray-300">
                        {(season.total_attendance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className={season.net_income >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {formatCurrency(season.net_income || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Draft History View */}
      {activeView === 'drafts' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Draft History</CardTitle>
          </CardHeader>
          <CardContent>
            {draftHistory.size === 0 ? (
              <p className="text-center text-gray-400 py-8">
                No draft history yet. Complete a draft to see your picks here.
              </p>
            ) : (
              <div className="space-y-6">
                {Array.from(draftHistory.entries()).map(([year, picks]) => (
                  <div key={year}>
                    <h3 className="text-lg font-semibold text-white mb-3">Year {year} Draft</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {picks.map((pick) => (
                        <div
                          key={pick.id}
                          className="bg-gray-800 rounded-lg p-3 flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium text-white">
                              {pick.player?.first_name} {pick.player?.last_name}
                            </div>
                            <div className="text-xs text-gray-400">
                              Round {pick.round}, Pick {pick.pick_number}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-gray-300">
                              {pick.player?.position}
                            </Badge>
                            <div className="text-sm text-amber-500 mt-1">
                              {pick.player?.current_rating}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Events View */}
      {activeView === 'events' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Event Log</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                No events recorded yet.
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-gray-800 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getEventTypeColor(event.type)}>
                          {event.type.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-gray-500">Year {event.year}</span>
                      </div>
                    </div>
                    <h4 className="font-medium text-white">{event.title}</h4>
                    <p className="text-sm text-gray-400 mt-1">{event.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Career Summary */}
      {seasons.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Career Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-2xl font-bold text-white">
                  {seasons.reduce((sum, s) => sum + s.wins, 0)}-
                  {seasons.reduce((sum, s) => sum + s.losses, 0)}
                </div>
                <p className="text-sm text-gray-400">Career Record</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {seasons.filter(s => s.made_playoffs).length}
                </div>
                <p className="text-sm text-gray-400">Playoff Appearances</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {seasons.reduce((sum, s) => sum + s.total_attendance, 0).toLocaleString()}
                </div>
                <p className="text-sm text-gray-400">Total Attendance</p>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  seasons.reduce((sum, s) => sum + (s.net_income || 0), 0) >= 0
                    ? 'text-green-500'
                    : 'text-red-500'
                }`}>
                  {formatCurrency(seasons.reduce((sum, s) => sum + (s.net_income || 0), 0))}
                </div>
                <p className="text-sm text-gray-400">Total Net Income</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
