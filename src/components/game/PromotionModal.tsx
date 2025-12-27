'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { promoteTier } from '@/lib/actions/game';
import { formatCurrency } from '@/lib/utils/format';
import { useRouter } from 'next/navigation';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  currentTier: string;
  nextTier: string;
  winPercentage: number;
  reserves: number;
  cityPride: number;
}

export default function PromotionModal({
  isOpen,
  onClose,
  gameId,
  currentTier,
  nextTier,
  winPercentage,
  reserves,
  cityPride,
}: PromotionModalProps) {
  const router = useRouter();
  const [isPromoting, setIsPromoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function getTierColor(tier: string) {
    const colors: Record<string, string> = {
      LOW_A: 'bg-gray-600',
      HIGH_A: 'bg-blue-600',
      DOUBLE_A: 'bg-purple-600',
      TRIPLE_A: 'bg-amber-600',
      MLB: 'bg-green-600',
    };
    return colors[tier] || 'bg-gray-600';
  }

  // Estimate bonuses based on tier difference
  const tierBonuses: Record<string, { budget: number; stadium: number; cashBonus: number }> = {
    HIGH_A: { budget: 500000, stadium: 1500, cashBonus: 150000 },
    DOUBLE_A: { budget: 1000000, stadium: 3000, cashBonus: 350000 },
    TRIPLE_A: { budget: 2000000, stadium: 5000, cashBonus: 650000 },
    MLB: { budget: 50000000, stadium: 25000, cashBonus: 6500000 },
  };

  const bonuses = tierBonuses[nextTier] || { budget: 0, stadium: 0, cashBonus: 0 };

  async function handlePromotion() {
    setIsPromoting(true);
    setError(null);

    try {
      const result = await promoteTier(gameId);

      if ('error' in result && result.error) {
        setError(result.error);
        setIsPromoting(false);
        return;
      }

      // Success! Close modal and refresh
      onClose();
      router.refresh();
    } catch {
      setError('Failed to process promotion. Please try again.');
      setIsPromoting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            <span className="text-amber-500">Level Up!</span>
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            Your franchise has earned a promotion to the next tier!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Tier Transition */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <Badge className={`${getTierColor(currentTier)} text-white px-4 py-2`}>
                {formatTier(currentTier)}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">Current</p>
            </div>
            <svg
              className="w-8 h-8 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <div className="text-center">
              <Badge className={`${getTierColor(nextTier)} text-white px-4 py-2`}>
                {formatTier(nextTier)}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">New Tier</p>
            </div>
          </div>

          {/* Qualification Stats */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Qualification Stats</h3>
            <div className="flex justify-between">
              <span className="text-gray-400">Win Percentage</span>
              <span className="text-green-500">{(winPercentage * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Reserves</span>
              <span className="text-green-500">{formatCurrency(reserves)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">City Pride</span>
              <span className="text-green-500">{cityPride}%</span>
            </div>
          </div>

          {/* Promotion Bonuses */}
          <div className="bg-gradient-to-r from-amber-900/30 to-amber-800/10 border border-amber-800 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-medium text-amber-500 mb-3">Promotion Bonuses</h3>
            <div className="flex justify-between">
              <span className="text-gray-300">Annual Budget</span>
              <span className="text-amber-400">+{formatCurrency(bonuses.budget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Stadium Capacity</span>
              <span className="text-amber-400">+{bonuses.stadium.toLocaleString()} seats</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Signing Bonus</span>
              <span className="text-amber-400">+{formatCurrency(bonuses.cashBonus)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">City Pride</span>
              <span className="text-amber-400">+10%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">National Recognition</span>
              <span className="text-amber-400">+15%</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-gray-700"
              onClick={onClose}
              disabled={isPromoting}
            >
              Later
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-500"
              onClick={handlePromotion}
              disabled={isPromoting}
            >
              {isPromoting ? 'Promoting...' : 'Accept Promotion'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
