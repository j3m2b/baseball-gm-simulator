'use client';

import { useMemo, type ReactNode } from 'react';
import type { Tier } from '@/lib/types';

interface CityAtmosphereProps {
  children: ReactNode;
  fanPride: number;
  tier: Tier;
}

// Atmosphere presets based on fan pride levels
const ATMOSPHERE_PRESETS = {
  thriving: {
    // Pride > 80: Bright, vibrant, prosperous
    filter: 'saturate(1.2) brightness(1.1)',
    overlay: 'bg-gradient-to-b from-amber-500/5 to-transparent',
    ambientGlow: 'shadow-amber-500/20',
    description: 'The city is thriving!',
    emoji: '🌟',
  },
  healthy: {
    // Pride 60-80: Normal, healthy
    filter: 'saturate(1.05) brightness(1.0)',
    overlay: 'bg-gradient-to-b from-green-500/5 to-transparent',
    ambientGlow: '',
    description: 'A healthy city',
    emoji: '🏙️',
  },
  neutral: {
    // Pride 40-60: Neutral
    filter: 'saturate(1.0) brightness(0.95)',
    overlay: '',
    ambientGlow: '',
    description: 'An average city',
    emoji: '🏢',
  },
  struggling: {
    // Pride 20-40: Struggling, desaturated
    filter: 'saturate(0.8) brightness(0.85)',
    overlay: 'bg-gradient-to-b from-gray-500/10 to-transparent',
    ambientGlow: '',
    description: 'The city struggles',
    emoji: '😔',
  },
  declining: {
    // Pride < 20: Declining, very desaturated
    filter: 'saturate(0.6) brightness(0.75) grayscale(0.3)',
    overlay: 'bg-gradient-to-b from-gray-700/20 to-transparent',
    ambientGlow: '',
    description: 'A city in decline',
    emoji: '💔',
  },
};

// Tier-based ambient effects
const TIER_AMBIENCE: Record<Tier, {
  particles: 'none' | 'few' | 'some' | 'many';
  nightlights: boolean;
  trafficDensity: 'low' | 'medium' | 'high';
}> = {
  LOW_A: { particles: 'none', nightlights: false, trafficDensity: 'low' },
  HIGH_A: { particles: 'few', nightlights: false, trafficDensity: 'low' },
  DOUBLE_A: { particles: 'some', nightlights: true, trafficDensity: 'medium' },
  TRIPLE_A: { particles: 'some', nightlights: true, trafficDensity: 'medium' },
  MLB: { particles: 'many', nightlights: true, trafficDensity: 'high' },
};

function getAtmospherePreset(fanPride: number) {
  if (fanPride > 80) return ATMOSPHERE_PRESETS.thriving;
  if (fanPride > 60) return ATMOSPHERE_PRESETS.healthy;
  if (fanPride > 40) return ATMOSPHERE_PRESETS.neutral;
  if (fanPride > 20) return ATMOSPHERE_PRESETS.struggling;
  return ATMOSPHERE_PRESETS.declining;
}

function getPrideMood(fanPride: number): { label: string; color: string } {
  if (fanPride > 80) return { label: 'Thriving', color: 'text-amber-400' };
  if (fanPride > 60) return { label: 'Healthy', color: 'text-green-400' };
  if (fanPride > 40) return { label: 'Stable', color: 'text-gray-400' };
  if (fanPride > 20) return { label: 'Struggling', color: 'text-orange-400' };
  return { label: 'Declining', color: 'text-red-400' };
}

export default function CityAtmosphere({
  children,
  fanPride,
  tier,
}: CityAtmosphereProps) {
  const atmosphere = useMemo(() => getAtmospherePreset(fanPride), [fanPride]);
  const tierAmbience = useMemo(() => TIER_AMBIENCE[tier], [tier]);
  const prideMood = useMemo(() => getPrideMood(fanPride), [fanPride]);

  // Neon glow effect for high pride entertainment district
  const showNeonGlow = fanPride > 80;

  return (
    <div className="relative">
      {/* Atmosphere Status Indicator */}
      <div className="flex items-center justify-between mb-4 px-2 text-sm">
        <div className="flex items-center gap-2">
          <span>{atmosphere.emoji}</span>
          <span className={prideMood.color}>{prideMood.label}</span>
        </div>
        <div className="text-gray-500 text-xs">
          Fan Pride: {fanPride}%
        </div>
      </div>

      {/* Main content with atmosphere filter */}
      <div
        className={`relative rounded-xl overflow-hidden ${atmosphere.ambientGlow}`}
        style={{
          filter: atmosphere.filter,
          transition: 'filter 1s ease-in-out',
        }}
      >
        {/* Atmospheric overlay gradient */}
        {atmosphere.overlay && (
          <div
            className={`absolute inset-0 pointer-events-none z-10 ${atmosphere.overlay}`}
          />
        )}

        {/* Neon glow effect for high pride */}
        {showNeonGlow && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 animate-pulse opacity-20">
              <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500 rounded-full blur-3xl" />
              <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-blue-500 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-red-500 rounded-full blur-3xl" />
            </div>
          </div>
        )}

        {/* Ambient particles for higher tiers */}
        {tierAmbience.particles !== 'none' && (
          <AmbientParticles density={tierAmbience.particles} />
        )}

        {/* The actual city grid content */}
        <div className="relative z-0">
          {children}
        </div>
      </div>

      {/* Bottom atmospheric gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none z-20"
        style={{
          background: 'linear-gradient(to top, rgba(17,24,39,0.9) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}

// Floating ambient particles for atmosphere
function AmbientParticles({ density }: { density: 'few' | 'some' | 'many' }) {
  const particleCount = density === 'many' ? 12 : density === 'some' ? 6 : 3;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-5">
      {[...Array(particleCount)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
}
