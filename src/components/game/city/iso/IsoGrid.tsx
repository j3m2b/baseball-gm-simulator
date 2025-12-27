'use client';

import { useMemo } from 'react';
import type { Building, Tier } from '@/lib/types';
import IsoTile from './IsoTile';

interface IsoGridProps {
  buildings: Building[];
  onSlotClick: (slotIndex: number, building: Building | null) => void;
  tier: Tier;
  fanPride: number;
}

export default function IsoGrid({
  buildings,
  onSlotClick,
  tier,
  fanPride,
}: IsoGridProps) {
  // Take only first 25 buildings for the 5x5 grid
  const gridBuildings = useMemo(() => buildings.slice(0, 25), [buildings]);

  // Calculate stats
  const stats = useMemo(() => {
    const occupied = gridBuildings.filter(b => b.state >= 2).length;
    const renovating = gridBuildings.filter(b => b.state === 1).length;
    const vacant = gridBuildings.filter(b => b.state === 0).length;
    const landmarks = gridBuildings.filter(b => b.state === 4).length;
    return { occupied, renovating, vacant, landmarks };
  }, [gridBuildings]);

  // Tile dimensions for positioning
  const tileSize = 80;
  const gap = 4;
  const gridSize = 5;

  // Calculate container dimensions for the rotated grid
  // After rotation, the diagonal becomes the width
  const containerWidth = (tileSize + gap) * gridSize * 1.5;
  const containerHeight = (tileSize + gap) * gridSize * 1.2;

  return (
    <div className="w-full">
      {/* Stats Header */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-lg">🏙️</span>
          <span className="font-semibold text-white">City District</span>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-green-400">{stats.occupied} Active</span>
          <span className="text-yellow-400">{stats.renovating} Building</span>
          <span className="text-gray-400">{stats.vacant} Available</span>
          {stats.landmarks > 0 && (
            <span className="text-amber-400">⭐ {stats.landmarks} Landmark{stats.landmarks > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* District Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-xs px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-600 border border-purple-400" />
          <span className="text-purple-400">Entertainment</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-600 border border-blue-400" />
          <span className="text-blue-400">Commercial</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-600 border border-red-400" />
          <span className="text-red-400">Performance</span>
        </div>
      </div>

      {/* Isometric Grid Container */}
      <div
        className="relative mx-auto overflow-visible"
        style={{
          width: containerWidth,
          height: containerHeight,
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
        }}
      >
        {/* The isometric plane */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            transformStyle: 'preserve-3d',
            transform: `
              translateX(-50%)
              translateY(-50%)
              rotateX(60deg)
              rotateZ(-45deg)
            `,
          }}
        >
          {/* Grid of tiles */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, ${tileSize}px)`,
              gap: `${gap}px`,
            }}
          >
            {gridBuildings.map((building, index) => (
              <IsoTile
                key={building.id}
                building={building}
                slotIndex={index}
                tier={tier}
                fanPride={fanPride}
                onClick={() => onSlotClick(index, building.state === 0 ? null : building)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Ground Shadow Effect */}
      <div
        className="mx-auto mt-4 opacity-20 blur-xl"
        style={{
          width: containerWidth * 0.7,
          height: 20,
          background: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
        }}
      />

      {/* Controls hint */}
      <div className="text-center mt-4 text-xs text-gray-500">
        Click empty lots to construct new buildings
      </div>
    </div>
  );
}
