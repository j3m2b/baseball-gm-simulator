'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface DraftedPlayer {
  playerName: string;
  position: string;
  rating: number;
  potential: number;
}

interface DraftCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  draftResults: {
    userPicks: DraftedPlayer[];
    skippedPicks: number;
    undraftedCount: number;
    finalRound: number;
    totalPicksMade: number;
  };
  rosterResults: {
    promotedCount: number;
    demotedCount: number;
    lineupSet: boolean;
    rotationSet: boolean;
  };
}

function getRatingColor(rating: number): string {
  if (rating >= 70) return 'text-green-400';
  if (rating >= 55) return 'text-green-500';
  if (rating >= 45) return 'text-yellow-500';
  if (rating >= 35) return 'text-orange-500';
  return 'text-red-500';
}

function getPotentialBadge(potential: number): { color: string; label: string } {
  if (potential >= 75) return { color: 'bg-purple-600', label: 'Star' };
  if (potential >= 65) return { color: 'bg-blue-600', label: 'Starter' };
  if (potential >= 55) return { color: 'bg-green-600', label: 'Solid' };
  if (potential >= 45) return { color: 'bg-yellow-600', label: 'Backup' };
  return { color: 'bg-gray-600', label: 'Filler' };
}

export default function DraftCompleteModal({
  isOpen,
  onClose,
  gameId,
  draftResults,
  rosterResults,
}: DraftCompleteModalProps) {
  const router = useRouter();

  function handleStartSeason() {
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            <span className="text-4xl">🎉</span>
            <span>Draft Complete!</span>
          </DialogTitle>
          <DialogDescription className="text-base">
            All {draftResults.finalRound} rounds are complete. Your roster is set for the season!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-green-900/20 border-green-800">
              <CardContent className="pt-4 text-center">
                <div className="text-3xl font-bold text-green-400">
                  {draftResults.userPicks.length}
                </div>
                <div className="text-sm text-gray-400">Players Drafted</div>
              </CardContent>
            </Card>

            {draftResults.skippedPicks > 0 && (
              <Card className="bg-yellow-900/20 border-yellow-800">
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-yellow-400">
                    {draftResults.skippedPicks}
                  </div>
                  <div className="text-sm text-gray-400">Picks Skipped</div>
                  <div className="text-xs text-yellow-600 mt-1">(Roster Full)</div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-blue-900/20 border-blue-800">
              <CardContent className="pt-4 text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {draftResults.undraftedCount}
                </div>
                <div className="text-sm text-gray-400">Free Agents</div>
                <div className="text-xs text-blue-600 mt-1">(Available to sign)</div>
              </CardContent>
            </Card>
          </div>

          {/* Auto-Drafted Players */}
          {draftResults.userPicks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span>Your Draft Picks</span>
                <Badge variant="outline" className="text-gray-400">
                  Auto-selected best available
                </Badge>
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {draftResults.userPicks.map((player, index) => {
                  const potentialInfo = getPotentialBadge(player.potential);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-500 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-white">{player.playerName}</div>
                          <div className="text-sm text-gray-400">{player.position}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className={`font-mono font-bold ${getRatingColor(player.rating)}`}>
                            {player.rating}
                          </div>
                          <div className="text-xs text-gray-500">OVR</div>
                        </div>
                        <div className="text-center">
                          <div className={`font-mono font-bold ${getRatingColor(player.potential)}`}>
                            {player.potential}
                          </div>
                          <div className="text-xs text-gray-500">POT</div>
                        </div>
                        <Badge className={`${potentialInfo.color} text-white text-xs`}>
                          {potentialInfo.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Roster Optimization Results */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🤖</span>
              <span>Auto-GM Roster Setup</span>
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className={rosterResults.lineupSet ? 'text-green-400' : 'text-gray-500'}>
                  {rosterResults.lineupSet ? '✓' : '○'}
                </span>
                <span className="text-gray-300">Starting lineup set</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={rosterResults.rotationSet ? 'text-green-400' : 'text-gray-500'}>
                  {rosterResults.rotationSet ? '✓' : '○'}
                </span>
                <span className="text-gray-300">Pitching rotation set</span>
              </div>
              {rosterResults.promotedCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-green-400">↑</span>
                  <span className="text-gray-300">
                    {rosterResults.promotedCount} promoted to active roster
                  </span>
                </div>
              )}
              {rosterResults.demotedCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">↓</span>
                  <span className="text-gray-300">
                    {rosterResults.demotedCount} sent to reserves
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="text-sm text-gray-400 bg-gray-900/50 rounded-lg p-3 border border-gray-800">
            <p className="font-medium text-white mb-2">What's Next?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Review your roster in the Roster tab</li>
              <li>Check team stats in the Overview</li>
              <li>Manage contracts in the Finances tab</li>
              <li>Start playing games in the Season tab!</li>
            </ul>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-4 border-t border-gray-800">
          <Button
            size="lg"
            onClick={handleStartSeason}
            className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-8 py-6 text-lg font-semibold"
          >
            <span className="mr-2">⚾</span>
            Start the Season!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
