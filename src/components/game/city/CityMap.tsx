'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Building, BuildingType, DistrictType, BuildingState } from '@/lib/types';
import { BUILDING_DISTRICT_CONFIG } from '@/lib/types';

interface CityMapProps {
  buildings: Building[];
  onSlotClick: (slotIndex: number, building: Building | null) => void;
  reserves: number;
}

// Building icons by type
const BUILDING_ICONS: Record<BuildingType, string> = {
  restaurant: '🍽️',
  bar: '🍺',
  retail: '🛍️',
  hotel: '🏨',
  corporate: '🏢',
};

// State icons for vacant/renovating
const STATE_ICONS: Record<number, string> = {
  0: '🏚️', // Vacant
  1: '🏗️', // Renovating
};

// District color themes
const DISTRICT_STYLES: Record<DistrictType, {
  border: string;
  bg: string;
  glow: string;
  text: string;
  label: string;
}> = {
  ENTERTAINMENT: {
    border: 'border-purple-500',
    bg: 'bg-purple-900/40',
    glow: 'shadow-purple-500/30 shadow-lg',
    text: 'text-purple-400',
    label: 'Entertainment',
  },
  COMMERCIAL: {
    border: 'border-blue-500',
    bg: 'bg-blue-900/40',
    glow: 'shadow-blue-500/30 shadow-lg',
    text: 'text-blue-400',
    label: 'Commercial',
  },
  PERFORMANCE: {
    border: 'border-red-500',
    bg: 'bg-red-900/40',
    glow: 'shadow-red-500/30 shadow-lg',
    text: 'text-red-400',
    label: 'Performance',
  },
};

// State styles overlay
const STATE_STYLES: Record<BuildingState, {
  overlay: string;
  badge: string;
  badgeBg: string;
}> = {
  0: { overlay: '', badge: 'Vacant', badgeBg: 'bg-gray-600' },
  1: { overlay: 'animate-pulse', badge: 'Renovating', badgeBg: 'bg-yellow-600' },
  2: { overlay: '', badge: 'Open', badgeBg: 'bg-green-600' },
  3: { overlay: '', badge: 'Expanded', badgeBg: 'bg-blue-600' },
  4: { overlay: 'ring-2 ring-amber-400', badge: 'Landmark', badgeBg: 'bg-amber-600' },
};

function getStateLabel(state: BuildingState): string {
  const labels: Record<BuildingState, string> = {
    0: 'Vacant',
    1: 'Renovating',
    2: 'Open',
    3: 'Expanded',
    4: 'Landmark',
  };
  return labels[state];
}

function getBuildingIcon(building: Building): string {
  if (building.state === 0) return STATE_ICONS[0];
  if (building.state === 1) return STATE_ICONS[1];
  return BUILDING_ICONS[building.type] || '🏠';
}

interface CitySlotProps {
  building: Building;
  slotIndex: number;
  onClick: () => void;
}

function CitySlot({ building, slotIndex, onClick }: CitySlotProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isVacant = building.state === 0;
  const districtConfig = BUILDING_DISTRICT_CONFIG[building.type];
  const districtStyle = DISTRICT_STYLES[districtConfig?.district || building.district || 'COMMERCIAL'];
  const stateStyle = STATE_STYLES[building.state];

  // Vacant slot styling
  if (isVacant) {
    return (
      <button
        onClick={onClick}
        title="Click to develop this zone"
        className="aspect-square rounded-lg border-2 border-dashed border-gray-600 bg-gray-800/50
                   flex flex-col items-center justify-center gap-1
                   hover:border-amber-500 hover:bg-gray-700/50
                   transition-all duration-200 cursor-pointer group"
      >
        <span className="text-2xl opacity-30 group-hover:opacity-60 transition-opacity">+</span>
        <span className="text-[10px] text-gray-500 group-hover:text-gray-400">Zone</span>
      </button>
    );
  }

  // Occupied slot styling
  const tooltipText = `${building.name || building.type} - ${stateStyle.badge}${building.yearOpened ? ` (Est. ${building.yearOpened})` : ''}`;

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={tooltipText}
        className={`aspect-square rounded-lg border-2 ${districtStyle.border} ${districtStyle.bg}
                   flex flex-col items-center justify-center gap-0.5 w-full
                   ${building.state >= 2 ? districtStyle.glow : ''}
                   ${stateStyle.overlay}
                   hover:scale-105 transition-all duration-200 cursor-pointer relative`}
      >
        <span className="text-xl md:text-2xl">{getBuildingIcon(building)}</span>
        {building.state >= 2 && (
          <span className={`text-[8px] md:text-[10px] ${districtStyle.text} truncate max-w-full px-1`}>
            {building.type}
          </span>
        )}
        {building.state === 4 && (
          <span className="absolute -top-1 -right-1 text-xs">⭐</span>
        )}
      </button>

      {/* Custom Tooltip */}
      {isHovered && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg min-w-[150px]">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getBuildingIcon(building)}</span>
              <div>
                <p className="font-semibold text-white text-sm">
                  {building.name || `${building.type.charAt(0).toUpperCase() + building.type.slice(1)}`}
                </p>
                <p className={`text-xs ${districtStyle.text}`}>
                  {districtStyle.label} District
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded ${stateStyle.badgeBg} text-white`}>
                {stateStyle.badge}
              </span>
              {building.yearOpened && (
                <span className="text-xs text-gray-400">
                  Est. Year {building.yearOpened}
                </span>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-800 border-r border-b border-gray-700 rotate-45"></div>
        </div>
      )}
    </div>
  );
}

export default function CityMap({ buildings, onSlotClick, reserves }: CityMapProps) {
  // Take only first 25 buildings for the 5x5 grid
  const gridBuildings = buildings.slice(0, 25);

  // Calculate stats
  const occupiedCount = gridBuildings.filter(b => b.state >= 2).length;
  const renovatingCount = gridBuildings.filter(b => b.state === 1).length;
  const vacantCount = gridBuildings.filter(b => b.state === 0).length;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🗺️</span>
            <span>City Map</span>
          </CardTitle>
          <div className="flex gap-3 text-xs">
            <span className="text-green-400">{occupiedCount} Active</span>
            <span className="text-yellow-400">{renovatingCount} Building</span>
            <span className="text-gray-400">{vacantCount} Available</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* District Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          {Object.entries(DISTRICT_STYLES).map(([key, style]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${style.bg} ${style.border} border`} />
              <span className={style.text}>{style.label}</span>
            </div>
          ))}
        </div>

        {/* 5x5 Grid */}
        <div className="grid grid-cols-5 gap-2 md:gap-3">
          {gridBuildings.map((building, index) => (
            <CitySlot
              key={building.id}
              building={building}
              slotIndex={index}
              onClick={() => onSlotClick(index, building.state === 0 ? null : building)}
            />
          ))}
        </div>

        {/* Bottom Legend */}
        <div className="mt-4 pt-3 border-t border-gray-800">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <span>🏚️ Vacant</span>
            <span>🏗️ Renovating</span>
            <span>Open (Active)</span>
            <span>⭐ Landmark</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
