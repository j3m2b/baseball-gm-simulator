'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Building } from '@/lib/types';
import { getDistrictSummary } from '@/lib/simulation/city-growth';

interface DistrictBonusPanelProps {
  buildings: Building[];
}

interface BonusMeterProps {
  label: string;
  icon: string;
  value: number;
  color: string;
  bgColor: string;
  description: string;
  count: number;
}

function BonusMeter({ label, icon, value, color, bgColor, description, count }: BonusMeterProps) {
  // Convert decimal bonus to percentage (e.g., 0.12 -> 12%)
  const percentage = Math.round((value) * 100);
  // Cap the visual bar at 100% but show actual value
  const barWidth = Math.min(percentage, 100);

  return (
    <div className={`${bgColor} rounded-lg p-4 border border-gray-700/50`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h4 className={`font-semibold ${color}`}>{label}</h4>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${color}`}>
            +{percentage}%
          </div>
          <div className="text-xs text-gray-500">
            {count} building{count !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            label === 'Entertainment'
              ? 'bg-gradient-to-r from-purple-600 to-purple-400'
              : label === 'Commercial'
              ? 'bg-gradient-to-r from-blue-600 to-blue-400'
              : 'bg-gradient-to-r from-red-600 to-red-400'
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Milestone Markers */}
      <div className="flex justify-between mt-1 text-[10px] text-gray-500">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

export default function DistrictBonusPanel({ buildings }: DistrictBonusPanelProps) {
  const summary = getDistrictSummary(buildings);

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>📊</span>
          <span>District Bonuses</span>
        </CardTitle>
        <p className="text-sm text-gray-400">
          Active buildings provide bonuses based on their district type
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Entertainment Bonus */}
          <BonusMeter
            label="Entertainment"
            icon="🎭"
            value={summary.entertainment.bonus}
            color="text-purple-400"
            bgColor="bg-purple-900/20"
            description="Fan Pride & Attendance"
            count={summary.entertainment.count}
          />

          {/* Commercial Bonus */}
          <BonusMeter
            label="Commercial"
            icon="💼"
            value={summary.commercial.bonus}
            color="text-blue-400"
            bgColor="bg-blue-900/20"
            description="Revenue & Income"
            count={summary.commercial.count}
          />

          {/* Performance Bonus */}
          <BonusMeter
            label="Performance"
            icon="💪"
            value={summary.performance.bonus}
            color="text-red-400"
            bgColor="bg-red-900/20"
            description="Training & Development"
            count={summary.performance.count}
          />
        </div>

        {/* Total Active Buildings */}
        <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center text-sm">
          <span className="text-gray-400">
            Total Active Buildings
          </span>
          <span className="text-white font-semibold">
            {summary.entertainment.count + summary.commercial.count + summary.performance.count} / 25
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
