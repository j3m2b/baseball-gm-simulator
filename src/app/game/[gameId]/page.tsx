import { notFound } from 'next/navigation';
import { getGame, getPlayerRoster, getDraftState, getDraftProspects, getRecentEvents } from '@/lib/actions/game';
import GameDashboard from '@/components/game/GameDashboard';

interface Props {
  params: Promise<{ gameId: string }>;
}

export default async function GamePage({ params }: Props) {
  const { gameId } = await params;

  const game = await getGame(gameId);

  if (!game) {
    notFound();
  }

  const [roster, draftState, events] = await Promise.all([
    getPlayerRoster(gameId),
    getDraftState(gameId),
    getRecentEvents(gameId),
  ]);

  // Get draft prospects if in draft phase
  let prospects: Awaited<ReturnType<typeof getDraftProspects>> = [];
  if (game.current_phase === 'draft' && draftState) {
    prospects = await getDraftProspects(gameId, game.current_year);
  }

  return (
    <GameDashboard
      game={game}
      roster={roster}
      draftState={draftState}
      prospects={prospects}
      events={events}
    />
  );
}
