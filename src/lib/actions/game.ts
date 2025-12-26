'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateInitialCity } from '@/lib/simulation/city-growth';
import { generateDraftClass } from '@/lib/simulation/draft';
import { TIER_CONFIGS, AI_TEAMS, type DifficultyMode } from '@/lib/types';
import type { Database } from '@/lib/types/database';

type GameRow = Database['public']['Tables']['games']['Row'];
type FranchiseRow = Database['public']['Tables']['current_franchise']['Row'];
type CityStateRow = Database['public']['Tables']['city_states']['Row'];
type PlayerRow = Database['public']['Tables']['players']['Row'];
type DraftRow = Database['public']['Tables']['drafts']['Row'];
type ProspectRow = Database['public']['Tables']['draft_prospects']['Row'];
type EventRow = Database['public']['Tables']['game_events']['Row'];

// ============================================
// CREATE NEW GAME
// ============================================

export async function createGame(formData: FormData) {
  const supabase = await createClient();

  const cityName = formData.get('cityName') as string;
  const teamName = formData.get('teamName') as string || `${cityName} Baseball Club`;
  const difficulty = (formData.get('difficulty') as DifficultyMode) || 'normal';

  if (!cityName || cityName.length < 2) {
    return { error: 'City name must be at least 2 characters' };
  }

  // For now, use a placeholder user ID (in production, get from auth)
  const userId = '00000000-0000-0000-0000-000000000000';

  try {
    // 1. Create the game record
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        user_id: userId,
        city_name: cityName,
        team_name: teamName,
        difficulty,
        current_year: 1,
        current_phase: 'draft',
        current_tier: 'LOW_A',
      } as any)
      .select()
      .single();

    if (gameError) throw gameError;
    if (!game) throw new Error('Failed to create game');

    const gameData = game as GameRow;
    const tierConfig = TIER_CONFIGS.LOW_A;

    // 2. Create franchise state
    const { error: franchiseError } = await supabase
      .from('current_franchise')
      .insert({
        game_id: gameData.id,
        tier: 'LOW_A',
        budget: tierConfig.budget,
        reserves: 50000,
        stadium_name: `${cityName} Field`,
        stadium_capacity: tierConfig.stadiumCapacity,
        stadium_quality: 40,
        hitting_coach_skill: 40,
        hitting_coach_salary: 50000,
        pitching_coach_skill: 40,
        pitching_coach_salary: 50000,
        development_coord_skill: 40,
        development_coord_salary: 50000,
        ticket_price: tierConfig.ticketPriceRange.min + 2,
      } as any);

    if (franchiseError) throw franchiseError;

    // 3. Create initial city state
    const initialBuildings = generateInitialCity();
    const openBuildings = initialBuildings.filter(b => b.state >= 2).length;

    const { error: cityError } = await supabase
      .from('city_states')
      .insert({
        game_id: gameData.id,
        population: tierConfig.cityPopulation,
        median_income: tierConfig.medianIncome,
        unemployment_rate: tierConfig.unemploymentRate,
        team_pride: 30,
        national_recognition: 5,
        buildings: initialBuildings,
        occupancy_rate: openBuildings / 50,
      } as any);

    if (cityError) throw cityError;

    // 4. Create draft for Year 1
    const { data: draft, error: draftError } = await supabase
      .from('drafts')
      .insert({
        game_id: gameData.id,
        year: 1,
        current_round: 1,
        current_pick: 1,
        is_complete: false,
        total_rounds: 40,
        teams_count: 20,
        players_per_round: 20,
        player_draft_position: 10,
      } as any)
      .select()
      .single();

    if (draftError) throw draftError;

    // 5. Generate draft class
    const prospects = generateDraftClass({
      gameId: gameData.id,
      draftYear: 1,
      totalPlayers: 800,
    });

    // Insert prospects in batches
    const batchSize = 100;
    for (let i = 0; i < prospects.length; i += batchSize) {
      const batch = prospects.slice(i, i + batchSize).map(p => ({
        game_id: gameData.id,
        draft_year: 1,
        first_name: p.firstName,
        last_name: p.lastName,
        age: p.age,
        position: p.position,
        player_type: p.playerType,
        current_rating: p.currentRating,
        potential: p.potential,
        hitter_attributes: p.hitterAttributes,
        pitcher_attributes: p.pitcherAttributes,
        hidden_traits: p.hiddenTraits,
        is_drafted: false,
      }));

      const { error: prospectError } = await supabase
        .from('draft_prospects')
        .insert(batch as any);

      if (prospectError) throw prospectError;
    }

    // 6. Create welcome event
    const { error: eventError } = await supabase
      .from('game_events')
      .insert({
        game_id: gameData.id,
        year: 1,
        type: 'city_growth',
        title: 'Welcome to ' + cityName + '!',
        description: `You've been hired as the new General Manager of the ${teamName}. The city is struggling, but with smart decisions and some luck, you can turn things around. Your first task: build a roster through the draft.`,
        is_read: false,
      } as any);

    if (eventError) throw eventError;

    return { success: true, gameId: gameData.id };
  } catch (error) {
    console.error('Error creating game:', error);
    return { error: 'Failed to create game. Please try again.' };
  }
}

// ============================================
// GET GAME
// ============================================

