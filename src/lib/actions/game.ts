'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateInitialCity, calculateCityBonuses } from '@/lib/simulation/city-growth';
import { generateDraftClass } from '@/lib/simulation/draft';
import { checkForEventsWithTier, serializeEvent, applyEventEffects, type GameState as EventGameState, type NarrativeEvent } from '@/lib/simulation/events';
import { generateGameHeadlines, generateCityHeadlines, generateMilestoneHeadlines, type HeadlineContext } from '@/lib/simulation/headline-generator';
import {
  calculatePayroll,
  generateContractOffer,
  generateRookieContract,
  processContractExpiration,
  generateMigrationContract,
  canAffordSalary,
  type PayrollSummary,
  type ContractOffer,
  type FreeAgentResult,
} from '@/lib/simulation/contracts';
import { simulateGameBatch, getRandomOpponent } from '@/lib/simulation/box-score';
import { processBatchTraining, calculateProgressionRate, getRecommendedTrainingFocus, type TrainingResult } from '@/lib/simulation/training';
import { generatePlayoffBracket, generateFinalsSeries, simulateNextSeriesGame, type PlayoffStanding, type PlayoffGameResult } from '@/lib/simulation/playoffs';
import {
  archiveSeasonStats,
  createEmptySeasonStats,
  calculateWinterDevelopment,
  applyRatingChange,
  processContractYear,
  generateDraftOrder,
  getPlayerDraftPosition,
  determinePlayoffResult,
  determineSeasonMVP,
  type SeasonStatsSummary,
  type TeamHistoryEntry,
  type DraftOrderEntry,
  type WinterDevelopmentResult,
  type ContractExpirationResult,
  type OffseasonSummary,
} from '@/lib/simulation/offseason';
import { TIER_CONFIGS, AI_TEAMS, FACILITY_CONFIGS, BUILDING_DISTRICT_CONFIG, getRosterCapacities, DEFAULT_DISTRICT_BONUSES, type DifficultyMode, type Tier, type FacilityLevel, type RosterStatus, type NewsStory, type GameResultData, type PlayerGamePerformance, type CityEventData, type BuildingType, type Building, type GameResult, type GameLogEntry, type BatterBoxScore, type PitcherBoxScore, type Position, type TrainingFocus, type HitterAttributes, type PitcherAttributes, type WorkEthic, type DistrictBonuses, type PlayoffBracket, type PlayoffSeries, type PlayoffGame, type PlayoffTeam, type PlayoffRound } from '@/lib/types';
import type { Database } from '@/lib/types/database';

type GameRow = Database['public']['Tables']['games']['Row'];
type FranchiseRow = Database['public']['Tables']['current_franchise']['Row'];
type CityStateRow = Database['public']['Tables']['city_states']['Row'];
type PlayerRow = Database['public']['Tables']['players']['Row'];
type DraftRow = Database['public']['Tables']['drafts']['Row'];
type ProspectRow = Database['public']['Tables']['draft_prospects']['Row'];
type EventRow = Database['public']['Tables']['game_events']['Row'];
type NewsStoryRow = Database['public']['Tables']['news_stories']['Row'];

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
        media_rank: p.mediaRank,
        archetype: p.archetype,
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
// DELETE SAVED GAME
// ============================================

export async function deleteGame(gameId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Auth error in deleteGame:', authError);
    return { success: false, error: 'You must be logged in to delete a game' };
  }

  // Verify the game exists and belongs to the current user
  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('id, user_id')
    .eq('id', gameId)
    .eq('user_id', user.id)
    .single();

  if (fetchError) {
    console.error('Error fetching game for deletion:', fetchError);
    return { success: false, error: 'Game not found or access denied' };
  }

  if (!game) {
    return { success: false, error: 'Game not found or you do not have permission to delete it' };
  }

  // Delete the game - Supabase will handle cascading deletes
  // for related tables (players, city_states, current_franchise, etc.)
  // thanks to ON DELETE CASCADE foreign key constraints
  const { error: deleteError } = await supabase
    .from('games')
    .delete()
    .eq('id', gameId)
    .eq('user_id', user.id); // CRITICAL: Include user_id to ensure RLS compliance

  if (deleteError) {
    console.error('Error deleting game:', deleteError);
    return { success: false, error: `Failed to delete game: ${deleteError.message}` };
  }

  // Revalidate the homepage so the game list refreshes
  revalidatePath('/');

  return { success: true };
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

  // Get current roster counts and facility level for Two-Tier System
  console.log('[draftPlayer] Checking roster capacity...');
  const { data: franchise } = await supabase
    .from('current_franchise')
    .select('facility_level')
    .eq('game_id', gameId)
    .single();

  const facilityLevel = ((franchise as { facility_level: FacilityLevel } | null)?.facility_level ?? 0) as FacilityLevel;

  const { data: currentPlayers } = await supabase
    .from('players')
    .select('roster_status')
    .eq('game_id', gameId)
    .eq('is_on_roster', true);

  const rosterCounts = { active: 0, reserve: 0 };
  if (currentPlayers) {
    for (const p of currentPlayers as { roster_status: RosterStatus }[]) {
      if (p.roster_status === 'ACTIVE') rosterCounts.active++;
      else rosterCounts.reserve++;
    }
  }

  // Determine roster status for the new player
  const capacities = getRosterCapacities(facilityLevel);
  let rosterStatus: RosterStatus;

  if (rosterCounts.active < capacities.activeMax) {
    rosterStatus = 'ACTIVE';
  } else if (rosterCounts.reserve < capacities.reserveMax) {
    rosterStatus = 'RESERVE';
  } else {
    console.log('[draftPlayer] ERROR: Roster is full');
    return {
      error: `Roster is full! Active: ${rosterCounts.active}/${capacities.activeMax}, Reserve: ${rosterCounts.reserve}/${capacities.reserveMax}. Release a player or upgrade facilities to continue drafting.`,
      rosterFull: true,
    };
  }

  console.log('[draftPlayer] Assigning to roster:', rosterStatus);

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

  // Create player record with roster status
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
      roster_status: rosterStatus,
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
// SIMULATE DRAFT REMAINDER (SAFE)
// ============================================

export interface DraftSimulationResult {
  success: boolean;
  error?: string;
  userPicks: { playerName: string; position: string; rating: number; potential: number }[];
  skippedPicks: number;
  undraftedCount: number;
  finalRound: number;
  totalPicksMade: number;
}

/**
 * Safely simulates all remaining draft picks, including user picks.
 * Handles roster capacity gracefully by skipping picks when full.
 * Marks all undrafted players as free agents when complete.
 */
export async function simulateDraftRemainder(gameId: string): Promise<DraftSimulationResult> {
  const supabase = await createClient();

  const draft = await getDraftState(gameId);
  if (!draft) {
    return { success: false, error: 'No active draft found', userPicks: [], skippedPicks: 0, undraftedCount: 0, finalRound: 0, totalPicksMade: 0 };
  }

  if (draft.is_complete) {
    return { success: false, error: 'Draft already complete', userPicks: [], skippedPicks: 0, undraftedCount: 0, finalRound: draft.total_rounds, totalPicksMade: 0 };
  }

  // Get facility level for roster capacity
  const { data: franchise } = await supabase
    .from('current_franchise')
    .select('facility_level')
    .eq('game_id', gameId)
    .single();

  const facilityLevel = ((franchise as { facility_level: FacilityLevel } | null)?.facility_level ?? 0) as FacilityLevel;
  const capacities = getRosterCapacities(facilityLevel);
  const totalCapacity = capacities.activeMax + capacities.reserveMax;

  const userPicks: DraftSimulationResult['userPicks'] = [];
  let skippedPicks = 0;
  let totalPicksMade = 0;
  let currentPick = draft.current_pick;
  let currentRound = draft.current_round;

  const getPickPositionInRound = (pickNum: number, roundNum: number): number => {
    const posInRound = ((pickNum - 1) % 20) + 1;
    if (roundNum % 2 === 0) {
      return 21 - posInRound;
    }
    return posInRound;
  };

  // Process all remaining picks
  while (currentRound <= draft.total_rounds) {
    const posInRound = getPickPositionInRound(currentPick, currentRound);
    const isUserPick = posInRound === draft.player_draft_position;

    // Get current roster count
    const { count: rosterCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId)
      .eq('is_on_roster', true);

    const currentRosterSize = rosterCount || 0;

    // Get best available prospect
    const { data: prospects } = await supabase
      .from('draft_prospects')
      .select('*')
      .eq('game_id', gameId)
      .eq('draft_year', draft.year)
      .eq('is_drafted', false)
      .order('potential', { ascending: false })
      .order('current_rating', { ascending: false })
      .limit(10);

    if (!prospects || prospects.length === 0) {
      // No more prospects to draft
      break;
    }

    const prospectData = (prospects as ProspectRow[])[0];

    if (isUserPick) {
      // User's pick - check roster capacity
      if (currentRosterSize >= totalCapacity) {
        // Roster full - skip this pick
        console.log(`[simulateDraftRemainder] Skipping user pick #${currentPick} - roster full (${currentRosterSize}/${totalCapacity})`);
        skippedPicks++;
      } else {
        // Draft the player for user
        const rosterStatus: RosterStatus = currentRosterSize < capacities.activeMax ? 'ACTIVE' : 'RESERVE';

        // Mark prospect as drafted
        await supabase
          .from('draft_prospects')
          // @ts-expect-error - Supabase types not inferred without database connection
          .update({
            is_drafted: true,
            drafted_by_team: 'player',
          })
          .eq('id', prospectData.id);

        // Create player record
        const { data: player } = await supabase
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
            traits_revealed: false,
            tier: 'LOW_A',
            years_at_tier: 0,
            salary: 10000,
            contract_years: 3,
            draft_year: draft.year,
            draft_round: currentRound,
            draft_pick: currentPick,
            is_on_roster: true,
            roster_status: rosterStatus,
          } as any)
          .select()
          .single();

        if (player) {
          const playerData = player as PlayerRow;
          // Record draft pick
          await supabase.from('draft_picks').insert({
            draft_id: draft.id,
            game_id: gameId,
            round: currentRound,
            pick_number: currentPick,
            pick_in_round: posInRound,
            team_id: 'player',
            player_id: playerData.id,
          } as any);

          userPicks.push({
            playerName: `${prospectData.first_name} ${prospectData.last_name}`,
            position: prospectData.position,
            rating: prospectData.current_rating,
            potential: prospectData.potential,
          });
          totalPicksMade++;
        }
      }
    } else {
      // AI team pick
      const aiTeamIndex = posInRound <= draft.player_draft_position
        ? posInRound - 1
        : posInRound - 2;

      if (aiTeamIndex >= 0 && aiTeamIndex < AI_TEAMS.length) {
        const aiTeam = AI_TEAMS[aiTeamIndex];

        // AI teams pick with some randomness from top 5
        const pickIndex = Math.min(
          Math.floor(Math.random() * 5),
          (prospects as ProspectRow[]).length - 1
        );
        const aiProspect = (prospects as ProspectRow[])[pickIndex];

        await supabase
          .from('draft_prospects')
          // @ts-expect-error - Supabase types not inferred without database connection
          .update({
            is_drafted: true,
            drafted_by_team: aiTeam.id,
          })
          .eq('id', aiProspect.id);

        // Record AI pick (no player record needed for AI teams)
        await supabase.from('draft_picks').insert({
          draft_id: draft.id,
          game_id: gameId,
          round: currentRound,
          pick_number: currentPick,
          pick_in_round: posInRound,
          team_id: aiTeam.id,
          player_id: null,
        } as any);

        totalPicksMade++;
      }
    }

    // Advance to next pick
    currentPick++;
    currentRound = Math.ceil(currentPick / 20);
  }

  // Mark draft as complete
  await supabase
    .from('drafts')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      current_pick: currentPick,
      current_round: draft.total_rounds,
      is_complete: true,
    })
    .eq('id', draft.id);

  // Handle undrafted players - mark as free agents
  const { data: undrafted } = await supabase
    .from('draft_prospects')
    .select('id')
    .eq('game_id', gameId)
    .eq('draft_year', draft.year)
    .eq('is_drafted', false);

  const undraftedCount = undrafted?.length || 0;

  // Update undrafted prospects to be available as free agents
  if (undraftedCount > 0) {
    await supabase
      .from('draft_prospects')
      // @ts-expect-error - Supabase types not inferred without database connection
      .update({
        is_free_agent: true,
      })
      .eq('game_id', gameId)
      .eq('draft_year', draft.year)
      .eq('is_drafted', false);
  }

  revalidatePath(`/game/${gameId}`);

  return {
    success: true,
    userPicks,
    skippedPicks,
    undraftedCount,
    finalRound: draft.total_rounds,
    totalPicksMade,
  };
}

// ============================================
// OPTIMIZE ROSTER (AUTO-GM)
// ============================================

export interface RosterOptimizationResult {
  success: boolean;
  error?: string;
  promotedCount: number;
  demotedCount: number;
  lineupSet: boolean;
  rotationSet: boolean;
}

/**
 * Auto-GM function that optimizes the roster after draft completion.
 * - Promotes best 25 players to ACTIVE roster
 * - Sets optimal batting lineup by position
 * - Sets pitching rotation and closer
 */
export async function optimizeRoster(gameId: string): Promise<RosterOptimizationResult> {
  const supabase = await createClient();

  // Get all rostered players
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_on_roster', true)
    .order('current_rating', { ascending: false });

  if (error || !players) {
    return { success: false, error: 'Failed to load roster', promotedCount: 0, demotedCount: 0, lineupSet: false, rotationSet: false };
  }

  const allPlayers = players as PlayerRow[];

  if (allPlayers.length === 0) {
    return { success: true, promotedCount: 0, demotedCount: 0, lineupSet: false, rotationSet: false };
  }

  // Separate by type
  const pitchers = allPlayers.filter(p => p.player_type === 'PITCHER');
  const hitters = allPlayers.filter(p => p.player_type === 'HITTER');

  // Sort each by rating
  pitchers.sort((a, b) => b.current_rating - a.current_rating);
  hitters.sort((a, b) => b.current_rating - a.current_rating);

  // Target: 12 pitchers, 13 position players for 25-man active roster
  const activePitchers = pitchers.slice(0, Math.min(12, pitchers.length));
  const activeHitters = hitters.slice(0, Math.min(13, hitters.length));

  // Fill remaining active slots if one group is short
  const activeCount = activePitchers.length + activeHitters.length;
  let additionalFromPitchers: PlayerRow[] = [];
  let additionalFromHitters: PlayerRow[] = [];

  if (activeCount < 25) {
    const remaining = 25 - activeCount;
    if (activePitchers.length < 12) {
      // Need more hitters
      additionalFromHitters = hitters.slice(13, 13 + remaining);
    } else if (activeHitters.length < 13) {
      // Need more pitchers
      additionalFromPitchers = pitchers.slice(12, 12 + remaining);
    }
  }

  const activePlayerIds = new Set([
    ...activePitchers.map(p => p.id),
    ...activeHitters.map(p => p.id),
    ...additionalFromPitchers.map(p => p.id),
    ...additionalFromHitters.map(p => p.id),
  ]);

  let promotedCount = 0;
  let demotedCount = 0;

  // Update roster statuses
  for (const player of allPlayers) {
    const shouldBeActive = activePlayerIds.has(player.id);
    const currentlyActive = player.roster_status === 'ACTIVE';

    if (shouldBeActive && !currentlyActive) {
      await supabase
        .from('players')
        // @ts-expect-error - Supabase types not inferred without database connection
        .update({ roster_status: 'ACTIVE' })
        .eq('id', player.id);
      promotedCount++;
    } else if (!shouldBeActive && currentlyActive) {
      await supabase
        .from('players')
        // @ts-expect-error - Supabase types not inferred without database connection
        .update({ roster_status: 'RESERVE' })
        .eq('id', player.id);
      demotedCount++;
    }
  }

  // Build optimal lineup - this is stored in a lineup metadata field or separate table
  // For now, we'll just ensure players are correctly rostered
  // The actual lineup would be calculated at game time based on ratings

  // Set pitching rotation (top 5 SPs) - could store this as JSON in franchise
  const starters = activePitchers.filter(p => p.position === 'SP').slice(0, 5);
  const relievers = activePitchers.filter(p => p.position === 'RP');
  const closer = relievers.length > 0 ? relievers[0] : null; // Best RP is closer

  // Store rotation/lineup in franchise metadata (if we had that field)
  // For now, we'll create a game event to announce the roster optimization
  await supabase.from('game_events').insert({
    game_id: gameId,
    year: 1,
    type: 'roster',
    title: 'Roster Optimized',
    description: `The coaching staff has set the lineup and rotation. ${promotedCount > 0 ? `${promotedCount} player(s) promoted to active roster. ` : ''}${demotedCount > 0 ? `${demotedCount} player(s) sent to reserves. ` : ''}${starters.length} starters and ${relievers.length} relievers ready for the season.`,
    is_read: false,
  } as any);

  revalidatePath(`/game/${gameId}`);

  return {
    success: true,
    promotedCount,
    demotedCount,
    lineupSet: activeHitters.length > 0,
    rotationSet: starters.length > 0,
  };
}

