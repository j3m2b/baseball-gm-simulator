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
  completeDraftAndTransition,
  type DraftSimulationResult,
  type RosterOptimizationResult,
} from '@/lib/actions/game';
import DraftCompleteModal from '../draft/DraftCompleteModal';
import { formatCurrency } from '@/lib/utils/format';
import { AI_TEAMS } from '@/lib/types';
import DraftNeeds from './DraftNeeds';

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
  media_rank: number;
  archetype: string;
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

interface RosterPlayer {
  id: string;
  position: string;
}

interface DraftTabProps {
  gameId: string;
  draftState: DraftState;
  prospects: Prospect[];
  reserves: number;
  roster: RosterPlayer[];
}

type SortField = 'media_rank' | 'name' | 'position' | 'age' | 'scouted_rating';
type SortDirection = 'asc' | 'desc';
type PositionFilter = 'all' | 'P' | 'C' | 'IF' | 'OF';

const PROSPECTS_PER_PAGE = 20;

// Position groupings for filters
const POSITION_GROUPS: Record<PositionFilter, string[]> = {
  all: [],
  P: ['SP', 'RP'],
  C: ['C'],
  IF: ['1B', '2B', '3B', 'SS'],
  OF: ['LF', 'CF', 'RF'],
};

export default function DraftTab({ gameId, draftState: initialDraftState, prospects: initialProspects, reserves, roster }: DraftTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [draftState, setDraftState] = useState(initialDraftState);
  const [prospects, setProspects] = useState(initialProspects);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [isScoutingOpen, setIsScoutingOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentReserves, setCurrentReserves] = useState(reserves);

  // Draft completion state
  const [isSimulatingRemainder, setIsSimulatingRemainder] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [draftResults, setDraftResults] = useState<DraftSimulationResult | null>(null);
  const [rosterResults, setRosterResults] = useState<RosterOptimizationResult | null>(null);

  // Sorting - default to media rank ascending (best prospects first)
  const [sortField, setSortField] = useState<SortField>('media_rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filtering
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');
  const [scoutedOnlyFilter, setScoutedOnlyFilter] = useState(false);
  const [favoritesOnlyFilter, setFavoritesOnlyFilter] = useState(false);

  // Favorites (watchlist) - stored locally
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    // Try to load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`draft-favorites-${gameId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Draft board
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [showDraftBoard, setShowDraftBoard] = useState(false);

  // Save favorites to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`draft-favorites-${gameId}`, JSON.stringify([...favorites]));
    }
  }, [favorites, gameId]);

  // Toggle favorite status
  function toggleFavorite(prospectId: string) {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(prospectId)) {
        newFavorites.delete(prospectId);
      } else {
        newFavorites.add(prospectId);
      }
      return newFavorites;
    });
  }

  // Filter prospects
  const filteredProspects = prospects.filter(prospect => {
    // Position filter
    if (positionFilter !== 'all') {
      const positions = POSITION_GROUPS[positionFilter];
      if (!positions.includes(prospect.position)) {
        return false;
      }
    }

    // Scouted only filter
    if (scoutedOnlyFilter && !prospect.scouting_accuracy) {
      return false;
    }

    // Favorites only filter
    if (favoritesOnlyFilter && !favorites.has(prospect.id)) {
      return false;
    }

    return true;
  });

  // Sort prospects
  const sortedProspects = [...filteredProspects].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'media_rank':
        comparison = (a.media_rank ?? 800) - (b.media_rank ?? 800);
        break;
      case 'name':
        comparison = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
        break;
      case 'position':
        comparison = a.position.localeCompare(b.position);
        break;
      case 'age':
        comparison = a.age - b.age;
        break;
      case 'scouted_rating':
        // Put scouted players first, then sort by rating
        const aRating = a.scouted_rating ?? -1;
        const bRating = b.scouted_rating ?? -1;
        comparison = bRating - aRating; // Higher ratings first
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedProspects.length / PROSPECTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PROSPECTS_PER_PAGE;
  const visibleProspects = sortedProspects.slice(startIndex, startIndex + PROSPECTS_PER_PAGE);

  // Handle sort toggle
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'media_rank' ? 'asc' : 'desc');
    }
    setCurrentPage(1); // Reset to first page on sort change
  }

  // Get sort indicator
  function getSortIndicator(field: SortField) {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  }

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

  async function handleSimulateRemainder() {
    setIsSimulatingRemainder(true);

    try {
      const result = await completeDraftAndTransition(gameId);

      if (result.success) {
        setDraftResults(result.draftResults);
        setRosterResults(result.rosterResults);
        setDraftState(prev => ({ ...prev, is_complete: true }));
        setShowCompleteModal(true);
      } else {
        alert(`Failed to complete draft: ${result.error}`);
      }
    } catch (error) {
      console.error('Error completing draft:', error);
      alert('An error occurred while completing the draft.');
    } finally {
      setIsSimulatingRemainder(false);
    }
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

  function getArchetypeBadge(archetype: string) {
    // Archetype colors based on type
    const colors: Record<string, string> = {
      'Slugger': 'bg-red-900/50 text-red-400 border-red-800',
      'Speedster': 'bg-cyan-900/50 text-cyan-400 border-cyan-800',
      'Contact King': 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
      'Glove Wizard': 'bg-purple-900/50 text-purple-400 border-purple-800',
      'Cannon Arm': 'bg-orange-900/50 text-orange-400 border-orange-800',
      'Flamethrower': 'bg-red-900/50 text-red-400 border-red-800',
      'Command Ace': 'bg-blue-900/50 text-blue-400 border-blue-800',
      'Movement Master': 'bg-green-900/50 text-green-400 border-green-800',
      'Playmaker': 'bg-gray-800 text-gray-300 border-gray-700',
      'Raw Talent': 'bg-amber-900/50 text-amber-400 border-amber-700',
    };
    return (
      <Badge variant="outline" className={`text-xs ${colors[archetype] || 'bg-gray-800 text-gray-300'}`}>
        {archetype}
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

              {/* Simulate Remainder Button */}
              <Button
                onClick={handleSimulateRemainder}
                disabled={isSimulatingRemainder || isSimulating}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white"
              >
                {isSimulatingRemainder ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Simulating...
                  </>
                ) : (
                  <>Sim to End & Start Season</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roster Needs Sidebar */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24">
            <DraftNeeds roster={roster} />
          </div>
        </div>

        {/* Main Draft Content */}
        <div className="lg:col-span-3">
          {/* Tab Toggle for Prospects vs Draft Board */}
          <div className="flex gap-2 mb-6">
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
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                Available Prospects
                <Badge variant="outline" className="text-gray-400">
                  {sortedProspects.length} / {prospects.length}
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

            {/* War Room Toolbar */}
            <div className="mt-4 space-y-3">
              {/* Position Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide mr-2">Position:</span>
                {(['all', 'P', 'C', 'IF', 'OF'] as PositionFilter[]).map((filter) => (
                  <Button
                    key={filter}
                    size="sm"
                    variant={positionFilter === filter ? 'default' : 'outline'}
                    onClick={() => { setPositionFilter(filter); setCurrentPage(1); }}
                    className={`h-7 px-3 ${positionFilter === filter ? 'bg-amber-600 hover:bg-amber-500' : 'border-gray-700'}`}
                  >
                    {filter === 'all' ? 'All' : filter}
                  </Button>
                ))}

                <div className="w-px h-6 bg-gray-700 mx-2" />

                {/* Scouted Only Toggle */}
                <Button
                  size="sm"
                  variant={scoutedOnlyFilter ? 'default' : 'outline'}
                  onClick={() => { setScoutedOnlyFilter(!scoutedOnlyFilter); setCurrentPage(1); }}
                  className={`h-7 px-3 ${scoutedOnlyFilter ? 'bg-green-600 hover:bg-green-500' : 'border-gray-700'}`}
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Scouted
                </Button>

                {/* Favorites Toggle */}
                <Button
                  size="sm"
                  variant={favoritesOnlyFilter ? 'default' : 'outline'}
                  onClick={() => { setFavoritesOnlyFilter(!favoritesOnlyFilter); setCurrentPage(1); }}
                  className={`h-7 px-3 ${favoritesOnlyFilter ? 'bg-yellow-600 hover:bg-yellow-500' : 'border-gray-700'}`}
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill={favoritesOnlyFilter ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Watchlist ({favorites.size})
                </Button>

                {/* Clear Filters */}
                {(positionFilter !== 'all' || scoutedOnlyFilter || favoritesOnlyFilter) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setPositionFilter('all');
                      setScoutedOnlyFilter(false);
                      setFavoritesOnlyFilter(false);
                      setCurrentPage(1);
                    }}
                    className="h-7 px-3 text-gray-400 hover:text-white"
                  >
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400 w-8"></TableHead>
                  <TableHead
                    className="text-gray-400 cursor-pointer hover:text-white w-16 select-none"
                    onClick={() => handleSort('media_rank')}
                  >
                    Rank{getSortIndicator('media_rank')}
                  </TableHead>
                  <TableHead
                    className="text-gray-400 cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('name')}
                  >
                    Name{getSortIndicator('name')}
                  </TableHead>
                  <TableHead
                    className="text-gray-400 cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('position')}
                  >
                    Pos{getSortIndicator('position')}
                  </TableHead>
                  <TableHead
                    className="text-gray-400 cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('age')}
                  >
                    Age{getSortIndicator('age')}
                  </TableHead>
                  <TableHead
                    className="text-gray-400 text-center cursor-pointer hover:text-white select-none"
                    onClick={() => handleSort('scouted_rating')}
                  >
                    Rating{getSortIndicator('scouted_rating')}
                  </TableHead>
                  <TableHead className="text-gray-400 text-center">Potential</TableHead>
                  <TableHead className="text-gray-400">Type/Scouted</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProspects.map((prospect) => {
                  const isFavorite = favorites.has(prospect.id);
                  return (
                    <TableRow
                      key={prospect.id}
                      className={`border-gray-800 hover:bg-gray-800/50 ${isFavorite ? 'bg-yellow-900/10' : ''}`}
                    >
                      <TableCell className="w-8 pr-0">
                        <button
                          onClick={() => toggleFavorite(prospect.id)}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                          title={isFavorite ? 'Remove from watchlist' : 'Add to watchlist'}
                        >
                          <svg
                            className={`w-4 h-4 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
                            fill={isFavorite ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-amber-500 font-bold">
                        #{prospect.media_rank ?? '-'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-white">
                          {prospect.first_name} {prospect.last_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{prospect.position}</TableCell>
                      <TableCell className="text-gray-300">{prospect.age}</TableCell>
                      <TableCell className="text-center">{getRatingDisplay(prospect)}</TableCell>
                      <TableCell className="text-center">{getPotentialDisplay(prospect)}</TableCell>
                      <TableCell>
                        {prospect.scouting_accuracy ? (
                          getScoutingBadge(prospect.scouting_accuracy)
                        ) : (
                          getArchetypeBadge(prospect.archetype)
                        )}
                      </TableCell>
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
                  );
                })}
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
        </div>
      </div>

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

      {/* Loading Overlay */}
      {isSimulatingRemainder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 text-center max-w-md">
            <div className="mb-6">
              <svg className="animate-spin mx-auto h-16 w-16 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Simulating Draft & Setting Lineups...
            </h3>
            <p className="text-gray-400">
              Auto-drafting remaining picks and optimizing your roster.
            </p>
            <div className="mt-4 flex justify-center gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        </div>
      )}

      {/* Draft Complete Modal */}
      {draftResults && rosterResults && (
        <DraftCompleteModal
          isOpen={showCompleteModal}
          onClose={() => setShowCompleteModal(false)}
          gameId={gameId}
          draftResults={draftResults}
          rosterResults={rosterResults}
        />
      )}
    </div>
  );
}
