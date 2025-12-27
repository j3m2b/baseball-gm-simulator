'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { upgradeFacility } from '@/lib/actions/game';
import { FACILITY_CONFIGS, getRosterCapacities, type FacilityLevel } from '@/lib/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface FacilitiesUpgradeProps {
  gameId: string;
  facilityLevel: FacilityLevel;
  reserves: number;
  activeCount: number;
  reserveCount: number;
}

export default function FacilitiesUpgrade({
  gameId,
  facilityLevel,
  reserves,
  activeCount,
  reserveCount,
}: FacilitiesUpgradeProps) {
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const currentConfig = FACILITY_CONFIGS[facilityLevel];
  const capacities = getRosterCapacities(facilityLevel);
  const nextLevel = facilityLevel < 2 ? (facilityLevel + 1) as FacilityLevel : null;
  const nextConfig = nextLevel !== null ? FACILITY_CONFIGS[nextLevel] : null;

  const canAfford = currentConfig.upgradeCost !== null && reserves >= currentConfig.upgradeCost;

  async function handleUpgrade() {
    if (!canAfford || isUpgrading) return;

    setIsUpgrading(true);
    try {
      const result = await upgradeFacility(gameId);
      if (result.success) {
        toast.success(`Upgraded to ${nextConfig?.name || 'new facility'}!`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to upgrade facility');
      }
    } catch {
      toast.error('Failed to upgrade facility');
    } finally {
      setIsUpgrading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  const activeUsage = (activeCount / capacities.activeMax) * 100;
  const reserveUsage = (reserveCount / capacities.reserveMax) * 100;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Team Facilities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Facility */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">{currentConfig.name}</h3>
                <Badge className="bg-blue-600 text-white">Level {facilityLevel}</Badge>
              </div>
              <p className="text-sm text-gray-400 mt-1">{currentConfig.description}</p>
            </div>
          </div>

          {/* Roster Usage */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Active Roster</span>
                <span className="text-white">{activeCount}/{capacities.activeMax}</span>
              </div>
              <Progress value={activeUsage} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Farm System</span>
                <span className="text-white">{reserveCount}/{capacities.reserveMax}</span>
              </div>
              <Progress value={reserveUsage} className="h-2" />
            </div>
          </div>
        </div>

        {/* Upgrade Path */}
        {nextConfig && (
          <div className="border border-dashed border-gray-700 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-300">Next Upgrade</h4>
                  <Badge variant="outline" className="border-amber-600 text-amber-500">
                    Level {nextLevel}
                  </Badge>
                </div>
                <h3 className="font-semibold text-white mt-1">{nextConfig.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{nextConfig.description}</p>
                <div className="mt-2 text-sm">
                  <span className="text-gray-400">Reserve Slots: </span>
                  <span className="text-green-500">
                    {capacities.reserveMax} → {nextConfig.reserveSlots}
                    <span className="text-xs ml-1">(+{nextConfig.reserveSlots - capacities.reserveMax})</span>
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-amber-500">
                  {formatCurrency(currentConfig.upgradeCost!)}
                </div>
                <div className="text-xs text-gray-500">
                  {canAfford ? 'Available' : `Need ${formatCurrency(currentConfig.upgradeCost! - reserves)} more`}
                </div>
              </div>
            </div>
            <Button
              onClick={handleUpgrade}
              disabled={!canAfford || isUpgrading}
              className="w-full mt-4 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700"
            >
              {isUpgrading ? 'Upgrading...' : canAfford ? 'Upgrade Facility' : 'Insufficient Funds'}
            </Button>
          </div>
        )}

        {/* Max Level */}
        {facilityLevel === 2 && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-center">
            <Badge className="bg-green-600 text-white mb-2">Maximum Level</Badge>
            <p className="text-sm text-gray-400">
              Your facilities are fully upgraded with maximum reserve capacity.
            </p>
          </div>
        )}

        {/* Facility Level Progress */}
        <div className="pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Facility Progress</span>
            <span className="text-sm text-gray-400">{facilityLevel}/2</span>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((level) => (
              <div
                key={level}
                className={`flex-1 h-2 rounded-full ${
                  level <= facilityLevel ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>Basic</span>
            <span>Complex</span>
            <span>Dev Lab</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