// ============================================
// COMPLETE DRAFT AND TRANSITION
// ============================================

export interface DraftCompletionResult {
  success: boolean;
  error?: string;
  draftResults: DraftSimulationResult;
  rosterResults: RosterOptimizationResult;
}

/**
 * Complete the draft and transition to season phase.
 * This is the main entry point for the "Sim to End & Start Season" button.
 */
export async function completeDraftAndTransition(gameId: string): Promise<DraftCompletionResult> {
  const supabase = await createClient();

  // Step 1: Simulate all remaining draft picks
  const draftResults = await simulateDraftRemainder(gameId);

  if (!draftResults.success) {
    return {
      success: false,
      error: draftResults.error,
      draftResults,
      rosterResults: { success: false, promotedCount: 0, demotedCount: 0, lineupSet: false, rotationSet: false },
    };
  }

  // Step 2: Optimize the roster
  const rosterResults = await optimizeRoster(gameId);

  // Step 3: Transition to season phase
  const { error: phaseError } = await supabase
    .from('games')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      current_phase: 'season',
    })
    .eq('id', gameId);

  if (phaseError) {
    return {
      success: false,
      error: 'Failed to transition to season phase',
      draftResults,
      rosterResults,
    };
  }

  // Create a season record if it doesn't exist
  const { data: game } = await supabase
    .from('games')
    .select('current_year, current_tier')
    .eq('id', gameId)
    .single();

  if (game) {
    const gameData = game as Pick<GameRow, 'current_year' | 'current_tier'>;
    const tierConfig = TIER_CONFIGS[gameData.current_tier as Tier];

    // Check if season exists
    const { data: existingSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('game_id', gameId)
      .eq('year', gameData.current_year)
      .single();

    if (!existingSeason) {
      await supabase.from('seasons').insert({
        game_id: gameId,
        year: gameData.current_year,
        wins: 0,
        losses: 0,
        games_played: 0,
        total_games: tierConfig.seasonLength,
        tier: gameData.current_tier,
      } as any);
    }
  }

  // Create announcement event
  await supabase.from('game_events').insert({
    game_id: gameId,
    year: 1,
    type: 'season',
    title: 'Opening Day!',
    description: `The draft is complete and the season is about to begin! ${draftResults.userPicks.length} new players have joined the team. Play ball!`,
    is_read: false,
  } as any);

  revalidatePath(`/game/${gameId}`);

  return {
    success: true,
    draftResults,
    rosterResults,
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
          media_rank: p.mediaRank,
          archetype: p.archetype,
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

  // Get current season state with team name
  const { data: game } = await supabase
    .from('games')
    .select('current_year, current_tier, team_name')
    .eq('id', gameId)
    .single();

  if (!game) return { error: 'Game not found' };

  const gameData = game as Pick<GameRow, 'current_year' | 'current_tier' | 'team_name'>;

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

  // Simulate games with detailed box scores
  const events: SeasonEvent[] = [];
  const newsStoriesToAdd: Omit<NewsStory, 'id'>[] = [];
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  // Map roster to box score format
  const rosterForSim = roster.map(p => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    position: p.position as Position,
    playerType: p.player_type as 'HITTER' | 'PITCHER',
    currentRating: p.current_rating,
  }));

  // Generate opponent strength (varies by tier)
  const opponentBase = tierConfig.averageOpponentStrength || 50;

  // Headline context for news generation
  const headlineContext: HeadlineContext = {
    teamName: gameData.team_name,
    year: gameData.current_year,
    currentWins: seasonData.wins || 0,
    currentLosses: seasonData.losses || 0,
  };

  // Simulate games with full box scores
  const batchResults = simulateGameBatch(
    rosterForSim,
    avgRating,
    opponentBase,
    franchiseData.stadium_capacity,
    cityData.team_pride,
    actualGamesToSim,
    (seasonData.games_played || 0) + 1,
    gameData.team_name,
    gameData.current_year
  );

  const batchWins = batchResults.totalWins;
  const batchLosses = batchResults.totalLosses;
  const batchHomeGames = batchResults.homeGames;
  const batchAttendance = batchResults.totalAttendance;

  // Store game results and generate events
  const gameResultsToInsert: Array<{
    game_id: string;
    season_id: string;
    year: number;
    game_number: number;
    player_team_name: string;
    opponent_name: string;
    is_home: boolean;
    player_runs: number;
    opponent_runs: number;
    is_win: boolean;
    player_line_score: number[];
    opponent_line_score: number[];
    player_hits: number;
    player_errors: number;
    opponent_hits: number;
    opponent_errors: number;
    batting_stats: BatterBoxScore[];
    pitching_stats: PitcherBoxScore[];
    attendance: number;
    game_duration_minutes: number;
  }> = [];

  for (const game of batchResults.games) {
    const { gameNumber, opponent, isHome, result } = game;

    // Track streaks
    if (result.isWin) {
      currentWinStreak++;
      currentLossStreak = 0;
      events.push({
        game: gameNumber,
        type: 'win',
        description: `Game ${gameNumber}: ${result.playerRuns}-${result.opponentRuns} vs ${opponent.city} ${opponent.name} (${isHome ? 'Home' : 'Away'})`,
      });
    } else {
      currentLossStreak++;
      currentWinStreak = 0;
      events.push({
        game: gameNumber,
        type: 'loss',
        description: `Game ${gameNumber}: ${result.playerRuns}-${result.opponentRuns} vs ${opponent.city} ${opponent.name} (${isHome ? 'Home' : 'Away'})`,
      });
    }

    // Store game result for batch insert
    gameResultsToInsert.push({
      game_id: gameId,
      season_id: seasonData.id,
      year: gameData.current_year,
      game_number: gameNumber,
      player_team_name: gameData.team_name,
      opponent_name: `${opponent.city} ${opponent.name}`,
      is_home: isHome,
      player_runs: result.playerRuns,
      opponent_runs: result.opponentRuns,
      is_win: result.isWin,
      player_line_score: result.playerLineScore,
      opponent_line_score: result.opponentLineScore,
      player_hits: result.playerHits,
      player_errors: result.playerErrors,
      opponent_hits: result.opponentHits,
      opponent_errors: result.opponentErrors,
      batting_stats: result.battingStats,
      pitching_stats: result.pitchingStats,
      attendance: result.attendance,
      game_duration_minutes: result.gameDurationMinutes,
    });

    // Generate player performances for headlines from box score
    const playerPerformances: PlayerGamePerformance[] = [];

    // Find standout hitter performances
    for (const batter of result.battingStats) {
      if (batter.hr >= 2 || (batter.h >= 3 && batter.rbi >= 3)) {
        playerPerformances.push({
          playerId: batter.playerId,
          playerName: batter.name,
          playerType: 'HITTER',
          homeRuns: batter.hr,
          hits: batter.h,
          rbi: batter.rbi,
        });
      }
    }

    // Find standout pitcher performances
    for (const pitcher of result.pitchingStats) {
      if (pitcher.so >= 10 || (pitcher.ip >= 7 && pitcher.er <= 1)) {
        playerPerformances.push({
          playerId: pitcher.playerId,
          playerName: pitcher.name,
          playerType: 'PITCHER',
          pitcherStrikeouts: pitcher.so,
          inningsPitched: pitcher.ip,
          earnedRuns: pitcher.er,
          isWin: pitcher.isWin,
        });
      }
    }

    // Generate news headlines for notable games
    const runDiff = Math.abs(result.playerRuns - result.opponentRuns);
    const shouldGenerateNews =
      currentWinStreak >= 3 ||
      currentLossStreak >= 3 ||
      playerPerformances.length > 0 ||
      (gameNumber % 10 === 0) ||
      runDiff >= 5;

    if (shouldGenerateNews) {
      const gameResultData: GameResultData = {
        gameNumber,
        isWin: result.isWin,
        isHome,
        runsScored: result.playerRuns,
        runsAllowed: result.opponentRuns,
        winStreak: currentWinStreak,
        lossStreak: currentLossStreak,
        playerPerformances,
      };

      headlineContext.currentWins = (seasonData.wins || 0) + batchWins;
      headlineContext.currentLosses = (seasonData.losses || 0) + batchLosses;

      const headlines = generateGameHeadlines(gameResultData, headlineContext);
      newsStoriesToAdd.push(...headlines);
    }
  }

  // Batch insert game results
  if (gameResultsToInsert.length > 0) {
    const { error: gameResultsError } = await supabase
      .from('game_results')
      // @ts-expect-error - game_results table may not exist yet in types
      .insert(gameResultsToInsert);

    if (gameResultsError) {
      console.error('Error inserting game results:', gameResultsError);
      // Continue even if this fails - don't block season progression
    }
  }

  // Note: Attendance is now calculated in the box score simulation

  // Process player training for games simulated
  // Calculate district bonuses from buildings
  const buildings = cityData.buildings
    ? (typeof cityData.buildings === 'string'
        ? JSON.parse(cityData.buildings)
        : cityData.buildings) as Building[]
    : [];
  const districtBonuses: DistrictBonuses = buildings.length > 0
    ? calculateCityBonuses(buildings)
    : DEFAULT_DISTRICT_BONUSES;

  // Map players for training
  const playersForTraining = roster.map(p => ({
    id: p.id,
    age: p.age,
    potential: p.potential,
    currentRating: p.current_rating,
    playerType: p.player_type as 'HITTER' | 'PITCHER',
    trainingFocus: (p.training_focus || 'overall') as TrainingFocus,
    currentXp: p.current_xp || 0,
    progressionRate: p.progression_rate || 1.0,
    morale: p.morale,
    isInjured: p.is_injured,
    rosterStatus: (p.roster_status || 'ACTIVE') as 'ACTIVE' | 'RESERVE',
    hitterAttributes: p.hitter_attributes as HitterAttributes | null,
    pitcherAttributes: p.pitcher_attributes as PitcherAttributes | null,
    hiddenTraits: {
      workEthic: ((p.hidden_traits as { workEthic?: WorkEthic })?.workEthic || 'average') as WorkEthic,
    },
  }));

  const trainingResults = processBatchTraining(
    playersForTraining,
    districtBonuses,
    (franchiseData.facility_level || 0) as FacilityLevel,
    actualGamesToSim
  );

  // Update players with training results
  for (const result of trainingResults.trainedPlayers) {
    const playerUpdate: Record<string, unknown> = {
      current_xp: result.newXp,
    };

    // If player leveled up, update the attribute
    if (result.leveledUp && result.attributeImproved && result.newRating !== undefined) {
      const player = roster.find(p => p.id === result.playerId);
      if (player) {
        if (player.player_type === 'HITTER' && player.hitter_attributes) {
          const rawAttrs = typeof player.hitter_attributes === 'string'
            ? JSON.parse(player.hitter_attributes)
            : player.hitter_attributes;
          const attrs = rawAttrs as HitterAttributes;
          playerUpdate.hitter_attributes = {
            ...attrs,
            [result.attributeImproved]: result.newRating,
          };
          // Update overall rating as average of attributes
          const newAttrs = playerUpdate.hitter_attributes as HitterAttributes;
          playerUpdate.current_rating = Math.round(
            (newAttrs.hit + newAttrs.power + newAttrs.speed + newAttrs.arm + newAttrs.field) / 5
          );
        } else if (player.player_type === 'PITCHER' && player.pitcher_attributes) {
          const rawAttrs = typeof player.pitcher_attributes === 'string'
            ? JSON.parse(player.pitcher_attributes)
            : player.pitcher_attributes;
          const attrs = rawAttrs as PitcherAttributes;
          playerUpdate.pitcher_attributes = {
            ...attrs,
            [result.attributeImproved]: result.newRating,
          };
          // Update overall rating as average of attributes
          const newAttrs = playerUpdate.pitcher_attributes as PitcherAttributes;
          playerUpdate.current_rating = Math.round(
            (newAttrs.stuff + newAttrs.control + newAttrs.movement) / 3
          );
        }
      }
    }

    await supabase
      .from('players')
      // @ts-expect-error - training fields may not exist in types
      .update(playerUpdate)
      .eq('id', result.playerId);
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

  // Store news stories
  if (newsStoriesToAdd.length > 0) {
    await addNewsStories(gameId, newsStoriesToAdd);
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
    newsGenerated: newsStoriesToAdd.length,
    training: {
      totalXpGained: trainingResults.totalXpGained,
      playersLeveledUp: trainingResults.playersLeveledUp,
    },
  };
}

// ============================================
// PLAYER TRAINING FUNCTIONS
// ============================================

/**
 * Set a player's training focus
 */
export async function setPlayerTrainingFocus(
  gameId: string,
  playerId: string,
  trainingFocus: TrainingFocus
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Verify player belongs to game
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('id, player_type')
      .eq('id', playerId)
      .eq('game_id', gameId)
      .single();

    if (playerError) {
      return { success: false, error: 'Player not found' };
    }

    if (!playerData) {
      return { success: false, error: 'Player not found' };
    }

    const playerType = (playerData as { player_type: 'HITTER' | 'PITCHER' }).player_type;

    // Validate training focus matches player type
    const validHitterFocuses = ['hit', 'power', 'speed', 'arm', 'field', 'overall'];
    const validPitcherFocuses = ['stuff', 'control', 'movement', 'overall'];

    if (playerType === 'HITTER' && !validHitterFocuses.includes(trainingFocus)) {
      return { success: false, error: 'Invalid training focus for hitter' };
    }
    if (playerType === 'PITCHER' && !validPitcherFocuses.includes(trainingFocus)) {
      return { success: false, error: 'Invalid training focus for pitcher' };
    }

    // Update training focus
    const { error: updateError } = await supabase
      .from('players')
      // @ts-expect-error - training_focus may not exist in types
      .update({ training_focus: trainingFocus })
      .eq('id', playerId);

    if (updateError) {
      return { success: false, error: 'Failed to update training focus' };
    }

    revalidatePath(`/game/${gameId}`);
    return { success: true };
  } catch (error) {
    console.error('Error setting training focus:', error);
    return { success: false, error: 'Failed to set training focus' };
  }
}

/**
 * Set training focus for multiple players at once
 */
