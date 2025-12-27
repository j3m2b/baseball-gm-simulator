'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { NewsStory, NewsStoryType, NewsPriority } from '@/lib/types';

interface NewsFeedProps {
  stories: NewsStory[];
  maxStories?: number;
  showTicker?: boolean;
  compact?: boolean;
}

// Icon mappings for different story types and icons
const ICON_MAP: Record<string, string> = {
  // Story type icons
  trophy: '🏆',
  baseball: '⚾',
  fire: '🔥',
  warning: '⚠️',
  star: '⭐',
  arm: '💪',
  crown: '👑',
  diamond: '💎',
  explosion: '💥',
  city: '🏙️',
  medal: '🥇',
  party: '🎉',
  up: '⬆️',
  down: '⬇️',
  swap: '🔄',
  default: '📰',
};

// Style configurations for story types
const STORY_STYLES: Record<NewsStoryType, {
  border: string;
  bg: string;
  iconBg: string;
  title: string;
  badge: string;
}> = {
  GAME_RESULT: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-950/30',
    iconBg: 'bg-blue-900/50',
    title: 'text-blue-400',
    badge: 'Game',
  },
  MILESTONE: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-950/30',
    iconBg: 'bg-amber-900/50',
    title: 'text-amber-400',
    badge: 'Milestone',
  },
  TRANSACTION: {
    border: 'border-l-green-500',
    bg: 'bg-green-950/30',
    iconBg: 'bg-green-900/50',
    title: 'text-green-400',
    badge: 'Transaction',
  },
  CITY: {
    border: 'border-l-purple-500',
    bg: 'bg-purple-950/30',
    iconBg: 'bg-purple-900/50',
    title: 'text-purple-400',
    badge: 'City',
  },
};

// Priority styles
const PRIORITY_STYLES: Record<NewsPriority, {
  label: string;
  className: string;
}> = {
  HIGH: {
    label: 'BREAKING',
    className: 'bg-red-600 text-white animate-pulse',
  },
  LOW: {
    label: '',
    className: '',
  },
};

function getIcon(iconName?: string): string {
  return ICON_MAP[iconName || 'default'] || ICON_MAP.default;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// News Ticker component for scrolling headlines
function NewsTicker({ stories }: { stories: NewsStory[] }) {
  if (stories.length === 0) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center">
        <div className="bg-red-600 px-3 py-2 text-white text-xs font-bold shrink-0">
          BREAKING
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap py-2 px-4">
            {stories.map((story, index) => (
              <span key={story.id} className="mx-8 text-sm text-gray-300">
                {getIcon(story.imageIcon)} {story.headline}
                {index < stories.length - 1 && (
                  <span className="mx-4 text-gray-600">|</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Single news story card
function NewsStoryCard({ story, compact }: { story: NewsStory; compact?: boolean }) {
  const style = STORY_STYLES[story.type];
  const priority = PRIORITY_STYLES[story.priority];

  if (compact) {
    return (
      <div className={`border-l-2 ${style.border} pl-3 py-1.5`}>
        <div className="flex items-start gap-2">
          <span className="text-sm">{getIcon(story.imageIcon)}</span>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${style.title} line-clamp-1`}>
              {story.headline}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Game {story.gameNumber || '-'}</span>
              {story.playerName && (
                <span className="text-gray-400">{story.playerName}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-l-4 ${style.border} ${style.bg} rounded-r-lg p-3`}>
      <div className="flex items-start gap-3">
        <div className={`${style.iconBg} w-10 h-10 rounded-full flex items-center justify-center shrink-0`}>
          <span className="text-lg">{getIcon(story.imageIcon)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {story.priority === 'HIGH' && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${priority.className}`}>
                {priority.label}
              </span>
            )}
            <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
              {style.badge}
            </span>
          </div>
          <p className={`font-semibold ${style.title} leading-tight`}>
            {story.headline}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {story.gameNumber && <span>Game #{story.gameNumber}</span>}
            <span>{formatDate(story.date)}</span>
            {story.playerName && (
              <span className="text-gray-400">{story.playerName}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewsFeed({
  stories,
  maxStories = 5,
  showTicker = false,
  compact = false,
}: NewsFeedProps) {
  // Split stories by priority
  const breakingNews = stories.filter(s => s.priority === 'HIGH');
  const regularNews = stories.filter(s => s.priority === 'LOW');
  const displayStories = stories.slice(0, maxStories);

  if (stories.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <span>📰</span>
            <span>News Feed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            No news yet. Headlines will appear as the season progresses.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Breaking News Ticker */}
      {showTicker && breakingNews.length > 0 && (
        <NewsTicker stories={breakingNews.slice(0, 5)} />
      )}

      {/* Main News Feed */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className={compact ? 'pb-2' : ''}>
          <CardTitle className={`flex items-center justify-between ${compact ? 'text-sm font-medium text-gray-400' : 'text-lg'}`}>
            <div className="flex items-center gap-2">
              <span>📰</span>
              <span>News Feed</span>
              {breakingNews.length > 0 && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            {!compact && (
              <span className="text-xs text-gray-500 font-normal">
                {stories.length} stories
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {displayStories.map((story) => (
            <NewsStoryCard key={story.id} story={story} compact={compact} />
          ))}

          {stories.length > maxStories && (
            <div className="text-center">
              <button className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
                View {stories.length - maxStories} more stories...
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export sub-components for flexibility
export { NewsTicker, NewsStoryCard };
