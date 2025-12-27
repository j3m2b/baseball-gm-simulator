'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/format';
import { getFreeAgents, signFreeAgent, getPayrollSummary, type FreeAgent } from '@/lib/actions/game';

interface FreeAgentMarketProps {
  gameId: string;
  reserves: number;
  salaryCap: number;
}

type PositionFilter = 'all' | 'P' | 'C' | 'IF' | 'OF';
type SortField = 'rating' | 'price' | 'age' | 'potential';
type SortDirection = 'asc' | 'desc';

const POSITION_GROUPS: Record<PositionFilter, string[]> = {
  all: [],
  P: ['SP', 'RP'],
  C: ['C'],
  IF: ['1B', '2B', '3B', 'SS'],
  OF: ['LF', 'CF', 'RF'],
};

export default function FreeAgentMarket({ gameId, reserves, salaryCap }: FreeAgentMarketProps) {
  const router = useRouter();
  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  // Filters and sorting
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');
  const [sortField, setSortField] = useState<SortField>('rating');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Signing modal
  const [selectedPlayer, setSelectedPlayer] = useState<FreeAgent | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState(0);
  const [signResult, setSignResult] = useState<{ success: boolean; message: string } | null>(null);

  // Payroll info
  const [currentPayroll, setCurrentPayroll] = useState(0);
  const [capSpace, setCapSpace] = useState(0);

  useEffect(() => {
    loadData();
  }, [gameId]);

  async function loadData() {
    setLoading(true);
    try {
      const [agentsResult, payrollResult] = await Promise.all([
        getFreeAgents(gameId),
        getPayrollSummary(gameId),
      ]);

      if (agentsResult.success) {
        setFreeAgents(agentsResult.freeAgents);
      }

      if (payrollResult) {
        setCurrentPayroll(payrollResult.totalPayroll);
        setCapSpace(payrollResult.capSpace);
      }
    } catch (error) {
      console.error('Error loading free agents:', error);
    }
    setLoading(false);
  }

  // Filter and sort
  const filteredAgents = freeAgents.filter(agent => {
    if (positionFilter === 'all') return true;
    return POSITION_GROUPS[positionFilter].includes(agent.position);
  });

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'rating':
        comparison = a.currentRating - b.currentRating;
        break;
      case 'price':
        comparison = a.askingPrice - b.askingPrice;
        break;
      case 'age':
        comparison = a.age - b.age;
        break;
      case 'potential':
        comparison = a.potential - b.potential;
        break;
    }
    return sortDirection === 'desc' ? -comparison : comparison;
  });

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  function getSortIndicator(field: SortField) {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  }

  function handleOpenSignModal(agent: FreeAgent) {
    setSelectedPlayer(agent);
    setOfferAmount(agent.askingPrice);
    setSignResult(null);
    setShowSignModal(true);
  }

  async function handleSign() {
    if (!selectedPlayer) return;

    setSigning(true);
    setSignResult(null);

    try {
      const result = await signFreeAgent(gameId, selectedPlayer.id, offerAmount);

      if (result.success) {
        setSignResult({
          success: true,
          message: `Successfully signed ${result.playerName} to a ${result.contractYears}-year, ${formatCurrency(result.salary || 0)} contract!`,
        });
        // Refresh data
        await loadData();
        router.refresh();
        // Close modal after brief delay
        setTimeout(() => {
          setShowSignModal(false);
          setSelectedPlayer(null);
        }, 2000);
      } else {
        setSignResult({
          success: false,
          message: result.error || 'Failed to sign player',
        });
      }
    } catch (error) {
      setSignResult({
        success: false,
        message: 'An error occurred while signing the player',
      });
    }

    setSigning(false);
  }

  function getRatingColor(rating: number): string {
    if (rating >= 70) return 'text-green-400';
    if (rating >= 55) return 'text-green-500';
    if (rating >= 45) return 'text-yellow-500';
    if (rating >= 35) return 'text-orange-500';
    return 'text-red-500';
  }

  function getArchetypeBadge(archetype: string) {
    const colors: Record<string, string> = {
      Slugger: 'bg-red-900/50 text-red-400 border-red-800',
      Speedster: 'bg-cyan-900/50 text-cyan-400 border-cyan-800',
      'Contact King': 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
      'Glove Wizard': 'bg-purple-900/50 text-purple-400 border-purple-800',
      'Cannon Arm': 'bg-orange-900/50 text-orange-400 border-orange-800',
      Flamethrower: 'bg-red-900/50 text-red-400 border-red-800',
      'Command Ace': 'bg-blue-900/50 text-blue-400 border-blue-800',
      'Movement Master': 'bg-green-900/50 text-green-400 border-green-800',
      Veteran: 'bg-amber-900/50 text-amber-400 border-amber-800',
    };
    return (
      <Badge variant="outline" className={`text-xs ${colors[archetype] || 'bg-gray-800 text-gray-300'}`}>
        {archetype}
      </Badge>
    );
  }

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-12 text-center text-gray-400">
          <div className="animate-spin mx-auto h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full mb-4"></div>
          Loading free agent market...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>Free Agent Market</span>
            <Badge variant="outline" className="text-gray-400">
              {freeAgents.length} available
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(reserves)}
              </div>
              <div className="text-sm text-gray-400">Cash Reserves</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${capSpace >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(capSpace)}
              </div>
              <div className="text-sm text-gray-400">Cap Space</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {formatCurrency(currentPayroll)}
              </div>
              <div className="text-sm text-gray-400">Current Payroll</div>
            </div>
          </div>

          {capSpace < 0 && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-400">
              You are currently over the salary cap. New signings may be limited.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Position Filters */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Position:</span>
              {(['all', 'P', 'C', 'IF', 'OF'] as PositionFilter[]).map(filter => (
                <Button
                  key={filter}
                  size="sm"
                  variant={positionFilter === filter ? 'default' : 'outline'}
                  onClick={() => setPositionFilter(filter)}
                  className={`h-8 ${positionFilter === filter ? 'bg-amber-600 hover:bg-amber-500' : 'border-gray-700'}`}
                >
                  {filter === 'all' ? 'All' : filter}
                </Button>
              ))}
            </div>

            <div className="w-px h-6 bg-gray-700" />

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Sort:</span>
              <Button
                size="sm"
                variant={sortField === 'rating' ? 'default' : 'outline'}
                onClick={() => handleSort('rating')}
                className={`h-8 ${sortField === 'rating' ? 'bg-blue-600 hover:bg-blue-500' : 'border-gray-700'}`}
              >
                Rating{getSortIndicator('rating')}
              </Button>
              <Button
                size="sm"
                variant={sortField === 'price' ? 'default' : 'outline'}
                onClick={() => handleSort('price')}
                className={`h-8 ${sortField === 'price' ? 'bg-blue-600 hover:bg-blue-500' : 'border-gray-700'}`}
              >
                Price{getSortIndicator('price')}
              </Button>
              <Button
                size="sm"
                variant={sortField === 'potential' ? 'default' : 'outline'}
                onClick={() => handleSort('potential')}
                className={`h-8 ${sortField === 'potential' ? 'bg-blue-600 hover:bg-blue-500' : 'border-gray-700'}`}
              >
                Potential{getSortIndicator('potential')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Free Agent List */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          {sortedAgents.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-lg mb-2">No free agents available</p>
              <p className="text-sm">Free agents become available after the draft or when players are released.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Pos</TableHead>
                  <TableHead className="text-gray-400 text-center">Age</TableHead>
                  <TableHead className="text-gray-400 text-center">Rating</TableHead>
                  <TableHead className="text-gray-400 text-center">Potential</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400 text-right">Asking Price</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAgents.map(agent => {
                  const canAfford = reserves >= agent.askingPrice * 0.1; // 10% signing bonus
                  const hasCapSpace = capSpace >= agent.askingPrice || currentPayroll + agent.askingPrice <= salaryCap * 1.2;

                  return (
                    <TableRow key={agent.id} className="border-gray-800 hover:bg-gray-800/50">
                      <TableCell>
                        <div className="font-medium text-white">
                          {agent.firstName} {agent.lastName}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{agent.position}</TableCell>
                      <TableCell className="text-center text-gray-300">{agent.age}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono font-bold ${getRatingColor(agent.currentRating)}`}>
                          {agent.currentRating}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono ${getRatingColor(agent.potential)}`}>
                          {agent.potential}
                        </span>
                      </TableCell>
                      <TableCell>{getArchetypeBadge(agent.archetype)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono ${hasCapSpace ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(agent.askingPrice)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenSignModal(agent)}
                          disabled={!canAfford}
                          className={
                            canAfford && hasCapSpace
                              ? 'bg-green-600 hover:bg-green-500'
                              : canAfford
                              ? 'bg-yellow-600 hover:bg-yellow-500'
                              : 'bg-gray-700 cursor-not-allowed'
                          }
                        >
                          Sign
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sign Confirmation Modal */}
      <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Free Agent</DialogTitle>
            <DialogDescription>
              Confirm the signing of {selectedPlayer?.firstName} {selectedPlayer?.lastName}
            </DialogDescription>
          </DialogHeader>

          {selectedPlayer && (
            <div className="space-y-4 py-4">
              {/* Player Info */}
              <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-amber-600/20 flex items-center justify-center text-2xl">
                  {selectedPlayer.playerType === 'PITCHER' ? '⚾' : '🏏'}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white text-lg">
                    {selectedPlayer.firstName} {selectedPlayer.lastName}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{selectedPlayer.position}</span>
                    <span>|</span>
                    <span>Age {selectedPlayer.age}</span>
                    <span>|</span>
                    <span className={getRatingColor(selectedPlayer.currentRating)}>
                      {selectedPlayer.currentRating} OVR
                    </span>
                  </div>
                </div>
              </div>

              {/* Contract Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Contract Length</span>
                  <span className="text-white font-medium">1 Year (Prove-It Deal)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Annual Salary</span>
                  <span className="text-green-400 font-mono font-bold">
                    {formatCurrency(offerAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Signing Bonus (10%)</span>
                  <span className="text-amber-400 font-mono">
                    {formatCurrency(Math.round(offerAmount * 0.1))}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Your Reserves After</span>
                    <span className={`font-mono font-bold ${reserves - Math.round(offerAmount * 0.1) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(reserves - Math.round(offerAmount * 0.1))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-400">New Payroll</span>
                    <span className={`font-mono ${currentPayroll + offerAmount <= salaryCap ? 'text-green-400' : 'text-yellow-400'}`}>
                      {formatCurrency(currentPayroll + offerAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cap Warning */}
              {currentPayroll + offerAmount > salaryCap && (
                <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg text-sm text-yellow-400">
                  This signing will put you over the salary cap. You may face luxury tax penalties.
                </div>
              )}

              {/* Result Message */}
              {signResult && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    signResult.success
                      ? 'bg-green-900/30 border border-green-700 text-green-400'
                      : 'bg-red-900/30 border border-red-700 text-red-400'
                  }`}
                >
                  {signResult.message}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignModal(false)} disabled={signing}>
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              disabled={signing || signResult?.success}
              className="bg-green-600 hover:bg-green-500"
            >
              {signing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing...
                </>
              ) : (
                'Confirm Signing'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