export async function setBatchTrainingFocus(
  gameId: string,
  playerFocuses: Array<{ playerId: string; trainingFocus: TrainingFocus }>
): Promise<{ success: boolean; updated: number; error?: string }> {
  const supabase = await createClient();

  let updated = 0;

  try {
    for (const { playerId, trainingFocus } of playerFocuses) {
      const result = await setPlayerTrainingFocus(gameId, playerId, trainingFocus);
      if (result.success) updated++;
    }

    revalidatePath(`/game/${gameId}`);
    return { success: true, updated };
  } catch (error) {
    console.error('Error in batch training focus update:', error);
    return { success: false, updated, error: 'Failed to update some players' };
  }
}

/**
 * Get training summary for the roster
 */
export async function getTrainingSummary(gameId: string): Promise<{
  success: boolean;
  summary?: {
    trainingMult: number;
    facilityBonus: number;
    totalBonus: number;
    avgProgressionRate: number;
    estimatedXpPerGame: number;
    estimatedGamesToLevelUp: number;
    playerBreakdown: Array<{
      playerId: string;
      playerName: string;
      trainingFocus: TrainingFocus;
      currentXp: number;
      progressionRate: number;
      estimatedGamesToNextLevel: number;
    }>;
  };
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // Get roster
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .eq('is_on_roster', true);

    // Get city data for buildings
    const { data: city } = await supabase
      .from('city_states')
      .select('buildings')
      .eq('game_id', gameId)
      .single();

    // Get franchise for facility level
    const { data: franchise } = await supabase
      .from('current_franchise')
      .select('facility_level')
      .eq('game_id', gameId)
      .single();

    if (!players) {
      return { success: false, error: 'Missing player data' };
    }
    if (!city) {
      return { success: false, error: 'Missing city data' };
    }
    if (!franchise) {
      return { success: false, error: 'Missing franchise data' };
    }

    // Calculate district bonuses from buildings
    const cityData = city as { buildings: unknown };
    const buildings = cityData.buildings
      ? (typeof cityData.buildings === 'string'
          ? JSON.parse(cityData.buildings as string)
          : cityData.buildings) as Building[]
      : [];
    const districtBonuses: DistrictBonuses = buildings.length > 0
      ? calculateCityBonuses(buildings)
      : DEFAULT_DISTRICT_BONUSES;

    const franchiseData = franchise as { facility_level: number };
    const facilityLevel = (franchiseData.facility_level || 0) as FacilityLevel;
    const trainingMult = districtBonuses.trainingMult;
    const facilityBonus = FACILITY_CONFIGS[facilityLevel] ? 1 + facilityLevel * 0.15 : 1.0;
    const totalBonus = trainingMult * facilityBonus;

    // Cast players to proper type
    const playerList = players as Array<{
      id: string;
      first_name: string;
      last_name: string;
      training_focus: string;
      current_xp: number;
      progression_rate: number;
    }>;

    // Calculate player breakdown
    const playerBreakdown = playerList.map(p => {
      const progressionRate = p.progression_rate || 1.0;
      const currentXp = p.current_xp || 0;
      const xpNeeded = 100 - currentXp;
      const estimatedXpPerGame = 2 * progressionRate * totalBonus;
      const estimatedGamesToNextLevel = estimatedXpPerGame > 0
        ? Math.ceil(xpNeeded / estimatedXpPerGame)
        : 999;

      return {
        playerId: p.id,
        playerName: `${p.first_name} ${p.last_name}`,
        trainingFocus: (p.training_focus || 'overall') as TrainingFocus,
        currentXp,
        progressionRate,
        estimatedGamesToNextLevel,
      };
    });

    // Calculate averages
    const avgProgressionRate = playerList.length > 0
      ? playerList.reduce((sum, p) => sum + (p.progression_rate || 1.0), 0) / playerList.length
      : 1.0;

    const estimatedXpPerGame = Math.round(2 * avgProgressionRate * totalBonus);
    const estimatedGamesToLevelUp = estimatedXpPerGame > 0
      ? Math.ceil(100 / estimatedXpPerGame)
      : 999;

    return {
      success: true,
      summary: {
        trainingMult,
        facilityBonus,
        totalBonus,
        avgProgressionRate,
        estimatedXpPerGame,
        estimatedGamesToLevelUp,
        playerBreakdown,
      },
    };
  } catch (error) {
    console.error('Error getting training summary:', error);
    return { success: false, error: 'Failed to get training summary' };
  }
}

// ============================================
// GAME LOG & BOX SCORE FUNCTIONS
// ============================================

/**
 * Get the game log for a specific season
 * Returns a list of games with basic info (for the schedule view)
 */
export async function getGameLog(
  gameId: string,
  year: number,
  limit: number = 50,
  offset: number = 0
): Promise<{ success: boolean; games?: GameLogEntry[]; total?: number; error?: string }> {
  const supabase = await createClient();

  try {
    // Get total count
    const { count } = await supabase
      .from('game_results')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId)
      .eq('year', year);

    // Get games
    const { data, error } = await supabase
      .from('game_results')
      .select('id, game_number, is_home, opponent_name, player_runs, opponent_runs, is_win, player_hits, player_errors, opponent_hits, opponent_errors, attendance, created_at')
      .eq('game_id', gameId)
      .eq('year', year)
      .order('game_number', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const games: GameLogEntry[] = (data || []).map((row: {
      id: string;
      game_number: number;
      is_home: boolean;
      opponent_name: string;
      player_runs: number;
      opponent_runs: number;
      is_win: boolean;
      player_hits: number;
      player_errors: number;
      opponent_hits: number;
      opponent_errors: number;
      attendance: number;
      created_at: string;
    }) => ({
      id: row.id,
      gameNumber: row.game_number,
      isHome: row.is_home,
      opponentName: row.opponent_name,
      playerRuns: row.player_runs,
      opponentRuns: row.opponent_runs,
      isWin: row.is_win,
      playerHits: row.player_hits,
      playerErrors: row.player_errors,
      opponentHits: row.opponent_hits,
      opponentErrors: row.opponent_errors,
      attendance: row.attendance,
      createdAt: new Date(row.created_at),
    }));

    return {
      success: true,
      games,
      total: count || 0,
    };
  } catch (error) {
    console.error('Error fetching game log:', error);
    return { success: false, error: 'Failed to fetch game log' };
  }
}

/**
 * Get a single game's full box score
 */
export async function getBoxScore(
  gameId: string,
  gameResultId: string
): Promise<{ success: boolean; boxScore?: GameResult; error?: string }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('game_results')
      .select('*')
      .eq('game_id', gameId)
      .eq('id', gameResultId)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: 'Game not found' };

    const row = data as {
      id: string;
      game_id: string;
      season_id: string;
      year: number;
      game_number: number;
      player_team_name: string;
      opponent_name: string;
      is_home: boolean;
      player_runs: number;
      opponent_runs: number;
      is_win: boolean;
      player_line_score: number[];
      opponent_line_score: number[];
      player_hits: number;
      player_errors: number;
      opponent_hits: number;
      opponent_errors: number;
      batting_stats: BatterBoxScore[];
      pitching_stats: PitcherBoxScore[];
      attendance: number;
      game_duration_minutes: number | null;
      weather: string | null;
      created_at: string;
    };

    const boxScore: GameResult = {
      id: row.id,
      gameId: row.game_id,
      seasonId: row.season_id,
      year: row.year,
      gameNumber: row.game_number,
      playerTeamName: row.player_team_name,
      opponentName: row.opponent_name,
      isHome: row.is_home,
      playerRuns: row.player_runs,
      opponentRuns: row.opponent_runs,
      isWin: row.is_win,
      playerLineScore: row.player_line_score || [],
      opponentLineScore: row.opponent_line_score || [],
      playerHits: row.player_hits,
      playerErrors: row.player_errors,
      opponentHits: row.opponent_hits,
      opponentErrors: row.opponent_errors,
      battingStats: row.batting_stats || [],
      pitchingStats: row.pitching_stats || [],
      attendance: row.attendance,
      gameDurationMinutes: row.game_duration_minutes || undefined,
      weather: row.weather || undefined,
      createdAt: new Date(row.created_at),
    };

    return { success: true, boxScore };
  } catch (error) {
    console.error('Error fetching box score:', error);
    return { success: false, error: 'Failed to fetch box score' };
  }
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

  // ============================================
  // PROGRESSION CHECK (Bankruptcy & Promotion)
  // ============================================

  const BANKRUPTCY_THRESHOLD = -2000000; // $2M in debt
  const isBankrupt = newReserves < BANKRUPTCY_THRESHOLD;

  // Update game status if bankrupt
  if (isBankrupt) {
    await supabase
      .from('games')
      // @ts-expect-error - Supabase types not inferred without database connection
      .update({
        status: 'game_over',
      })
      .eq('id', gameId);

    // Create game over event
    await supabase.from('game_events').insert({
      game_id: gameId,
      year: gameData.current_year,
      type: 'story',
      title: 'Franchise Declared Bankrupt',
      description: `With debts exceeding $${Math.abs(newReserves / 1000).toFixed(0)}K, the franchise can no longer continue operations. The ownership group has no choice but to shut down.`,
      is_read: false,
    } as any);
  }

  // Check tier promotion eligibility using proper criteria
  // Requirements: Win% > .550 AND Positive Balance AND Pride > 60
  const tierOrder = ['LOW_A', 'HIGH_A', 'DOUBLE_A', 'TRIPLE_A', 'MLB'];
  const currentTierIndex = tierOrder.indexOf(gameData.current_tier);
  const canPromote = !isBankrupt &&
    currentTierIndex < tierOrder.length - 1 &&
    winPct > 0.550 &&
    newReserves > 0 &&
    cityGrowth.newPride > 60;

  // Legacy flag for backward compatibility
  const tierPromotionEligible = canPromote;

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

  // ============================================
  // NARRATIVE EVENT ENGINE
  // Check for story events based on game state
  // ============================================

  const eventGameState: EventGameState = {
    gameId,
    year: gameData.current_year,
    tier: gameData.current_tier as Tier,
    wins,
    losses,
    winPercentage: winPct,
    madePlayoffs,
    wonDivision: leagueRank === 1,
    population: cityData.population,
    unemploymentRate: cityData.unemployment_rate,
    teamPride: cityData.team_pride,
    medianIncome: cityData.median_income,
    stadiumQuality: franchiseData.stadium_quality,
    reserves: newReserves,
    totalAttendance: seasonData.total_attendance || 0,
    stadiumCapacity: franchiseData.stadium_capacity,
    consecutiveWinningSeasons: winPct > 0.5 ? (franchiseData.consecutive_winning_seasons || 0) + 1 : 0,
    consecutiveDivisionTitles: leagueRank === 1 ? (franchiseData.consecutive_division_titles || 0) + 1 : 0,
  };

  const narrativeEvents = checkForEventsWithTier(eventGameState);

  // Insert narrative events into database
  const insertedEventIds: string[] = [];
  for (const event of narrativeEvents) {
    const serialized = serializeEvent(event);
    const expiresYear = event.durationYears ? gameData.current_year + event.durationYears : null;

    const { data: insertedEvent } = await supabase.from('game_events').insert({
      game_id: gameId,
      year: gameData.current_year,
      type: serialized.type,
      title: serialized.title,
      description: serialized.description,
      effects: serialized.effects,
      duration_years: serialized.duration_years,
      expires_year: expiresYear,
      is_read: false,
    } as any).select('id').single();

    if (insertedEvent) {
      insertedEventIds.push((insertedEvent as { id: string }).id);

      // Create active effects for events with duration
      if (event.durationYears && event.durationYears > 0) {
        const effects = event.effects;
        const effectEntries: Array<{ effect_type: string; modifier: number }> = [];

        if (effects.attendanceModifier) {
          effectEntries.push({ effect_type: 'attendance_modifier', modifier: effects.attendanceModifier });
        }
        if (effects.revenueModifier) {
          effectEntries.push({ effect_type: 'revenue_modifier', modifier: effects.revenueModifier });
        }
        if (effects.merchandiseModifier) {
          effectEntries.push({ effect_type: 'merchandise_modifier', modifier: effects.merchandiseModifier });
        }

        for (const entry of effectEntries) {
          await supabase.from('active_effects').insert({
            game_id: gameId,
            event_id: (insertedEvent as { id: string }).id,
            effect_type: entry.effect_type,
            modifier: entry.modifier,
            start_year: gameData.current_year,
            end_year: expiresYear,
            is_active: true,
          } as any);
        }
      }
    }
  }

  // Apply immediate event effects to city/franchise (one-time changes)
  if (narrativeEvents.length > 0) {
    const eventEffects = applyEventEffects(eventGameState, narrativeEvents);

    // Update city with event effects (if they differ from what we already calculated)
    if (eventEffects.newPride !== cityGrowth.newPride || eventEffects.newPopulation !== cityGrowth.population) {
      await supabase
        .from('city_states')
        // @ts-expect-error - Supabase types not inferred without database connection
        .update({
          team_pride: eventEffects.newPride,
          population: eventEffects.newPopulation,
        })
        .eq('game_id', gameId);
    }

    // Update stadium quality if events affected it
    if (eventEffects.newStadiumQuality !== franchiseData.stadium_quality) {
      await supabase
        .from('current_franchise')
        // @ts-expect-error - Supabase types not inferred without database connection
        .update({
          stadium_quality: eventEffects.newStadiumQuality,
          reserves: newReserves - eventEffects.totalMaintenanceCost,
        })
        .eq('game_id', gameId);
    }
  }

  // Update franchise consecutive season tracking
  await supabase
    .from('current_franchise')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      consecutive_winning_seasons: winPct > 0.5 ? (franchiseData.consecutive_winning_seasons || 0) + 1 : 0,
      consecutive_division_titles: leagueRank === 1 ? (franchiseData.consecutive_division_titles || 0) + 1 : 0,
    })
    .eq('game_id', gameId);

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
    canPromote,
    isBankrupt,
    nextTier: canPromote ? tierOrder[currentTierIndex + 1] : null,
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

// ============================================
// PROMOTE TO NEXT TIER
// ============================================

