'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';

interface GameOverProps {
  teamName: string;
  cityName: string;
  year: number;
  tier: string;
  reserves: number;
  cityPride: number;
  rosterSize: number;
}

export default function GameOver({
  teamName,
  cityName,
  year,
  tier,
  reserves,
  cityPride,
  rosterSize,
}: GameOverProps) {
  function formatTier(t: string) {
    const tiers: Record<string, string> = {
      LOW_A: 'Low-A',
      HIGH_A: 'High-A',
      DOUBLE_A: 'Double-A',
      TRIPLE_A: 'Triple-A',
      MLB: 'MLB',
    };
    return tiers[t] || t;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950 via-red-900 to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Fired Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-red-800/50 flex items-center justify-center border-4 border-red-600">
            <svg
              className="w-14 h-14 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-bold text-red-400 mb-4">
          You Were Fired
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-red-200 mb-8">
          The owners of the {teamName} have terminated your contract.
        </p>

        {/* Reason */}
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-red-300 mb-4">
            Reason for Termination
          </h2>
          <p className="text-gray-300 text-lg">
            Financial insolvency. With reserves at{' '}
            <span className="font-bold text-red-400">
              {formatCurrency(reserves)}
            </span>
            , the franchise could no longer meet its obligations. The team has
            been dissolved.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Years as GM</div>
            <div className="text-2xl font-bold text-white">{year}</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Final Tier</div>
            <div className="text-2xl font-bold text-amber-500">
              {formatTier(tier)}
            </div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">City Pride</div>
            <div className="text-2xl font-bold text-white">{cityPride}%</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Roster Size</div>
            <div className="text-2xl font-bold text-white">{rosterSize}</div>
          </div>
        </div>

        {/* City Impact */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            Impact on {cityName}
          </h3>
          <p className="text-gray-400">
            With the team gone, the city&apos;s hopes of reaching the majors have
            been dashed. The stadium sits empty, a monument to what could have
            been.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button
              size="lg"
              className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-6 text-lg font-semibold"
            >
              Return to Menu
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-12 text-sm text-gray-600">
          Better luck next time, GM.
        </p>
      </div>
    </div>
  );
}
