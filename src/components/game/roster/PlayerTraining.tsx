'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { setPlayerTrainingFocus } from '@/lib/actions/game';
import { TRAINING_FOCUS_CONFIG, type TrainingFocus, type HitterTrainingFocus, type PitcherTrainingFocus } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface PlayerTrainingProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    playerType: 'HITTER' | 'PITCHER';
    position: string;
    currentRating: number;
    potential: number;
    trainingFocus: TrainingFocus;
    currentXp: number;
    progressionRate: number;
    hitterAttributes?: {
      hit: number;
      power: number;
      speed: number;
      arm: number;
      field: number;
    } | null;
    pitcherAttributes?: {
      stuff: number;
      control: number;
      movement: number;
    } | null;
  };
}

export default function PlayerTraining({
  isOpen,
  onClose,
  gameId,
  player,
}: PlayerTrainingProps) {
  const router = useRouter();
  const [selectedFocus, setSelectedFocus] = useState<TrainingFocus>(player.trainingFocus);
  const [isSaving, setIsSaving] = useState(false);

  const hitterFocuses: HitterTrainingFocus[] = ['hit', 'power', 'speed', 'arm', 'field'];
  const pitcherFocuses: PitcherTrainingFocus[] = ['stuff', 'control', 'movement'];

  const availableFocuses = player.playerType === 'HITTER'
    ? [...hitterFocuses, 'overall' as const]
    : [...pitcherFocuses, 'overall' as const];

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await setPlayerTrainingFocus(gameId, player.id, selectedFocus);
      if (result.success) {
        router.refresh();
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }

  function getAttributeValue(focus: TrainingFocus): number | null {
    if (focus === 'overall') return null;

    if (player.playerType === 'HITTER' && player.hitterAttributes) {
      return player.hitterAttributes[focus as HitterTrainingFocus] ?? null;
    }
    if (player.playerType === 'PITCHER' && player.pitcherAttributes) {
      return player.pitcherAttributes[focus as PitcherTrainingFocus] ?? null;
    }
    return null;
  }

  function getProgressionLabel(rate: number): { label: string; color: string } {
    if (rate >= 1.5) return { label: 'Rapid', color: 'text-green-400' };
    if (rate >= 1.2) return { label: 'Fast', color: 'text-green-500' };
    if (rate >= 0.9) return { label: 'Normal', color: 'text-gray-400' };
    if (rate >= 0.7) return { label: 'Slow', color: 'text-amber-500' };
    return { label: 'Very Slow', color: 'text-red-500' };
  }

  const progressionInfo = getProgressionLabel(player.progressionRate);
  const xpToNextLevel = 100 - player.currentXp;
  const estimatedGames = Math.ceil(xpToNextLevel / (2 * player.progressionRate));

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {player.firstName} {player.lastName} - Training
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Player Info */}
          <div className="flex items-center justify-between">
            <div>
              <Badge className="bg-gray-700">{player.position}</Badge>
              <span className="ml-2 text-gray-400">
                Rating: <span className="text-white font-medium">{player.currentRating}</span>
                <span className="text-gray-500"> / {player.potential}</span>
              </span>
            </div>
            <div className={progressionInfo.color}>
              {progressionInfo.label} Development
            </div>
          </div>

          {/* XP Progress */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Training Progress</span>
                <span className="text-sm text-white">{player.currentXp}/100 XP</span>
              </div>
              <Progress value={player.currentXp} className="h-3" />
              <p className="text-xs text-gray-500 mt-2">
                ~{estimatedGames} games until next attribute increase
              </p>
            </CardContent>
          </Card>

          {/* Training Focus Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Training Focus</h3>
            <div className="grid grid-cols-2 gap-2">
              {availableFocuses.map((focus) => {
                const config = TRAINING_FOCUS_CONFIG[focus];
                const attrValue = getAttributeValue(focus);
                const isSelected = selectedFocus === focus;

                return (
                  <button
                    key={focus}
                    onClick={() => setSelectedFocus(focus)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                        {config.label}
                      </span>
                      {attrValue !== null && (
                        <span className="text-sm text-gray-400">{attrValue}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Attributes */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Current Attributes</h3>
            <div className="grid grid-cols-3 gap-2">
              {player.playerType === 'HITTER' && player.hitterAttributes && (
                <>
                  <AttributeBar label="Contact" value={player.hitterAttributes.hit} max={player.potential} />
                  <AttributeBar label="Power" value={player.hitterAttributes.power} max={player.potential} />
                  <AttributeBar label="Speed" value={player.hitterAttributes.speed} max={player.potential} />
                  <AttributeBar label="Arm" value={player.hitterAttributes.arm} max={player.potential} />
                  <AttributeBar label="Defense" value={player.hitterAttributes.field} max={player.potential} />
                </>
              )}
              {player.playerType === 'PITCHER' && player.pitcherAttributes && (
                <>
                  <AttributeBar label="Velocity" value={player.pitcherAttributes.stuff} max={player.potential} />
                  <AttributeBar label="Command" value={player.pitcherAttributes.control} max={player.potential} />
                  <AttributeBar label="Movement" value={player.pitcherAttributes.movement} max={player.potential} />
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="border-gray-700">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || selectedFocus === player.trainingFocus}
              className="bg-amber-600 hover:bg-amber-500"
            >
              {isSaving ? 'Saving...' : 'Save Training Focus'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AttributeBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percentage = (value / 80) * 100; // 80 is max rating
  const roomToGrow = max - value;

  return (
    <div className="bg-gray-800 rounded p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-medium text-white">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded overflow-hidden">
        <div
          className={`h-full ${roomToGrow > 10 ? 'bg-green-500' : roomToGrow > 5 ? 'bg-amber-500' : 'bg-red-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