export async function promoteTier(gameId: string) {
  const supabase = await createClient();

  // Get current game state
  const { data: game } = await supabase
    .from('games')
    .select('*, current_franchise(*), city_states(*)')
    .eq('id', gameId)
    .single();

  if (!game) return { error: 'Game not found' };

  const gameData = game as GameRow & {
    current_franchise: FranchiseRow | null;
    city_states: CityStateRow | null;
  };

  const franchise = gameData.current_franchise;
  const city = gameData.city_states;

  if (!franchise || !city) {
    return { error: 'Missing franchise or city data' };
  }

  // Validate promotion eligibility
  const tierOrder = ['LOW_A', 'HIGH_A', 'DOUBLE_A', 'TRIPLE_A', 'MLB'];
  const currentTierIndex = tierOrder.indexOf(gameData.current_tier);

  if (currentTierIndex >= tierOrder.length - 1) {
    return { error: 'Already at MLB tier' };
  }

  // Get last season to verify eligibility
  const { data: lastSeason } = await supabase
    .from('seasons')
    .select('*')
    .eq('game_id', gameId)
    .eq('year', gameData.current_year)
    .single();

  if (!lastSeason) {
    return { error: 'No season data found' };
  }

  const seasonData = lastSeason as SeasonRow;
  const winPct = seasonData.wins && seasonData.losses
    ? seasonData.wins / (seasonData.wins + seasonData.losses)
    : 0;

  // Check all promotion requirements
  if (winPct <= 0.550) {
    return { error: 'Win percentage must be above .550 for promotion' };
  }
  if (franchise.reserves <= 0) {
    return { error: 'Must have positive reserves for promotion' };
  }
  if (city.team_pride <= 60) {
    return { error: 'City pride must be above 60 for promotion' };
  }

  // Calculate new tier
  const newTier = tierOrder[currentTierIndex + 1] as Tier;
  const newTierConfig = TIER_CONFIGS[newTier];

  // Calculate promotion bonuses
  const promotionBonuses = {
    budgetIncrease: newTierConfig.budget - TIER_CONFIGS[gameData.current_tier as Tier].budget,
    stadiumCapacityIncrease: newTierConfig.stadiumCapacity - franchise.stadium_capacity,
    prideBonus: 10,
    recognitionBonus: 15,
    cashBonus: Math.round(newTierConfig.budget * 0.1), // 10% of new budget as bonus
  };

  // Update game tier
  await supabase
    .from('games')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      current_tier: newTier,
      current_phase: 'off_season', // Move to off-season after promotion
      status: newTier === 'MLB' ? 'promoted' : 'active',
    })
    .eq('id', gameId);

  // Update franchise with new tier benefits
  await supabase
    .from('current_franchise')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      tier: newTier,
      budget: newTierConfig.budget,
      reserves: franchise.reserves + promotionBonuses.cashBonus,
      stadium_capacity: newTierConfig.stadiumCapacity,
      total_promotions: (franchise.total_promotions || 0) + 1,
      last_promotion_year: gameData.current_year,
    })
    .eq('game_id', gameId);

  // Update city with promotion bonuses
  await supabase
    .from('city_states')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      team_pride: Math.min(100, city.team_pride + promotionBonuses.prideBonus),
      national_recognition: Math.min(100, city.national_recognition + promotionBonuses.recognitionBonus),
      population: newTierConfig.cityPopulation,
      median_income: newTierConfig.medianIncome,
    })
    .eq('game_id', gameId);

  // Record promotion in history
  await supabase.from('promotion_history').insert({
    game_id: gameId,
    year: gameData.current_year,
    from_tier: gameData.current_tier,
    to_tier: newTier,
    win_pct: winPct,
    reserves: franchise.reserves,
    city_pride: city.team_pride,
    consecutive_winning_seasons: franchise.consecutive_winning_seasons || 0,
    won_division: seasonData.league_rank === 1,
    won_championship: false, // TODO: Track playoff results
  } as any);

  // Create promotion event
  await supabase.from('game_events').insert({
    game_id: gameId,
    year: gameData.current_year,
    type: 'story',
    title: `Promoted to ${getTierDisplayName(newTier)}!`,
    description: `After a stellar season, ownership has approved the franchise's promotion to ${getTierDisplayName(newTier)}! The city is buzzing with excitement as the team prepares for the next level of competition.`,
    is_read: false,
  } as any);

  revalidatePath(`/game/${gameId}`);

  return {
    success: true,
    previousTier: gameData.current_tier,
    newTier,
    bonuses: promotionBonuses,
  };
}

function getTierDisplayName(tier: string): string {
  const names: Record<string, string> = {
    LOW_A: 'Low-A',
    HIGH_A: 'High-A',
    DOUBLE_A: 'Double-A',
    TRIPLE_A: 'Triple-A',
    MLB: 'Major League Baseball',
  };
  return names[tier] || tier;
}

// ============================================
// ROSTER MANAGEMENT (Two-Tier System)
// ============================================

export async function movePlayer(
  gameId: string,
  playerId: string,
  destination: RosterStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get player data
  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, roster_status, is_on_roster')
    .eq('id', playerId)
    .eq('game_id', gameId)
    .single();

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  const playerData = player as { id: string; first_name: string; last_name: string; roster_status: RosterStatus; is_on_roster: boolean };

  if (playerData.roster_status === destination) {
    return { success: false, error: `Player is already on ${destination} roster` };
  }

  // Get current roster counts and facility level
  const { data: franchise } = await supabase
    .from('current_franchise')
    .select('facility_level')
    .eq('game_id', gameId)
    .single();

  if (!franchise) {
    return { success: false, error: 'Franchise not found' };
  }

  const facilityLevel = (franchise as { facility_level: FacilityLevel }).facility_level;
  const capacities = getRosterCapacities(facilityLevel);

  // Get current roster counts
  const { data: rosterCounts } = await supabase
    .from('players')
    .select('roster_status')
    .eq('game_id', gameId)
    .eq('is_on_roster', true);

  const counts = {
    active: 0,
    reserve: 0,
  };

  if (rosterCounts) {
    for (const p of rosterCounts as { roster_status: RosterStatus }[]) {
      if (p.roster_status === 'ACTIVE') counts.active++;
      else counts.reserve++;
    }
  }

  // Validate move
  if (destination === 'ACTIVE') {
    if (counts.active >= capacities.activeMax) {
      return {
        success: false,
        error: `Active roster is full (${counts.active}/${capacities.activeMax}). Send a player down first.`,
      };
    }
  } else {
    if (counts.reserve >= capacities.reserveMax) {
      return {
        success: false,
        error: `Reserve roster is full (${counts.reserve}/${capacities.reserveMax}). Upgrade facilities or release a player.`,
      };
    }
  }

  // Perform the move
  const { error: updateError } = await supabase
    .from('players')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({ roster_status: destination })
    .eq('id', playerId);

  if (updateError) {
    return { success: false, error: 'Failed to move player' };
  }

  revalidatePath(`/game/${gameId}`);

  return { success: true };
}

export async function getRosterCounts(gameId: string): Promise<{
  active: number;
  reserve: number;
  activeMax: number;
  reserveMax: number;
  facilityLevel: FacilityLevel;
}> {
  const supabase = await createClient();

  // Get facility level
  const { data: franchise } = await supabase
    .from('current_franchise')
    .select('facility_level')
    .eq('game_id', gameId)
    .single();

  const facilityLevel = (franchise as { facility_level: FacilityLevel } | null)?.facility_level ?? 0;
  const capacities = getRosterCapacities(facilityLevel);

  // Get roster counts
  const { data: players } = await supabase
    .from('players')
    .select('roster_status')
    .eq('game_id', gameId)
    .eq('is_on_roster', true);

  const counts = { active: 0, reserve: 0 };

  if (players) {
    for (const p of players as { roster_status: RosterStatus }[]) {
      if (p.roster_status === 'ACTIVE') counts.active++;
      else counts.reserve++;
    }
  }

  return {
    ...counts,
    activeMax: capacities.activeMax,
    reserveMax: capacities.reserveMax,
    facilityLevel,
  };
}

export async function upgradeFacility(gameId: string): Promise<{
  success: boolean;
  error?: string;
  newLevel?: FacilityLevel;
  cost?: number;
}> {
  const supabase = await createClient();

  // Get current franchise state
  const { data: franchise } = await supabase
    .from('current_franchise')
    .select('facility_level, reserves')
    .eq('game_id', gameId)
    .single();

  if (!franchise) {
    return { success: false, error: 'Franchise not found' };
  }

  const franchiseData = franchise as { facility_level: FacilityLevel; reserves: number };
  const currentLevel = franchiseData.facility_level;
  const currentConfig = FACILITY_CONFIGS[currentLevel];

  // Check if already at max level
  if (currentConfig.upgradeCost === null) {
    return { success: false, error: 'Facilities are already at maximum level' };
  }

  // Check if enough reserves
  if (franchiseData.reserves < currentConfig.upgradeCost) {
    return {
      success: false,
      error: `Not enough reserves. Need $${currentConfig.upgradeCost.toLocaleString()}, have $${franchiseData.reserves.toLocaleString()}`,
    };
  }

  const newLevel = (currentLevel + 1) as FacilityLevel;
  const cost = currentConfig.upgradeCost;

  // Perform the upgrade
  const { error: updateError } = await supabase
    .from('current_franchise')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      facility_level: newLevel,
      reserves: franchiseData.reserves - cost,
    })
    .eq('game_id', gameId);

  if (updateError) {
    return { success: false, error: 'Failed to upgrade facility' };
  }

  // Create upgrade event
  const newConfig = FACILITY_CONFIGS[newLevel];
  await supabase.from('game_events').insert({
    game_id: gameId,
    year: 1, // Will be updated with current year
    type: 'story',
    title: `Facility Upgraded: ${newConfig.name}`,
    description: `The franchise has invested in a ${newConfig.name}. Reserve roster capacity has increased to ${newConfig.reserveSlots} players.`,
    is_read: false,
  } as any);

  revalidatePath(`/game/${gameId}`);

  return { success: true, newLevel, cost };
}

// ============================================
// NEWS STORIES (Dynamic Narrative Engine)
// ============================================

/**
 * Get recent news stories for a game
 */
export async function getNewsStories(
  gameId: string,
  limit: number = 50
): Promise<NewsStory[]> {
  const supabase = await createClient();

  const { data: stories, error } = await supabase
    .from('news_stories')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching news stories:', error);
    return [];
  }

  // Map database rows to NewsStory interface
  return (stories as NewsStoryRow[]).map(row => ({
    id: row.id,
    date: row.date,
    headline: row.headline,
    type: row.type,
    priority: row.priority,
    imageIcon: row.image_icon || undefined,
    year: row.year,
    gameNumber: row.game_number || undefined,
    playerId: row.player_id || undefined,
    playerName: row.player_name || undefined,
  }));
}

/**
 * Get breaking news (high priority stories)
 */
export async function getBreakingNewsStories(
  gameId: string,
  limit: number = 5
): Promise<NewsStory[]> {
  const supabase = await createClient();

  const { data: stories, error } = await supabase
    .from('news_stories')
    .select('*')
    .eq('game_id', gameId)
    .eq('priority', 'HIGH')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching breaking news:', error);
    return [];
  }

  return (stories as NewsStoryRow[]).map(row => ({
    id: row.id,
    date: row.date,
    headline: row.headline,
    type: row.type,
    priority: row.priority,
    imageIcon: row.image_icon || undefined,
    year: row.year,
    gameNumber: row.game_number || undefined,
    playerId: row.player_id || undefined,
    playerName: row.player_name || undefined,
  }));
}

/**
 * Add a news story to the database
 */
export async function addNewsStory(
  gameId: string,
  story: Omit<NewsStory, 'id'>
): Promise<{ success: boolean; error?: string; story?: NewsStory }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('news_stories')
    .insert({
      game_id: gameId,
      date: story.date,
      headline: story.headline,
      type: story.type,
      priority: story.priority,
      image_icon: story.imageIcon || null,
      year: story.year,
      game_number: story.gameNumber || null,
      player_id: story.playerId || null,
      player_name: story.playerName || null,
    } as any)
    .select()
    .single();

  if (error) {
    console.error('Error adding news story:', error);
    return { success: false, error: 'Failed to add news story' };
  }

  const row = data as NewsStoryRow;

  return {
    success: true,
    story: {
      id: row.id,
      date: row.date,
      headline: row.headline,
      type: row.type,
      priority: row.priority,
      imageIcon: row.image_icon || undefined,
      year: row.year,
      gameNumber: row.game_number || undefined,
      playerId: row.player_id || undefined,
      playerName: row.player_name || undefined,
    },
  };
}

/**
 * Add multiple news stories to the database
 */
export async function addNewsStories(
  gameId: string,
  stories: Omit<NewsStory, 'id'>[]
): Promise<{ success: boolean; count: number }> {
  if (stories.length === 0) {
    return { success: true, count: 0 };
  }

  const supabase = await createClient();

  const insertData = stories.map(story => ({
    game_id: gameId,
    date: story.date,
    headline: story.headline,
    type: story.type,
    priority: story.priority,
    image_icon: story.imageIcon || null,
    year: story.year,
    game_number: story.gameNumber || null,
    player_id: story.playerId || null,
    player_name: story.playerName || null,
  }));

  const { error } = await supabase
    .from('news_stories')
    .insert(insertData as any);

  if (error) {
    console.error('Error adding news stories:', error);
    return { success: false, count: 0 };
  }

  return { success: true, count: stories.length };
}

/**
 * Generate and store news headlines from a simulated game
 */
export async function generateGameNews(
  gameId: string,
  gameResult: GameResultData,
  context: HeadlineContext
): Promise<NewsStory[]> {
  // Generate headlines using the headline generator
  const stories = generateGameHeadlines(gameResult, context);

  // Store in database
  if (stories.length > 0) {
    await addNewsStories(gameId, stories);
  }

  return stories;
}

/**
 * Generate and store city news headlines
 */
export async function generateCityNews(
  gameId: string,
  cityEvent: CityEventData,
  year: number
): Promise<NewsStory[]> {
  const stories = generateCityHeadlines(cityEvent, year);

  if (stories.length > 0) {
    await addNewsStories(gameId, stories);
  }

  return stories;
}

/**
 * Clean up old news stories to maintain the 50-story limit
 */
export async function cleanupOldNews(gameId: string): Promise<void> {
  const supabase = await createClient();

  // Get the ID of the 50th newest story
  const { data: cutoffStory } = await supabase
    .from('news_stories')
    .select('id, created_at')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .range(49, 49)
    .single();

  if (!cutoffStory) return;

  // Delete all stories older than the cutoff
  await supabase
    .from('news_stories')
    .delete()
    .eq('game_id', gameId)
    .lt('created_at', (cutoffStory as { created_at: string }).created_at);
}

// ============================================
// CITY BUILDING CONSTRUCTION
// ============================================

// Building costs
const BUILDING_COSTS: Record<BuildingType, number> = {
  restaurant: 50000,
  bar: 75000,
  retail: 40000,
  hotel: 200000,
  corporate: 150000,
};

/**
 * Construct a new building in an empty city slot
 */
export async function constructBuilding(
  gameId: string,
  slotIndex: number,
  buildingType: BuildingType
): Promise<{
  success: boolean;
  error?: string;
  building?: Building;
}> {
  const supabase = await createClient();

  // Get current city and franchise state
  const { data: cityData } = await supabase
    .from('city_states')
    .select('buildings')
    .eq('game_id', gameId)
    .single();

  const { data: franchiseData } = await supabase
    .from('current_franchise')
    .select('reserves')
    .eq('game_id', gameId)
    .single();

  if (!cityData || !franchiseData) {
    return { success: false, error: 'City or franchise data not found' };
  }

  const cityDataTyped = cityData as { buildings: unknown };
  const franchiseDataTyped = franchiseData as { reserves: number };

  const buildings = (cityDataTyped.buildings || []) as Building[];
  const reserves = franchiseDataTyped.reserves;
  const cost = BUILDING_COSTS[buildingType];

  // Validate slot index
  if (slotIndex < 0 || slotIndex >= buildings.length) {
    return { success: false, error: 'Invalid slot index' };
  }

  // Check if slot is vacant
  const existingBuilding = buildings[slotIndex];
  if (existingBuilding.state !== 0) {
    return { success: false, error: 'This slot is already occupied' };
  }

  // Check if player can afford
  if (reserves < cost) {
    return {
      success: false,
      error: `Insufficient funds. Need ${cost.toLocaleString()}, have ${reserves.toLocaleString()}`,
    };
  }

  // Get district config for this building type
  const districtConfig = BUILDING_DISTRICT_CONFIG[buildingType];

  // Update the building
  const updatedBuilding: Building = {
    ...existingBuilding,
    type: buildingType,
    state: 1, // Under renovation
    district: districtConfig.district,
  };

  // Update buildings array
  const updatedBuildings = [...buildings];
  updatedBuildings[slotIndex] = updatedBuilding;

  // Update database
  const [{ error: cityError }, { error: franchiseError }] = await Promise.all([
    supabase
      .from('city_states')
      // @ts-expect-error - Supabase types not inferred without database connection
      .update({ buildings: updatedBuildings })
      .eq('game_id', gameId),
    supabase
      .from('current_franchise')
      // @ts-expect-error - Supabase types not inferred without database connection
      .update({ reserves: reserves - cost })
      .eq('game_id', gameId),
  ]);

  if (cityError || franchiseError) {
    console.error('Error constructing building:', cityError || franchiseError);
    return { success: false, error: 'Failed to construct building' };
  }

  // Create a game event for the construction
  await supabase.from('game_events').insert({
    game_id: gameId,
    year: 1, // Will be updated with current year
    type: 'city',
    title: `New ${buildingType.charAt(0).toUpperCase() + buildingType.slice(1)} Under Construction`,
    description: `Construction has begun on a new ${buildingType} in the ${districtConfig.district.toLowerCase()} district. Cost: $${cost.toLocaleString()}.`,
    is_read: false,
  } as any);

  revalidatePath(`/game/${gameId}`);

  return {
    success: true,
    building: updatedBuilding,
  };
}

