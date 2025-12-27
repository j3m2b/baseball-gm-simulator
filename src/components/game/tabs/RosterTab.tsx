'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { movePlayer } from '@/lib/actions/game';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { FACILITY_CONFIGS, type FacilityLevel } from '@/lib/types';
import { ArrowUp, ArrowDown } from 'lucide-react';

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

interface Player {
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
  roster_status: 'ACTIVE' | 'RESERVE';
  season_stats?: SeasonStats | null;
}

interface RosterTabProps {
  roster: Player[];
  gameId: string;
  facilityLevel?: FacilityLevel;
  reserves?: number;
}

export default function RosterTab({ roster, gameId, facilityLevel = 0, reserves = 0 }: RosterTabProps) {
  const router = useRouter();
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null);

  // Separate active and reserve players
  const activePlayers = roster.filter(p => p.roster_status === 'ACTIVE');
  const reservePlayers = roster.filter(p => p.roster_status === 'RESERVE');

  // Separate by player type within each roster
  const activePitchers = activePlayers.filter(p => p.player_type === 'PITCHER');
  const activeHitters = activePlayers.filter(p => p.player_type === 'HITTER');
  const reservePitchers = reservePlayers.filter(p => p.player_type === 'PITCHER');
  const reserveHitters = reservePlayers.filter(p => p.player_type === 'HITTER');

  // Get capacities from facility config
  const facilityConfig = FACILITY_CONFIGS[facilityLevel];
  const activeMax = 25;
  const reserveMax = facilityConfig.reserveSlots;

  async function handleMovePlayer(playerId: string, destination: 'ACTIVE' | 'RESERVE') {
    setMovingPlayerId(playerId);
    try {
      const result = await movePlayer(gameId, playerId, destination);
      if (result.success) {
        toast.success(`Player ${destination === 'ACTIVE' ? 'called up' : 'sent down'} successfully`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to move player');
      }
    } catch {
      toast.error('Failed to move player');
    } finally {
      setMovingPlayerId(null);
    }
  }

  function getRatingColor(rating: number): string {
    if (rating >= 70) return 'text-green-400';
    if (rating >= 60) return 'text-green-500';
    if (rating >= 50) return 'text-yellow-500';
    if (rating >= 40) return 'text-orange-500';
    return 'text-red-500';
  }

  function getStatusBadge(player: Player) {
    const gap = player.potential - player.current_rating;

    if (gap <= 5 && player.current_rating >= 60) {
      return <Badge className="bg-green-600 text-white">Ready</Badge>;
    }
    if (gap > 10) {
      return <Badge className="bg-blue-600 text-white">Developing</Badge>;
    }
    if (player.morale < 40) {
      return <Badge className="bg-red-600 text-white">Struggling</Badge>;
    }
    return <Badge className="bg-gray-600 text-white">Average</Badge>;
  }

  function formatTier(tier: string) {
    const tiers: Record<string, string> = {
      LOW_A: 'A',
      HIGH_A: 'A+',
      DOUBLE_A: 'AA',
      TRIPLE_A: 'AAA',
      MLB: 'MLB',
    };
    return tiers[tier] || tier;
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Format batting average as .305 (3 decimals, no leading zero)
  function formatAvg(avg: number): string {
    return avg.toFixed(3).replace(/^0/, '');
  }

  // Format ERA as 3.45 (2 decimals)
  function formatERA(era: number): string {
    return era.toFixed(2);
  }

  // Check if player has batter stats
  function hasBatterStats(stats: SeasonStats): boolean {
    return stats.battingAvg !== undefined;
  }

  // Check if player has pitcher stats
  function hasPitcherStats(stats: SeasonStats): boolean {
    return stats.era !== undefined;
  }

  // Check if any players have season stats
  const hasSeasonStats = roster.some(p => p.season_stats);

  const PlayerTable = ({
    players,
    title,
    rosterType,
    canMoveUp,
    canMoveDown,
    isPitcher,
  }: {
    players: Player[];
    title: string;
    rosterType: 'ACTIVE' | 'RESERVE';
    canMoveUp: boolean;
    canMoveDown: boolean;
    isPitcher: boolean;
  }) => (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-400">{title} ({players.length})</h4>
      {players.length === 0 ? (
        <p className="text-center text-gray-500 py-4 text-sm">
          No {title.toLowerCase()}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400 w-8"></TableHead>
              <TableHead className="text-gray-400">Name</TableHead>
              <TableHead className="text-gray-400">Pos</TableHead>
              <TableHead className="text-gray-400">Age</TableHead>
              <TableHead className="text-gray-400 text-center">Rating</TableHead>
              {/* Show stats columns if season stats exist */}
              {hasSeasonStats && !isPitcher && (
                <>
                  <TableHead className="text-gray-400 text-center">AVG</TableHead>
                  <TableHead className="text-gray-400 text-center">HR</TableHead>
                  <TableHead className="text-gray-400 text-center">RBI</TableHead>
                  <TableHead className="text-gray-400 text-center">OPS</TableHead>
                </>
              )}
              {hasSeasonStats && isPitcher && (
                <>
                  <TableHead className="text-gray-400 text-center">W-L</TableHead>
                  <TableHead className="text-gray-400 text-center">ERA</TableHead>
                  <TableHead className="text-gray-400 text-center">SO</TableHead>
                </>
              )}
              {!hasSeasonStats && (
                <TableHead className="text-gray-400 text-center">Potential</TableHead>
              )}
              <TableHead className="text-gray-400 text-right">Salary</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player) => {
              const stats = player.season_stats;
              const playerHasBatterStats = stats && hasBatterStats(stats);
              const playerHasPitcherStats = stats && hasPitcherStats(stats);

              return (
                <TableRow
                  key={player.id}
                  className="border-gray-800 hover:bg-gray-800/50"
                >
                  <TableCell>
                    {rosterType === 'ACTIVE' && canMoveDown && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                        onClick={() => handleMovePlayer(player.id, 'RESERVE')}
                        disabled={movingPlayerId === player.id}
                        title="Send to Reserve"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    )}
                    {rosterType === 'RESERVE' && canMoveUp && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                        onClick={() => handleMovePlayer(player.id, 'ACTIVE')}
                        disabled={movingPlayerId === player.id}
                        title="Call Up to Active"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-white">
                        {player.first_name} {player.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTier(player.tier)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">{player.position}</TableCell>
                  <TableCell className="text-gray-300">{player.age}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-mono font-bold ${getRatingColor(player.current_rating)}`}>
                      {player.current_rating}
                    </span>
                  </TableCell>
                  {/* Batter stats columns */}
                  {hasSeasonStats && !isPitcher && (
                    <>
                      <TableCell className="text-center font-mono text-white">
                        {playerHasBatterStats && stats?.battingAvg !== undefined ? formatAvg(stats.battingAvg) : '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono text-white">
                        {playerHasBatterStats && stats?.homeRuns !== undefined ? stats.homeRuns : '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono text-white">
                        {playerHasBatterStats && stats?.rbi !== undefined ? stats.rbi : '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono text-amber-400">
                        {playerHasBatterStats && stats?.ops !== undefined ? formatAvg(stats.ops) : '-'}
                      </TableCell>
                    </>
                  )}
                  {/* Pitcher stats columns */}
                  {hasSeasonStats && isPitcher && (
                    <>
                      <TableCell className="text-center font-mono text-white">
                        {playerHasPitcherStats && stats ? `${stats.wins ?? 0}-${stats.losses ?? 0}` : '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono text-white">
                        {playerHasPitcherStats && stats?.era !== undefined ? formatERA(stats.era) : '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono text-white">
                        {playerHasPitcherStats && stats?.strikeouts !== undefined ? stats.strikeouts : '-'}
                      </TableCell>
                    </>
                  )}
                  {/* Show potential when no stats exist */}
                  {!hasSeasonStats && (
                    <TableCell className="text-center">
                      <span className={`font-mono ${getRatingColor(player.potential)}`}>
                        {player.potential}
                      </span>
                    </TableCell>
                  )}
                  <TableCell className="text-right text-gray-300">
                    {formatCurrency(player.salary)}
                  </TableCell>
                  <TableCell>{getStatusBadge(player)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );

  const canMoveToActive = activePlayers.length < activeMax;
  const canMoveToReserve = reservePlayers.length < reserveMax;

  return (
    <div className="space-y-6">
      {/* Roster Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">
              {activePlayers.length}/{activeMax}
            </div>
            <p className="text-sm text-gray-400">Active Roster</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">
              {reservePlayers.length}/{reserveMax}
            </div>
            <p className="text-sm text-gray-400">Farm System</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{activePitchers.length + reservePitchers.length}</div>
            <p className="text-sm text-gray-400">Total Pitchers</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{activeHitters.length + reserveHitters.length}</div>
            <p className="text-sm text-gray-400">Position Players</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">
              {roster.length > 0
                ? Math.round(roster.reduce((sum, p) => sum + p.current_rating, 0) / roster.length)
                : 0}
            </div>
            <p className="text-sm text-gray-400">Avg Rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Facility Info */}
      <Card className="bg-gradient-to-r from-blue-900/20 to-blue-800/10 border-blue-800/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-white">{facilityConfig.name}</div>
                <div className="text-sm text-gray-400">{facilityConfig.description}</div>
              </div>
            </div>
            {facilityConfig.upgradeCost !== null && (
              <div className="text-right">
                <div className="text-xs text-gray-500">Next Upgrade</div>
                <div className="text-sm text-amber-500 font-medium">
                  {formatCurrency(facilityConfig.upgradeCost)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Roster (25-Man) */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Active Roster (25-Man)
            <Badge variant="outline" className="text-gray-400">
              {activePlayers.length}/{activeMax}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <PlayerTable
            players={activePitchers}
            title="Pitchers"
            rosterType="ACTIVE"
            canMoveUp={false}
            canMoveDown={canMoveToReserve}
            isPitcher={true}
          />
          <PlayerTable
            players={activeHitters}
            title="Position Players"
            rosterType="ACTIVE"
            canMoveUp={false}
            canMoveDown={canMoveToReserve}
            isPitcher={false}
          />
          {activePlayers.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              No players on active roster. Draft players to build your team!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Farm System / Reserves */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            Farm System / Reserves
            <Badge variant="outline" className="text-gray-400">
              {reservePlayers.length}/{reserveMax}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <PlayerTable
            players={reservePitchers}
            title="Pitchers"
            rosterType="RESERVE"
            canMoveUp={canMoveToActive}
            canMoveDown={false}
            isPitcher={true}
          />
          <PlayerTable
            players={reserveHitters}
            title="Position Players"
            rosterType="RESERVE"
            canMoveUp={canMoveToActive}
            canMoveDown={false}
            isPitcher={false}
          />
          {reservePlayers.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              No players in farm system. As your active roster fills, new draftees will be assigned here.
            </p>
          )}
        </CardContent>
      </Card>

      {roster.length === 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Players Yet</h3>
            <p className="text-gray-400">
              Head to the Draft tab to start building your roster through the annual draft.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
