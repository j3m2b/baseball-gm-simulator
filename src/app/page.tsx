'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createGame, getSavedGames } from '@/lib/actions/game';
import { useEffect } from 'react';

interface SavedGame {
  id: string;
  city_name: string;
  team_name: string;
  current_year: number;
  current_tier: string;
  current_phase: string;
  updated_at: string;
}

export default function Home() {
  const router = useRouter();
  const [isNewGameOpen, setIsNewGameOpen] = useState(false);
  const [isLoadGameOpen, setIsLoadGameOpen] = useState(false);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGames() {
      const games = await getSavedGames();
      setSavedGames(games);
    }
    loadGames();
  }, []);

  async function handleCreateGame(formData: FormData) {
    setIsCreating(true);
    setError(null);

    try {
      const result = await createGame(formData);
      if (result?.error) {
        setError(result.error);
        setIsCreating(false);
      } else if (result?.gameId) {
        router.push(`/game/${result.gameId}`);
      }
    } catch {
      setError('Failed to create game. Please try again.');
      setIsCreating(false);
    }
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        {/* Baseball Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-xl shadow-amber-500/20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-14 h-14 text-white"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2C8 6 8 18 12 22" />
              <path d="M12 2C16 6 16 18 12 22" />
              <path d="M4.5 8.5C8 10 16 10 19.5 8.5" />
              <path d="M4.5 15.5C8 14 16 14 19.5 15.5" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
          Baseball GM
          <span className="block text-amber-500">Simulator</span>
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl leading-relaxed">
          You don&apos;t just build a team—
          <span className="text-white font-medium">you rebuild a city.</span>
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <span className="px-4 py-2 bg-gray-800/50 rounded-full text-sm text-gray-300 border border-gray-700">
            5 Tier Progression
          </span>
          <span className="px-4 py-2 bg-gray-800/50 rounded-full text-sm text-gray-300 border border-gray-700">
            Dynamic City Evolution
          </span>
          <span className="px-4 py-2 bg-gray-800/50 rounded-full text-sm text-gray-300 border border-gray-700">
            Deep Draft System
          </span>
          <span className="px-4 py-2 bg-gray-800/50 rounded-full text-sm text-gray-300 border border-gray-700">
            Financial Strategy
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* New Game Dialog */}
          <Dialog open={isNewGameOpen} onOpenChange={setIsNewGameOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-6 text-lg font-semibold shadow-lg shadow-amber-600/25"
              >
                New Game
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Start New Career</DialogTitle>
                <DialogDescription>
                  Name your city and choose your difficulty. You&apos;ll start as GM of a Low-A team in a struggling town.
                </DialogDescription>
              </DialogHeader>
              <form action={handleCreateGame} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="cityName">City Name</Label>
                  <Input
                    id="cityName"
                    name="cityName"
                    placeholder="Milltown"
                    required
                    minLength={2}
                    maxLength={50}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamName">Team Name (Optional)</Label>
                  <Input
                    id="teamName"
                    name="teamName"
                    placeholder="Leave blank to auto-generate"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select name="difficulty" defaultValue="normal">
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">
                        <div className="flex flex-col items-start">
                          <span>Easy</span>
                          <span className="text-xs text-muted-foreground">
                            Forgiving budgets, less competition
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="normal">
                        <div className="flex flex-col items-start">
                          <span>Normal</span>
                          <span className="text-xs text-muted-foreground">
                            Balanced challenge
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="hard">
                        <div className="flex flex-col items-start">
                          <span>Hard</span>
                          <span className="text-xs text-muted-foreground">
                            Tight budgets, elite AI competition
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewGameOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="bg-amber-600 hover:bg-amber-500"
                  >
                    {isCreating ? 'Creating...' : 'Start Career'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Load Game Dialog */}
          <Dialog open={isLoadGameOpen} onOpenChange={setIsLoadGameOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg font-semibold border-gray-600 hover:bg-gray-800"
              >
                Load Game
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Load Saved Game</DialogTitle>
                <DialogDescription>
                  Continue your career from a previous save.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                {savedGames.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No saved games found. Start a new career!
                  </p>
                ) : (
                  savedGames.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => router.push(`/game/${game.id}`)}
                      className="w-full p-4 text-left rounded-lg border border-gray-700 hover:border-amber-600 hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-white">
                            {game.team_name}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {game.city_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-amber-500 font-medium">
                            Year {game.current_year}
                          </span>
                          <p className="text-xs text-gray-500">
                            {formatTier(game.current_tier)} • {formatPhase(game.current_phase)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Footer Info */}
        <p className="mt-16 text-sm text-gray-600">
          From Low-A to MLB • 20+ Year Careers • City Building • Deep Strategy
        </p>
      </div>
    </div>
  );
}