/**
 * Get city state with buildings
 */
export async function getCityState(gameId: string): Promise<{
  buildings: Building[];
  population: number;
  teamPride: number;
  occupancyRate: number;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('city_states')
    .select('buildings, population, team_pride, occupancy_rate')
    .eq('game_id', gameId)
    .single();

  if (error || !data) {
    return null;
  }

  const typedData = data as {
    buildings: unknown;
    population: number;
    team_pride: number;
    occupancy_rate: number;
  };

  return {
    buildings: (typedData.buildings || []) as Building[],
    population: typedData.population,
    teamPride: typedData.team_pride,
    occupancyRate: typedData.occupancy_rate,
  };
}

// ============================================
// CONTRACT & FREE AGENCY SYSTEM
// ============================================

/**
 * Get team payroll summary
 */
export async function getPayrollSummary(gameId: string): Promise<PayrollSummary | null> {
  const supabase = await createClient();

  // Get current tier
  const { data: game } = await supabase
    .from('games')
    .select('current_tier')
    .eq('id', gameId)
    .single();

  if (!game) return null;

  const gameData = game as Pick<GameRow, 'current_tier'>;

  // Get all rostered players
  const { data: players } = await supabase
    .from('players')
    .select('id, first_name, last_name, salary, roster_status')
    .eq('game_id', gameId)
    .eq('is_on_roster', true);

  if (!players) return null;

  const roster = (players as PlayerRow[]).map(p => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    salary: p.salary,
    rosterStatus: p.roster_status as RosterStatus,
  }));

  return calculatePayroll(roster, gameData.current_tier as Tier);
}

/**
 * Get players with expiring contracts (contractYears <= 1)
 */
export async function getExpiringContracts(gameId: string): Promise<Array<{
  id: string;
  name: string;
  position: string;
  rating: number;
  age: number;
  morale: number;
  salary: number;
  contractYears: number;
}>> {
  const supabase = await createClient();

  const { data: players, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, position, current_rating, age, morale, salary, contract_years')
    .eq('game_id', gameId)
    .eq('is_on_roster', true)
    .lte('contract_years', 1)
    .order('current_rating', { ascending: false });

  if (error || !players) {
    console.error('Error fetching expiring contracts:', error);
    return [];
  }

  return (players as PlayerRow[]).map(p => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    position: p.position,
    rating: p.current_rating,
    age: p.age,
    morale: p.morale,
    salary: p.salary,
    contractYears: p.contract_years,
  }));
}

/**
 * Generate a contract offer for a player
 */
export async function generatePlayerContractOffer(
  gameId: string,
  playerId: string
): Promise<{ success: boolean; error?: string; offer?: ContractOffer }> {
  const supabase = await createClient();

  // Get player data
  const { data: player } = await supabase
    .from('players')
    .select('current_rating, potential, tier, age')
    .eq('id', playerId)
    .eq('game_id', gameId)
    .single();

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  const playerData = player as Pick<PlayerRow, 'current_rating' | 'potential' | 'tier' | 'age'>;

  const offer = generateContractOffer({
    currentRating: playerData.current_rating,
    potential: playerData.potential,
    tier: playerData.tier as Tier,
    age: playerData.age,
  }, true);

  return { success: true, offer };
}

/**
 * Extend/renew a player's contract
 */
export async function extendPlayerContract(
  gameId: string,
  playerId: string,
  customOffer?: { salary: number; years: number }
): Promise<{
  success: boolean;
  error?: string;
  newSalary?: number;
  newYears?: number;
  accepted?: boolean;
}> {
  const supabase = await createClient();

  // Get player data
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .eq('game_id', gameId)
    .single();

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  const playerData = player as PlayerRow;

  // Get team tier for salary cap check
  const { data: game } = await supabase
    .from('games')
    .select('current_tier')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  const tier = (game as Pick<GameRow, 'current_tier'>).current_tier as Tier;
  const tierConfig = TIER_CONFIGS[tier];

  // Get current payroll
  const payroll = await getPayrollSummary(gameId);
  if (!payroll) {
    return { success: false, error: 'Could not calculate payroll' };
  }

  // Generate or use custom offer
  let offer: ContractOffer;
  if (customOffer) {
    offer = {
      salary: customOffer.salary,
      years: customOffer.years,
      totalValue: customOffer.salary * customOffer.years,
      isQualifyingOffer: true,
    };
  } else {
    offer = generateContractOffer({
      currentRating: playerData.current_rating,
      potential: playerData.potential,
      tier,
      age: playerData.age,
    }, true);
  }

  // Check salary cap (excluding current player's salary)
  const payrollWithoutPlayer = payroll.totalPayroll - playerData.salary;
  if (!canAffordSalary(payrollWithoutPlayer, offer.salary, tierConfig.salaryCap)) {
    return {
      success: false,
      error: `Signing this player would exceed the salary cap. Cap space: $${(tierConfig.salaryCap - payrollWithoutPlayer).toLocaleString()}`,
    };
  }

  // Get last season win percentage for negotiation
  const { data: lastSeason } = await supabase
    .from('seasons')
    .select('wins, losses')
    .eq('game_id', gameId)
    .order('year', { ascending: false })
    .limit(1)
    .single();

  const winPct = lastSeason
    ? (lastSeason as { wins: number; losses: number }).wins /
      ((lastSeason as { wins: number; losses: number }).wins + (lastSeason as { wins: number; losses: number }).losses)
    : 0.5;

  // Process the contract extension
  const result = processContractExpiration(
    {
      ...playerData,
      firstName: playerData.first_name,
      lastName: playerData.last_name,
      currentRating: playerData.current_rating,
      playerType: playerData.player_type as 'HITTER' | 'PITCHER',
      potential: playerData.potential,
      tier: playerData.tier as Tier,
      salary: playerData.salary,
      contractYears: playerData.contract_years,
      hiddenTraits: playerData.hidden_traits as any,
      hitterAttributes: playerData.hitter_attributes as any,
      pitcherAttributes: playerData.pitcher_attributes as any,
      traitsRevealed: playerData.traits_revealed,
      rosterStatus: playerData.roster_status as RosterStatus,
      confidence: playerData.confidence || 50,
      gamesPlayed: playerData.games_played || 0,
      yearsInOrg: playerData.years_in_org || 0,
      yearsAtTier: playerData.years_at_tier || 0,
      isInjured: playerData.is_injured,
      injuryGamesRemaining: playerData.injury_games_remaining || 0,
      isOnRoster: playerData.is_on_roster,
      seasonStats: null,
      draftYear: playerData.draft_year,
      draftRound: playerData.draft_round,
      draftPick: playerData.draft_pick,
      position: playerData.position as any,
      gameId: playerData.game_id,
      createdAt: new Date(playerData.created_at),
      updatedAt: new Date(playerData.updated_at),
      trainingFocus: (playerData.training_focus || 'overall') as TrainingFocus,
      currentXp: playerData.current_xp || 0,
      progressionRate: playerData.progression_rate || 1.0,
    },
    winPct,
    true
  );

  if (result.outcome === 'resigned' && result.newContract) {
    // Player accepted - update contract
    await supabase
      .from('players')
      // @ts-expect-error - Supabase types not inferred without database connection
      .update({
        salary: result.newContract.salary,
        contract_years: result.newContract.years,
      })
      .eq('id', playerId);

    // Create event
    await supabase.from('game_events').insert({
      game_id: gameId,
      year: 1,
      type: 'transaction',
      title: `${playerData.first_name} ${playerData.last_name} Re-Signs`,
      description: `${playerData.first_name} ${playerData.last_name} has agreed to a ${result.newContract.years}-year, $${result.newContract.totalValue.toLocaleString()} contract extension.`,
      is_read: false,
    } as any);

    revalidatePath(`/game/${gameId}`);

    return {
      success: true,
      accepted: true,
      newSalary: result.newContract.salary,
      newYears: result.newContract.years,
    };
  }

  // Player rejected
  return {
    success: true,
    accepted: false,
    error: `${playerData.first_name} ${playerData.last_name} declined the offer and will test free agency.`,
  };
}

/**
 * Release a player from the roster
 */
export async function releasePlayer(
  gameId: string,
  playerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get player data
  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, salary')
    .eq('id', playerId)
    .eq('game_id', gameId)
    .single();

  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  const playerData = player as Pick<PlayerRow, 'id' | 'first_name' | 'last_name' | 'salary'>;

  // Remove player from roster
  await supabase
    .from('players')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      is_on_roster: false,
      roster_status: null,
    })
    .eq('id', playerId);

  // Create release event
  await supabase.from('game_events').insert({
    game_id: gameId,
    year: 1,
    type: 'transaction',
    title: `${playerData.first_name} ${playerData.last_name} Released`,
    description: `The team has released ${playerData.first_name} ${playerData.last_name}, saving $${playerData.salary.toLocaleString()} in salary.`,
    is_read: false,
  } as any);

  revalidatePath(`/game/${gameId}`);

  return { success: true };
}

/**
 * Process all contract expirations at end of season
 * Called during off-season phase transition
 */
export async function processEndOfSeasonContracts(
  gameId: string
): Promise<{
  success: boolean;
  results: FreeAgentResult[];
  error?: string;
}> {
  const supabase = await createClient();

  // Get all players with contracts expiring (years = 1, will be 0 after decrement)
  const { data: expiringPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_on_roster', true)
    .eq('contract_years', 1);

  const results: FreeAgentResult[] = [];

  if (!expiringPlayers || expiringPlayers.length === 0) {
    // Still decrement all contracts
    await decrementAllContracts(gameId);
    return { success: true, results };
  }

  // Get team win percentage
  const { data: lastSeason } = await supabase
    .from('seasons')
    .select('wins, losses')
    .eq('game_id', gameId)
    .order('year', { ascending: false })
    .limit(1)
    .single();

  const winPct = lastSeason
    ? (lastSeason as { wins: number; losses: number }).wins /
      ((lastSeason as { wins: number; losses: number }).wins + (lastSeason as { wins: number; losses: number }).losses)
    : 0.5;

  // Process each expiring contract
  for (const playerRow of expiringPlayers as PlayerRow[]) {
    // Convert to Player type for processing
    const player = {
      ...playerRow,
      firstName: playerRow.first_name,
      lastName: playerRow.last_name,
      currentRating: playerRow.current_rating,
      playerType: playerRow.player_type as 'HITTER' | 'PITCHER',
      potential: playerRow.potential,
      tier: playerRow.tier as Tier,
      salary: playerRow.salary,
      contractYears: playerRow.contract_years,
      hiddenTraits: playerRow.hidden_traits as any,
      hitterAttributes: playerRow.hitter_attributes as any,
      pitcherAttributes: playerRow.pitcher_attributes as any,
      traitsRevealed: playerRow.traits_revealed,
      rosterStatus: playerRow.roster_status as RosterStatus,
      confidence: playerRow.confidence || 50,
      gamesPlayed: playerRow.games_played || 0,
      yearsInOrg: playerRow.years_in_org || 0,
      yearsAtTier: playerRow.years_at_tier || 0,
      isInjured: playerRow.is_injured,
      injuryGamesRemaining: playerRow.injury_games_remaining || 0,
      isOnRoster: playerRow.is_on_roster,
      seasonStats: null,
      draftYear: playerRow.draft_year,
      draftRound: playerRow.draft_round,
      draftPick: playerRow.draft_pick,
      position: playerRow.position as any,
      gameId: playerRow.game_id,
      createdAt: new Date(playerRow.created_at),
      updatedAt: new Date(playerRow.updated_at),
      trainingFocus: (playerRow.training_focus || 'overall') as TrainingFocus,
      currentXp: playerRow.current_xp || 0,
      progressionRate: playerRow.progression_rate || 1.0,
    };

    // Auto-offer contracts to good players (rating >= 50)
    const shouldOffer = player.currentRating >= 50;

    const result = processContractExpiration(player, winPct, shouldOffer);
    results.push(result);

    if (result.outcome === 'resigned' && result.newContract) {
      // Player re-signed
      await supabase
        .from('players')
        // @ts-expect-error - Supabase types not inferred without database connection
        .update({
          salary: result.newContract.salary,
          contract_years: result.newContract.years,
        })
        .eq('id', playerRow.id);

      // Create event
      await supabase.from('game_events').insert({
        game_id: gameId,
        year: 1,
        type: 'transaction',
        title: `${player.firstName} ${player.lastName} Re-Signs`,
        description: `${player.firstName} ${player.lastName} has re-signed for ${result.newContract.years} year(s) at $${result.newContract.salary.toLocaleString()}/year.`,
        is_read: false,
      } as any);
    } else if (result.outcome === 'departed') {
      // Player left
      await supabase
        .from('players')
        // @ts-expect-error - Supabase types not inferred without database connection
        .update({
          is_on_roster: false,
          roster_status: null,
        })
        .eq('id', playerRow.id);

      // Create event
      await supabase.from('game_events').insert({
        game_id: gameId,
        year: 1,
        type: 'transaction',
        title: `${player.firstName} ${player.lastName} Departs`,
        description: `${player.firstName} ${player.lastName} has ${shouldOffer ? 'rejected our offer and ' : ''}signed with the ${result.destination}.`,
        is_read: false,
      } as any);
    }
  }

  // Decrement remaining contracts
  await decrementAllContracts(gameId);

  revalidatePath(`/game/${gameId}`);

  return { success: true, results };
}

/**
 * Decrement contract years for all players
 */
async function decrementAllContracts(gameId: string): Promise<void> {
  const supabase = await createClient();

  // Get all rostered players
  const { data: players } = await supabase
    .from('players')
    .select('id, contract_years')
    .eq('game_id', gameId)
    .eq('is_on_roster', true)
    .gt('contract_years', 0);

  if (!players) return;

  // Decrement each player's contract years
  for (const player of players as { id: string; contract_years: number }[]) {
    await supabase
      .from('players')
      // @ts-expect-error - Supabase types not inferred without database connection
      .update({
        contract_years: Math.max(0, player.contract_years - 1),
      })
      .eq('id', player.id);
  }
}

/**
 * Migrate existing players without proper contracts
 * Call this once to set up contracts for existing games
 */
export async function migratePlayerContracts(gameId: string): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
}> {
  const supabase = await createClient();

  // Get game tier
  const { data: game } = await supabase
    .from('games')
    .select('current_tier')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { success: false, migratedCount: 0, error: 'Game not found' };
  }

  const tier = (game as Pick<GameRow, 'current_tier'>).current_tier as Tier;

  // Get all players with default/missing contracts (salary = 10000 is the default)
  const { data: players } = await supabase
    .from('players')
    .select('id, current_rating, potential, age, years_in_org')
    .eq('game_id', gameId)
    .eq('is_on_roster', true)
    .eq('salary', 10000);

  if (!players || players.length === 0) {
    return { success: true, migratedCount: 0 };
  }

  let migratedCount = 0;

  for (const playerRow of players as Pick<PlayerRow, 'id' | 'current_rating' | 'potential' | 'age' | 'years_in_org'>[]) {
    const contract = generateMigrationContract({
      currentRating: playerRow.current_rating,
      potential: playerRow.potential,
      tier,
      age: playerRow.age,
      yearsInOrg: playerRow.years_in_org || 0,
    });

    await supabase
      .from('players')
      // @ts-expect-error - Supabase types not inferred without database connection
      .update({
        salary: contract.salary,
        contract_years: contract.contractYears,
      })
      .eq('id', playerRow.id);

    migratedCount++;
  }

  revalidatePath(`/game/${gameId}`);

  return { success: true, migratedCount };
}

