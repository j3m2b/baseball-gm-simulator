'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  scoutProspect,
  draftPlayer,
  simulateAIDraftPicks,
  advancePhase,
  getDraftPicks,
  refreshProspects,
} from '@/lib/actions/game';
import { formatCurrency } from '@/lib/utils/format';
import { AI_TEAMS } from '@/lib/types';

interface Prospect {
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  position: string;
  player_type: string;
  current_rating: number;
  potential: number;
  scouted_rating: number | null;
  scouted_potential: number | null;
  scouting_accuracy: string | null;
}

interface DraftState {
  id: string;
  year: number;
  current_round: number;
  current_pick: number;
  is_complete: boolean;
  player_draft_position: number;
  total_rounds: number;
}

interface DraftPick {
  pickNumber: number;
  round: number;
  pickInRound: number;
  teamId: string;
  playerName: string;
  position: string;
  rating: number;
}

interface DraftTabProps {
  gameId: string;
  draftState: DraftState;
  prospects: Prospect[];
  reserves: number;
}

const PROSPECTS_PER_PAGE = 20;

export default function DraftTab({ gameId, draftState: initialDraftState, prospects: initialProspects, reserves }: DraftTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [draftState, setDraftState] = useState(initialDraftState);
  const [prospects, setProspects] = useState(initialProspects);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [isScoutingOpen, setIsScoutingOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentReserves, setCurrentReserves] = useState(reserves);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Draft board
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [showDraftBoard, setShowDraftBoard] = useState(false);

  // Calculate pagination
  const totalPages = Math.ceil(prospects.length / PROSPECTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PROSPECTS_PER_PAGE;
  const visibleProspects = prospects.slice(startIndex, startIndex + PROSPECTS_PER_PAGE);

  // Check if it's player's turn
  const getPickPositionInRound = useCallback((pickNum: number, roundNum: number): number => {
    const posInRound = ((pickNum - 1) % 20) + 1;
    if (roundNum % 2 === 0) {
      return 21 - posInRound;
    }
    return posInRound;
  }, []);

  const currentPickPosition = getPickPositionInRound(draftState.current_pick, draftState.current_round);
  const isPlayerTurn = !draftState.is_complete && currentPickPosition === draftState.player_draft_position;

  // Get team name for current pick
  const getCurrentTeamName = useCallback(() => {
    if (currentPickPosition === draftState.player_draft_position) {
      return 'YOUR PICK';
    }
    const aiTeamIndex = currentPickPosition <= draftState.player_draft_position
      ? currentPickPosition - 1
      : currentPickPosition - 2;
    const team = AI_TEAMS[aiTeamIndex];
    return team?.name || `Team ${currentPickPosition}`;
  }, [currentPickPosition, draftState.player_draft_position]);

  // Fetch draft picks for draft board
  const fetchDraftPicks = useCallback(async () => {
    const picks = await getDraftPicks(gameId, draftState.year);
    setDraftPicks(picks);
  }, [gameId, draftState.year]);

  // Refresh prospects from server
  const doRefreshProspects = useCallback(async () => {
    console.log('[DraftTab] Refreshing prospects from server...');
    const freshProspects = await refreshProspects(gameId, draftState.year);
    console.log('[DraftTab] Got', freshProspects.length, 'available prospects');
    setProspects(freshProspects);
  }, [gameId, draftState.year]);

  // Load draft picks on mount
  useEffect(() => {
    fetchDraftPicks();
  }, [fetchDraftPicks]);

  // Simulate AI picks when not player's turn
  useEffect(() => {
    async function runAISimulation() {
      if (!isPlayerTurn && !draftState.is_complete && !isSimulating) {
        setIsSimulating(true);

        // Add a small delay for drama
        await new Promise(resolve => setTimeout(resolve, 500));

        const result = await simulateAIDraftPicks(gameId);

        if (result.success && result.picks) {
          // Update draft state
          setDraftState(prev => ({
            ...prev,
            current_pick: result.currentPick,
            current_round: result.currentRound,
            is_complete: result.isComplete,
          }));

          // Refresh prospects and draft picks
          await doRefreshProspects();
          await fetchDraftPicks();
        }

        setIsSimulating(false);
      }
    }

    if (!isPlayerTurn && !draftState.is_complete) {
      runAISimulation();
    }
  }, [isPlayerTurn, draftState.is_complete, gameId, isSimulating, doRefreshProspects, fetchDraftPicks]);

  async function handleScout(accuracy: 'low' | 'medium' | 'high') {
    if (!selectedProspect) return;

    const costs = { low: 2000, medium: 4000, high: 8000 };
    if (currentReserves < costs[accuracy]) {
      alert('Not enough funds for scouting!');
      return;
    }

    startTransition(async () => {
      const result = await scoutProspect(gameId, selectedProspect.id, accuracy);

      if (result.success) {
        setProspects(prev =>
          prev.map(p =>
            p.id === selectedProspect.id
              ? {
                  ...p,
                  scouted_rating: result.scoutedRating ?? null,
                  scouted_potential: result.scoutedPotential ?? null,
                  scouting_accuracy: accuracy,
                }
              : p
          )
        );
        setSelectedProspect(prev =>
          prev
            ? {
                ...prev,
                scouted_rating: result.scoutedRating ?? null,
                scouted_potential: result.scoutedPotential ?? null,
                scouting_accuracy: accuracy,
              }
            : null
        );
        setCurrentReserves(prev => prev - (result.cost ?? 0));
      }

      setIsScoutingOpen(false);
    });
  }

  async function handleDraft(prospectId: string) {
    console.log('[DraftTab] handleDraft called with prospectId:', prospectId);

    // Find the prospect to get their name
    const draftedProspect = prospects.find(p => p.id === prospectId);
    if (!draftedProspect) {
      console.error('[DraftTab] Prospect not found in local state, refreshing...');
      await doRefreshProspects();
      alert('Please try again - prospects list was refreshed.');
      return;
    }

    // Optimistic update - remove from list immediately
    setProspects(prev => prev.filter(p => p.id !== prospectId));

    startTransition(async () => {
      console.log('[DraftTab] Calling draftPlayer action...');
      const result = await draftPlayer(gameId, prospectId);
      console.log('[DraftTab] draftPlayer result:', result);

      if (result.error) {
        console.error('[DraftTab] Draft failed:', result.error);
        // Revert optimistic update and refresh
        await doRefreshProspects();
        alert(`Draft failed: ${result.error}`);
        return;
      }

      if (result.success) {
        console.log('[DraftTab] Draft successful, updating UI...');

        // Update draft state
        setDraftState(prev => ({
          ...prev,
          current_pick: result.nextPick ?? prev.current_pick + 1,
          current_round: Math.ceil((result.nextPick ?? prev.current_pick + 1) / 20),
          is_complete: result.isComplete ?? false,
        }));

        // Close selection dialog
        setSelectedProspect(null);

        // Refresh draft board
        await fetchDraftPicks();

        // Refresh prospects to ensure sync
        await doRefreshProspects();
      }
    });
  }

  async function handleCompleteDraft() {
    await advancePhase(gameId);
    router.refresh();
  }

  function getRatingDisplay(prospect: Prospect) {
    if (prospect.scouted_rating !== null) {
      return (
        <span className="font-mono font-bold text-green-400">
          {prospect.scouted_rating}
        </span>
      );
    }
    return <span className="text-gray-500">???</span>;
  }

  function getPotentialDisplay(prospect: Prospect) {
    if (prospect.scouted_potential !== null) {
      return (
        <span className="font-mono text-green-400">
          {prospect.scouted_potential}
        </span>
      );
    }
    return <span className="text-gray-500">???</span>;
  }

  function getScoutingBadge(accuracy: string | null) {
    if (!accuracy) return null;
    const colors = {
      low: 'bg-yellow-600',
      medium: 'bg-blue-600',
      high: 'bg-green-600',
    };
    return (
      <Badge className={`${colors[accuracy as keyof typeof colors]} text-white text-xs`}>
        {accuracy.charAt(0).toUpperCase() + accuracy.slice(1)}
      </Badge>
    );
  }

  function getTeamDisplayName(teamId: string) {
    if (teamId === 'player') return 'You';
    const team = AI_TEAMS.find(t => t.id === teamId);
    return team?.abbreviation || teamId;
  }

  if (draftState.is_complete) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-12 text-center">
          <div className="text-4xl mb-4">
            <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Draft Complete!</h3>
          <p className="text-gray-400 mb-6">
            Year {draftState.year} draft has concluded. Your roster is set for the season.
          </p>
          <Button onClick={handleCompleteDraft} className="bg-amber-600 hover:bg-amber-500">
            Start Season
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Draft Status Bar */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-sm text-gray-400">Round</div>
                <div className="text-2xl font-bold text-white">{draftState.current_round}/{draftState.total_rounds}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Overall Pick</div>
                <div className="text-2xl font-bold text-white">#{draftState.current_pick}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Pick in Round</div>
                <div className="text-2xl font-bold text-white">#{currentPickPosition}/20</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Your Position</div>
                <div className="text-2xl font-bold text-amber-500">#{draftState.player_draft_position}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Scouting Budget</div>
                <div className={`text-lg font-bold ${currentReserves >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(currentReserves)}
                </div>
              </div>

              <div className="text-center min-w-[140px]">
                {isPlayerTurn ? (
                  <Badge className="bg-green-600 text-white px-4 py-2 text-lg animate-pulse">
                    Your Pick!
                  </Badge>
                ) : isSimulating ? (
                  <div>
                    <Badge className="bg-blue-600 text-white px-4 py-2">
                      AI Picking...
                    </Badge>
                    <div className="text-xs text-gray-400 mt-1">{getCurrentTeamName()}</div>
                  </div>
                ) : (
                  <Badge className="bg-gray-600 text-white px-4 py-2">
                    Waiting...
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Toggle for Prospects vs Draft Board */}
      <div className="flex gap-2">
        <Button
          variant={!showDraftBoard ? 'default' : 'outline'}
          onClick={() => setShowDraftBoard(false)}
          className={!showDraftBoard ? 'bg-amber-600 hover:bg-amber-500' : ''}
        >
          Available Prospects ({prospects.length})
        </Button>
        <Button
          variant={showDraftBoard ? 'default' : 'outline'}
          onClick={() => { setShowDraftBoard(true); fetchDraftPicks(); }}
          className={showDraftBoard ? 'bg-amber-600 hover:bg-amber-500' : ''}
        >
          Draft Board ({draftPicks.length} picks)
        </Button>
      </div>

      {/* Draft Board View */}
      {showDraftBoard && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Draft Board - Year {draftState.year}
              <Badge variant="outline" className="text-gray-400">
                {draftPicks.length} picks made
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {draftPicks.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                No picks made yet. The draft is just starting!
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-transparent">
                      <TableHead className="text-gray-400 w-16">Pick</TableHead>
                      <TableHead className="text-gray-400 w-16">Rd</TableHead>
                      <TableHead className="text-gray-400 w-20">Team</TableHead>
                      <TableHead className="text-gray-400">Player</TableHead>
                      <TableHead className="text-gray-400 w-16">Pos</TableHead>
                      <TableHead className="text-gray-400 w-16 text-center">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draftPicks.map((pick) => (
                      <TableRow
                        key={pick.pickNumber}
                        className={`border-gray-800 ${pick.teamId === 'player' ? 'bg-amber-900/20' : 'hover:bg-gray-800/50'}`}
                      >
                        <TableCell className="font-mono text-white">#{pick.pickNumber}</TableCell>
                        <TableCell className="text-gray-400">{pick.round}</TableCell>
                        <TableCell>
                          <Badge className={pick.teamId === 'player' ? 'bg-amber-600' : 'bg-gray-700'}>
                            {getTeamDisplayName(pick.teamId)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-white">{pick.playerName}</TableCell>
                        <TableCell className="text-gray-300">{pick.position}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono font-bold text-green-400">{pick.rating}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prospects Table */}
      {!showDraftBoard && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                Available Prospects
                <Badge variant="outline" className="text-gray-400">
                  {prospects.length} remaining
                </Badge>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={doRefreshProspects}
                disabled={isPending}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Pos</TableHead>
                  <TableHead className="text-gray-400">Age</TableHead>
                  <TableHead className="text-gray-400 text-center">Rating</TableHead>
                  <TableHead className="text-gray-400 text-center">Potential</TableHead>
                  <TableHead className="text-gray-400">Scouted</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProspects.map((prospect) => (
                  <TableRow
                    key={prospect.id}
                    className="border-gray-800 hover:bg-gray-800/50"
                  >
                    <TableCell>
                      <div className="font-medium text-white">
                        {prospect.first_name} {prospect.last_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">{prospect.position}</TableCell>
                    <TableCell className="text-gray-300">{prospect.age}</TableCell>
                    <TableCell className="text-center">{getRatingDisplay(prospect)}</TableCell>
                    <TableCell className="text-center">{getPotentialDisplay(prospect)}</TableCell>
                    <TableCell>{getScoutingBadge(prospect.scouting_accuracy)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setIsScoutingOpen(true);
                          }}
                          disabled={isPending}
                        >
                          Scout
                        </Button>
                        {isPlayerTurn && (
                          <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-500"
                            onClick={() => handleDraft(prospect.id)}
                            disabled={isPending}
                          >
                            Draft
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1}-{Math.min(startIndex + PROSPECTS_PER_PAGE, prospects.length)} of {prospects.length}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={page}
                          size="sm"
                          variant={currentPage === page ? 'default' : 'outline'}
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? 'bg-amber-600' : ''}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scouting Dialog */}
      <Dialog open={isScoutingOpen} onOpenChange={setIsScoutingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Scout {selectedProspect?.first_name} {selectedProspect?.last_name}
            </DialogTitle>
            <DialogDescription>
              Choose scouting intensity. Higher accuracy costs more but reveals more reliable information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <Button
              className="w-full justify-between"
              variant="outline"
              onClick={() => handleScout('low')}
              disabled={isPending || currentReserves < 2000}
            >
              <span>Low Accuracy (±15 rating error)</span>
              <span className="text-amber-500">{formatCurrency(2000)}</span>
            </Button>

            <Button
              className="w-full justify-between"
              variant="outline"
              onClick={() => handleScout('medium')}
              disabled={isPending || currentReserves < 4000}
            >
              <span>Medium Accuracy (±8 rating error)</span>
              <span className="text-amber-500">{formatCurrency(4000)}</span>
            </Button>

            <Button
              className="w-full justify-between bg-green-600 hover:bg-green-500"
              onClick={() => handleScout('high')}
              disabled={isPending || currentReserves < 8000}
            >
              <span>High Accuracy (±3 rating error)</span>
              <span>{formatCurrency(8000)}</span>
            </Button>
          </div>

          <div className="mt-4 text-sm text-gray-400">
            Current reserves: <span className="text-white font-medium">{formatCurrency(currentReserves)}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
