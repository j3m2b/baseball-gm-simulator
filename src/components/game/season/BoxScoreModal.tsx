'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getBoxScore } from '@/lib/actions/game';
import type { GameResult, BatterBoxScore, PitcherBoxScore } from '@/lib/types';

interface BoxScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  gameResultId: string | null;
}

export default function BoxScoreModal({
  isOpen,
  onClose,
  gameId,
  gameResultId,
}: BoxScoreModalProps) {
  const [boxScore, setBoxScore] = useState<GameResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('batting');

  useEffect(() => {
    if (isOpen && gameResultId) {
      loadBoxScore();
    }
  }, [isOpen, gameResultId]);

  async function loadBoxScore() {
    if (!gameResultId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getBoxScore(gameId, gameResultId);
      if (result.success && result.boxScore) {
        setBoxScore(result.boxScore);
      } else {
        setError(result.error || 'Failed to load box score');
      }
    } catch (err) {
      setError('Failed to load box score');
    } finally {
      setIsLoading(false);
    }
  }

  function formatInningsPitched(ip: number): string {
    const whole = Math.floor(ip);
    const fraction = ip - whole;
    if (fraction === 0) return `${whole}.0`;
    if (fraction < 0.4) return `${whole}.1`;
    if (fraction < 0.7) return `${whole}.2`;
    return `${whole}.0`;
  }

  if (!boxScore) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Box Score</DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center">
            {isLoading ? (
              <div className="animate-pulse text-gray-400">Loading box score...</div>
            ) : error ? (
              <div className="text-red-400">{error}</div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-white text-xl mb-1">
                Game {boxScore.gameNumber}
              </DialogTitle>
              <p className="text-sm text-gray-400">
                {boxScore.isHome ? 'vs' : '@'} {boxScore.opponentName}
              </p>
            </div>
            <Badge
              className={`text-lg px-3 py-1 ${
                boxScore.isWin ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              {boxScore.isWin ? 'W' : 'L'} {boxScore.playerRuns}-{boxScore.opponentRuns}
            </Badge>
          </div>
        </DialogHeader>

        {/* Line Score */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Line Score</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-gray-400 min-w-[120px]">Team</th>
                  {boxScore.playerLineScore.map((_, i) => (
                    <th key={i} className="text-center py-2 px-2 text-gray-400 w-8">
                      {i + 1}
                    </th>
                  ))}
                  <th className="text-center py-2 px-2 text-gray-400 font-bold border-l border-gray-700 w-10">R</th>
                  <th className="text-center py-2 px-2 text-gray-400 font-bold w-10">H</th>
                  <th className="text-center py-2 px-2 text-gray-400 font-bold w-10">E</th>
                </tr>
              </thead>
              <tbody>
                {/* Away team (or opponent if home) */}
                <tr className="border-b border-gray-800">
                  <td className="py-2 px-3 text-white">
                    {boxScore.isHome ? boxScore.opponentName : boxScore.playerTeamName}
                  </td>
                  {(boxScore.isHome ? boxScore.opponentLineScore : boxScore.playerLineScore).map(
                    (runs, i) => (
                      <td key={i} className="text-center py-2 px-2 text-gray-300">
                        {runs}
                      </td>
                    )
                  )}
                  <td className="text-center py-2 px-2 text-white font-bold border-l border-gray-700">
                    {boxScore.isHome ? boxScore.opponentRuns : boxScore.playerRuns}
                  </td>
                  <td className="text-center py-2 px-2 text-white font-bold">
                    {boxScore.isHome ? boxScore.opponentHits : boxScore.playerHits}
                  </td>
                  <td className="text-center py-2 px-2 text-white font-bold">
                    {boxScore.isHome ? boxScore.opponentErrors : boxScore.playerErrors}
                  </td>
                </tr>
                {/* Home team (or player team if home) */}
                <tr>
                  <td className="py-2 px-3 text-white">
                    {boxScore.isHome ? boxScore.playerTeamName : boxScore.opponentName}
                  </td>
                  {(boxScore.isHome ? boxScore.playerLineScore : boxScore.opponentLineScore).map(
                    (runs, i) => (
                      <td key={i} className="text-center py-2 px-2 text-gray-300">
                        {runs}
                      </td>
                    )
                  )}
                  <td className="text-center py-2 px-2 text-white font-bold border-l border-gray-700">
                    {boxScore.isHome ? boxScore.playerRuns : boxScore.opponentRuns}
                  </td>
                  <td className="text-center py-2 px-2 text-white font-bold">
                    {boxScore.isHome ? boxScore.playerHits : boxScore.opponentHits}
                  </td>
                  <td className="text-center py-2 px-2 text-white font-bold">
                    {boxScore.isHome ? boxScore.playerErrors : boxScore.opponentErrors}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="bg-gray-800 border border-gray-700">
            <TabsTrigger value="batting" className="data-[state=active]:bg-gray-700">
              Batting
            </TabsTrigger>
            <TabsTrigger value="pitching" className="data-[state=active]:bg-gray-700">
              Pitching
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batting" className="mt-4">
            <BattingStatsTable batters={boxScore.battingStats} teamName={boxScore.playerTeamName} />
          </TabsContent>

          <TabsContent value="pitching" className="mt-4">
            <PitchingStatsTable pitchers={boxScore.pitchingStats} teamName={boxScore.playerTeamName} />
          </TabsContent>
        </Tabs>

        {/* Game Info */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
          <span>Attendance: {boxScore.attendance.toLocaleString()}</span>
          {boxScore.gameDurationMinutes && (
            <span>
              Duration: {Math.floor(boxScore.gameDurationMinutes / 60)}:
              {(boxScore.gameDurationMinutes % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BattingStatsTable({
  batters,
  teamName,
}: {
  batters: BatterBoxScore[];
  teamName: string;
}) {
  if (batters.length === 0) {
    return <div className="text-gray-400 py-4">No batting stats available</div>;
  }

  // Calculate totals
  const totals = batters.reduce(
    (acc, b) => ({
      ab: acc.ab + b.ab,
      r: acc.r + b.r,
      h: acc.h + b.h,
      doubles: acc.doubles + b.doubles,
      triples: acc.triples + b.triples,
      hr: acc.hr + b.hr,
      rbi: acc.rbi + b.rbi,
      bb: acc.bb + b.bb,
      so: acc.so + b.so,
      sb: acc.sb + b.sb,
    }),
    { ab: 0, r: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, so: 0, sb: 0 }
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-2 px-3 text-gray-400 min-w-[150px]">{teamName}</th>
            <th className="text-center py-2 px-2 text-gray-400">AB</th>
            <th className="text-center py-2 px-2 text-gray-400">R</th>
            <th className="text-center py-2 px-2 text-gray-400">H</th>
            <th className="text-center py-2 px-2 text-gray-400">2B</th>
            <th className="text-center py-2 px-2 text-gray-400">3B</th>
            <th className="text-center py-2 px-2 text-gray-400">HR</th>
            <th className="text-center py-2 px-2 text-gray-400">RBI</th>
            <th className="text-center py-2 px-2 text-gray-400">BB</th>
            <th className="text-center py-2 px-2 text-gray-400">SO</th>
            <th className="text-center py-2 px-2 text-gray-400">SB</th>
            <th className="text-center py-2 px-2 text-gray-400">AVG</th>
          </tr>
        </thead>
        <tbody>
          {batters.map((batter, i) => (
            <tr key={batter.playerId || i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="py-2 px-3">
                <div className="text-white">{batter.name}</div>
                <div className="text-xs text-gray-500">{batter.position}</div>
              </td>
              <td className="text-center py-2 px-2 text-gray-300">{batter.ab}</td>
              <td className="text-center py-2 px-2 text-gray-300">{batter.r}</td>
              <td className="text-center py-2 px-2 text-gray-300">{batter.h}</td>
              <td className="text-center py-2 px-2 text-gray-300">{batter.doubles}</td>
              <td className="text-center py-2 px-2 text-gray-300">{batter.triples}</td>
              <td className="text-center py-2 px-2 text-gray-300">{batter.hr}</td>
              <td className="text-center py-2 px-2 text-gray-300">{batter.rbi}</td>
              <td className="text-center py-2 px-2 text-gray-300">{batter.bb}</td>
              <td className="text-center py-2 px-2 text-gray-300">{batter.so}</td>
              <td className="text-center py-2 px-2 text-gray-300">{batter.sb}</td>
              <td className="text-center py-2 px-2 text-gray-300">
                {batter.ab > 0 ? (batter.h / batter.ab).toFixed(3).slice(1) : '.000'}
              </td>
            </tr>
          ))}
          {/* Totals Row */}
          <tr className="bg-gray-800/50 font-medium">
            <td className="py-2 px-3 text-white">Totals</td>
            <td className="text-center py-2 px-2 text-white">{totals.ab}</td>
            <td className="text-center py-2 px-2 text-white">{totals.r}</td>
            <td className="text-center py-2 px-2 text-white">{totals.h}</td>
            <td className="text-center py-2 px-2 text-white">{totals.doubles}</td>
            <td className="text-center py-2 px-2 text-white">{totals.triples}</td>
            <td className="text-center py-2 px-2 text-white">{totals.hr}</td>
            <td className="text-center py-2 px-2 text-white">{totals.rbi}</td>
            <td className="text-center py-2 px-2 text-white">{totals.bb}</td>
            <td className="text-center py-2 px-2 text-white">{totals.so}</td>
            <td className="text-center py-2 px-2 text-white">{totals.sb}</td>
            <td className="text-center py-2 px-2 text-white">
              {totals.ab > 0 ? (totals.h / totals.ab).toFixed(3).slice(1) : '.000'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PitchingStatsTable({
  pitchers,
  teamName,
}: {
  pitchers: PitcherBoxScore[];
  teamName: string;
}) {
  if (pitchers.length === 0) {
    return <div className="text-gray-400 py-4">No pitching stats available</div>;
  }

  function formatIP(ip: number): string {
    const whole = Math.floor(ip);
    const fraction = Math.round((ip - whole) * 10);
    return `${whole}.${Math.min(fraction, 2)}`;
  }

  // Calculate totals
  const totals = pitchers.reduce(
    (acc, p) => ({
      ip: acc.ip + p.ip,
      h: acc.h + p.h,
      r: acc.r + p.r,
      er: acc.er + p.er,
      bb: acc.bb + p.bb,
      so: acc.so + p.so,
      hr: acc.hr + p.hr,
      pitchCount: acc.pitchCount + p.pitchCount,
    }),
    { ip: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0, pitchCount: 0 }
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-2 px-3 text-gray-400 min-w-[150px]">{teamName}</th>
            <th className="text-center py-2 px-2 text-gray-400">IP</th>
            <th className="text-center py-2 px-2 text-gray-400">H</th>
            <th className="text-center py-2 px-2 text-gray-400">R</th>
            <th className="text-center py-2 px-2 text-gray-400">ER</th>
            <th className="text-center py-2 px-2 text-gray-400">BB</th>
            <th className="text-center py-2 px-2 text-gray-400">SO</th>
            <th className="text-center py-2 px-2 text-gray-400">HR</th>
            <th className="text-center py-2 px-2 text-gray-400">PC</th>
            <th className="text-center py-2 px-2 text-gray-400">ERA</th>
          </tr>
        </thead>
        <tbody>
          {pitchers.map((pitcher, i) => (
            <tr key={pitcher.playerId || i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <span className="text-white">{pitcher.name}</span>
                  {pitcher.isWin && (
                    <Badge className="bg-green-600/30 text-green-400 text-xs">W</Badge>
                  )}
                  {pitcher.isLoss && (
                    <Badge className="bg-red-600/30 text-red-400 text-xs">L</Badge>
                  )}
                  {pitcher.isSave && (
                    <Badge className="bg-blue-600/30 text-blue-400 text-xs">SV</Badge>
                  )}
                  {pitcher.isHold && (
                    <Badge className="bg-amber-600/30 text-amber-400 text-xs">H</Badge>
                  )}
                </div>
              </td>
              <td className="text-center py-2 px-2 text-gray-300">{formatIP(pitcher.ip)}</td>
              <td className="text-center py-2 px-2 text-gray-300">{pitcher.h}</td>
              <td className="text-center py-2 px-2 text-gray-300">{pitcher.r}</td>
              <td className="text-center py-2 px-2 text-gray-300">{pitcher.er}</td>
              <td className="text-center py-2 px-2 text-gray-300">{pitcher.bb}</td>
              <td className="text-center py-2 px-2 text-gray-300">{pitcher.so}</td>
              <td className="text-center py-2 px-2 text-gray-300">{pitcher.hr}</td>
              <td className="text-center py-2 px-2 text-gray-300">{pitcher.pitchCount}</td>
              <td className="text-center py-2 px-2 text-gray-300">
                {pitcher.ip > 0 ? ((pitcher.er * 9) / pitcher.ip).toFixed(2) : '-'}
              </td>
            </tr>
          ))}
          {/* Totals Row */}
          <tr className="bg-gray-800/50 font-medium">
            <td className="py-2 px-3 text-white">Totals</td>
            <td className="text-center py-2 px-2 text-white">{formatIP(totals.ip)}</td>
            <td className="text-center py-2 px-2 text-white">{totals.h}</td>
            <td className="text-center py-2 px-2 text-white">{totals.r}</td>
            <td className="text-center py-2 px-2 text-white">{totals.er}</td>
            <td className="text-center py-2 px-2 text-white">{totals.bb}</td>
            <td className="text-center py-2 px-2 text-white">{totals.so}</td>
            <td className="text-center py-2 px-2 text-white">{totals.hr}</td>
            <td className="text-center py-2 px-2 text-white">{totals.pitchCount}</td>
            <td className="text-center py-2 px-2 text-white">
              {totals.ip > 0 ? ((totals.er * 9) / totals.ip).toFixed(2) : '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
