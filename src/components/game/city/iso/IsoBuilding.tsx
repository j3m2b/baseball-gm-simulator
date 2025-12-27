'use client';

import { useState } from 'react';
import {
  Utensils,
  Beer,
  ShoppingBag,
  Hotel,
  Building2,
  TreePine,
  CircleDollarSign,
  type LucideIcon,
} from 'lucide-react';
import type { Building, BuildingType, DistrictType, BuildingState, Tier } from '@/lib/types';

// Building icons by type
const BUILDING_ICONS: Record<BuildingType, LucideIcon> = {
  restaurant: Utensils,
  bar: Beer,
  retail: ShoppingBag,
  hotel: Hotel,
  corporate: Building2,
};

// District colors for building faces
const DISTRICT_COLORS: Record<DistrictType, {
  top: string;
  left: string;
  right: string;
  glow: string;
  icon: string;
}> = {
  ENTERTAINMENT: {
    top: 'bg-purple-400',
    left: 'bg-purple-600',
    right: 'bg-purple-700',
    glow: 'drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]',
    icon: 'text-purple-200',
  },
  COMMERCIAL: {
    top: 'bg-blue-400',
    left: 'bg-blue-600',
    right: 'bg-blue-700',
    glow: 'drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]',
    icon: 'text-blue-200',
  },
  PERFORMANCE: {
    top: 'bg-red-400',
    left: 'bg-red-600',
    right: 'bg-red-700',
    glow: 'drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]',
    icon: 'text-red-200',
  },
};

// Building height multipliers based on state
const HEIGHT_MULTIPLIERS: Record<BuildingState, number> = {
  0: 0,    // Vacant - no building
  1: 0.5,  // Renovating - half height
  2: 1,    // Open - full height
  3: 1.5,  // Expanded - 1.5x height
  4: 2,    // Landmark - 2x height (tower)
};

interface IsoBuildingProps {
  building: Building;
  tier: Tier;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function IsoBuilding({
  building,
  tier,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: IsoBuildingProps) {
  const isVacant = building.state === 0;
  const isRenovating = building.state === 1;
  const districtColors = DISTRICT_COLORS[building.district];
  const Icon = BUILDING_ICONS[building.type];

  // Base height in pixels, scales with building state
  const baseHeight = 24;
  const heightMultiplier = HEIGHT_MULTIPLIERS[building.state];
  const buildingHeight = baseHeight * heightMultiplier;

  // Size of the building footprint
  const size = 48;

  // If vacant, render a prop based on tier
  if (isVacant) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <VacantSlotProp tier={tier} isHovered={isHovered} />
      </div>
    );
  }

