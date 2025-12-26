'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';

interface Building {
  id: number;
  type: string;
  state: number;
  name: string | null;
}

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
}

export default function CityTab({ city, cityName, teamName }: CityTabProps) {
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

  // Count buildings by state
  const buildingCounts = {
    vacant: buildings.filter(b => b.state === 0).length,
    renovating: buildings.filter(b => b.state === 1).length,
    open: buildings.filter(b => b.state === 2).length,
    expanded: buildings.filter(b => b.state === 3).length,
    landmark: buildings.filter(b => b.state === 4).length,
  };

  // Count by type
  const typeCounts: Record<string, number> = {};
  buildings.forEach(b => {
    if (b.state >= 2 && b.type) {
      typeCounts[b.type] = (typeCounts[b.type] || 0) + 1;
    }
  });

  function getBuildingColor(state: number): string {
    switch (state) {
      case 0: return 'bg-gray-800 border-gray-700'; // Vacant
      case 1: return 'bg-yellow-900/30 border-yellow-800'; // Renovating
      case 2: return 'bg-green-900/30 border-green-800'; // Open
      case 3: return 'bg-blue-900/30 border-blue-800'; // Expanded
      case 4: return 'bg-amber-900/30 border-amber-700'; // Landmark
      default: return 'bg-gray-800 border-gray-700';
    }
  }

  function getBuildingIcon(type: string, state: number): string {
    if (state === 0) return '🏚️';
    if (state === 1) return '🏗️';

    switch (type) {
      case 'restaurant': return '🍽️';
      case 'bar': return '🍺';
      case 'retail': return '🛍️';
      case 'hotel': return '🏨';
      case 'corporate': return '🏢';
      default: return '🏠';
    }
  }

  function getStateLabel(state: number): string {
    switch (state) {
      case 0: return 'Vacant';
      case 1: return 'Renovating';
      case 2: return 'Open';
      case 3: return 'Expanded';
      case 4: return 'Landmark';
      default: return 'Unknown';
    }
  }

  function getStateBadgeColor(state: number): string {
    switch (state) {
      case 0: return 'bg-gray-600';
      case 1: return 'bg-yellow-600';
      case 2: return 'bg-green-600';
      case 3: return 'bg-blue-600';
      case 4: return 'bg-amber-600';
      default: return 'bg-gray-600';
    }
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

      {/* Downtown District */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Downtown District</CardTitle>
            <Badge className="bg-amber-600 text-white">
              {(city.occupancy_rate * 100).toFixed(0)}% Occupied
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            50 buildings surrounding the stadium. Win games to grow the city!
          </p>
        </CardHeader>
        <CardContent>
          {/* Building Legend */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-800 border border-gray-700" />
              <span className="text-xs text-gray-400">Vacant ({buildingCounts.vacant})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-900/30 border border-yellow-800" />
              <span className="text-xs text-gray-400">Renovating ({buildingCounts.renovating})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-900/30 border border-green-800" />
              <span className="text-xs text-gray-400">Open ({buildingCounts.open})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-900/30 border border-blue-800" />
              <span className="text-xs text-gray-400">Expanded ({buildingCounts.expanded})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-900/30 border border-amber-700" />
              <span className="text-xs text-gray-400">Landmark ({buildingCounts.landmark})</span>
            </div>
          </div>

          {/* Building Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {buildings.map((building) => (
              <div
                key={building.id}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center text-lg cursor-default transition-transform hover:scale-110 ${getBuildingColor(building.state)}`}
                title={building.name || `${getStateLabel(building.state)} ${building.type || 'lot'}`}
              >
                {getBuildingIcon(building.type, building.state)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Business Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Businesses */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Active Businesses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(typeCounts).length === 0 ? (
                <p className="text-gray-400 text-sm">No businesses open yet. Win games to grow the city!</p>
              ) : (
                Object.entries(typeCounts).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getBuildingIcon(type, 2)}</span>
                      <span className="text-gray-300 capitalize">{type}s</span>
                    </div>
                    <Badge variant="outline" className="text-gray-300">
                      {count}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notable Locations */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Notable Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {buildings.filter(b => b.state >= 2 && b.name).length === 0 ? (
                <p className="text-gray-400 text-sm">No notable locations yet.</p>
              ) : (
                buildings
                  .filter(b => b.state >= 2 && b.name)
                  .sort((a, b) => b.state - a.state)
                  .slice(0, 10)
                  .map((building) => (
                    <div key={building.id} className="flex justify-between items-center p-2 rounded bg-gray-800">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getBuildingIcon(building.type, building.state)}</span>
                        <span className="text-gray-300">{building.name}</span>
                      </div>
                      <Badge className={getStateBadgeColor(building.state)}>
                        {getStateLabel(building.state)}
                      </Badge>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* City Growth Guide */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-lg">City Growth</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400 space-y-2">
          <p>
            Your team's success directly impacts the city. Winning seasons bring new businesses,
            increased population, and higher property values.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Win games to increase team pride and attract investment</li>
            <li>Higher attendance leads to more foot traffic for businesses</li>
            <li>Making playoffs gives a major boost to city growth</li>
            <li>Buildings upgrade through 5 stages: Vacant → Renovating → Open → Expanded → Landmark</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