// ============================================
// FREE AGENT MARKET
// ============================================

export interface FreeAgent {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: string;
  playerType: 'HITTER' | 'PITCHER';
  currentRating: number;
  potential: number;
  askingPrice: number;
  archetype: string;
}

/**
 * Calculate asking price based on player rating and potential
 */
function calculateAskingPrice(currentRating: number, potential: number, tier: Tier): number {
  const tierConfig = TIER_CONFIGS[tier];
  const { minSalary, maxSalary } = tierConfig;

  // Weighted average: 60% current, 40% potential for free agents
  const effectiveRating = currentRating * 0.6 + potential * 0.4;

  // Normalize rating to 0-1 scale
  const normalizedRating = Math.max(0, Math.min(1, (effectiveRating - 20) / 60));

  // Quadratic scaling with a premium for free agency (1.2x multiplier)
  const salaryMultiplier = Math.pow(normalizedRating, 1.6) * 1.2;

  // Calculate salary
  const salaryRange = maxSalary - minSalary;
  let salary = minSalary + salaryRange * salaryMultiplier;

  // Clamp and round
  salary = Math.max(minSalary, Math.min(maxSalary, salary));
  return Math.round(salary / 1000) * 1000;
}

/**
 * Get available free agents for signing
 * Returns top 100 free agents sorted by rating
 */
export async function getFreeAgents(gameId: string): Promise<{
  success: boolean;
  freeAgents: FreeAgent[];
  error?: string;
}> {
  const supabase = await createClient();

  // Get current tier for salary calculations
  const { data: game } = await supabase
    .from('games')
    .select('current_tier, current_year')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { success: false, freeAgents: [], error: 'Game not found' };
  }

  const gameData = game as Pick<GameRow, 'current_tier' | 'current_year'>;
  const tier = gameData.current_tier as Tier;

  // Fetch free agents from draft_prospects (undrafted players marked as free agents)
  const { data: prospects, error } = await supabase
    .from('draft_prospects')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_drafted', false)
    .order('current_rating', { ascending: false })
    .limit(100);

  if (error) {
    return { success: false, freeAgents: [], error: 'Failed to fetch free agents' };
  }

  if (!prospects || prospects.length === 0) {
    return { success: true, freeAgents: [] };
  }

  // Also check for released players (players with is_on_roster = false)
  const { data: releasedPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_on_roster', false)
    .order('current_rating', { ascending: false })
    .limit(50);

  // Convert prospects to FreeAgent format
  const prospectFreeAgents: FreeAgent[] = (prospects as ProspectRow[]).map(p => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    age: p.age,
    position: p.position,
    playerType: p.player_type as 'HITTER' | 'PITCHER',
    currentRating: p.current_rating,
    potential: p.potential,
    askingPrice: calculateAskingPrice(p.current_rating, p.potential, tier),
    archetype: p.archetype || 'Unknown',
  }));

  // Convert released players to FreeAgent format
  const releasedFreeAgents: FreeAgent[] = (releasedPlayers as PlayerRow[] || []).map(p => ({
    id: `player-${p.id}`, // Prefix to distinguish from prospects
    firstName: p.first_name,
    lastName: p.last_name,
    age: p.age,
    position: p.position,
    playerType: p.player_type as 'HITTER' | 'PITCHER',
    currentRating: p.current_rating,
    potential: p.potential,
    askingPrice: calculateAskingPrice(p.current_rating, p.potential, tier),
    archetype: 'Veteran',
  }));

  // Combine and sort by rating
  const allFreeAgents = [...prospectFreeAgents, ...releasedFreeAgents]
    .sort((a, b) => b.currentRating - a.currentRating)
    .slice(0, 100);

  return { success: true, freeAgents: allFreeAgents };
}

export interface SignFreeAgentResult {
  success: boolean;
  error?: string;
  playerName?: string;
  salary?: number;
  contractYears?: number;
  rosterStatus?: 'ACTIVE' | 'RESERVE';
}

/**
 * Sign a free agent to the roster
 */
export async function signFreeAgent(
  gameId: string,
  freeAgentId: string,
  offerAmount: number
): Promise<SignFreeAgentResult> {
  const supabase = await createClient();

  // Determine if this is a prospect or a released player
  const isReleasedPlayer = freeAgentId.startsWith('player-');
  const actualId = isReleasedPlayer ? freeAgentId.replace('player-', '') : freeAgentId;

  // Get game and franchise data
  const { data: game } = await supabase
    .from('games')
    .select('current_tier, current_year')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  const gameData = game as Pick<GameRow, 'current_tier' | 'current_year'>;
  const tier = gameData.current_tier as Tier;
  const tierConfig = TIER_CONFIGS[tier];

  // Get franchise reserves
  const { data: franchise } = await supabase
    .from('current_franchise')
    .select('reserves, facility_level')
    .eq('game_id', gameId)
    .single();

  if (!franchise) {
    return { success: false, error: 'Franchise not found' };
  }

  const franchiseData = franchise as { reserves: number; facility_level: FacilityLevel };
  const facilityLevel = franchiseData.facility_level ?? 0;
  const capacities = getRosterCapacities(facilityLevel);

  // Check budget space
  if (franchiseData.reserves < offerAmount) {
    return {
      success: false,
      error: `Insufficient funds. You have ${formatCurrency(franchiseData.reserves)} but need ${formatCurrency(offerAmount)}.`,
    };
  }

  // Get current payroll
  const { data: rosterPlayers } = await supabase
    .from('players')
    .select('id, salary, roster_status')
    .eq('game_id', gameId)
    .eq('is_on_roster', true);

  const currentPayroll = (rosterPlayers || []).reduce(
    (sum, p) => sum + ((p as { salary: number }).salary || 0),
    0
  );

  // Check salary cap
  if (currentPayroll + offerAmount > tierConfig.salaryCap * 1.2) {
    return {
      success: false,
      error: `Would exceed luxury tax threshold. Current payroll: ${formatCurrency(currentPayroll)}, Cap: ${formatCurrency(tierConfig.salaryCap)}.`,
    };
  }

  // Check roster space
  const rosterCounts = { active: 0, reserve: 0 };
  for (const p of (rosterPlayers || []) as { roster_status: RosterStatus }[]) {
    if (p.roster_status === 'ACTIVE') rosterCounts.active++;
    else rosterCounts.reserve++;
  }

  const totalRoster = rosterCounts.active + rosterCounts.reserve;
  const totalCapacity = capacities.activeMax + capacities.reserveMax;

  if (totalRoster >= totalCapacity) {
    return {
      success: false,
      error: `Roster is full (${totalRoster}/${totalCapacity}). Release a player first.`,
    };
  }

  // Determine roster status
  const rosterStatus: RosterStatus = rosterCounts.active < capacities.activeMax ? 'ACTIVE' : 'RESERVE';

  let playerName: string;

  if (isReleasedPlayer) {
    // Re-sign a released player
    const { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('id', actualId)
      .single();

    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const playerData = player as PlayerRow;
    playerName = `${playerData.first_name} ${playerData.last_name}`;

    // Update player record
    await supabase
      .from('players')
      // @ts-expect-error - Supabase types not inferred
      .update({
        is_on_roster: true,
        roster_status: rosterStatus,
        salary: offerAmount,
        contract_years: 1, // 1-year prove-it deal
      })
      .eq('id', actualId);
  } else {
    // Sign a prospect
    const { data: prospect } = await supabase
      .from('draft_prospects')
      .select('*')
      .eq('id', actualId)
      .single();

    if (!prospect) {
      return { success: false, error: 'Free agent not found' };
    }

    const prospectData = prospect as ProspectRow;
    playerName = `${prospectData.first_name} ${prospectData.last_name}`;

    // Mark prospect as signed
    await supabase
      .from('draft_prospects')
      // @ts-expect-error - Supabase types not inferred
      .update({
        is_drafted: true,
        drafted_by_team: 'player',
      })
      .eq('id', actualId);

    // Create player record
    await supabase.from('players').insert({
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
      traits_revealed: false,
      tier: tier,
      years_at_tier: 0,
      salary: offerAmount,
      contract_years: 1, // 1-year prove-it deal
      is_on_roster: true,
      roster_status: rosterStatus,
    } as any);
  }

  // Deduct from reserves (signing bonus effect)
  const signingBonus = Math.round(offerAmount * 0.1); // 10% signing bonus
  await supabase
    .from('current_franchise')
    // @ts-expect-error - Supabase types not inferred
    .update({
      reserves: franchiseData.reserves - signingBonus,
    })
    .eq('game_id', gameId);

  // Create transaction event
  await supabase.from('game_events').insert({
    game_id: gameId,
    year: gameData.current_year,
    type: 'transaction',
    title: `${playerName} Signed`,
    description: `${playerName} has signed a 1-year, ${formatCurrency(offerAmount)} contract. Signing bonus: ${formatCurrency(signingBonus)}.`,
    is_read: false,
  } as any);

  revalidatePath(`/game/${gameId}`);

  return {
    success: true,
    playerName,
    salary: offerAmount,
    contractYears: 1,
    rosterStatus,
  };
}

// Helper function for formatting currency in server action
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================
// PLAYOFFS AND CHAMPIONSHIP
// ============================================

export interface PlayoffBracketData {
  id: string;
  gameId: string;
  seasonId: string;
  year: number;
  status: 'pending' | 'semifinals' | 'finals' | 'complete';
  championTeamId: string | null;
  championTeamName: string | null;
  semifinals: PlayoffSeriesData[];
  finals: PlayoffSeriesData | null;
}

export interface PlayoffSeriesData {
  id: string;
  bracketId: string;
  round: 'semifinals' | 'finals';
  seriesNumber: number;
  team1: PlayoffTeamData;
  team2: PlayoffTeamData;
  team1Wins: number;
  team2Wins: number;
  status: 'pending' | 'in_progress' | 'complete';
  winnerId: string | null;
  winnerName: string | null;
  games: PlayoffGameData[];
}

export interface PlayoffTeamData {
  id: string;
  name: string;
  seed: number;
  wins: number;
  losses: number;
  winPct: number;
}

export interface PlayoffGameData {
  id: string;
  gameNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  isComplete: boolean;
  homeLineScore: number[];
  awayLineScore: number[];
  attendance: number;
}

/**
 * Initialize playoffs when entering post_season phase
 * Creates bracket structure with top 4 teams
 */
export async function initializePlayoffs(gameId: string): Promise<{
  success: boolean;
  bracket?: PlayoffBracketData;
  standings?: PlayoffStanding[];
  error?: string;
}> {
  const supabase = await createClient();

  // Get current game state
  const { data: game } = await supabase
    .from('games')
    .select('id, current_year, current_phase, team_name')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  const gameData = game as Pick<GameRow, 'id' | 'current_year' | 'current_phase' | 'team_name'>;

  // Check if playoffs already exist for this year
  const { data: existingBracket } = await supabase
    .from('playoff_brackets')
    .select('id')
    .eq('game_id', gameId)
    .eq('year', gameData.current_year)
    .single();

  if (existingBracket) {
    // Already have a bracket, fetch and return it
    return getPlayoffBracket(gameId);
  }

  // Get current season
  const { data: season } = await supabase
    .from('seasons')
    .select('id, wins, losses')
    .eq('game_id', gameId)
    .eq('year', gameData.current_year)
    .single();

  if (!season) {
    return { success: false, error: 'Season not found' };
  }

  const seasonData = season as { id: string; wins: number; losses: number };

  // Generate playoff bracket
  const { bracket, standings } = generatePlayoffBracket({
    gameId,
    seasonId: seasonData.id,
    year: gameData.current_year,
    playerTeamName: gameData.team_name,
    playerWins: seasonData.wins,
    playerLosses: seasonData.losses,
    aiTeams: AI_TEAMS,
  });

  // Insert bracket into database
  const { data: bracketRow, error: bracketError } = await supabase
    .from('playoff_brackets')
    .insert({
      game_id: gameId,
      season_id: seasonData.id,
      year: gameData.current_year,
      status: 'semifinals',
      champion_team_id: null,
      champion_team_name: null,
    } as any)
    .select()
    .single();

  if (bracketError || !bracketRow) {
    return { success: false, error: 'Failed to create playoff bracket' };
  }

  const bracketData = bracketRow as { id: string };

  // Insert semifinal series
  const seriesInserts = bracket.semifinals.map((series, idx) => ({
    bracket_id: bracketData.id,
    round: 'semifinals',
    series_number: idx + 1,
    team1_id: series.team1.id,
    team1_name: series.team1.name,
    team1_seed: series.team1.seed,
    team1_wins: 0,
    team2_id: series.team2.id,
    team2_name: series.team2.name,
    team2_seed: series.team2.seed,
    team2_wins: 0,
    status: 'pending',
    winner_id: null,
    winner_name: null,
  }));

  const { error: seriesError } = await supabase
    .from('playoff_series')
    .insert(seriesInserts as any);

  if (seriesError) {
    return { success: false, error: 'Failed to create playoff series' };
  }

  // Create game event for playoffs starting
  await supabase.from('game_events').insert({
    game_id: gameId,
    year: gameData.current_year,
    type: 'milestone',
    title: 'Playoffs Begin!',
    description: `The ${gameData.team_name} have made the playoffs as the #${standings.findIndex(s => s.isPlayer) + 1} seed!`,
    is_read: false,
  } as any);

  revalidatePath(`/game/${gameId}`);

  // Return the created bracket
  return getPlayoffBracket(gameId);
}

/**
 * Get current playoff bracket for the game
 */
export async function getPlayoffBracket(gameId: string): Promise<{
  success: boolean;
  bracket?: PlayoffBracketData;
  standings?: PlayoffStanding[];
  error?: string;
}> {
  const supabase = await createClient();

  // Get current year
  const { data: game } = await supabase
    .from('games')
    .select('current_year')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  const gameData = game as Pick<GameRow, 'current_year'>;

  // Get bracket
  const { data: bracketRow } = await supabase
    .from('playoff_brackets')
    .select('*')
    .eq('game_id', gameId)
    .eq('year', gameData.current_year)
    .single();

  if (!bracketRow) {
    return { success: false, error: 'No playoff bracket found' };
  }

  const bracket = bracketRow as {
    id: string;
    game_id: string;
    season_id: string;
    year: number;
    status: string;
    champion_team_id: string | null;
    champion_team_name: string | null;
  };

  // Get all series for this bracket
  const { data: seriesRows } = await supabase
    .from('playoff_series')
    .select('*')
    .eq('bracket_id', bracket.id)
    .order('round', { ascending: true })
    .order('series_number', { ascending: true });

  const allSeries = (seriesRows || []) as {
    id: string;
    bracket_id: string;
    round: string;
    series_number: number;
    team1_id: string;
    team1_name: string;
    team1_seed: number;
    team1_wins: number;
    team2_id: string;
    team2_name: string;
    team2_seed: number;
    team2_wins: number;
    status: string;
    winner_id: string | null;
    winner_name: string | null;
  }[];

  // Get all games for all series
  const seriesIds = allSeries.map(s => s.id);
  const { data: gameRows } = await supabase
    .from('playoff_games')
    .select('*')
    .in('series_id', seriesIds)
    .order('game_number', { ascending: true });

  const allGames = (gameRows || []) as {
    id: string;
    series_id: string;
    game_number: number;
    home_team_id: string;
    away_team_id: string;
    home_score: number | null;
    away_score: number | null;
    winner_id: string | null;
    is_complete: boolean;
    home_line_score: number[];
    away_line_score: number[];
    attendance: number;
  }[];

  // Build series data with games
  const buildSeriesData = (series: typeof allSeries[0]): PlayoffSeriesData => {
    const seriesGames = allGames.filter(g => g.series_id === series.id);
    return {
      id: series.id,
      bracketId: series.bracket_id,
      round: series.round as 'semifinals' | 'finals',
      seriesNumber: series.series_number,
      team1: {
        id: series.team1_id,
        name: series.team1_name,
        seed: series.team1_seed,
        wins: 0,
        losses: 0,
        winPct: 0,
      },
      team2: {
        id: series.team2_id,
        name: series.team2_name,
        seed: series.team2_seed,
        wins: 0,
        losses: 0,
        winPct: 0,
      },
      team1Wins: series.team1_wins,
      team2Wins: series.team2_wins,
      status: series.status as 'pending' | 'in_progress' | 'complete',
      winnerId: series.winner_id,
      winnerName: series.winner_name,
      games: seriesGames.map(g => ({
        id: g.id,
        gameNumber: g.game_number,
        homeTeamId: g.home_team_id,
        awayTeamId: g.away_team_id,
        homeScore: g.home_score,
        awayScore: g.away_score,
        winnerId: g.winner_id,
        isComplete: g.is_complete,
        homeLineScore: g.home_line_score || [],
        awayLineScore: g.away_line_score || [],
        attendance: g.attendance || 0,
      })),
    };
  };

  const semifinals = allSeries.filter(s => s.round === 'semifinals').map(buildSeriesData);
  const finalsSeries = allSeries.find(s => s.round === 'finals');
  const finals = finalsSeries ? buildSeriesData(finalsSeries) : null;

  return {
    success: true,
    bracket: {
      id: bracket.id,
      gameId: bracket.game_id,
      seasonId: bracket.season_id,
      year: bracket.year,
      status: bracket.status as 'pending' | 'semifinals' | 'finals' | 'complete',
      championTeamId: bracket.champion_team_id,
      championTeamName: bracket.champion_team_name,
      semifinals,
      finals,
    },
  };
}

/**
 * Simulate the next game in a playoff series
 */
export async function simulatePlayoffSeriesGame(
  gameId: string,
  seriesId: string
): Promise<{
  success: boolean;
  game?: PlayoffGameData;
  seriesComplete: boolean;
  winnerId?: string | null;
  winnerName?: string | null;
  error?: string;
}> {
  const supabase = await createClient();

  // Get franchise for stadium capacity
  const { data: franchise } = await supabase
    .from('current_franchise')
    .select('stadium_capacity')
    .eq('game_id', gameId)
    .single();

  if (!franchise) {
    return { success: false, seriesComplete: false, error: 'Franchise not found' };
  }

  const franchiseData = franchise as { stadium_capacity: number };

  // Get series data
  const { data: seriesRow } = await supabase
    .from('playoff_series')
    .select('*')
    .eq('id', seriesId)
    .single();

  if (!seriesRow) {
    return { success: false, seriesComplete: false, error: 'Series not found' };
  }

  const series = seriesRow as {
    id: string;
    bracket_id: string;
    round: string;
    team1_id: string;
    team1_name: string;
    team1_seed: number;
    team1_wins: number;
    team2_id: string;
    team2_name: string;
    team2_seed: number;
    team2_wins: number;
    status: string;
  };

  // Check if series is already complete
  if (series.status === 'complete') {
    return { success: false, seriesComplete: true, error: 'Series already complete' };
  }

  // Build PlayoffSeries for simulation
  const playoffSeries: PlayoffSeries = {
    id: series.id,
    bracketId: series.bracket_id,
    round: series.round as PlayoffRound,
    seriesNumber: 1,
    team1: {
      id: series.team1_id,
      name: series.team1_name,
      seed: series.team1_seed,
      wins: 0,
      losses: 0,
      winPct: series.team1_seed === 1 ? 0.6 : series.team1_seed === 2 ? 0.55 : series.team1_seed === 3 ? 0.5 : 0.45,
    },
    team2: {
      id: series.team2_id,
      name: series.team2_name,
      seed: series.team2_seed,
      wins: 0,
      losses: 0,
      winPct: series.team2_seed === 1 ? 0.6 : series.team2_seed === 2 ? 0.55 : series.team2_seed === 3 ? 0.5 : 0.45,
    },
    team1Wins: series.team1_wins,
    team2Wins: series.team2_wins,
    status: series.status as 'pending' | 'in_progress' | 'complete',
    winnerId: null,
    winnerName: null,
    games: [],
  };

  // Simulate next game
  const result = simulateNextSeriesGame(playoffSeries, franchiseData.stadium_capacity);

  // Insert game record
  const { data: gameRow, error: gameError } = await supabase
    .from('playoff_games')
    .insert({
      series_id: seriesId,
      game_number: result.game.gameNumber,
      home_team_id: result.game.homeTeamId,
      away_team_id: result.game.awayTeamId,
      home_score: result.game.homeScore,
      away_score: result.game.awayScore,
      winner_id: result.game.winnerId,
      is_complete: true,
      home_line_score: result.game.homeLineScore,
      away_line_score: result.game.awayLineScore,
      attendance: result.game.attendance,
    } as any)
    .select()
    .single();

  if (gameError || !gameRow) {
    return { success: false, seriesComplete: false, error: 'Failed to save game' };
  }

  const savedGame = gameRow as { id: string };

  // Update series wins
  const newStatus = result.isSeriesComplete ? 'complete' : 'in_progress';
  await supabase
    .from('playoff_series')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      team1_wins: result.newTeam1Wins,
      team2_wins: result.newTeam2Wins,
      status: newStatus,
      winner_id: result.winnerId,
      winner_name: result.winnerName,
    })
    .eq('id', seriesId);

  revalidatePath(`/game/${gameId}`);

  return {
    success: true,
    game: {
      id: savedGame.id,
      gameNumber: result.game.gameNumber,
      homeTeamId: result.game.homeTeamId,
      awayTeamId: result.game.awayTeamId,
      homeScore: result.game.homeScore,
      awayScore: result.game.awayScore,
      winnerId: result.game.winnerId,
      isComplete: true,
      homeLineScore: result.game.homeLineScore,
      awayLineScore: result.game.awayLineScore,
      attendance: result.game.attendance,
    },
    seriesComplete: result.isSeriesComplete,
    winnerId: result.winnerId,
    winnerName: result.winnerName,
  };
}