  // Renovating state - construction scaffolding look
  if (isRenovating) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div
          className="relative transition-all duration-500 ease-out"
          style={{
            width: size,
            height: size,
            transformStyle: 'preserve-3d',
            transform: `translateZ(${buildingHeight / 2}px)`,
          }}
        >
          {/* Construction cube - animated stripes */}
          <div
            className="absolute bg-gradient-to-br from-yellow-500 via-yellow-600 to-orange-600 animate-pulse"
            style={{
              width: size,
              height: buildingHeight,
              transform: `rotateX(-90deg) translateZ(${size / 2}px)`,
              transformOrigin: 'bottom',
            }}
          >
            {/* Scaffolding lines */}
            <div className="absolute inset-0 opacity-30">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-0.5 bg-gray-800"
                  style={{ top: `${(i + 1) * 20}%` }}
                />
              ))}
            </div>
          </div>

          {/* Top face */}
          <div
            className="absolute bg-yellow-400"
            style={{
              width: size,
              height: size,
              transform: `translateZ(${buildingHeight}px)`,
            }}
          />

          {/* Left face */}
          <div
            className="absolute bg-yellow-600"
            style={{
              width: size,
              height: buildingHeight,
              transform: `rotateY(-90deg) translateZ(${size / 2}px)`,
              transformOrigin: 'right',
            }}
          />

          {/* Crane icon on top */}
          <div
            className="absolute flex items-center justify-center text-gray-800"
            style={{
              width: size,
              height: size,
              transform: `translateZ(${buildingHeight + 2}px)`,
            }}
          >
            <span className="text-lg">🏗️</span>
          </div>
        </div>
      </div>
    );
  }

  // Active building (state 2-4)
  const isLandmark = building.state === 4;
  const showGlow = isHovered || isLandmark;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
        showGlow ? districtColors.glow : ''
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="relative transition-all duration-500 ease-out"
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
          transform: `translateZ(${buildingHeight / 2}px) ${isHovered ? 'scale(1.05)' : ''}`,
        }}
      >
        {/* Front face (visible from bottom-right) */}
        <div
          className={`absolute ${districtColors.right} transition-colors duration-300`}
          style={{
            width: size,
            height: buildingHeight,
            transform: `rotateX(-90deg) translateZ(${size / 2}px)`,
            transformOrigin: 'bottom',
          }}
        >
          {/* Windows */}
          <BuildingWindows height={buildingHeight} />
        </div>

        {/* Left face */}
        <div
          className={`absolute ${districtColors.left} transition-colors duration-300`}
          style={{
            width: size,
            height: buildingHeight,
            transform: `rotateY(-90deg) translateZ(${size / 2}px)`,
            transformOrigin: 'right',
          }}
        >
          {/* Windows */}
          <BuildingWindows height={buildingHeight} />
        </div>

        {/* Top face (roof) */}
        <div
          className={`absolute ${districtColors.top} transition-colors duration-300 flex items-center justify-center`}
          style={{
            width: size,
            height: size,
            transform: `translateZ(${buildingHeight}px)`,
          }}
        >
          {/* Icon on roof */}
          <Icon className={`w-6 h-6 ${districtColors.icon} drop-shadow-md`} />
        </div>

        {/* Landmark star */}
        {isLandmark && (
          <div
            className="absolute flex items-center justify-center animate-pulse"
            style={{
              width: size,
              height: size,
              transform: `translateZ(${buildingHeight + 12}px)`,
            }}
          >
            <span className="text-2xl drop-shadow-lg">⭐</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Windows pattern for building faces
function BuildingWindows({ height }: { height: number }) {
  const rows = Math.max(1, Math.floor(height / 12));

  return (
    <div className="absolute inset-1 grid gap-1" style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}>
      {[...Array(rows)].map((_, row) => (
        <div key={row} className="flex gap-1 justify-center items-center">
          {[...Array(3)].map((_, col) => (
            <div
              key={col}
              className="w-2 h-2 bg-yellow-200/60 rounded-sm"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Vacant slot props based on tier
function VacantSlotProp({ tier, isHovered }: { tier: Tier; isHovered: boolean }) {
  const tierLevel = getTierLevel(tier);

  // Lower tiers get trees/nature, higher tiers get "For Sale" signs
  if (tierLevel <= 2) {
    return (
      <div className={`transition-all duration-300 ${isHovered ? 'scale-110' : ''}`}>
        <TreePine
          className={`w-8 h-8 ${
            tierLevel === 1 ? 'text-green-600' : 'text-green-500'
          } drop-shadow-md`}
        />
      </div>
    );
  }

  // Urban tiers - "For Sale" sign
  return (
    <div
      className={`flex flex-col items-center gap-1 transition-all duration-300 ${
        isHovered ? 'scale-110' : ''
      }`}
    >
      <CircleDollarSign className="w-6 h-6 text-amber-500" />
      <div className="text-[8px] text-amber-400 font-bold bg-gray-800/80 px-1 rounded">
        FOR SALE
      </div>
    </div>
  );
}

function getTierLevel(tier: Tier): number {
  const levels: Record<Tier, number> = {
    LOW_A: 1,
    HIGH_A: 2,
    DOUBLE_A: 3,
    TRIPLE_A: 4,
    MLB: 5,
  };
  return levels[tier];
}
