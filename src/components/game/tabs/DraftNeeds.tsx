'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RosterPlayer {
  position: string;
}

interface DraftNeedsProps {
  roster: RosterPlayer[];
}

// Target roster composition for MLB 26-man roster
const ROSTER_TARGETS: Record<string, { target: number; priority: 'high' | 'medium' | 'low' }> = {
  // Pitchers (13 total - MLB hard cap)
  SP: { target: 5, priority: 'high' },      // The Rotation
  RP: { target: 8, priority: 'medium' },    // Bullpen (Closer/Setup/Long Relief)
  // Catchers (2 total)
  C: { target: 2, priority: 'high' },       // Starter + Backup
  // Infielders (6 total)
  '1B': { target: 1, priority: 'low' },
  '2B': { target: 2, priority: 'medium' },  // Starter + Utility Backup
  '3B': { target: 1, priority: 'low' },
  SS: { target: 2, priority: 'high' },      // Starter + Utility Backup
  // Outfielders (5 total)
  LF: { target: 2, priority: 'low' },       // Starter + Bench Bat/DH type
  CF: { target: 1, priority: 'medium' },    // True Centerfielder
  RF: { target: 2, priority: 'low' },       // Starter + Bench Power Bat
};

// Group positions by category for display
const POSITION_GROUPS = {
  Pitchers: ['SP', 'RP'],
  Catchers: ['C'],
  Infield: ['1B', '2B', '3B', 'SS'],
  Outfield: ['LF', 'CF', 'RF'],
};

export default function DraftNeeds({ roster }: DraftNeedsProps) {
  // Count current roster by position
  const positionCounts: Record<string, number> = {};
  for (const player of roster) {
    positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
  }

  function getCountColor(current: number, target: number): string {
    if (current >= target) return 'text-green-400';
    if (current > 0) return 'text-yellow-400';
    return 'text-red-400';
  }

  function getPriorityDot(priority: 'high' | 'medium' | 'low'): React.ReactNode {
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-gray-500',
    };
    return (
      <span className={`inline-block w-2 h-2 rounded-full ${colors[priority]}`} />
    );
  }

  // Calculate overall needs
  const totalNeeds = Object.entries(ROSTER_TARGETS).reduce((sum, [pos, config]) => {
    const current = positionCounts[pos] || 0;
    return sum + Math.max(0, config.target - current);
  }, 0);

  const highPriorityNeeds = Object.entries(ROSTER_TARGETS)
    .filter(([pos, config]) => config.priority === 'high')
    .reduce((sum, [pos, config]) => {
      const current = positionCounts[pos] || 0;
      return sum + Math.max(0, config.target - current);
    }, 0);

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex justify-between items-center">
          <span>Roster Needs</span>
          <span className="text-xs text-gray-400 font-normal">
            {roster.length}/26
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="flex justify-between text-sm bg-gray-800/50 rounded-lg p-3">
          <div>
            <div className={`font-bold ${totalNeeds > 10 ? 'text-red-400' : totalNeeds > 5 ? 'text-yellow-400' : 'text-green-400'}`}>
              {totalNeeds}
            </div>
            <div className="text-xs text-gray-500">Open Spots</div>
          </div>
          <div className="text-right">
            <div className={`font-bold ${highPriorityNeeds > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {highPriorityNeeds}
            </div>
            <div className="text-xs text-gray-500">Key Needs</div>
          </div>
        </div>

        {/* Position Groups */}
        <div className="space-y-4">
          {Object.entries(POSITION_GROUPS).map(([groupName, positions]) => (
            <div key={groupName}>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                {groupName}
              </div>
              <div className="space-y-1">
                {positions.map((pos) => {
                  const current = positionCounts[pos] || 0;
                  const config = ROSTER_TARGETS[pos];
                  const target = config?.target || 1;
                  const priority = config?.priority || 'low';
                  const isFilled = current >= target;

                  return (
                    <div
                      key={pos}
                      className={`flex items-center justify-between py-1.5 px-2 rounded ${
                        isFilled ? 'bg-gray-800/30' : 'bg-gray-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {!isFilled && getPriorityDot(priority)}
                        <span className={`font-mono text-sm ${isFilled ? 'text-gray-500' : 'text-white'}`}>
                          {pos}
                        </span>
                      </div>
                      <span className={`font-mono text-sm font-medium ${getCountColor(current, target)}`}>
                        {current}/{target}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="pt-3 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-2">Priority</div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-400">High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-gray-400">Med</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-500" />
              <span className="text-gray-400">Low</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
