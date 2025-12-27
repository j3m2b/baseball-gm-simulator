'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  initializePlayoffs,
  getPlayoffBracket,
  simulatePlayoffSeriesGame,
  simulateEntireSeries,
  advancePlayoffs,
  type PlayoffBracketData,
  type PlayoffSeriesData,
  type PlayoffGameData,
} from '@/lib/actions/game';
import { toast } from 'sonner';

interface PlayoffBracketProps {
  gameId: string;
  teamName: string;
  onChampionshipWon?: () => void;
  onPlayoffsComplete?: () => void;
}

export default function PlayoffBracket({
  gameId,
  teamName,
  onChampionshipWon,
  onPlayoffsComplete,
}: PlayoffBracketProps) {
  const [bracket, setBracket] = useState<PlayoffBracketData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null);
  const [showChampionship, setShowChampionship] = useState(false);

  const loadBracket = useCallback(async () => {
    setIsLoading(true);
    try {
      // First try to get existing bracket
      let result = await getPlayoffBracket(gameId);

      // If no bracket exists, initialize it
      if (!result.success || !result.bracket) {
        result = await initializePlayoffs(gameId);
      }

      if (result.success && result.bracket) {
        setBracket(result.bracket);

        // Check if playoffs just completed with player as champion
        if (result.bracket.status === 'complete' && result.bracket.championTeamId === 'player') {
          setShowChampionship(true);
        }
      }
    } catch (err) {
      toast.error('Failed to load playoff bracket');
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadBracket();
  }, [loadBracket]);

  const handleSimulateGame = async (seriesId: string) => {
    if (isSimulating) return;

    setIsSimulating(true);
    setActiveSeriesId(seriesId);

    try {
      const result = await simulatePlayoffSeriesGame(gameId, seriesId);

      if (result.success && result.game) {
        // Reload bracket to get updated state
        await loadBracket();

        if (result.seriesComplete) {
          toast.success(`Series complete! ${result.winnerName} wins!`);

          // Try to advance playoffs
          const advanceResult = await advancePlayoffs(gameId);
          if (advanceResult.success) {
            await loadBracket();

            if (advanceResult.newRound === 'complete') {
              if (advanceResult.championId === 'player') {
                setShowChampionship(true);
                onChampionshipWon?.();
              } else {
                onPlayoffsComplete?.();
              }
            }
          }
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('Failed to simulate game');
    } finally {
      setIsSimulating(false);
      setActiveSeriesId(null);
    }
  };

  const handleSimulateSeries = async (seriesId: string) => {
    if (isSimulating) return;

    setIsSimulating(true);
    setActiveSeriesId(seriesId);

    try {
      const result = await simulateEntireSeries(gameId, seriesId);

      if (result.success) {
        toast.success(`${result.winnerName} wins the series ${result.team1Wins}-${result.team2Wins}!`);

        // Try to advance playoffs
        const advanceResult = await advancePlayoffs(gameId);
        if (advanceResult.success) {
          await loadBracket();

          if (advanceResult.newRound === 'complete') {
            if (advanceResult.championId === 'player') {
              setShowChampionship(true);
              onChampionshipWon?.();
            } else {
              onPlayoffsComplete?.();
            }
          }
        } else {
          await loadBracket();
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('Failed to simulate series');
    } finally {
      setIsSimulating(false);
      setActiveSeriesId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-12 text-center">
          <div className="animate-pulse text-gray-400">Loading playoffs...</div>
        </CardContent>
      </Card>
    );
  }

  if (!bracket) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-12 text-center text-gray-400">
          Playoffs not available
        </CardContent>
      </Card>
    );
  }

  // Championship celebration overlay
  if (showChampionship && bracket.championTeamId === 'player') {
    return (
      <div className="relative">
        <Card className="bg-gradient-to-br from-yellow-900/40 via-amber-800/30 to-yellow-900/40 border-yellow-500 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent"></div>
          <CardContent className="py-16 text-center relative z-10">
            <div className="mb-6">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-4xl font-bold text-yellow-400 mb-2">CHAMPIONS!</h2>
              <p className="text-2xl text-yellow-200">{teamName}</p>
            </div>

            <div className="max-w-md mx-auto bg-gray-900/60 rounded-lg p-6 mb-6">
              <p className="text-gray-300 mb-4">
                Congratulations! Your team has won the championship, proving themselves as the best in the league!
              </p>
              <div className="flex justify-center gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">Year {bracket.year}</div>
                  <div className="text-gray-400">Champions</div>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                setShowChampionship(false);
                onPlayoffsComplete?.();
              }}
              className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-8"
            >
              Continue to Offseason
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-900/30 to-blue-800/10 border-blue-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl text-blue-400">
              Year {bracket.year} Playoffs
            </CardTitle>
            <Badge className={
              bracket.status === 'complete' ? 'bg-green-600' :
              bracket.status === 'finals' ? 'bg-yellow-600' :
              'bg-blue-600'
            }>
              {bracket.status === 'complete' ? 'Complete' :
               bracket.status === 'finals' ? 'Finals' :
               'Semifinals'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Bracket Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Semifinals Column */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-400 text-center">Semifinals</h3>
          {bracket.semifinals.map((series) => (
            <SeriesCard
              key={series.id}
              series={series}
              isActive={activeSeriesId === series.id}
              isSimulating={isSimulating}
              canSimulate={series.status !== 'complete'}
              onSimulateGame={() => handleSimulateGame(series.id)}
              onSimulateSeries={() => handleSimulateSeries(series.id)}
            />
          ))}
        </div>

        {/* Finals Column */}
        <div className="lg:col-span-2 flex items-center justify-center">
          {bracket.finals ? (
            <div className="w-full max-w-md">
              <h3 className="text-lg font-semibold text-yellow-400 text-center mb-4">Championship Finals</h3>
              <SeriesCard
                series={bracket.finals}
                isActive={activeSeriesId === bracket.finals.id}
                isSimulating={isSimulating}
                canSimulate={bracket.finals.status !== 'complete'}
                onSimulateGame={() => handleSimulateGame(bracket.finals!.id)}
                onSimulateSeries={() => handleSimulateSeries(bracket.finals!.id)}
                isFinals
              />
            </div>
          ) : bracket.status === 'semifinals' ? (
            <Card className="bg-gray-800/50 border-gray-700 border-dashed w-full max-w-md">
              <CardContent className="py-12 text-center text-gray-500">
                <div className="text-4xl mb-4">🏆</div>
                <p>Finals matchup will be determined after semifinals</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Complete playoffs notification */}
      {bracket.status === 'complete' && bracket.championTeamId !== 'player' && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-6 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <h3 className="text-xl font-bold text-gray-300 mb-2">
              {bracket.championTeamName} are the Champions!
            </h3>
            <p className="text-gray-400 mb-4">
              Better luck next season. Use the offseason to improve your team!
            </p>
            <Button
              onClick={() => onPlayoffsComplete?.()}
              className="bg-gray-600 hover:bg-gray-500"
            >
              Continue to Offseason
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual Series Card Component
interface SeriesCardProps {
  series: PlayoffSeriesData;
  isActive: boolean;
  isSimulating: boolean;
  canSimulate: boolean;
  onSimulateGame: () => void;
  onSimulateSeries: () => void;
  isFinals?: boolean;
}

function SeriesCard({
  series,
  isActive,
  isSimulating,
  canSimulate,
  onSimulateGame,
  onSimulateSeries,
  isFinals = false,
}: SeriesCardProps) {
  const isPlayerInSeries = series.team1.id === 'player' || series.team2.id === 'player';
  const playerTeam = series.team1.id === 'player' ? series.team1 : series.team2.id === 'player' ? series.team2 : null;
  const isPlayerWinner = series.winnerId === 'player';
  const isSeriesComplete = series.status === 'complete';

  return (
    <Card className={`
      ${isFinals ? 'border-yellow-600/50 bg-yellow-900/10' : 'border-gray-700 bg-gray-800'}
      ${isPlayerInSeries && !isSeriesComplete ? 'ring-1 ring-blue-500/30' : ''}
      ${isSeriesComplete && isPlayerWinner ? 'ring-1 ring-green-500/30' : ''}
      ${isSeriesComplete && isPlayerInSeries && !isPlayerWinner ? 'ring-1 ring-red-500/30' : ''}
    `}>
      <CardContent className="p-4">
        {/* Series Matchup */}
        <div className="space-y-3 mb-4">
          <TeamRow
            team={series.team1}
            wins={series.team1Wins}
            isWinner={series.winnerId === series.team1.id}
            isSeriesComplete={isSeriesComplete}
          />
          <div className="text-center text-gray-500 text-xs">VS</div>
          <TeamRow
            team={series.team2}
            wins={series.team2Wins}
            isWinner={series.winnerId === series.team2.id}
            isSeriesComplete={isSeriesComplete}
          />
        </div>

        {/* Series Score */}
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-white">
            {series.team1Wins} - {series.team2Wins}
          </div>
          <div className="text-xs text-gray-400">
            {isSeriesComplete ? 'Final' : `Best of 5 - First to 3`}
          </div>
        </div>

        {/* Game Results */}
        {series.games.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">Game Results</div>
            <div className="flex gap-1 justify-center">
              {series.games.map((game) => (
                <GameResultBadge key={game.id} game={game} series={series} />
              ))}
              {/* Show remaining games as empty */}
              {[...Array(5 - series.games.length)].map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="w-8 h-8 rounded bg-gray-700/30 flex items-center justify-center text-xs text-gray-500"
                >
                  {series.games.length + idx + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulation Controls */}
        {canSimulate && (
          <div className="flex gap-2">
            <Button
              onClick={onSimulateGame}
              disabled={isSimulating}
              variant="outline"
              size="sm"
              className="flex-1 border-gray-600"
            >
              {isActive && isSimulating ? 'Simulating...' : 'Next Game'}
            </Button>
            <Button
              onClick={onSimulateSeries}
              disabled={isSimulating}
              size="sm"
              className={`flex-1 ${isFinals ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
              {isActive && isSimulating ? 'Simulating...' : 'Sim Series'}
            </Button>
          </div>
        )}

        {/* Winner Badge */}
        {isSeriesComplete && (
          <div className="text-center">
            <Badge className={isPlayerWinner ? 'bg-green-600' : 'bg-gray-600'}>
              {series.winnerName} advances!
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Team Row Component
interface TeamRowProps {
  team: PlayoffSeriesData['team1'];
  wins: number;
  isWinner: boolean;
  isSeriesComplete: boolean;
}

function TeamRow({ team, wins, isWinner, isSeriesComplete }: TeamRowProps) {
  const isPlayer = team.id === 'player';

  return (
    <div className={`
      flex items-center justify-between p-2 rounded
      ${isPlayer ? 'bg-blue-900/20' : 'bg-gray-700/30'}
      ${isSeriesComplete && isWinner ? 'ring-1 ring-green-500/50' : ''}
      ${isSeriesComplete && !isWinner ? 'opacity-50' : ''}
    `}>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs border-gray-600">
          #{team.seed}
        </Badge>
        <span className={`text-sm font-medium ${isPlayer ? 'text-blue-400' : 'text-white'}`}>
          {team.name}
        </span>
      </div>
      <div className="text-lg font-bold text-white">{wins}</div>
    </div>
  );
}

// Game Result Badge Component
interface GameResultBadgeProps {
  game: PlayoffGameData;
  series: PlayoffSeriesData;
}

function GameResultBadge({ game, series }: GameResultBadgeProps) {
  const isTeam1Winner = game.winnerId === series.team1.id;
  const isPlayerInvolved = series.team1.id === 'player' || series.team2.id === 'player';
  const playerWonGame = game.winnerId === 'player';

  return (
    <div
      className={`
        w-8 h-8 rounded flex items-center justify-center text-xs font-bold
        ${isPlayerInvolved
          ? playerWonGame
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
          : isTeam1Winner
            ? 'bg-blue-600 text-white'
            : 'bg-gray-600 text-white'
        }
      `}
      title={`Game ${game.gameNumber}: ${game.homeScore}-${game.awayScore}`}
    >
      {game.gameNumber}
    </div>
  );
}
