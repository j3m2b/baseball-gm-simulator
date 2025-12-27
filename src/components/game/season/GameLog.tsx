'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getGameLog } from '@/lib/actions/game';
import type { GameLogEntry } from '@/lib/types';
import BoxScoreModal from './BoxScoreModal';

interface GameLogProps {
  gameId: string;
  currentYear: number;
  gamesPlayed: number;
}

export default function GameLog({ gameId, currentYear, gamesPlayed }: GameLogProps) {
  const [games, setGames] = useState<GameLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [isBoxScoreOpen, setIsBoxScoreOpen] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    loadGames();
  }, [gameId, currentYear, page]);

  async function loadGames() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getGameLog(gameId, currentYear, pageSize, page * pageSize);
      if (result.success && result.games) {
        setGames(result.games);
        setTotal(result.total || 0);
      } else {
        setError(result.error || 'Failed to load games');
      }
    } catch (err) {
      setError('Failed to load games');
    } finally {
      setIsLoading(false);
    }
  }

  function handleGameClick(game: GameLogEntry) {
    setSelectedGameId(game.id);
    setIsBoxScoreOpen(true);
  }

  function calculateStreak(games: GameLogEntry[]): string {
    if (games.length === 0) return '-';

    const firstResult = games[0].isWin;
    let streak = 0;

    for (const game of games) {
      if (game.isWin === firstResult) {
        streak++;
      } else {
        break;
      }
    }

    return firstResult ? `W${streak}` : `L${streak}`;
  }

  function getLast10Record(games: GameLogEntry[]): string {
    const last10 = games.slice(0, 10);
    const wins = last10.filter(g => g.isWin).length;
    const losses = last10.length - wins;
    return `${wins}-${losses}`;
  }

  if (games.length === 0 && !isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">Game Log</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-8">
            No games played yet. Simulate some games to see your game log!
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Game Log</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">
                Streak: <span className="text-white font-medium">{calculateStreak(games)}</span>
              </span>
              <span className="text-gray-400">
                Last 10: <span className="text-white font-medium">{getLast10Record(games)}</span>
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse text-gray-400 text-center py-8">Loading games...</div>
          ) : error ? (
            <div className="text-red-400 text-center py-8">{error}</div>
          ) : (
            <>
              {/* Game List */}
              <div className="space-y-1">
                {games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleGameClick(game)}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-800/50 transition-colors flex items-center gap-4"
                  >
                    {/* Game Number */}
                    <div className="w-10 text-gray-500 text-sm">#{game.gameNumber}</div>

                    {/* Result Badge */}
                    <Badge
                      className={`w-8 justify-center ${
                        game.isWin ? 'bg-green-600' : 'bg-red-600'
                      }`}
                    >
                      {game.isWin ? 'W' : 'L'}
                    </Badge>

                    {/* Score */}
                    <div className="w-16 font-mono text-white">
                      {game.playerRuns}-{game.opponentRuns}
                    </div>

                    {/* Home/Away & Opponent */}
                    <div className="flex-1">
                      <span className="text-gray-400 mr-1">{game.isHome ? 'vs' : '@'}</span>
                      <span className="text-white">{game.opponentName}</span>
                    </div>

                    {/* Hits */}
                    <div className="text-gray-400 text-sm w-20 text-right">
                      H: {game.playerHits}-{game.opponentHits}
                    </div>

                    {/* Attendance (only for home games) */}
                    {game.isHome && (
                      <div className="text-gray-500 text-sm w-24 text-right">
                        {game.attendance.toLocaleString()}
                      </div>
                    )}
                    {!game.isHome && <div className="w-24" />}

                    {/* View Details Icon */}
                    <div className="text-gray-500">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                    className="border-gray-700"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-400">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages - 1}
                    className="border-gray-700"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Box Score Modal */}
      <BoxScoreModal
        isOpen={isBoxScoreOpen}
        onClose={() => {
          setIsBoxScoreOpen(false);
          setSelectedGameId(null);
        }}
        gameId={gameId}
        gameResultId={selectedGameId}
      />
    </>
  );
}
