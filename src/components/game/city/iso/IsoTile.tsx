'use client';

import { useState } from 'react';
import type { Building, Tier, BuildingState } from '@/lib/types';
import { BUILDING_DISTRICT_CONFIG } from '@/lib/types';
import IsoBuilding from './IsoBuilding';

// Ground colors based on tier (city development level)
const TIER_GROUND_STYLES: Record<Tier, {
  base: string;
  hover: string;
  border: string;
  vacant: string;
  description: string;
}> = {
  LOW_A: {
    base: 'bg-gradient-to-br from-green-700 to-green-800',
    hover: 'from-green-600 to-green-700',
    border: 'border-green-900',
    vacant: 'bg-gradient-to-br from-green-800/50 to-green-900/50',
    description: 'Rural grassland',
  },
  HIGH_A: {
    base: 'bg-gradient-to-br from-green-600 to-emerald-700',
    hover: 'from-green-500 to-emerald-600',
    border: 'border-emerald-800',
    vacant: 'bg-gradient-to-br from-emerald-800/50 to-emerald-900/50',
    description: 'Developing suburb',
  },
  DOUBLE_A: {
    base: 'bg-gradient-to-br from-gray-500 to-gray-600',
    hover: 'from-gray-400 to-gray-500',
    border: 'border-gray-700',
    vacant: 'bg-gradient-to-br from-gray-700/50 to-gray-800/50',
    description: 'Suburban pavement',
  },
  TRIPLE_A: {
    base: 'bg-gradient-to-br from-gray-600 to-slate-700',
    hover: 'from-gray-500 to-slate-600',
    border: 'border-slate-800',
    vacant: 'bg-gradient-to-br from-slate-700/50 to-slate-800/50',
    description: 'Urban district',
  },
  MLB: {
    base: 'bg-gradient-to-br from-gray-800 to-zinc-900',
    hover: 'from-gray-700 to-zinc-800',
    border: 'border-zinc-950',
    vacant: 'bg-gradient-to-br from-zinc-800/50 to-zinc-900/50',
    description: 'Metropolitan core',
  },
};

// State styles for building status indicators
const STATE_LABELS: Record<BuildingState, {
  label: string;
  color: string;
}> = {
  0: { label: 'Vacant', color: 'text-gray-400' },
  1: { label: 'Under Construction', color: 'text-yellow-400' },
  2: { label: 'Open', color: 'text-green-400' },
  3: { label: 'Expanded', color: 'text-blue-400' },
  4: { label: 'Landmark', color: 'text-amber-400' },
};

// District labels
const DISTRICT_LABELS: Record<string, { label: string; color: string }> = {
  ENTERTAINMENT: { label: 'Entertainment', color: 'text-purple-400' },
  COMMERCIAL: { label: 'Commercial', color: 'text-blue-400' },
  PERFORMANCE: { label: 'Performance', color: 'text-red-400' },
};

interface IsoTileProps {
  building: Building;
  slotIndex: number;
  tier: Tier;
  onClick: () => void;
  fanPride: number;
}

export default function IsoTile({
  building,
  slotIndex,
  tier,
  onClick,
  fanPride,
}: IsoTileProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isVacant = building.state === 0;
  const groundStyle = TIER_GROUND_STYLES[tier];
  const stateInfo = STATE_LABELS[building.state];
  const districtConfig = BUILDING_DISTRICT_CONFIG[building.type];
  const districtInfo = DISTRICT_LABELS[districtConfig?.district || building.district || 'COMMERCIAL'];

  // Tile size
  const tileSize = 80;

  return (
    <div
      className="relative cursor-pointer group"
      style={{
        width: tileSize,
        height: tileSize,
        transformStyle: 'preserve-3d',
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ground Tile (the base) */}
      <div
        className={`absolute inset-0 ${
          isVacant ? groundStyle.vacant : groundStyle.base
        } ${groundStyle.border} border transition-all duration-300 ${
          isHovered ? `brightness-125 ${groundStyle.hover}` : ''
        }`}
        style={{
          transform: 'translateZ(0px)',
        }}
      >
        {/* Grid lines for visual texture */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 border border-white/20" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
        </div>

        {/* Slot number indicator (subtle) */}
        <div className="absolute bottom-1 right-1 text-[8px] text-white/20 font-mono">
          {slotIndex + 1}
        </div>
      </div>

      {/* Building or Vacant Prop */}
      <IsoBuilding
        building={building}
        tier={tier}
        isHovered={isHovered}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Hover Tooltip */}
      {isHovered && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateZ(100px)',
            marginBottom: '8px',
          }}
        >
          <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl min-w-[160px] backdrop-blur-sm">
            {isVacant ? (
              <>
                <p className="font-semibold text-white text-sm mb-1">Empty Lot</p>
                <p className="text-xs text-gray-400">{groundStyle.description}</p>
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <p className="text-xs text-amber-400">Click to build</p>
                </div>
              </>
            ) : (
              <>
                <p className="font-semibold text-white text-sm">
                  {building.name || `${building.type.charAt(0).toUpperCase()}${building.type.slice(1)}`}
                </p>
                <p className={`text-xs ${districtInfo.color}`}>
                  {districtInfo.label} District
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs ${stateInfo.color}`}>
                    {stateInfo.label}
                  </span>
                  {building.yearOpened && (
                    <span className="text-xs text-gray-500">
                      Est. Year {building.yearOpened}
                    </span>
                  )}
                </div>
                {building.state === 4 && (
                  <div className="mt-1 text-xs text-amber-400 flex items-center gap-1">
                    <span>⭐</span>
                    <span>Landmark Status</span>
                  </div>
                )}
              </>
            )}
          </div>
          {/* Tooltip arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-900 border-r border-b border-gray-700 rotate-45" />
        </div>
      )}

      {/* Click ripple effect zone */}
      {isHovered && (
        <div
          className="absolute inset-0 rounded border-2 border-white/20 animate-pulse pointer-events-none"
          style={{ transform: 'translateZ(1px)' }}
        />
      )}
    </div>
  );
}
