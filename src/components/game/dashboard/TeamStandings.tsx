'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SeasonRecord {
  wins: number;
  losses: number;
  winPct: number;
  divisionRank: number;
  gamesBack: number;
  expectedWins: number;
  expectedLosses: number;
  pythagoreanLuck: number; // Actual wins - Expected wins
}

interface TeamStandingsProps {
  seasonRecord: SeasonRecord | null;
  teamName: string;
  tier: string;
}

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

export default function TeamStandings({ seasonRecord, teamName, tier }: TeamStandingsProps) {
  if (!seasonRecord) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Season Record</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">
            No season data yet. Complete a season to see your record.
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    wins,
    losses,
    winPct,
    divisionRank,
    gamesBack,
    expectedWins,
    expectedLosses,
    pythagoreanLuck,
  } = seasonRecord;

  // Determine luck indicator
  const isLucky = pythagoreanLuck > 0;
  const isUnlucky = pythagoreanLuck < 0;
  const luckText = isLucky
    ? `+${pythagoreanLuck.toFixed(0)} lucky wins`
    : isUnlucky
    ? `${pythagoreanLuck.toFixed(0)} unlucky losses`
    : 'Performing as expected';

  // Determine rank suffix
  const getRankSuffix = (rank: number): string => {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  };

  // Determine playoff position badge
  const getPlayoffBadge = () => {
    if (divisionRank === 1) {
      return <Badge className="bg-amber-600 text-white">Division Leader</Badge>;
    }
    if (divisionRank <= 4) {
      return <Badge className="bg-green-600 text-white">Playoff Position</Badge>;
    }
    return <Badge className="bg-gray-600 text-white">Out of Playoffs</Badge>;
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Season Record</span>
          <Badge variant="outline" className="text-gray-400">
            {formatTier(tier)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Record Display */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold text-white">
              {wins}-{losses}
            </div>
            <div className="text-sm text-gray-400">
              {(winPct * 100).toFixed(1)}% Win Rate
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-400">
              {divisionRank}{getRankSuffix(divisionRank)}
            </div>
            <div className="text-sm text-gray-400">
              {gamesBack > 0 ? `${gamesBack.toFixed(1)} GB` : 'Leading'}
            </div>
          </div>
        </div>

        {/* Playoff Status */}
        <div className="flex justify-center">
          {getPlayoffBadge()}
        </div>

        {/* Pythagorean Luck Section */}
        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Expected Record</span>
            <span className="font-mono text-gray-300">
              {expectedWins.toFixed(0)}-{expectedLosses.toFixed(0)}
            </span>
          </div>

          {/* Luck Indicator */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-gray-400 text-sm">Pythagorean Luck</span>
            <div className="flex items-center gap-2">
              {isLucky ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : isUnlucky ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-gray-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  isLucky ? 'text-green-500' : isUnlucky ? 'text-red-500' : 'text-gray-400'
                }`}
              >
                {luckText}
              </span>
            </div>
          </div>

          {/* Explanation tooltip-like text */}
          <p className="text-xs text-gray-500 mt-2">
            Based on runs scored vs. allowed (Pythagorean Expectation)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
