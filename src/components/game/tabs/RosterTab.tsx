'use client';

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
}

interface RosterTabProps {
  roster: Player[];
  gameId: string;
}

export default function RosterTab({ roster, gameId }: RosterTabProps) {
  // Separate pitchers and hitters
  const pitchers = roster.filter(p => p.player_type === 'PITCHER');
  const hitters = roster.filter(p => p.player_type === 'HITTER');

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

  function formatPosition(position: string) {
    return position;
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

  const PlayerTable = ({ players, title }: { players: Player[]; title: string }) => (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {title}
          <Badge variant="outline" className="text-gray-400">
            {players.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {players.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            No {title.toLowerCase()} on roster. Draft players to build your team!
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead className="text-gray-400">Name</TableHead>
                <TableHead className="text-gray-400">Pos</TableHead>
                <TableHead className="text-gray-400">Age</TableHead>
                <TableHead className="text-gray-400 text-center">Rating</TableHead>
                <TableHead className="text-gray-400 text-center">Potential</TableHead>
                <TableHead className="text-gray-400 text-center">Morale</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow
                  key={player.id}
                  className="border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                >
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
                  <TableCell className="text-gray-300">
                    {formatPosition(player.position)}
                  </TableCell>
                  <TableCell className="text-gray-300">{player.age}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-mono font-bold ${getRatingColor(player.current_rating)}`}>
                      {player.current_rating}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-mono ${getRatingColor(player.potential)}`}>
                      {player.potential}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-12 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            player.morale >= 60
                              ? 'bg-green-500'
                              : player.morale >= 40
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${player.morale}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{player.morale}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(player)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Roster Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{roster.length}/25</div>
            <p className="text-sm text-gray-400">Total Players</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{pitchers.length}</div>
            <p className="text-sm text-gray-400">Pitchers</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-white">{hitters.length}</div>
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

      {/* Player Tables */}
      <PlayerTable players={pitchers} title="Pitchers" />
      <PlayerTable players={hitters} title="Position Players" />

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