/**
 * Advance playoffs after a series completes
 * Creates finals series or completes playoffs
 */
export async function advancePlayoffs(gameId: string): Promise<{
  success: boolean;
  newRound?: 'finals' | 'complete';
  championId?: string;
  championName?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // Get current bracket
  const { data: game } = await supabase
    .from('games')
    .select('current_year, team_name')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  const gameData = game as Pick<GameRow, 'current_year' | 'team_name'>;

  const { data: bracketRow } = await supabase
    .from('playoff_brackets')
    .select('*')
    .eq('game_id', gameId)
    .eq('year', gameData.current_year)
    .single();

  if (!bracketRow) {
    return { success: false, error: 'No playoff bracket found' };
  }

  const bracket = bracketRow as {
    id: string;
    status: string;
  };

  // Get all series
  const { data: seriesRows } = await supabase
    .from('playoff_series')
    .select('*')
    .eq('bracket_id', bracket.id);

  const allSeries = (seriesRows || []) as {
    id: string;
    round: string;
    winner_id: string | null;
    winner_name: string | null;
    team1_id: string;
    team1_name: string;
    team1_seed: number;
    team2_id: string;
    team2_name: string;
    team2_seed: number;
  }[];

  if (bracket.status === 'semifinals') {
    // Check if both semifinals are complete
    const semifinals = allSeries.filter(s => s.round === 'semifinals');
    const completedSemis = semifinals.filter(s => s.winner_id !== null);

    if (completedSemis.length < 2) {
      return { success: false, error: 'Not all semifinals are complete' };
    }

    // Create finals series
    const semifinal1 = semifinals.find(s => s.team1_seed === 1 || s.team2_seed === 1);
    const semifinal2 = semifinals.find(s => s.team1_seed === 2 || s.team2_seed === 2);

    if (!semifinal1 || !semifinal2 || !semifinal1.winner_id || !semifinal2.winner_id) {
      return { success: false, error: 'Invalid semifinals state' };
    }

    // Determine seeds for winners
    const winner1Seed = semifinal1.winner_id === semifinal1.team1_id ? semifinal1.team1_seed : semifinal1.team2_seed;
    const winner2Seed = semifinal2.winner_id === semifinal2.team1_id ? semifinal2.team1_seed : semifinal2.team2_seed;

    const finals = generateFinalsSeries(
      bracket.id,
      {
        id: semifinal1.winner_id,
        name: semifinal1.winner_name!,
        seed: winner1Seed,
        winPct: winner1Seed === 1 ? 0.6 : 0.55,
      },
      {
        id: semifinal2.winner_id,
        name: semifinal2.winner_name!,
        seed: winner2Seed,
        winPct: winner2Seed === 2 ? 0.55 : 0.5,
      }
    );

    // Insert finals series
    await supabase
      .from('playoff_series')
      .insert({
        bracket_id: bracket.id,
        round: 'finals',
        series_number: 1,
        team1_id: finals.team1.id,
        team1_name: finals.team1.name,
        team1_seed: finals.team1.seed,
        team1_wins: 0,
        team2_id: finals.team2.id,
        team2_name: finals.team2.name,
        team2_seed: finals.team2.seed,
        team2_wins: 0,
        status: 'pending',
      } as any);

    // Update bracket status
    await supabase
      .from('playoff_brackets')
      // @ts-expect-error - Supabase types not inferred without database connection
      .update({ status: 'finals' })
      .eq('id', bracket.id);

    // Create event for finals
    await supabase.from('game_events').insert({
      game_id: gameId,
      year: gameData.current_year,
      type: 'milestone',
      title: 'Championship Finals!',
      description: `${finals.team1.name} vs ${finals.team2.name} for the championship!`,
      is_read: false,
    } as any);

    revalidatePath(`/game/${gameId}`);

    return { success: true, newRound: 'finals' };
  }

  if (bracket.status === 'finals') {
    // Check if finals are complete
    const finals = allSeries.find(s => s.round === 'finals');

    if (!finals || !finals.winner_id) {
      return { success: false, error: 'Finals not complete' };
    }

    // Update bracket with champion
    await supabase
      .from('playoff_brackets')
      // @ts-expect-error - Supabase types not inferred without database connection
      .update({
        status: 'complete',
        champion_team_id: finals.winner_id,
        champion_team_name: finals.winner_name,
      })
      .eq('id', bracket.id);

    const isPlayerChampion = finals.winner_id === 'player';

    // Create championship event
    await supabase.from('game_events').insert({
      game_id: gameId,
      year: gameData.current_year,
      type: 'milestone',
      title: isPlayerChampion ? 'CHAMPIONS!' : 'Season Complete',
      description: isPlayerChampion
        ? `The ${gameData.team_name} have won the championship! What a historic season!`
        : `${finals.winner_name} have won the championship. Better luck next season!`,
      is_read: false,
    } as any);

    // Update season with championship flag if player won
    if (isPlayerChampion) {
      const { data: season } = await supabase
        .from('seasons')
        .select('id')
        .eq('game_id', gameId)
        .eq('year', gameData.current_year)
        .single();

      if (season) {
        await supabase
          .from('seasons')
          // @ts-expect-error - Supabase types not inferred without database connection
          .update({ championship_winner: true })
          .eq('id', (season as { id: string }).id);
      }
    }

    revalidatePath(`/game/${gameId}`);

    return {
      success: true,
      newRound: 'complete',
      championId: finals.winner_id,
      championName: finals.winner_name || undefined,
    };
  }

  return { success: false, error: 'Invalid bracket status' };
}

/**
 * Simulate entire playoff series at once (for quick simulation)
 */
export async function simulateEntireSeries(
  gameId: string,
  seriesId: string
): Promise<{
  success: boolean;
  winnerId?: string;
  winnerName?: string;
  team1Wins?: number;
  team2Wins?: number;
  error?: string;
}> {
  let result = await simulatePlayoffSeriesGame(gameId, seriesId);

  while (result.success && !result.seriesComplete) {
    result = await simulatePlayoffSeriesGame(gameId, seriesId);
  }

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Get final series state
  const supabase = await createClient();
  const { data: seriesRow } = await supabase
    .from('playoff_series')
    .select('team1_wins, team2_wins, winner_id, winner_name')
    .eq('id', seriesId)
    .single();

  if (!seriesRow) {
    return { success: false, error: 'Failed to get series result' };
  }

  const series = seriesRow as {
    team1_wins: number;
    team2_wins: number;
    winner_id: string;
    winner_name: string;
  };

  return {
    success: true,
    winnerId: series.winner_id,
    winnerName: series.winner_name,
    team1Wins: series.team1_wins,
    team2Wins: series.team2_wins,
  };
}

// ============================================
// OFFSEASON ROLLOVER SYSTEM
// ============================================

export interface SeasonSummaryData {
  year: number;
  tier: string;
  teamName: string;
  wins: number;
  losses: number;
  winPct: number;
  leagueRank: number;
  madePlayoffs: boolean;
  playoffResult: 'Champion' | 'Finals' | 'Semifinals' | 'Missed';
  championName: string | null;
  finalsMatchup: { team1: string; team2: string } | null;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  avgAttendance: number;
  mvpPlayer: { id: string; name: string } | null;
  expiringContracts: Array<{
    id: string;
    name: string;
    position: string;
    rating: number;
  }>;
  topPerformers: Array<{
    id: string;
    name: string;
    position: string;
    rating: number;
    keyStats: string;
  }>;
}

/**
 * Get season summary for the SeasonReview UI
 */
