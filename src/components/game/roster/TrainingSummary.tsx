'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTrainingSummary } from '@/lib/actions/game';
import { TRAINING_FOCUS_CONFIG, type TrainingFocus } from '@/lib/types';

interface TrainingSummaryProps {
  gameId: string;
}

interface TrainingSummaryData {
  trainingMult: number;
  facilityBonus: number;
  totalBonus: number;
  avgProgressionRate: number;
  estimatedXpPerGame: number;
  estimatedGamesToLevelUp: number;
  playerBreakdown: Array<{
    playerId: string;
    playerName: string;
    trainingFocus: TrainingFocus;
    currentXp: number;
    progressionRate: number;
    estimatedGamesToNextLevel: number;
  }>;
}

export default function TrainingSummary({ gameId }: TrainingSummaryProps) {
  const [summary, setSummary] = useState<TrainingSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, [gameId]);

  async function loadSummary() {
    setIsLoading(true);
    try {
      const result = await getTrainingSummary(gameId);
      if (result.success && result.summary) {
        setSummary(result.summary);
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-6 text-center">
          <div className="animate-pulse text-gray-400">Loading training data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const bonusPercentage = ((summary.totalBonus - 1) * 100).toFixed(0);

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Player Development</CardTitle>
          {summary.totalBonus > 1 && (
            <Badge className="bg-green-600">+{bonusPercentage}% Training Bonus</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bonus Breakdown */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-red-400">
              {((summary.trainingMult - 1) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-gray-400">Performance District</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-400">
              {((summary.facilityBonus - 1) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-gray-400">Facility Bonus</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-amber-400">
              ~{summary.estimatedGamesToLevelUp}
            </div>
            <p className="text-xs text-gray-400">Games to Level Up</p>
          </div>
        </div>

        {/* Training Focus Distribution */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Training Focus Distribution</h4>
          <TrainingFocusChart players={summary.playerBreakdown} />
        </div>

        {/* Players Close to Leveling Up */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Close to Improvement</h4>
          <div className="space-y-1">
            {summary.playerBreakdown
              .filter(p => p.currentXp >= 70)
              .sort((a, b) => b.currentXp - a.currentXp)
              .slice(0, 3)
              .map(player => (
                <div
                  key={player.playerId}
                  className="flex items-center justify-between bg-gray-800 rounded px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">{player.playerName}</span>
                    <Badge variant="outline" className="text-xs border-gray-600">
                      {TRAINING_FOCUS_CONFIG[player.trainingFocus].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-700 rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${player.currentXp}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{player.currentXp}%</span>
                  </div>
                </div>
              ))}
            {summary.playerBreakdown.filter(p => p.currentXp >= 70).length === 0 && (
              <p className="text-sm text-gray-500 text-center py-2">
                No players close to leveling up yet
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrainingFocusChart({
  players,
}: {
  players: Array<{ trainingFocus: TrainingFocus }>;
}) {
  const focusCounts: Record<string, number> = {};

  for (const player of players) {
    const label = TRAINING_FOCUS_CONFIG[player.trainingFocus].label;
    focusCounts[label] = (focusCounts[label] || 0) + 1;
  }

  const total = players.length;
  const sortedFocuses = Object.entries(focusCounts)
    .sort(([, a], [, b]) => b - a);

  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-red-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-gray-500',
  ];

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="h-4 rounded overflow-hidden flex">
        {sortedFocuses.map(([label, count], i) => (
          <div
            key={label}
            className={`${colors[i % colors.length]} transition-all`}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${label}: ${count}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {sortedFocuses.map(([label, count], i) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
            <span className="text-xs text-gray-400">
              {label}: {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