export async function getGame(gameId: string) {
  const supabase = await createClient();

  const { data: game, error } = await supabase
    .from('games')
    .select(`
      *,
      current_franchise (*),
      city_states (*)
    `)
    .eq('id', gameId)
    .single();

  if (error) {
    console.error('Error fetching game:', error);
    return null;
  }

  return game as (GameRow & {
    current_franchise: FranchiseRow | null;
    city_states: CityStateRow | null;
  });
}

// ============================================
// GET SAVED GAMES
// ============================================

export async function getSavedGames() {
  const supabase = await createClient();

  const { data: games, error } = await supabase
    .from('games')
    .select(`
      id,
      city_name,
      team_name,
      current_year,
      current_tier,
      current_phase,
      created_at,
      updated_at
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved games:', error);
    return [];
  }

  return games as Pick<GameRow, 'id' | 'city_name' | 'team_name' | 'current_year' | 'current_tier' | 'current_phase' | 'created_at' | 'updated_at'>[];
}

// ============================================
// GET PLAYER ROSTER
// ============================================

export async function getPlayerRoster(gameId: string) {
  const supabase = await createClient();

  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_on_roster', true)
    .order('current_rating', { ascending: false });

  if (error) {
    console.error('Error fetching roster:', error);
    return [];
  }

  return players as PlayerRow[];
}

// ============================================
// GET DRAFT PROSPECTS
// ============================================

export async function getDraftProspects(gameId: string, year: number) {
  const supabase = await createClient();

  const { data: prospects, error } = await supabase
    .from('draft_prospects')
    .select('*')
    .eq('game_id', gameId)
    .eq('draft_year', year)
    .eq('is_drafted', false)
    .order('current_rating', { ascending: false });

  if (error) {
    console.error('Error fetching prospects:', error);
    return [];
  }

  return prospects as ProspectRow[];
}

// ============================================
// GET DRAFT STATE
// ============================================

export async function getDraftState(gameId: string) {
  const supabase = await createClient();

  const { data: game } = await supabase
    .from('games')
    .select('current_year')
    .eq('id', gameId)
    .single();

  if (!game) return null;

  const gameData = game as Pick<GameRow, 'current_year'>;

  const { data: draft, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('game_id', gameId)
    .eq('year', gameData.current_year)
    .single();

  if (error) {
    console.error('Error fetching draft:', error);
    return null;
  }

  return draft as DraftRow;
}

// ============================================
// SCOUT PROSPECT
// ============================================

export async function scoutProspect(
  gameId: string,
  prospectId: string,
  accuracy: 'low' | 'medium' | 'high'
) {
  const supabase = await createClient();

  // Get prospect's true ratings
  const { data: prospect, error: prospectError } = await supabase
    .from('draft_prospects')
    .select('*')
    .eq('id', prospectId)
    .single();

  if (prospectError || !prospect) {
    return { error: 'Prospect not found' };
  }

  const prospectData = prospect as ProspectRow;

  // Get franchise for budget check
  const { data: franchise, error: franchiseError } = await supabase
    .from('current_franchise')
    .select('*')
    .eq('game_id', gameId)
    .single();

  if (franchiseError || !franchise) {
    return { error: 'Franchise not found' };
  }

  const franchiseData = franchise as FranchiseRow;

  // Calculate scouting cost
  const costs = { low: 2000, medium: 4000, high: 8000 };
  const cost = costs[accuracy];

  // Check if we can afford it
  if (franchiseData.reserves < cost) {
    return { error: 'Insufficient funds for scouting' };
  }

  // Calculate scouted values with error based on accuracy
  const errors = { low: 15, medium: 8, high: 3 };
  const maxError = errors[accuracy];

  const ratingError = Math.floor((Math.random() * 2 - 1) * maxError);
  const potentialError = Math.floor((Math.random() * 2 - 1) * maxError);

  const scoutedRating = Math.max(20, Math.min(80, prospectData.current_rating + ratingError));
  const scoutedPotential = Math.max(20, Math.min(80, prospectData.potential + potentialError));

  // Check trait discovery
  const traitChances = { low: 0.3, medium: 0.6, high: 0.9 };
  const traitsRevealed = Math.random() < traitChances[accuracy];

  // Update prospect with scouted values
  const { error: updateError } = await supabase
    .from('draft_prospects')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      scouted_rating: scoutedRating,
      scouted_potential: scoutedPotential,
      scouting_accuracy: accuracy,
    })
    .eq('id', prospectId);

  if (updateError) {
    return { error: 'Failed to update scouting data' };
  }

  // Deduct cost from reserves
  const { error: costError } = await supabase
    .from('current_franchise')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      reserves: franchiseData.reserves - cost,
    })
    .eq('game_id', gameId);

  if (costError) {
    return { error: 'Failed to deduct scouting cost' };
  }

  // Create scouting report
  const { data: game } = await supabase
    .from('games')
    .select('current_year')
    .eq('id', gameId)
    .single();

  const gameData = game as Pick<GameRow, 'current_year'> | null;

  await supabase.from('scouting_reports').insert({
    game_id: gameId,
    prospect_id: prospectId,
    scouted_rating: scoutedRating,
    scouted_potential: scoutedPotential,
    accuracy,
    rating_error: Math.abs(ratingError),
    traits_revealed: traitsRevealed,
    revealed_traits: traitsRevealed ? prospectData.hidden_traits : null,
    cost,
    year: gameData?.current_year || 1,
  } as any);

  return {
    success: true,
    scoutedRating,
    scoutedPotential,
    traitsRevealed,
    revealedTraits: traitsRevealed ? prospectData.hidden_traits : null,
    cost,
  };
}

// ============================================
// DRAFT PLAYER
// ============================================

export async function draftPlayer(gameId: string, prospectId: string) {
  console.log('[draftPlayer] Called with gameId:', gameId, 'prospectId:', prospectId);

  const supabase = await createClient();

  // Get current draft state
  const draft = await getDraftState(gameId);
  console.log('[draftPlayer] Draft state:', draft);

  if (!draft) {
    console.log('[draftPlayer] ERROR: No active draft found');
    return { error: 'No active draft found' };
  }

  // Get the prospect
  const { data: prospect, error: prospectError } = await supabase
    .from('draft_prospects')
    .select('*')
    .eq('id', prospectId)
    .eq('is_drafted', false)
    .single();

  console.log('[draftPlayer] Prospect query result:', { prospect: (prospect as any)?.id, error: prospectError });

  if (prospectError || !prospect) {
    console.log('[draftPlayer] ERROR: Prospect not found or already drafted', prospectError);
    return { error: 'Prospect not found or already drafted' };
  }

  const prospectData = prospect as ProspectRow;

  // Mark prospect as drafted
  console.log('[draftPlayer] Marking prospect as drafted...');
  const { error: updateProspectError } = await supabase
    .from('draft_prospects')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      is_drafted: true,
      drafted_by_team: 'player',
    })
    .eq('id', prospectId);

  if (updateProspectError) {
    console.log('[draftPlayer] ERROR: Failed to update prospect', updateProspectError);
    return { error: 'Failed to draft player' };
  }

  // Create player record
  console.log('[draftPlayer] Creating player record...');
  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      game_id: gameId,
      first_name: prospectData.first_name,
      last_name: prospectData.last_name,
      age: prospectData.age,
      position: prospectData.position,
      player_type: prospectData.player_type,
      current_rating: prospectData.current_rating,
      potential: prospectData.potential,
      hitter_attributes: prospectData.hitter_attributes,
      pitcher_attributes: prospectData.pitcher_attributes,
      hidden_traits: prospectData.hidden_traits,
      traits_revealed: prospectData.scouting_accuracy === 'high',
      tier: 'LOW_A',
      years_at_tier: 0,
      salary: 10000,
      contract_years: 3,
      draft_year: draft.year,
      draft_round: draft.current_round,
      draft_pick: draft.current_pick,
      is_on_roster: true,
    } as any)
    .select()
    .single();

  if (playerError) {
    console.log('[draftPlayer] ERROR: Failed to create player', playerError);
    return { error: 'Failed to create player record' };
  }

  const playerData = player as PlayerRow;
  console.log('[draftPlayer] Player created:', playerData.id);

  // Record the draft pick
  console.log('[draftPlayer] Recording draft pick...');
  const { error: draftPickError } = await supabase.from('draft_picks').insert({
    draft_id: draft.id,
    game_id: gameId,
    round: draft.current_round,
    pick_number: draft.current_pick,
    pick_in_round: ((draft.current_pick - 1) % 20) + 1,
    team_id: 'player',
    player_id: playerData.id,
  } as any);

  if (draftPickError) {
    console.log('[draftPlayer] ERROR: Failed to record draft pick', draftPickError);
  }

  // Advance draft pick
  const nextPick = draft.current_pick + 1;
  const nextRound = Math.ceil(nextPick / 20);
  const isComplete = nextRound > draft.total_rounds;

  console.log('[draftPlayer] Advancing draft pick to:', nextPick);
  const { error: updateDraftError } = await supabase
    .from('drafts')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      current_pick: nextPick,
      current_round: Math.min(nextRound, draft.total_rounds),
      is_complete: isComplete,
    })
    .eq('id', draft.id);

  if (updateDraftError) {
    console.log('[draftPlayer] ERROR: Failed to update draft', updateDraftError);
  }

  // Revalidate the game page to refresh data
  revalidatePath(`/game/${gameId}`);

  console.log('[draftPlayer] SUCCESS - returning result');
  return {
    success: true,
    player: playerData,
    nextPick,
    isComplete,
  };
}

// ============================================
// SIMULATE AI DRAFT PICKS
// ============================================

export async function simulateAIDraftPicks(gameId: string) {
  const supabase = await createClient();

  const draft = await getDraftState(gameId);
  if (!draft || draft.is_complete) {
    return { error: 'No active draft or draft complete' };
  }

  // Get available prospects
  const { data: prospects } = await supabase
    .from('draft_prospects')
    .select('*')
    .eq('game_id', gameId)
    .eq('draft_year', draft.year)
    .eq('is_drafted', false)
    .order('current_rating', { ascending: false });

  if (!prospects || prospects.length === 0) {
    return { error: 'No prospects available' };
  }

  let currentPick = draft.current_pick;
  let currentRound = draft.current_round;
  const picks: { teamId: string; playerName: string; pick: number }[] = [];

  const getPickPositionInRound = (pickNum: number, roundNum: number): number => {
    const posInRound = ((pickNum - 1) % 20) + 1;
    if (roundNum % 2 === 0) {
      return 21 - posInRound;
    }
    return posInRound;
  };

  while (currentRound <= draft.total_rounds) {
    const posInRound = getPickPositionInRound(currentPick, currentRound);

    if (posInRound === draft.player_draft_position) {
      break;
    }

    const aiTeamIndex = posInRound <= draft.player_draft_position
      ? posInRound - 1
      : posInRound - 2;

    if (aiTeamIndex >= 0 && aiTeamIndex < AI_TEAMS.length) {
      const aiTeam = AI_TEAMS[aiTeamIndex];

      const { data: remaining } = await supabase
        .from('draft_prospects')
        .select('*')
        .eq('game_id', gameId)
        .eq('draft_year', draft.year)
        .eq('is_drafted', false)
        .order('current_rating', { ascending: false })
        .limit(50);

      if (!remaining || remaining.length === 0) break;

      const remainingData = remaining as ProspectRow[];

      const pickIndex = Math.min(
        Math.floor(Math.random() * 3),
        remainingData.length - 1
      );
      const selectedProspect = remainingData[pickIndex];

      await supabase
        .from('draft_prospects')
        // @ts-expect-error - Supabase types not inferred without database connection
        .update({
          is_drafted: true,
          drafted_by_team: aiTeam.id,
        })
        .eq('id', selectedProspect.id);

      picks.push({
        teamId: aiTeam.id,
        playerName: `${selectedProspect.first_name} ${selectedProspect.last_name}`,
        pick: currentPick,
      });
    }

    currentPick++;
    currentRound = Math.ceil(currentPick / 20);

    if (picks.length > 40) break;
  }

  const isComplete = currentRound > draft.total_rounds;
  await supabase
    .from('drafts')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      current_pick: currentPick,
      current_round: Math.min(currentRound, draft.total_rounds),
      is_complete: isComplete,
    })
    .eq('id', draft.id);

  // Revalidate the game page to refresh data
  revalidatePath(`/game/${gameId}`);

  return {
    success: true,
    picks,
    currentPick,
    currentRound,
    isPlayerTurn: !isComplete && getPickPositionInRound(currentPick, currentRound) === draft.player_draft_position,
    isComplete,
  };
}

// ============================================
// ADVANCE GAME PHASE
// ============================================

export async function advancePhase(gameId: string) {
  const supabase = await createClient();

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    return { error: 'Game not found' };
  }

  const gameData = game as GameRow;

  const phaseOrder = ['pre_season', 'draft', 'season', 'post_season', 'off_season'];
  const currentIndex = phaseOrder.indexOf(gameData.current_phase);

  let nextPhase: string;
  let nextYear = gameData.current_year;

  if (currentIndex === phaseOrder.length - 1) {
    nextPhase = 'pre_season';
    nextYear = gameData.current_year + 1;
  } else {
    nextPhase = phaseOrder[currentIndex + 1];
  }

  if (nextPhase === 'pre_season') {
    nextPhase = 'draft';
  }

  const { error: updateError } = await supabase
    .from('games')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      current_phase: nextPhase,
      current_year: nextYear,
    })
    .eq('id', gameId);

  if (updateError) {
    return { error: 'Failed to advance phase' };
  }

  if (nextPhase === 'draft') {
    const { data: existingDraft } = await supabase
      .from('drafts')
      .select('id')
      .eq('game_id', gameId)
      .eq('year', nextYear)
      .single();

    if (!existingDraft) {
      await supabase.from('drafts').insert({
        game_id: gameId,
        year: nextYear,
        current_round: 1,
        current_pick: 1,
        is_complete: false,
        player_draft_position: 10,
      } as any);

      const prospects = generateDraftClass({
        gameId,
        draftYear: nextYear,
        totalPlayers: 800,
      });

      const batchSize = 100;
      for (let i = 0; i < prospects.length; i += batchSize) {
        const batch = prospects.slice(i, i + batchSize).map(p => ({
          game_id: gameId,
          draft_year: nextYear,
          first_name: p.firstName,
          last_name: p.lastName,
          age: p.age,
          position: p.position,
          player_type: p.playerType,
          current_rating: p.currentRating,
          potential: p.potential,
          hitter_attributes: p.hitterAttributes,
          pitcher_attributes: p.pitcherAttributes,
          hidden_traits: p.hiddenTraits,
          is_drafted: false,
        }));

        await supabase.from('draft_prospects').insert(batch as any);
      }
    }
  }

  return {
    success: true,
    nextPhase,
    nextYear,
  };
}

// ============================================
// GET RECENT EVENTS
// ============================================

export async function getRecentEvents(gameId: string, limit: number = 5) {
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from('game_events')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  return events as EventRow[];
}

// ============================================
// GET DRAFT PICKS (DRAFT BOARD)
// ============================================

interface DraftPickRow {
  id: string;
  round: number;
  pick_number: number;
  pick_in_round: number;
  team_id: string;
  player_id: string;
  created_at: string;
}

interface PlayerInfo {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  current_rating: number;
}

export async function getDraftPicks(gameId: string, year: number) {
  const supabase = await createClient();

  // Get all draft picks with player info
  const { data: picks, error } = await supabase
    .from('draft_picks')
    .select(`
      id,
      round,
      pick_number,
      pick_in_round,
      team_id,
      player_id,
      created_at
    `)
    .eq('game_id', gameId)
    .order('pick_number', { ascending: true });

  if (error) {
    console.error('Error fetching draft picks:', error);
    return [];
  }

  const typedPicks = (picks || []) as DraftPickRow[];

  // Get player details for each pick
  const playerIds = typedPicks.map(p => p.player_id).filter(Boolean);

  if (playerIds.length === 0) {
    return [];
  }

  const { data: players } = await supabase
    .from('players')
    .select('id, first_name, last_name, position, current_rating')
    .in('id', playerIds);

  const typedPlayers = (players || []) as PlayerInfo[];
  const playerMap = new Map(typedPlayers.map(p => [p.id, p]));

  // Also get drafted prospects for AI picks
  const { data: prospects } = await supabase
    .from('draft_prospects')
    .select('id, first_name, last_name, position, current_rating, drafted_by_team')
    .eq('game_id', gameId)
    .eq('draft_year', year)
    .eq('is_drafted', true);

  const typedProspects = (prospects || []) as PlayerInfo[];
  const prospectMap = new Map(typedProspects.map(p => [p.id, p]));

  return typedPicks.map(pick => {
    const player = playerMap.get(pick.player_id);
    const prospect = prospectMap.get(pick.player_id);
    const info = player || prospect;

    return {
      pickNumber: pick.pick_number,
      round: pick.round,
      pickInRound: pick.pick_in_round,
      teamId: pick.team_id,
      playerName: info ? `${info.first_name} ${info.last_name}` : 'Unknown',
      position: info?.position || '?',
      rating: info?.current_rating || 0,
    };
  });
}

// ============================================
// REFRESH PROSPECTS (GET AVAILABLE)
// ============================================

export async function refreshProspects(gameId: string, year: number) {
  const supabase = await createClient();

  const { data: prospects, error } = await supabase
    .from('draft_prospects')
    .select('*')
    .eq('game_id', gameId)
    .eq('draft_year', year)
    .eq('is_drafted', false)
    .order('current_rating', { ascending: false });

  if (error) {
    console.error('Error refreshing prospects:', error);
    return [];
  }

  return prospects as ProspectRow[];
}

// ============================================
// SEASON SIMULATION
// ============================================

// Note: We use simplified inline calculations here since the simulation engines
// expect internal TypeScript types that differ from database row types.

interface SeasonProgress {
  gamesPlayed: number;
  wins: number;
  losses: number;
  homeGames: number;
  awayGames: number;
  totalAttendance: number;
  isComplete: boolean;
}

interface SeasonEvent {
  game: number;
  type: 'win' | 'loss' | 'milestone' | 'injury' | 'development';
  description: string;
}

interface SeasonResultsData {
  wins: number;
  losses: number;
  winPercentage: number;
  leagueRank: number;
  totalAttendance: number;
  avgAttendance: number;
  revenueTotal: number;
  expenseTotal: number;
  netIncome: number;
  playerGrowth: Array<{
    playerId: string;
    playerName: string;
    ratingChange: number;
    newRating: number;
  }>;
  cityChanges: {
    prideChange: number;
    recognitionChange: number;
    buildingsUpgraded: number;
  };
  madePlayoffs: boolean;
  playoffResult?: string;
  tierPromotionEligible: boolean;
}

type SeasonRow = Database['public']['Tables']['seasons']['Row'];

// Initialize or get current season
export async function initializeSeasonSimulation(gameId: string) {
  const supabase = await createClient();

  // Get game state
  const { data: game } = await supabase
    .from('games')
    .select('current_year, current_tier')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { error: 'Game not found' };
  }

  const gameData = game as Pick<GameRow, 'current_year' | 'current_tier'>;

  // Check if season already exists
  const { data: existingSeason } = await supabase
    .from('seasons')
    .select('*')
    .eq('game_id', gameId)
    .eq('year', gameData.current_year)
    .single();

  if (existingSeason) {
    const seasonData = existingSeason as SeasonRow;
    return {
      season: seasonData,
      progress: {
        gamesPlayed: seasonData.games_played || 0,
        wins: seasonData.wins || 0,
        losses: seasonData.losses || 0,
        homeGames: seasonData.home_games || 0,
        awayGames: seasonData.away_games || 0,
        totalAttendance: seasonData.total_attendance || 0,
        isComplete: seasonData.is_complete || false,
      },
    };
  }

  // Create new season record
  const tierConfig = TIER_CONFIGS[gameData.current_tier as keyof typeof TIER_CONFIGS];
  const totalGames = tierConfig.seasonLength;

  const { data: newSeason, error: seasonError } = await supabase
    .from('seasons')
    .insert({
      game_id: gameId,
      year: gameData.current_year,
      tier: gameData.current_tier,
      games_played: 0,
      wins: 0,
      losses: 0,
      home_games: 0,
      away_games: 0,
      total_attendance: 0,
      total_games: totalGames,
      is_complete: false,
    } as any)
    .select()
    .single();

  if (seasonError) {
    console.error('Error creating season:', seasonError);
    return { error: 'Failed to create season' };
  }

  const newSeasonData = newSeason as SeasonRow;

  return {
    season: newSeasonData,
    progress: {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      homeGames: 0,
      awayGames: 0,
      totalAttendance: 0,
      isComplete: false,
    },
  };
}

// Simulate a batch of games
export async function simulateSeasonBatch(
  gameId: string,
  gamesToSimulate: number = 10
) {
  const supabase = await createClient();

  // Get current season state
  const { data: game } = await supabase
    .from('games')
    .select('current_year, current_tier')
    .eq('id', gameId)
    .single();

  if (!game) return { error: 'Game not found' };

  const gameData = game as Pick<GameRow, 'current_year' | 'current_tier'>;

  const { data: season } = await supabase
    .from('seasons')
    .select('*')
    .eq('game_id', gameId)
    .eq('year', gameData.current_year)
    .single();

  if (!season) return { error: 'Season not found' };

  const seasonData = season as SeasonRow;

  if (seasonData.is_complete) {
    return { error: 'Season already complete' };
  }

  // Get roster and franchise data
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_on_roster', true);

  const { data: franchise } = await supabase
    .from('current_franchise')
    .select('*')
    .eq('game_id', gameId)
    .single();

  const { data: city } = await supabase
    .from('city_states')
    .select('*')
    .eq('game_id', gameId)
    .single();

  const roster = (players || []) as PlayerRow[];
  const franchiseData = franchise as FranchiseRow | null;
  const cityData = city as CityStateRow | null;

  if (!franchiseData || !cityData) {
    return { error: 'Missing franchise or city data' };
  }

  const tierConfig = TIER_CONFIGS[gameData.current_tier as keyof typeof TIER_CONFIGS];
  const totalGames = tierConfig.seasonLength;
  const remainingGames = totalGames - (seasonData.games_played || 0);
  const actualGamesToSim = Math.min(gamesToSimulate, remainingGames);

  if (actualGamesToSim <= 0) {
    return { error: 'No games remaining' };
  }

  // Calculate team strength from roster
  const avgRating = roster.length > 0
    ? roster.reduce((sum, p) => sum + p.current_rating, 0) / roster.length
    : 40;

  // Simulate games
  const events: SeasonEvent[] = [];
  let batchWins = 0;
  let batchLosses = 0;
  let batchHomeGames = 0;
  let batchAttendance = 0;

  for (let i = 0; i < actualGamesToSim; i++) {
    const gameNum = (seasonData.games_played || 0) + i + 1;
    const isHome = Math.random() < 0.5;

    // Generate opponent strength (varies by tier)
    const opponentBase = tierConfig.averageOpponentStrength || 50;
    const opponentStrength = opponentBase + (Math.random() * 20 - 10);

    // Calculate win probability
    const strengthDiff = avgRating - opponentStrength;
    const homeBonus = isHome ? 5 : 0;
    const winProb = 0.5 + (strengthDiff + homeBonus) / 100;
    const clampedProb = Math.max(0.2, Math.min(0.8, winProb));

    const isWin = Math.random() < clampedProb;

    if (isWin) {
      batchWins++;
      events.push({
        game: gameNum,
        type: 'win',
        description: `Game ${gameNum}: Victory! (${isHome ? 'Home' : 'Away'})`,
      });
    } else {
      batchLosses++;
      events.push({
        game: gameNum,
        type: 'loss',
        description: `Game ${gameNum}: Loss (${isHome ? 'Home' : 'Away'})`,
      });
    }

    if (isHome) {
      batchHomeGames++;
      // Calculate attendance for home games (inline calculation)
      const baseAttendance = franchiseData.stadium_capacity * 0.4;
      const prideMultiplier = 0.7 + (cityData.team_pride / 100) * 0.8;
      const winBonus = 1 + ((seasonData.wins || 0) + batchWins) / 100;
      const attendance = Math.min(
        Math.round(baseAttendance * prideMultiplier * winBonus),
        franchiseData.stadium_capacity
      );
      batchAttendance += attendance;
    }
  }

  // Update season record
  const newGamesPlayed = (seasonData.games_played || 0) + actualGamesToSim;
  const newWins = (seasonData.wins || 0) + batchWins;
  const newLosses = (seasonData.losses || 0) + batchLosses;
  const newHomeGames = (seasonData.home_games || 0) + batchHomeGames;
  const newAttendance = (seasonData.total_attendance || 0) + batchAttendance;
  const isComplete = newGamesPlayed >= totalGames;

  const { error: updateError } = await supabase
    .from('seasons')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      games_played: newGamesPlayed,
      wins: newWins,
      losses: newLosses,
      home_games: newHomeGames,
      away_games: actualGamesToSim - batchHomeGames + (seasonData.away_games || 0),
      total_attendance: newAttendance,
      is_complete: isComplete,
    })
    .eq('id', seasonData.id);

  if (updateError) {
    console.error('Error updating season:', updateError);
    return { error: 'Failed to update season' };
  }

  revalidatePath(`/game/${gameId}`);

  return {
    success: true,
    progress: {
      gamesPlayed: newGamesPlayed,
      wins: newWins,
      losses: newLosses,
      homeGames: newHomeGames,
      awayGames: actualGamesToSim - batchHomeGames + (seasonData.away_games || 0),
      totalAttendance: newAttendance,
      isComplete,
    },
    events,
    totalGames,
  };
}

// Complete the season and calculate final results
export async function completeSeasonSimulation(gameId: string) {
  const supabase = await createClient();

  // Get all relevant data
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (!game) return { error: 'Game not found' };

  const gameData = game as GameRow;

  const { data: season } = await supabase
    .from('seasons')
    .select('*')
    .eq('game_id', gameId)
    .eq('year', gameData.current_year)
    .single();

  if (!season) return { error: 'Season not found' };

  const seasonData = season as SeasonRow;

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_on_roster', true);

  const { data: franchise } = await supabase
    .from('current_franchise')
    .select('*')
    .eq('game_id', gameId)
    .single();

  const { data: city } = await supabase
    .from('city_states')
    .select('*')
    .eq('game_id', gameId)
    .single();

  const roster = (players || []) as PlayerRow[];

  if (!franchise || !city) {
    return { error: 'Missing franchise or city data' };
  }

  const franchiseData = franchise as FranchiseRow;
  const cityData = city as CityStateRow;

  const tierConfig = TIER_CONFIGS[gameData.current_tier as keyof typeof TIER_CONFIGS];

  // Calculate win percentage and league rank
  const wins = seasonData.wins || 0;
  const losses = seasonData.losses || 0;
  const winPct = wins + losses > 0 ? wins / (wins + losses) : 0;

  // Simulate league standings (simplified - player rank based on win %)
  let leagueRank = 1;
  for (let i = 0; i < 19; i++) {
    const aiWinPct = 0.4 + Math.random() * 0.25; // AI teams win 40-65%
    if (aiWinPct > winPct) leagueRank++;
  }

  const madePlayoffs = leagueRank <= 4;

  // Calculate player development (simplified inline calculation)
  const playerGrowth: SeasonResultsData['playerGrowth'] = [];
  const avgCoachSkill = (franchiseData.hitting_coach_skill + franchiseData.pitching_coach_skill + franchiseData.development_coord_skill) / 3;
  const coachingBonus = (avgCoachSkill - 50) / 30; // -1 to +1 based on coach quality

  for (const player of roster) {
    // Base growth: (potential - current) * 0.15 + coaching bonus + random variance
    const baseGrowth = (player.potential - player.current_rating) * 0.15;
    const ageModifier = player.age < 24 ? 1.2 : player.age > 28 ? 0.7 : 1.0;
    const randomVariance = (Math.random() * 0.4) - 0.2; // ±20%

    let ratingChange = Math.round(
      (baseGrowth * ageModifier + coachingBonus * 2) * (1 + randomVariance)
    );
    ratingChange = Math.max(-5, Math.min(5, ratingChange)); // Clamp to -5 to +5

    const newRating = Math.max(20, Math.min(80, player.current_rating + ratingChange));
    const newMorale = Math.max(20, Math.min(100, player.morale + (winPct > 0.5 ? 5 : -3)));

    playerGrowth.push({
      playerId: player.id,
      playerName: `${player.first_name} ${player.last_name}`,
      ratingChange,
      newRating,
    });

    // Update player rating
    await supabase
      .from('players')
      // @ts-expect-error - Supabase types not inferred without database connection
      .update({
        current_rating: newRating,
        morale: newMorale,
        age: player.age + 1,
      })
      .eq('id', player.id);
  }

  // Calculate financials (simplified inline calculation)
  const avgAttendance = seasonData.home_games && seasonData.home_games > 0
    ? Math.round((seasonData.total_attendance || 0) / seasonData.home_games)
    : 0;

  // Revenue calculations
  const ticketRevenue = (seasonData.total_attendance || 0) * franchiseData.ticket_price;
  const concessionRevenue = Math.round((seasonData.total_attendance || 0) * 12 * (1 + franchiseData.stadium_quality / 200));
  const parkingRevenue = Math.floor((seasonData.total_attendance || 0) * 0.25) * 20;
  const merchandiseRevenue = Math.round((seasonData.total_attendance || 0) * 8 * (cityData.team_pride / 100));

  // Sponsorships based on tier
  const tierSponsorship: Record<string, number> = {
    LOW_A: 100000,
    HIGH_A: 300000,
    DOUBLE_A: 800000,
    TRIPLE_A: 2000000,
    MLB: 10000000,
  };
  const sponsorshipRevenue = Math.round((tierSponsorship[gameData.current_tier] || 100000) * (0.5 + cityData.team_pride / 200));

  const totalRevenue = ticketRevenue + concessionRevenue + parkingRevenue + merchandiseRevenue + sponsorshipRevenue;

  // Expense calculations
  const playerSalaries = roster.reduce((sum, p) => sum + p.salary, 0);
  const coachingSalaries = franchiseData.hitting_coach_salary + franchiseData.pitching_coach_salary + franchiseData.development_coord_salary;
  const travelCosts: Record<string, number> = {
    LOW_A: 50000,
    HIGH_A: 100000,
    DOUBLE_A: 200000,
    TRIPLE_A: 350000,
    MLB: 500000,
  };
  const maintenanceCosts = Math.round(franchiseData.stadium_capacity * 10);

  const totalExpenses = playerSalaries + coachingSalaries + (travelCosts[gameData.current_tier] || 50000) + maintenanceCosts;
  const netIncome = totalRevenue - totalExpenses;

  const finances = {
    totalRevenue,
    totalExpenses,
    netIncome,
  };

  // Update franchise finances
  const newReserves = franchiseData.reserves + finances.netIncome;
  await supabase
    .from('current_franchise')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      reserves: newReserves,
    })
    .eq('game_id', gameId);

  // Calculate city growth (simplified inline calculation)
  // Pride changes based on season performance
  let prideChange = 0;
  if (winPct >= 0.5) prideChange += 5;
  else prideChange -= 3;
  if (madePlayoffs) prideChange += 8;
  if (leagueRank === 1) prideChange += 15; // Championship

  const newPride = Math.max(0, Math.min(100, cityData.team_pride + prideChange));

  // Recognition changes
  let recognitionChange = 0;
  if (madePlayoffs) recognitionChange += 3;
  if (leagueRank === 1) recognitionChange += 8;

  const newRecognition = Math.max(0, Math.min(100, cityData.national_recognition + recognitionChange));

  // Population growth
  const populationGrowth = 500 + Math.round(winPct * 200) + Math.round(cityData.team_pride);
  const newPopulation = cityData.population + populationGrowth;

  // Building upgrades based on success
  const successScore = (winPct - 0.5) * 100 + (avgAttendance / franchiseData.stadium_capacity) * 30 + (madePlayoffs ? 20 : 0);
  const buildingsToUpgrade = Math.max(0, Math.floor(successScore / 20));

  // Get current buildings and upgrade them
  const buildings = cityData.buildings as Array<{ id: number; state: number; type: string; name: string | null }>;
  let upgradedCount = 0;

  for (const building of buildings) {
    if (upgradedCount >= buildingsToUpgrade) break;
    if (building.state < 4) {
      building.state = Math.min(4, building.state + 1);
      upgradedCount++;
    }
  }

  const openBuildings = buildings.filter(b => b.state >= 2).length;
  const newOccupancyRate = openBuildings / 50;

  const cityGrowth = {
    newPride,
    newRecognition,
    buildingsUpgraded: upgradedCount,
    buildings,
    occupancyRate: newOccupancyRate,
    population: newPopulation,
  };

  // Update city state
  await supabase
    .from('city_states')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      team_pride: cityGrowth.newPride,
      national_recognition: cityGrowth.newRecognition,
      buildings: cityGrowth.buildings,
      occupancy_rate: cityGrowth.occupancyRate,
      population: cityGrowth.population,
    })
    .eq('game_id', gameId);

  // Check tier promotion eligibility
  const tierOrder = ['LOW_A', 'HIGH_A', 'DOUBLE_A', 'TRIPLE_A', 'MLB'];
  const currentTierIndex = tierOrder.indexOf(gameData.current_tier);
  const tierPromotionEligible = madePlayoffs &&
    leagueRank === 1 &&
    currentTierIndex < tierOrder.length - 1;

  // Update season as complete with results
  await supabase
    .from('seasons')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      is_complete: true,
      league_rank: leagueRank,
      made_playoffs: madePlayoffs,
      revenue_total: finances.totalRevenue,
      expense_total: finances.totalExpenses,
      net_income: finances.netIncome,
    })
    .eq('id', seasonData.id);

  // Create season summary event
  await supabase.from('game_events').insert({
    game_id: gameId,
    year: gameData.current_year,
    type: 'season_complete',
    title: `Year ${gameData.current_year} Season Complete`,
    description: `Final Record: ${wins}-${losses} (${(winPct * 100).toFixed(1)}%). Finished ${leagueRank}${getOrdinalSuffix(leagueRank)} in the league.${madePlayoffs ? ' Made playoffs!' : ''}`,
    is_read: false,
  } as any);

  // Advance to post_season or off_season
  const nextPhase = madePlayoffs ? 'post_season' : 'off_season';
  await supabase
    .from('games')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      current_phase: nextPhase,
    })
    .eq('id', gameId);

  revalidatePath(`/game/${gameId}`);

  const results: SeasonResultsData = {
    wins,
    losses,
    winPercentage: winPct,
    leagueRank,
    totalAttendance: seasonData.total_attendance || 0,
    avgAttendance,
    revenueTotal: finances.totalRevenue,
    expenseTotal: finances.totalExpenses,
    netIncome: finances.netIncome,
    playerGrowth,
    cityChanges: {
      prideChange: cityGrowth.newPride - cityData.team_pride,
      recognitionChange: cityGrowth.newRecognition - cityData.national_recognition,
      buildingsUpgraded: cityGrowth.buildingsUpgraded || 0,
    },
    madePlayoffs,
    tierPromotionEligible,
  };

  return {
    success: true,
    results,
    nextPhase,
  };
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// Get current season state
export async function getSeasonState(gameId: string) {
  const supabase = await createClient();

  const { data: game } = await supabase
    .from('games')
    .select('current_year, current_tier')
    .eq('id', gameId)
    .single();

  if (!game) return null;

  const gameData = game as Pick<GameRow, 'current_year' | 'current_tier'>;

  const { data: season } = await supabase
    .from('seasons')
    .select('*')
    .eq('game_id', gameId)
    .eq('year', gameData.current_year)
    .single();

  if (!season) return null;

  const seasonData = season as SeasonRow;
  const tierConfig = TIER_CONFIGS[gameData.current_tier as keyof typeof TIER_CONFIGS];

  return {
    season: seasonData,
    totalGames: tierConfig.seasonLength,
    progress: {
      gamesPlayed: seasonData.games_played || 0,
      wins: seasonData.wins || 0,
      losses: seasonData.losses || 0,
      homeGames: seasonData.home_games || 0,
      awayGames: seasonData.away_games || 0,
      totalAttendance: seasonData.total_attendance || 0,
      isComplete: seasonData.is_complete || false,
    },
  };
}
