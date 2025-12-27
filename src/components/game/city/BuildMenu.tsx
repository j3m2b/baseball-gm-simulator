'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BuildingType, DistrictType, Tier } from '@/lib/types';
import { BUILDING_DISTRICT_CONFIG } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/format';

interface BuildMenuProps {
  isOpen: boolean;
  onClose: () => void;
  slotIndex: number;
  reserves: number;
  currentTier: Tier;
  onConstruct: (buildingType: BuildingType) => Promise<void>;
}

// Building configurations for the menu
interface BuildingOption {
  type: BuildingType;
  name: string;
  icon: string;
  cost: number;
  effect: string;
  effectValue: string;
  minTier: Tier;
  description: string;
}

const TIER_ORDER: Tier[] = ['LOW_A', 'HIGH_A', 'DOUBLE_A', 'TRIPLE_A', 'MLB'];

function getTierIndex(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

const BUILDING_OPTIONS: BuildingOption[] = [
  // Entertainment District
  {
    type: 'restaurant',
    name: 'Restaurant',
    icon: '🍽️',
    cost: 50000,
    effect: 'Fan Pride',
    effectValue: '+2%',
    minTier: 'LOW_A',
    description: 'A family-friendly eatery that brings fans together on game days.',
  },
  {
    type: 'bar',
    name: 'Sports Bar',
    icon: '🍺',
    cost: 75000,
    effect: 'Fan Pride',
    effectValue: '+2.5%',
    minTier: 'LOW_A',
    description: 'A lively sports bar that keeps the energy high before and after games.',
  },
  // Commercial District
  {
    type: 'retail',
    name: 'Retail Shop',
    icon: '🛍️',
    cost: 40000,
    effect: 'Income',
    effectValue: '+2%',
    minTier: 'LOW_A',
    description: 'A merchandise and souvenir shop for loyal fans.',
  },
  {
    type: 'hotel',
    name: 'Hotel',
    icon: '🏨',
    cost: 200000,
    effect: 'Income',
    effectValue: '+5%',
    minTier: 'HIGH_A',
    description: 'A premium hotel that attracts out-of-town visitors.',
  },
  // Performance District
  {
    type: 'corporate',
    name: 'Corporate Office',
    icon: '🏢',
    cost: 150000,
    effect: 'Training',
    effectValue: '+3%',
    minTier: 'DOUBLE_A',
    description: 'Corporate sponsors who invest in player development programs.',
  },
];

// District tab configurations
const DISTRICT_TABS: { id: DistrictType; label: string; icon: string; color: string }[] = [
  { id: 'ENTERTAINMENT', label: 'Entertainment', icon: '🎭', color: 'text-purple-400' },
  { id: 'COMMERCIAL', label: 'Commercial', icon: '💼', color: 'text-blue-400' },
  { id: 'PERFORMANCE', label: 'Performance', icon: '💪', color: 'text-red-400' },
];

interface BuildingCardProps {
  option: BuildingOption;
  canAfford: boolean;
  isLocked: boolean;
  onSelect: () => void;
  isBuilding: boolean;
}

function BuildingCard({ option, canAfford, isLocked, onSelect, isBuilding }: BuildingCardProps) {
  const districtConfig = BUILDING_DISTRICT_CONFIG[option.type];
  const district = districtConfig.district;

  const borderColor = district === 'ENTERTAINMENT'
    ? 'border-purple-500/50 hover:border-purple-400'
    : district === 'COMMERCIAL'
    ? 'border-blue-500/50 hover:border-blue-400'
    : 'border-red-500/50 hover:border-red-400';

  const bgColor = district === 'ENTERTAINMENT'
    ? 'bg-purple-900/20'
    : district === 'COMMERCIAL'
    ? 'bg-blue-900/20'
    : 'bg-red-900/20';

  const effectColor = district === 'ENTERTAINMENT'
    ? 'text-purple-400'
    : district === 'COMMERCIAL'
    ? 'text-blue-400'
    : 'text-red-400';

  if (isLocked) {
    return (
      <Card className={`${bgColor} border border-gray-700 opacity-50`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-3xl opacity-50">{option.icon}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-400">{option.name}</h4>
                <Badge variant="outline" className="text-gray-500 border-gray-600">
                  🔒 {option.minTier}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Requires {option.minTier} tier to unlock
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${bgColor} border ${borderColor} transition-all hover:scale-[1.02] cursor-pointer`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl">{option.icon}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">{option.name}</h4>
              <span className={`text-sm font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(option.cost)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{option.description}</p>
            <div className="flex items-center justify-between mt-3">
              <div className={`text-sm font-medium ${effectColor}`}>
                {option.effectValue} {option.effect}
              </div>
              <Button
                size="sm"
                onClick={onSelect}
                disabled={!canAfford || isBuilding}
                className={canAfford
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'}
              >
                {isBuilding ? 'Building...' : canAfford ? 'Construct' : 'Insufficient Funds'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BuildMenu({
  isOpen,
  onClose,
  slotIndex,
  reserves,
  currentTier,
  onConstruct,
}: BuildMenuProps) {
  const [activeDistrict, setActiveDistrict] = useState<DistrictType>('ENTERTAINMENT');
  const [isBuilding, setIsBuilding] = useState(false);

  const currentTierIndex = getTierIndex(currentTier);

  // Filter buildings by district
  const filteredBuildings = BUILDING_OPTIONS.filter(option => {
    const config = BUILDING_DISTRICT_CONFIG[option.type];
    return config.district === activeDistrict;
  });

  async function handleConstruct(buildingType: BuildingType) {
    setIsBuilding(true);
    try {
      await onConstruct(buildingType);
      onClose();
    } finally {
      setIsBuilding(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>🏗️</span>
            <span>Zone Development</span>
            <Badge variant="outline" className="ml-2 text-gray-400">
              Slot #{slotIndex + 1}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose a building type to develop this zone. Each district provides different bonuses.
          </DialogDescription>
        </DialogHeader>

        {/* Available Funds */}
        <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3 mb-4">
          <span className="text-sm text-gray-400">Available Funds</span>
          <span className={`text-lg font-bold ${reserves >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(reserves)}
          </span>
        </div>

        {/* District Tabs */}
        <Tabs value={activeDistrict} onValueChange={(v) => setActiveDistrict(v as DistrictType)}>
          <TabsList className="w-full bg-gray-800 border border-gray-700 mb-4">
            {DISTRICT_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={`flex-1 data-[state=active]:${
                  tab.id === 'ENTERTAINMENT'
                    ? 'bg-purple-900/50'
                    : tab.id === 'COMMERCIAL'
                    ? 'bg-blue-900/50'
                    : 'bg-red-900/50'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                <span className={tab.color}>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {DISTRICT_TABS.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-3 mt-0">
              {/* District Description */}
              <div className={`text-xs ${tab.color} bg-gray-800/50 rounded p-2`}>
                {tab.id === 'ENTERTAINMENT' && (
                  <span>Entertainment buildings boost Fan Pride and attendance.</span>
                )}
                {tab.id === 'COMMERCIAL' && (
                  <span>Commercial buildings increase revenue and income.</span>
                )}
                {tab.id === 'PERFORMANCE' && (
                  <span>Performance buildings enhance player training and development.</span>
                )}
              </div>

              {/* Building Options */}
              {BUILDING_OPTIONS.filter(
                (option) => BUILDING_DISTRICT_CONFIG[option.type].district === tab.id
              ).map((option) => {
                const optionTierIndex = getTierIndex(option.minTier);
                const isLocked = currentTierIndex < optionTierIndex;
                const canAfford = reserves >= option.cost;

                return (
                  <BuildingCard
                    key={option.type}
                    option={option}
                    canAfford={canAfford}
                    isLocked={isLocked}
                    onSelect={() => handleConstruct(option.type)}
                    isBuilding={isBuilding}
                  />
                );
              })}

              {BUILDING_OPTIONS.filter(
                (option) => BUILDING_DISTRICT_CONFIG[option.type].district === tab.id
              ).length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No buildings available in this district yet.
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Cancel Button */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose} className="border-gray-700">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
