// ============================================
// Database Types for Supabase
// Generated types that match the database schema
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string;
          user_id: string;
          city_name: string;
          team_name: string;
          difficulty: 'easy' | 'normal' | 'hard';
          current_year: number;
          current_phase: 'pre_season' | 'draft' | 'season' | 'post_season' | 'off_season';
          current_tier: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          status: 'active' | 'game_over' | 'promoted' | 'champion' | 'abandoned';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          city_name: string;
          team_name: string;
          difficulty?: 'easy' | 'normal' | 'hard';
          current_year?: number;
          current_phase?: 'pre_season' | 'draft' | 'season' | 'post_season' | 'off_season';
          current_tier?: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          status?: 'active' | 'game_over' | 'promoted' | 'champion' | 'abandoned';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          city_name?: string;
          team_name?: string;
          difficulty?: 'easy' | 'normal' | 'hard';
          current_year?: number;
          current_phase?: 'pre_season' | 'draft' | 'season' | 'post_season' | 'off_season';
          current_tier?: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          status?: 'active' | 'game_over' | 'promoted' | 'champion' | 'abandoned';
          created_at?: string;
          updated_at?: string;
        };
      };

      players: {
        Row: {
          id: string;
          game_id: string;
          first_name: string;
          last_name: string;
          age: number;
          position: string;
          player_type: 'HITTER' | 'PITCHER';
          current_rating: number;
          potential: number;
          hitter_attributes: Json | null;
          pitcher_attributes: Json | null;
          hidden_traits: Json;
          traits_revealed: boolean;
          tier: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          years_at_tier: number;
          confidence: number;
          morale: number;
          games_played: number;
          years_in_org: number;
          salary: number;
          contract_years: number;
          is_injured: boolean;
          injury_games_remaining: number;
          is_on_roster: boolean;
          roster_status: 'ACTIVE' | 'RESERVE';
          draft_year: number;
          draft_round: number;
          draft_pick: number;
          training_focus: string;
          current_xp: number;
          progression_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          first_name: string;
          last_name: string;
          age: number;
          position: string;
          player_type: 'HITTER' | 'PITCHER';
          current_rating: number;
          potential: number;
          hitter_attributes?: Json | null;
          pitcher_attributes?: Json | null;
          hidden_traits: Json;
          traits_revealed?: boolean;
          tier: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          years_at_tier?: number;
          confidence?: number;
          morale?: number;
          games_played?: number;
          years_in_org?: number;
          salary: number;
          contract_years: number;
          is_injured?: boolean;
          injury_games_remaining?: number;
          is_on_roster?: boolean;
          roster_status?: 'ACTIVE' | 'RESERVE';
          draft_year: number;
          draft_round: number;
          draft_pick: number;
          training_focus?: string;
          current_xp?: number;
          progression_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          first_name?: string;
          last_name?: string;
          age?: number;
          position?: string;
          player_type?: 'HITTER' | 'PITCHER';
          current_rating?: number;
          potential?: number;
          hitter_attributes?: Json | null;
          pitcher_attributes?: Json | null;
          hidden_traits?: Json;
          traits_revealed?: boolean;
          tier?: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          years_at_tier?: number;
          confidence?: number;
          morale?: number;
          games_played?: number;
          years_in_org?: number;
          salary?: number;
          contract_years?: number;
          is_injured?: boolean;
          injury_games_remaining?: number;
          is_on_roster?: boolean;
          roster_status?: 'ACTIVE' | 'RESERVE';
          draft_year?: number;
          draft_round?: number;
          draft_pick?: number;
          training_focus?: string;
          current_xp?: number;
          progression_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      current_franchise: {
        Row: {
          id: string;
          game_id: string;
          tier: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          budget: number;
          reserves: number;
          stadium_name: string;
          stadium_capacity: number;
          stadium_quality: number;
          hitting_coach_skill: number;
          hitting_coach_salary: number;
          pitching_coach_skill: number;
          pitching_coach_salary: number;
          development_coord_skill: number;
          development_coord_salary: number;
          ticket_price: number;
          facility_level: 0 | 1 | 2;
          consecutive_winning_seasons: number;
          consecutive_division_titles: number;
          total_promotions: number;
          last_promotion_year: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          tier?: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          budget?: number;
          reserves?: number;
          stadium_name: string;
          stadium_capacity?: number;
          stadium_quality?: number;
          hitting_coach_skill?: number;
          hitting_coach_salary?: number;
          pitching_coach_skill?: number;
          pitching_coach_salary?: number;
          development_coord_skill?: number;
          development_coord_salary?: number;
          ticket_price?: number;
          facility_level?: 0 | 1 | 2;
          consecutive_winning_seasons?: number;
          consecutive_division_titles?: number;
          total_promotions?: number;
          last_promotion_year?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          tier?: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          budget?: number;
          reserves?: number;
          stadium_name?: string;
          stadium_capacity?: number;
          stadium_quality?: number;
          hitting_coach_skill?: number;
          hitting_coach_salary?: number;
          pitching_coach_skill?: number;
          pitching_coach_salary?: number;
          development_coord_skill?: number;
          development_coord_salary?: number;
          ticket_price?: number;
          facility_level?: 0 | 1 | 2;
          consecutive_winning_seasons?: number;
          consecutive_division_titles?: number;
          total_promotions?: number;
          last_promotion_year?: number | null;
          updated_at?: string;
        };
      };

      promotion_history: {
        Row: {
          id: string;
          game_id: string;
          year: number;
          from_tier: string;
          to_tier: string;
          win_pct: number;
          reserves: number;
          city_pride: number;
          consecutive_winning_seasons: number;
          won_division: boolean;
          won_championship: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          year: number;
          from_tier: string;
          to_tier: string;
          win_pct: number;
          reserves: number;
          city_pride: number;
          consecutive_winning_seasons: number;
          won_division?: boolean;
          won_championship?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          year?: number;
          from_tier?: string;
          to_tier?: string;
          win_pct?: number;
          reserves?: number;
          city_pride?: number;
          consecutive_winning_seasons?: number;
          won_division?: boolean;
          won_championship?: boolean;
          created_at?: string;
        };
      };

      game_endings: {
        Row: {
          id: string;
          game_id: string;
          ending_type: string;
          year: number;
          tier: string;
          final_reserves: number;
          total_debt: number;
          final_city_pride: number;
          total_wins: number;
          total_losses: number;
          total_promotions: number;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          ending_type: string;
          year: number;
          tier: string;
          final_reserves: number;
          total_debt?: number;
          final_city_pride: number;
          total_wins?: number;
          total_losses?: number;
          total_promotions?: number;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          ending_type?: string;
          year?: number;
          tier?: string;
          final_reserves?: number;
          total_debt?: number;
          final_city_pride?: number;
          total_wins?: number;
          total_losses?: number;
          total_promotions?: number;
          reason?: string | null;
          created_at?: string;
        };
      };

      city_states: {
        Row: {
          id: string;
          game_id: string;
          population: number;
          median_income: number;
          unemployment_rate: number;
          team_pride: number;
          national_recognition: number;
          buildings: Json;
          occupancy_rate: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          population?: number;
          median_income?: number;
          unemployment_rate?: number;
          team_pride?: number;
          national_recognition?: number;
          buildings: Json;
          occupancy_rate?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          population?: number;
          median_income?: number;
          unemployment_rate?: number;
          team_pride?: number;
          national_recognition?: number;
          buildings?: Json;
          occupancy_rate?: number;
          updated_at?: string;
        };
      };

      drafts: {
        Row: {
          id: string;
          game_id: string;
          year: number;
          current_round: number;
          current_pick: number;
          is_complete: boolean;
          total_rounds: number;
          teams_count: number;
          players_per_round: number;
          player_draft_position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          year: number;
          current_round?: number;
          current_pick?: number;
          is_complete?: boolean;
          total_rounds?: number;
          teams_count?: number;
          players_per_round?: number;
          player_draft_position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          year?: number;
          current_round?: number;
          current_pick?: number;
          is_complete?: boolean;
          total_rounds?: number;
          teams_count?: number;
          players_per_round?: number;
          player_draft_position?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      draft_picks: {
        Row: {
          id: string;
          draft_id: string;
          game_id: string;
          round: number;
          pick_number: number;
          pick_in_round: number;
          team_id: string;
          player_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          draft_id: string;
          game_id: string;
          round: number;
          pick_number: number;
          pick_in_round: number;
          team_id: string;
          player_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          draft_id?: string;
          game_id?: string;
          round?: number;
          pick_number?: number;
          pick_in_round?: number;
          team_id?: string;
          player_id?: string;
          created_at?: string;
        };
      };

      draft_prospects: {
        Row: {
          id: string;
          game_id: string;
          draft_year: number;
          first_name: string;
          last_name: string;
          age: number;
          position: string;
          player_type: 'HITTER' | 'PITCHER';
          current_rating: number;
          potential: number;
          hitter_attributes: Json | null;
          pitcher_attributes: Json | null;
          hidden_traits: Json;
          scouted_rating: number | null;
          scouted_potential: number | null;
          scouting_accuracy: 'low' | 'medium' | 'high' | null;
          is_drafted: boolean;
          drafted_by_team: string | null;
          media_rank: number;
          archetype: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          draft_year: number;
          first_name: string;
          last_name: string;
          age: number;
          position: string;
          player_type: 'HITTER' | 'PITCHER';
          current_rating: number;
          potential: number;
          hitter_attributes?: Json | null;
          pitcher_attributes?: Json | null;
          hidden_traits: Json;
          scouted_rating?: number | null;
          scouted_potential?: number | null;
          scouting_accuracy?: 'low' | 'medium' | 'high' | null;
          is_drafted?: boolean;
          drafted_by_team?: string | null;
          media_rank: number;
          archetype: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          draft_year?: number;
          first_name?: string;
          last_name?: string;
          age?: number;
          position?: string;
          player_type?: 'HITTER' | 'PITCHER';
          current_rating?: number;
          potential?: number;
          hitter_attributes?: Json | null;
          pitcher_attributes?: Json | null;
          hidden_traits?: Json;
          scouted_rating?: number | null;
          scouted_potential?: number | null;
          scouting_accuracy?: 'low' | 'medium' | 'high' | null;
          is_drafted?: boolean;
          drafted_by_team?: string | null;
          media_rank?: number;
          archetype?: string;
          created_at?: string;
        };
      };

      scouting_reports: {
        Row: {
          id: string;
          game_id: string;
          prospect_id: string;
          scouted_rating: number;
          scouted_potential: number;
          accuracy: 'low' | 'medium' | 'high';
          rating_error: number;
          traits_revealed: boolean;
          revealed_traits: Json | null;
          cost: number;
          year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          prospect_id: string;
          scouted_rating: number;
          scouted_potential: number;
          accuracy: 'low' | 'medium' | 'high';
          rating_error: number;
          traits_revealed?: boolean;
          revealed_traits?: Json | null;
          cost: number;
          year: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          prospect_id?: string;
          scouted_rating?: number;
          scouted_potential?: number;
          accuracy?: 'low' | 'medium' | 'high';
          rating_error?: number;
          traits_revealed?: boolean;
          revealed_traits?: Json | null;
          cost?: number;
          year?: number;
          created_at?: string;
        };
      };

      seasons: {
        Row: {
          id: string;
          game_id: string;
          year: number;
          tier: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          wins: number;
          losses: number;
          win_pct: number;
          division_rank: number;
          league_rank: number;
          made_playoffs: boolean;
          won_division: boolean;
          won_championship: boolean;
          won_world_series: boolean;
          total_attendance: number;
          avg_attendance: number;
          games_played: number;
          home_games: number;
          away_games: number;
          total_games: number;
          is_complete: boolean;
          revenue_total: number;
          expense_total: number;
          net_income: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          year: number;
          tier: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          wins?: number;
          losses?: number;
          win_pct?: number;
          division_rank?: number;
          league_rank?: number;
          made_playoffs?: boolean;
          won_division?: boolean;
          won_championship?: boolean;
          won_world_series?: boolean;
          total_attendance?: number;
          avg_attendance?: number;
          games_played?: number;
          home_games?: number;
          away_games?: number;
          total_games?: number;
          is_complete?: boolean;
          revenue_total?: number;
          expense_total?: number;
          net_income?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          year?: number;
          tier?: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          wins?: number;
          losses?: number;
          win_pct?: number;
          division_rank?: number;
          league_rank?: number;
          made_playoffs?: boolean;
          won_division?: boolean;
          won_championship?: boolean;
          won_world_series?: boolean;
          total_attendance?: number;
          avg_attendance?: number;
          games_played?: number;
          home_games?: number;
          away_games?: number;
          total_games?: number;
          is_complete?: boolean;
          revenue_total?: number;
          expense_total?: number;
          net_income?: number;
          created_at?: string;
        };
      };

      finances: {
        Row: {
          id: string;
          game_id: string;
          year: number;
          ticket_revenue: number;
          concession_revenue: number;
          parking_revenue: number;
          merchandise_revenue: number;
          sponsorship_revenue: number;
          total_revenue: number;
          player_salaries: number;
          coaching_salaries: number;
          stadium_maintenance: number;
          travel_costs: number;
          marketing_costs: number;
          debt_service: number;
          total_expenses: number;
          net_income: number;
          ending_reserves: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          year: number;
          ticket_revenue: number;
          concession_revenue: number;
          parking_revenue: number;
          merchandise_revenue: number;
          sponsorship_revenue: number;
          total_revenue: number;
          player_salaries: number;
          coaching_salaries: number;
          stadium_maintenance: number;
          travel_costs: number;
          marketing_costs: number;
          debt_service: number;
          total_expenses: number;
          net_income: number;
          ending_reserves: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          year?: number;
          ticket_revenue?: number;
          concession_revenue?: number;
          parking_revenue?: number;
          merchandise_revenue?: number;
          sponsorship_revenue?: number;
          total_revenue?: number;
          player_salaries?: number;
          coaching_salaries?: number;
          stadium_maintenance?: number;
          travel_costs?: number;
          marketing_costs?: number;
          debt_service?: number;
          total_expenses?: number;
          net_income?: number;
          ending_reserves?: number;
          created_at?: string;
        };
      };

      game_events: {
        Row: {
          id: string;
          game_id: string;
          year: number;
          type: string;
          title: string;
          description: string;
          effects: Json | null;
          player_id: string | null;
          building_id: number | null;
          is_read: boolean;
          duration_years: number | null;
          expires_year: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          year: number;
          type: string;
          title: string;
          description: string;
          effects?: Json | null;
          player_id?: string | null;
          building_id?: number | null;
          is_read?: boolean;
          duration_years?: number | null;
          expires_year?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          year?: number;
          type?: string;
          title?: string;
          description?: string;
          effects?: Json | null;
          player_id?: string | null;
          building_id?: number | null;
          is_read?: boolean;
          duration_years?: number | null;
          expires_year?: number | null;
          created_at?: string;
        };
      };

      active_effects: {
        Row: {
          id: string;
          game_id: string;
          event_id: string | null;
          effect_type: string;
          modifier: number;
          start_year: number;
          end_year: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          event_id?: string | null;
          effect_type: string;
          modifier: number;
          start_year: number;
          end_year?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          event_id?: string | null;
          effect_type?: string;
          modifier?: number;
          start_year?: number;
          end_year?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
      };

      ai_teams: {
        Row: {
          id: string;
          name: string;
          city: string;
          abbreviation: string;
          philosophy: string;
          risk_tolerance: number;
          needs: Json;
          base_strength: number;
          variance_multiplier: number;
        };
        Insert: {
          id: string;
          name: string;
          city: string;
          abbreviation: string;
          philosophy: string;
          risk_tolerance: number;
          needs: Json;
          base_strength: number;
          variance_multiplier: number;
        };
        Update: {
          id?: string;
          name?: string;
          city?: string;
          abbreviation?: string;
          philosophy?: string;
          risk_tolerance?: number;
          needs?: Json;
          base_strength?: number;
          variance_multiplier?: number;
        };
      };

      news_stories: {
        Row: {
          id: string;
          game_id: string;
          date: string;
          headline: string;
          type: 'GAME_RESULT' | 'MILESTONE' | 'TRANSACTION' | 'CITY';
          priority: 'HIGH' | 'LOW';
          image_icon: string | null;
          year: number;
          game_number: number | null;
          player_id: string | null;
          player_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          date: string;
          headline: string;
          type: 'GAME_RESULT' | 'MILESTONE' | 'TRANSACTION' | 'CITY';
          priority: 'HIGH' | 'LOW';
          image_icon?: string | null;
          year: number;
          game_number?: number | null;
          player_id?: string | null;
          player_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          date?: string;
          headline?: string;
          type?: 'GAME_RESULT' | 'MILESTONE' | 'TRANSACTION' | 'CITY';
          priority?: 'HIGH' | 'LOW';
          image_icon?: string | null;
          year?: number;
          game_number?: number | null;
          player_id?: string | null;
          player_name?: string | null;
          created_at?: string;
        };
      };

      franchise_tiers: {
        Row: {
          tier: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          name: string;
          budget: number;
          stadium_capacity: number;
          player_age_min: number;
          player_age_max: number;
          rating_min: number;
          rating_max: number;
          scouting_budget: number;
          ticket_price_min: number;
          ticket_price_max: number;
          city_population: number;
          unemployment_rate: number;
          median_income: number;
          promotion_requirements: Json | null;
        };
        Insert: {
          tier: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          name: string;
          budget: number;
          stadium_capacity: number;
          player_age_min: number;
          player_age_max: number;
          rating_min: number;
          rating_max: number;
          scouting_budget: number;
          ticket_price_min: number;
          ticket_price_max: number;
          city_population: number;
          unemployment_rate: number;
          median_income: number;
          promotion_requirements?: Json | null;
        };
        Update: {
          tier?: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
          name?: string;
          budget?: number;
          stadium_capacity?: number;
          player_age_min?: number;
          player_age_max?: number;
          rating_min?: number;
          rating_max?: number;
          scouting_budget?: number;
          ticket_price_min?: number;
          ticket_price_max?: number;
          city_population?: number;
          unemployment_rate?: number;
          median_income?: number;
          promotion_requirements?: Json | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      difficulty_mode: 'easy' | 'normal' | 'hard';
      game_phase: 'pre_season' | 'draft' | 'season' | 'post_season' | 'off_season';
      tier_type: 'LOW_A' | 'HIGH_A' | 'DOUBLE_A' | 'TRIPLE_A' | 'MLB';
      player_type: 'HITTER' | 'PITCHER';
      scouting_tier: 'low' | 'medium' | 'high';
    };
  };
}

// Helper type for Supabase client
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
