'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import { constructBuilding } from '@/lib/actions/game';
import { IsoGrid, CityAtmosphere } from '../city/iso';
import BuildMenu from '../city/BuildMenu';
import DistrictBonusPanel from '../city/DistrictBonusPanel';
import type { Building, BuildingType, Tier } from '@/lib/types';

interface CityTabProps {
  city: {
    population: number;
    median_income: number;
    unemployment_rate: number;
    team_pride: number;
    national_recognition: number;
    occupancy_rate: number;
    buildings: unknown; // JSON type from database
  } | null;
  cityName: string;
  teamName: string;
  gameId: string;
  reserves: number;
  currentTier: Tier;
}

export default function CityTab({
  city,
  cityName,
  teamName,
  gameId,
  reserves,
  currentTier,
}: CityTabProps) {
  const router = useRouter();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [isBuildMenuOpen, setIsBuildMenuOpen] = useState(false);

  if (!city) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-12 text-center text-gray-400">
          City data not available
        </CardContent>
      </Card>
    );
  }

  const buildings = (city.buildings || []) as Building[];

  function handleSlotClick(slotIndex: number, building: Building | null) {
    if (!building) {
      // Empty slot - open build menu
      setSelectedSlot(slotIndex);
      setIsBuildMenuOpen(true);
    } else {
      // Occupied slot - could show details in future
      // For now, do nothing or show a toast
    }
  }

  async function handleConstruct(buildingType: BuildingType) {
    if (selectedSlot === null) return;

    const result = await constructBuilding(gameId, selectedSlot, buildingType);

    if (result.success) {
      router.refresh();
    } else {
      // Could show error toast here
      console.error('Construction failed:', result.error);
    }
  }

  function handleCloseBuildMenu() {
    setIsBuildMenuOpen(false);
    setSelectedSlot(null);
  }

  return (
    <div className="space-y-6">
      {/* City Header */}
      <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl text-white">{cityName}</CardTitle>
              <p className="text-gray-400 mt-1">Home of the {teamName}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-amber-500">{city.team_pride}%</div>
              <p className="text-sm text-gray-400">Team Pride</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-2xl font-bold text-white">
                {city.population.toLocaleString()}
              </div>
              <p className="text-sm text-gray-400">Population</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(city.median_income)}
              </div>
              <p className="text-sm text-gray-400">Median Income</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {city.unemployment_rate.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-400">Unemployment</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">
                {city.national_recognition}%
              </div>
              <p className="text-sm text-gray-400">Recognition</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* District Bonus Panel */}
      <DistrictBonusPanel buildings={buildings} />

      {/* Isometric City View */}
      <Card className="bg-gray-900 border-gray-800 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🏙️</span>
            <span>City View</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <CityAtmosphere fanPride={city.team_pride} tier={currentTier}>
            <IsoGrid
              buildings={buildings}
              onSlotClick={handleSlotClick}
              tier={currentTier}
              fanPride={city.team_pride}
            />
          </CityAtmosphere>
        </CardContent>
      </Card>

      {/* City Growth Guide */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>📈</span>
            <span>City Growth</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400 space-y-3">
          <p>
            Your team's success directly impacts the city. Winning seasons bring new businesses,
            increased population, and higher property values.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-800/30">
              <h4 className="font-semibold text-purple-400 mb-1">🎭 Entertainment</h4>
              <p className="text-xs">Restaurants & Bars boost fan pride and game attendance.</p>
            </div>
            <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-800/30">
              <h4 className="font-semibold text-blue-400 mb-1">💼 Commercial</h4>
              <p className="text-xs">Retail & Hotels increase revenue and sponsorship deals.</p>
            </div>
            <div className="bg-red-900/20 rounded-lg p-3 border border-red-800/30">
              <h4 className="font-semibold text-red-400 mb-1">💪 Performance</h4>
              <p className="text-xs">Corporate offices fund player training programs.</p>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-800">
            <h4 className="font-semibold text-white mb-2">Building Progression</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="bg-gray-800 border-gray-700">
                🏚️ Vacant
              </Badge>
              <span className="text-gray-500">→</span>
              <Badge variant="outline" className="bg-yellow-900/30 border-yellow-800">
                🏗️ Renovating
              </Badge>
              <span className="text-gray-500">→</span>
              <Badge variant="outline" className="bg-green-900/30 border-green-800">
                Open
              </Badge>
              <span className="text-gray-500">→</span>
              <Badge variant="outline" className="bg-blue-900/30 border-blue-800">
                Expanded
              </Badge>
              <span className="text-gray-500">→</span>
              <Badge variant="outline" className="bg-amber-900/30 border-amber-800">
                ⭐ Landmark
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Build Menu Modal */}
      <BuildMenu
        isOpen={isBuildMenuOpen}
        onClose={handleCloseBuildMenu}
        slotIndex={selectedSlot ?? 0}
        reserves={reserves}
        currentTier={currentTier}
        onConstruct={handleConstruct}
      />
    </div>
  );
}