export async function getSeasonSummary(gameId: string): Promise<{
  success: boolean;
  summary?: SeasonSummaryData;
  error?: string;
}> {
  const supabase = await createClient();

  // Get game data
  const { data: game } = await supabase
    .from('games')
    .select('current_year, current_tier, team_name')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  const gameData = game as Pick<GameRow, 'current_year' | 'current_tier' | 'team_name'>;

  // Get season data
  const { data: season } = await supabase
    .from('seasons')
    .select('*')
    .eq('game_id', gameId)
    .eq('year', gameData.current_year)
    .single();

  if (!season) {
    return { success: false, error: 'Season not found' };
  }

  const seasonData = season as {
    wins: number;
    losses: number;
    total_revenue: number;
    total_expenses: number;
    total_attendance: number;
    games_played: number;
    league_rank: number;
    made_playoffs: boolean;
  };

  // Get playoff bracket if exists
  const { data: bracket } = await supabase
    .from('playoff_brackets')
    .select('*, playoff_series(*)')
    .eq('game_id', gameId)
    .eq('year', gameData.current_year)
    .single();

  let playoffResult: 'Champion' | 'Finals' | 'Semifinals' | 'Missed' = 'Missed';
  let championName: string | null = null;
  let finalsMatchup: { team1: string; team2: string } | null = null;

  if (bracket) {
    const bracketData = bracket as {
      champion_team_id: string | null;
      champion_team_name: string | null;
      playoff_series: Array<{
        round: string;
        team1_name: string;
        team2_name: string;
        winner_id: string | null;
      }>;
    };

    championName = bracketData.champion_team_name;

    // Find finals series
    const finals = bracketData.playoff_series?.find(s => s.round === 'finals');
    if (finals) {
      finalsMatchup = { team1: finals.team1_name, team2: finals.team2_name };
    }

    // Determine player's result
    if (bracketData.champion_team_id === 'player') {
      playoffResult = 'Champion';
    } else if (finals) {
      // Check if player was in finals
      const playerInFinals = finals.team1_name === gameData.team_name || finals.team2_name === gameData.team_name;
      if (playerInFinals) {
        playoffResult = 'Finals';
      } else {
        playoffResult = 'Semifinals';
      }
    } else if (seasonData.made_playoffs) {
      playoffResult = 'Semifinals';
    }
  }

  // Get players with expiring contracts
  const { data: expiringPlayers } = await supabase
    .from('players')
    .select('id, first_name, last_name, position, current_rating, contract_years')
    .eq('game_id', gameId)
    .eq('is_on_roster', true)
    .eq('contract_years', 1);

  const expiringContracts = (expiringPlayers || []).map(p => ({
    id: (p as PlayerRow).id,
    name: `${(p as PlayerRow).first_name} ${(p as PlayerRow).last_name}`,
    position: (p as PlayerRow).position,
    rating: (p as PlayerRow).current_rating,
  }));

  // Get top performers (highest rated players)
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, first_name, last_name, position, player_type, current_rating, season_stats')
    .eq('game_id', gameId)
    .eq('is_on_roster', true)
    .order('current_rating', { ascending: false })
    .limit(5);

  const topPerformers = (allPlayers || []).map(p => {
    const player = p as PlayerRow & { season_stats: Record<string, number> | null };
    const stats = player.season_stats;
    let keyStats = '';

    if (player.player_type === 'HITTER' && stats) {
      const avg = stats.atBats ? (stats.hits / stats.atBats).toFixed(3) : '.000';
      keyStats = `${avg} AVG, ${stats.homeRuns || 0} HR, ${stats.rbi || 0} RBI`;
    } else if (player.player_type === 'PITCHER' && stats) {
      const era = stats.era?.toFixed(2) || '0.00';
      keyStats = `${stats.wins || 0}-${stats.losses || 0}, ${era} ERA, ${stats.strikeouts || 0} K`;
    }

    return {
      id: player.id,
      name: `${player.first_name} ${player.last_name}`,
      position: player.position,
      rating: player.current_rating,
      keyStats,
    };
  });

  // Find MVP
  const mvpCandidates = (allPlayers || []).map(p => {
    const player = p as PlayerRow & { season_stats: Record<string, unknown> | null };
    return {
      id: player.id,
      name: `${player.first_name} ${player.last_name}`,
      playerType: player.player_type as 'HITTER' | 'PITCHER',
      seasonStats: player.season_stats,
      currentRating: player.current_rating,
    };
  });

  const mvpPlayer = determineSeasonMVP(mvpCandidates);

  const winPct = seasonData.wins / (seasonData.wins + seasonData.losses) || 0;
  const avgAttendance = seasonData.games_played > 0
    ? Math.round(seasonData.total_attendance / (seasonData.games_played / 2)) // Home games only
    : 0;

  return {
    success: true,
    summary: {
      year: gameData.current_year,
      tier: gameData.current_tier,
      teamName: gameData.team_name,
      wins: seasonData.wins,
      losses: seasonData.losses,
      winPct,
      leagueRank: seasonData.league_rank || 1,
      madePlayoffs: seasonData.made_playoffs || false,
      playoffResult,
      championName,
      finalsMatchup,
      totalRevenue: seasonData.total_revenue || 0,
      totalExpenses: seasonData.total_expenses || 0,
      netIncome: (seasonData.total_revenue || 0) - (seasonData.total_expenses || 0),
      avgAttendance,
      mvpPlayer: mvpPlayer ? { id: mvpPlayer.playerId, name: mvpPlayer.playerName } : null,
      expiringContracts,
      topPerformers,
    },
  };
}

export interface AdvanceSeasonResult {
  success: boolean;
  newYear?: number;
  offseasonSummary?: OffseasonSummary;
  error?: string;
}

/**
 * Advance to the next season - main rollover function
 */
export async function advanceToNextSeason(gameId: string): Promise<AdvanceSeasonResult> {
  const supabase = await createClient();

  // Get current game state
  const { data: game } = await supabase
    .from('games')
    .select('current_year, current_tier, team_name')
    .eq('id', gameId)
    .single();

  if (!game) {
    return { success: false, error: 'Game not found' };
  }

  const gameData = game as Pick<GameRow, 'current_year' | 'current_tier' | 'team_name'>;
  const currentYear = gameData.current_year;
  const newYear = currentYear + 1;
  const tier = gameData.current_tier as Tier;

  // Get current season data
  const { data: season } = await supabase
    .from('seasons')
    .select('*')
    .eq('game_id', gameId)
    .eq('year', currentYear)
    .single();

  if (!season) {
    return { success: false, error: 'Current season not found' };
  }

  const seasonData = season as {
    id: string;
    wins: number;
    losses: number;
    total_revenue: number;
    total_expenses: number;
    total_attendance: number;
    games_played: number;
    league_rank: number;
    made_playoffs: boolean;
    championship_winner: boolean;
  };

  // Get playoff bracket for playoff result
  const { data: bracket } = await supabase
    .from('playoff_brackets')
    .select('champion_team_id, champion_team_name')
    .eq('game_id', gameId)
    .eq('year', currentYear)
    .single();

  const bracketData = bracket as { champion_team_id: string | null; champion_team_name: string | null } | null;

  // ============================================
  // STEP 1: ARCHIVE TEAM HISTORY
  // ============================================

  const playoffResult = determinePlayoffResult(
    seasonData.made_playoffs,
    bracketData?.champion_team_id || null,
    bracketData?.champion_team_id || null,
    null,
    'player'
  );

  // Get MVP from roster
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, first_name, last_name, player_type, current_rating, season_stats')
    .eq('game_id', gameId)
    .eq('is_on_roster', true);

  const mvpCandidates = (allPlayers || []).map(p => {
    const player = p as PlayerRow & { season_stats: Record<string, unknown> | null };
    return {
      id: player.id,
      name: `${player.first_name} ${player.last_name}`,
      playerType: player.player_type as 'HITTER' | 'PITCHER',
      seasonStats: player.season_stats,
      currentRating: player.current_rating,
    };
  });

  const mvp = determineSeasonMVP(mvpCandidates);

  const teamHistoryEntry: TeamHistoryEntry = {
    year: currentYear,
    tier: tier,
    wins: seasonData.wins,
    losses: seasonData.losses,
    winPct: seasonData.wins / (seasonData.wins + seasonData.losses) || 0,
    leagueRank: seasonData.league_rank || 1,
    madePlayoffs: seasonData.made_playoffs,
    playoffResult,
    totalRevenue: seasonData.total_revenue || 0,
    totalExpenses: seasonData.total_expenses || 0,
    netIncome: (seasonData.total_revenue || 0) - (seasonData.total_expenses || 0),
    avgAttendance: seasonData.games_played > 0
      ? Math.round(seasonData.total_attendance / (seasonData.games_played / 2))
      : 0,
    mvpPlayerId: mvp?.playerId,
    mvpPlayerName: mvp?.playerName,
  };

  // Insert team history
  await supabase.from('team_history').insert({
    game_id: gameId,
    year: currentYear,
    tier: tier,
    wins: teamHistoryEntry.wins,
    losses: teamHistoryEntry.losses,
    win_pct: teamHistoryEntry.winPct,
    league_rank: teamHistoryEntry.leagueRank,
    made_playoffs: teamHistoryEntry.madePlayoffs,
    playoff_result: teamHistoryEntry.playoffResult,
    total_revenue: teamHistoryEntry.totalRevenue,
    total_expenses: teamHistoryEntry.totalExpenses,
    net_income: teamHistoryEntry.netIncome,
    avg_attendance: teamHistoryEntry.avgAttendance,
    mvp_player_id: teamHistoryEntry.mvpPlayerId,
    mvp_player_name: teamHistoryEntry.mvpPlayerName,
  } as any);

  // ============================================
  // STEP 2: PROCESS PLAYERS - ARCHIVE STATS, AGE, DEVELOP, CONTRACTS
  // ============================================

  const winterDevelopment: WinterDevelopmentResult[] = [];
  const contractExpirations: ContractExpirationResult[] = [];
  const departingFreeAgents: ContractExpirationResult[] = [];

  type PlayerWithStats = PlayerRow & {
    career_stats: SeasonStatsSummary[] | null;
    season_stats: Record<string, unknown> | null;
  };
  const rosterPlayers = (allPlayers || []) as PlayerWithStats[];

  for (const player of rosterPlayers) {
    const playerType = player.player_type as 'HITTER' | 'PITCHER';

    // Archive season stats to career stats
    const existingCareerStats = player.career_stats || [];
    const newCareerStats = archiveSeasonStats(
      player.season_stats,
      existingCareerStats,
      currentYear,
      tier,
      playerType
    );

    // Reset season stats
    const emptyStats = createEmptySeasonStats(playerType);

    // Age player
    const newAge = player.age + 1;

    // Winter development
    const workEthic = (player.hidden_traits as { workEthic?: WorkEthic } | null)?.workEthic || 'average';
    const development = calculateWinterDevelopment(
      newAge,
      player.current_rating,
      player.potential,
      workEthic
    );

    const newRating = applyRatingChange(player.current_rating, development.ratingChange);

    if (development.ratingChange !== 0) {
      winterDevelopment.push({
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        age: newAge,
        previousRating: player.current_rating,
        newRating,
        ratingChange: development.ratingChange,
        reason: development.reason,
      });
    }

    // Process contract
    const contractResult = processContractYear(player.contract_years || 1);

    contractExpirations.push({
      playerId: player.id,
      playerName: `${player.first_name} ${player.last_name}`,
      position: player.position,
      previousRating: player.current_rating,
      becameFreeAgent: contractResult.becameFreeAgent,
    });

    if (contractResult.becameFreeAgent) {
      departingFreeAgents.push({
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        position: player.position,
        previousRating: player.current_rating,
        becameFreeAgent: true,
      });
    }

    // Update player
    await supabase
      .from('players')
      // @ts-expect-error - Supabase types not inferred without database connection
      .update({
        age: newAge,
        current_rating: newRating,
        career_stats: newCareerStats,
        season_stats: emptyStats,
        contract_years: contractResult.newContractYears,
        is_on_roster: !contractResult.becameFreeAgent,
        is_free_agent: contractResult.becameFreeAgent,
        years_in_org: contractResult.becameFreeAgent ? 0 : (player.years_in_org || 0) + 1,
      })
      .eq('id', player.id);
  }

  // ============================================
  // STEP 3: GENERATE DRAFT ORDER
  // ============================================

  const draftOrder = generateDraftOrder(
    gameData.team_name,
    seasonData.wins,
    seasonData.losses,
    AI_TEAMS,
    newYear
  );

  // Insert draft order
  for (const entry of draftOrder) {
    await supabase.from('draft_orders').insert({
      game_id: gameId,
      year: newYear,
      pick_number: entry.pickNumber,
      team_id: entry.teamId,
      team_name: entry.teamName,
      previous_season_wins: entry.previousSeasonWins,
      previous_season_losses: entry.previousSeasonLosses,
      is_used: false,
    } as any);
  }

  const playerDraftPosition = getPlayerDraftPosition(draftOrder);

  // ============================================
  // STEP 4: CREATE NEW SEASON
  // ============================================

  // Create new season record
  await supabase.from('seasons').insert({
    game_id: gameId,
    year: newYear,
    tier: tier,
    wins: 0,
    losses: 0,
    games_played: 0,
    total_attendance: 0,
    total_revenue: 0,
    total_expenses: 0,
    is_complete: false,
  } as any);

  // Generate new draft class
  await supabase.from('drafts').insert({
    game_id: gameId,
    year: newYear,
    round: 1,
    pick_order: JSON.stringify(draftOrder.map(e => e.teamId)),
    current_pick: 1,
    is_complete: false,
  } as any);

  // Generate prospects for the new draft
  const draftClass = generateDraftClass({
    gameId,
    draftYear: newYear,
    totalPlayers: 800,
  });

  for (const prospect of draftClass) {
    await supabase.from('draft_prospects').insert({
      game_id: gameId,
      draft_year: newYear,
      first_name: prospect.firstName,
      last_name: prospect.lastName,
      age: prospect.age,
      position: prospect.position,
      player_type: prospect.playerType,
      current_rating: prospect.currentRating,
      potential: prospect.potential,
      hitter_attributes: prospect.hitterAttributes || null,
      pitcher_attributes: prospect.pitcherAttributes || null,
      hidden_traits: prospect.hiddenTraits || null,
      archetype: prospect.archetype,
      scouted_rating: null,
      scouted_potential: null,
      scout_accuracy: null,
      is_drafted: false,
    } as any);
  }

  // ============================================
  // STEP 5: UPDATE GAME STATE
  // ============================================

  await supabase
    .from('games')
    // @ts-expect-error - Supabase types not inferred without database connection
    .update({
      current_year: newYear,
      current_phase: 'draft',
    })
    .eq('id', gameId);

  // Create news event for new season
  await supabase.from('game_events').insert({
    game_id: gameId,
    year: newYear,
    type: 'milestone',
    title: `Year ${newYear} Begins!`,
    description: `The offseason is complete. Your team enters Year ${newYear} with ${rosterPlayers.length - departingFreeAgents.length} players on the roster. Draft position: #${playerDraftPosition}`,
    is_read: false,
  } as any);

  // Create events for departing free agents
  for (const fa of departingFreeAgents) {
    await supabase.from('game_events').insert({
      game_id: gameId,
      year: newYear,
      type: 'transaction',
      title: `${fa.playerName} Departs`,
      description: `${fa.playerName} (${fa.position}, ${fa.previousRating} OVR) has become a free agent after their contract expired.`,
      is_read: false,
    } as any);
  }

  revalidatePath(`/game/${gameId}`);

  return {
    success: true,
    newYear,
    offseasonSummary: {
      previousYear: currentYear,
      newYear,
      teamHistory: teamHistoryEntry,
      winterDevelopment,
      contractExpirations,
      departingFreeAgents,
      draftOrder,
      playerDraftPosition,
    },
  };
}

/**
 * Get team history for all seasons played
 */
export async function getTeamHistory(gameId: string): Promise<{
  success: boolean;
  history?: TeamHistoryEntry[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data: history, error } = await supabase
    .from('team_history')
    .select('*')
    .eq('game_id', gameId)
    .order('year', { ascending: true });

  if (error) {
    return { success: false, error: 'Failed to fetch team history' };
  }

  const entries: TeamHistoryEntry[] = (history || []).map(h => ({
    year: (h as any).year,
    tier: (h as any).tier,
    wins: (h as any).wins,
    losses: (h as any).losses,
    winPct: parseFloat((h as any).win_pct) || 0,
    leagueRank: (h as any).league_rank || 1,
    madePlayoffs: (h as any).made_playoffs || false,
    playoffResult: (h as any).playoff_result || 'Missed',
    totalRevenue: (h as any).total_revenue || 0,
    totalExpenses: (h as any).total_expenses || 0,
    netIncome: (h as any).net_income || 0,
    avgAttendance: (h as any).avg_attendance || 0,
    mvpPlayerId: (h as any).mvp_player_id,
    mvpPlayerName: (h as any).mvp_player_name,
  }));

  return { success: true, history: entries };
}

/**
 * Get player's career stats
 */
export async function getPlayerCareerStats(playerId: string): Promise<{
  success: boolean;
  careerStats?: SeasonStatsSummary[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data: player, error } = await supabase
    .from('players')
    .select('career_stats')
    .eq('id', playerId)
    .single();

  if (error || !player) {
    return { success: false, error: 'Player not found' };
  }

  const careerStats = ((player as any).career_stats as SeasonStatsSummary[]) || [];

  return { success: true, careerStats };
}
