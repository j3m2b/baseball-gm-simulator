'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Target } from 'lucide-react';

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
  position: string;
  player_type: string;
  current_rating: number;
  season_stats?: SeasonStats | null;
}

interface LeagueLeadersProps {
  roster: Player[];
}

// Type guards
function hasBatterStats(stats: SeasonStats): boolean {
  return stats.battingAvg !== undefined;
}

function hasPitcherStats(stats: SeasonStats): boolean {
  return stats.era !== undefined;
}

// Format batting average as .305 (3 decimals, no leading zero)
function formatAvg(avg: number): string {
  return avg.toFixed(3).replace(/^0/, '');
}

// Format ERA as 3.45 (2 decimals)
function formatERA(era: number): string {
  return era.toFixed(2);
}

export default function LeagueLeaders({ roster }: LeagueLeadersProps) {
  // Filter players with season stats
  const playersWithStats = roster.filter(p => p.season_stats);

  if (playersWithStats.length === 0) {
    return null; // Don't show if no stats yet
  }

  // Separate batters and pitchers
  const batters = playersWithStats.filter(
    p => p.player_type === 'HITTER' && p.season_stats && hasBatterStats(p.season_stats)
  );
  const pitchers = playersWithStats.filter(
    p => p.player_type === 'PITCHER' && p.season_stats && hasPitcherStats(p.season_stats)
  );

  // Find Team MVP (highest WAR among all players)
  let mvp: Player | null = null;
  let mvpWar = -Infinity;
  for (const player of playersWithStats) {
    const stats = player.season_stats;
    if (stats && stats.war !== undefined && stats.war > mvpWar) {
      mvpWar = stats.war;
      mvp = player;
    }
  }

  // Find Home Run King (most HRs among batters)
  let hrKing: Player | null = null;
  let maxHRs = 0;
  for (const player of batters) {
    const stats = player.season_stats;
    if (stats && stats.homeRuns !== undefined && stats.homeRuns > maxHRs) {
      maxHRs = stats.homeRuns;
      hrKing = player;
    }
  }

  // Find Ace Pitcher (best ERA among qualified pitchers - min 50 IP)
  let ace: Player | null = null;
  let bestERA = Infinity;
  for (const player of pitchers) {
    const stats = player.season_stats;
    if (stats && stats.inningsPitched !== undefined && stats.era !== undefined) {
      if (stats.inningsPitched >= 50 && stats.era < bestERA) {
        bestERA = stats.era;
        ace = player;
      }
    }
  }
  // If no qualified pitcher, take the one with most innings
  if (!ace && pitchers.length > 0) {
    let maxIP = 0;
    for (const player of pitchers) {
      const stats = player.season_stats;
      if (stats && stats.inningsPitched !== undefined && stats.inningsPitched > maxIP) {
        maxIP = stats.inningsPitched;
        ace = player;
      }
    }
  }

  const leaders = [
    {
      title: 'Team MVP',
      icon: Trophy,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      player: mvp,
      stat: mvp?.season_stats?.war !== undefined ? `${mvp.season_stats.war.toFixed(1)} WAR` : null,
    },
    {
      title: 'Home Run King',
      icon: Zap,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      player: hrKing,
      stat: hrKing?.season_stats?.homeRuns !== undefined ? `${hrKing.season_stats.homeRuns} HR` : null,
    },
    {
      title: 'Ace Pitcher',
      icon: Target,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      player: ace,
      stat: ace?.season_stats?.era !== undefined ? `${formatERA(ace.season_stats.era)} ERA` : null,
    },
  ].filter(l => l.player !== null);

  if (leaders.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Team Leaders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaders.map((leader) => {
            const player = leader.player!;
            const stats = player.season_stats;
            const Icon = leader.icon;

            return (
              <div
                key={leader.title}
                className={`flex items-center gap-3 p-3 rounded-lg ${leader.bgColor}`}
              >
                <div className={`p-2 rounded-lg bg-gray-800`}>
                  <Icon className={`h-4 w-4 ${leader.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{leader.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">
                      {player.first_name} {player.last_name}
                    </span>
                    <Badge variant="outline" className="text-gray-400 text-xs">
                      {player.position}
                    </Badge>
                  </div>
                  {/* Additional stats line */}
                  {stats && hasBatterStats(stats) && leader.title !== 'Ace Pitcher' && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {stats.battingAvg !== undefined ? formatAvg(stats.battingAvg) : '-'} AVG / {stats.ops !== undefined ? formatAvg(stats.ops) : '-'} OPS
                    </div>
                  )}
                  {stats && hasPitcherStats(stats) && leader.title === 'Ace Pitcher' && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {stats.wins ?? 0}-{stats.losses ?? 0} / {stats.strikeouts ?? 0} SO
                    </div>
                  )}
                </div>
                <div className={`text-lg font-bold ${leader.color}`}>
                  {leader.stat}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
