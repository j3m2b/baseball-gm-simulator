'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface GameEvent {
  id: string;
  year: number;
  type: string;
  title: string;
  description: string;
  is_read: boolean;
  effects?: unknown;
  duration_years?: number | null;
}

interface RecentEventsProps {
  events: GameEvent[];
  maxEvents?: number;
  compact?: boolean;
}

// Color schemes for different event types
const EVENT_STYLES: Record<string, {
  border: string;
  bg: string;
  icon: string;
  iconBg: string;
  title: string;
}> = {
  economic: {
    border: 'border-l-red-500',
    bg: 'bg-red-950/30',
    icon: '📉',
    iconBg: 'bg-red-900/50',
    title: 'text-red-400',
  },
  team: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-950/30',
    icon: '⚾',
    iconBg: 'bg-blue-900/50',
    title: 'text-blue-400',
  },
  city: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-950/30',
    icon: '🏟️',
    iconBg: 'bg-amber-900/50',
    title: 'text-amber-400',
  },
  story: {
    border: 'border-l-purple-500',
    bg: 'bg-purple-950/30',
    icon: '📰',
    iconBg: 'bg-purple-900/50',
    title: 'text-purple-400',
  },
  // Default for system events like season_complete, draft_complete, etc.
  default: {
    border: 'border-l-gray-500',
    bg: 'bg-gray-800/30',
    icon: '📋',
    iconBg: 'bg-gray-700/50',
    title: 'text-gray-400',
  },
};

function getEventStyle(type: string) {
  return EVENT_STYLES[type] || EVENT_STYLES.default;
}

function getEventTypeBadge(type: string) {
  const labels: Record<string, string> = {
    economic: 'Economic',
    team: 'Team',
    city: 'City',
    story: 'Story',
    season_complete: 'Season',
    draft_complete: 'Draft',
    promotion: 'Promotion',
  };
  return labels[type] || type;
}

export default function RecentEvents({ events, maxEvents = 3, compact = false }: RecentEventsProps) {
  const displayEvents = events.slice(0, maxEvents);

  if (displayEvents.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No events yet. Events will appear as the season progresses.</p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    // Compact version for sidebar
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400">Recent Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayEvents.map((event) => {
            const style = getEventStyle(event.type);
            return (
              <div
                key={event.id}
                className={`border-l-2 ${style.border} pl-3 py-1`}
              >
                <div className={`text-sm font-medium ${style.title}`}>{event.title}</div>
                <div className="text-xs text-gray-500">Year {event.year}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Full version for Overview tab
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span>Recent Events</span>
          {events.some(e => !e.is_read) && (
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayEvents.map((event) => {
          const style = getEventStyle(event.type);
          return (
            <div
              key={event.id}
              className={`border-l-4 ${style.border} ${style.bg} rounded-r-lg p-3`}
            >
              <div className="flex items-start gap-3">
                <div className={`${style.iconBg} w-8 h-8 rounded-full flex items-center justify-center shrink-0`}>
                  <span className="text-sm">{style.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold ${style.title}`}>{event.title}</span>
                    <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                      {getEventTypeBadge(event.type)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2">{event.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>Year {event.year}</span>
                    {event.duration_years && event.duration_years > 0 && (
                      <span className="text-amber-500">
                        Effect lasts {event.duration_years} year{event.duration_years > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
