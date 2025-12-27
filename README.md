# Baseball GM Simulator v1.0.0

> **You don't just build a team—you rebuild a city.**

A deep baseball management simulation where your decisions as GM ripple through an entire community. Start in Low-A ball with a struggling franchise in a forgotten town, and work your way up to MLB while transforming the city around you.

## The Hook: The Virtuous Cycle

Your success creates a self-reinforcing loop:

```
    ┌─────────────────────────────────────────────────┐
    │                                                 │
    ▼                                                 │
 WINNING ──► CITY GROWTH ──► BIGGER BUDGET ──► BETTER PLAYERS
    │           │                                     │
    │           ├── New businesses open               │
    │           ├── Population increases              │
    │           ├── Team pride rises                  │
    │           └── Stadium fills up                  │
    │                                                 │
    └─────────────────────────────────────────────────┘
```

Win games → Businesses open around the stadium → City pride grows → Attendance increases → Revenue rises → You can afford better players → You win more games.

## v1.0.0 Features

### Complete Game Loop
Play through an entire multi-year career with all core systems:
- **Draft** → **Season** → **Playoffs** → **Offseason** → Repeat

### Five-Tier Progression System
- **Low-A** → **High-A** → **Double-A** → **Triple-A** → **MLB**
- Each tier unlocks larger stadiums, bigger budgets, and tougher competition
- Promotion requires: Win% > .550, positive reserves, city pride > 60%
- Bankruptcy occurs if reserves drop below -$2,000,000

### Two-Tier Roster System
- **Active Roster (25-Man)**: Your main squad for games
- **Farm System / Reserves**: Develop prospects for the future
- Upgrade facilities to expand reserve capacity:
  - **Basic Dugout** (Level 0): 5 reserve slots
  - **Minor League Complex** (Level 1): 20 reserve slots ($150K)
  - **Player Development Lab** (Level 2): 40 reserve slots ($500K)

### Deep Player Development
- 20-80 rating scale for all attributes
- **Gaussian distribution** for realistic talent scarcity (Box-Muller transform)
- Hidden traits (work ethic, injury proneness, personality) discovered through scouting
- Annual growth based on coaching quality, playing time, and tier appropriateness
- Player archetypes: Slugger, Speedster, Contact King, Flamethrower, and more

### 40-Round Annual Draft with War Room
- 800 prospects per draft class with realistic talent distribution
- **Smart Draft Features**:
  - Media consensus rankings with realistic variance
  - Position filters (P, C, IF, OF)
  - Scouted-only toggle
  - Sortable columns
  - Watchlist/favorites with star toggle
- Three scouting tiers reveal increasingly accurate ratings
- 19 AI teams with distinct draft philosophies compete for talent

### Full Season Simulation with Box Scores
- **Batch game simulation** with real-time progress tracking
- **Detailed box scores** for every game:
  - Line scores (runs by inning)
  - Complete batting statistics (AB, R, H, 2B, 3B, HR, RBI, BB, SO, AVG)
  - Pitching statistics (IP, H, R, ER, BB, SO, ERA)
  - Game decisions (W, L, SV)
- **Game log** with full season history
- Click any game to view the complete box score

### Player Training System
- Train players during the season to boost specific attributes
- Training focus options: Contact, Power, Speed, Fielding, Arm Strength
- Pitchers can focus on: Velocity, Control, Movement, Stamina
- Training effects accumulate over the season
- Work ethic influences training effectiveness

### Playoff System
- **4-team playoff bracket** (top teams by record)
- **Best-of-7 semifinal series**
- **Best-of-7 championship finals**
- Interactive **playoff bracket visualization**
- Simulate one game at a time or advance through series
- Championship celebration for winners

### Offseason Rollover System
- **Season Review**: Complete summary of your season
  - Final record and win percentage
  - League ranking and playoff result
  - Financial summary (revenue, expenses, net income)
  - Team MVP and top performers
  - Expiring contracts warning
- **Winter Development**: Age-based player progression
  - Young players (18-24): Potential growth (+1 to +3)
  - Prime years (25-29): Maintain peak or slight growth
  - Decline phase (30+): Gradual decline based on age
- **Contract Processing**: Automatic free agent departures
- **Draft Order**: Inverse standings (worst team picks first)
- Seamless transition to Year 2, 3, 4... and beyond!

### Contract & Free Agency System
- **Salary calculations** based on rating and tier
- **Multi-year contracts** with varying lengths
- **Contract negotiations** with player acceptance probability
- **Free agent market** for off-roster players
- **Payroll management** with budget constraints
- **Expiring contract warnings** before offseason

### Narrative Event Engine
- Dynamic events based on team performance and city state
- Event types: Economic, Team, City, and Story events
- Events with lasting effects on gameplay
- Toast notifications for real-time event updates
- Recent events display in dashboard sidebar

### Dynamic City Visualization
- 50 buildings that evolve based on team success
- Buildings progress: Vacant → Renovating → Open → Expanded → Landmark
- Watch your struggling town transform into a thriving baseball city
- District bonuses affect team performance and revenue

### Realistic Financial Simulation
- Revenue streams: tickets, concessions, parking, merchandise, sponsorships
- Expenses: player salaries, coaching staff, stadium maintenance, travel
- Budget grows with tier progression and city development
- Facility upgrades for expanded roster capacity

### League Standings & Leaders
- **Real-time standings** showing all teams in your league
- **Statistical leaders** for batting and pitching categories
- Track your team's position throughout the season

### Win/Loss Conditions
- **Promotion**: Meet requirements and level up to the next tier
- **Championship**: Win the playoffs to become champion
- **Bankruptcy (Game Over)**: Reserves below -$2M ends your career
- Post-game summary with career statistics

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router and Server Actions |
| **React 19** | Latest React with concurrent features |
| **TypeScript** | Type-safe development |
| **Tailwind CSS 4** | Utility-first styling |
| **Supabase** | PostgreSQL database with Row Level Security |
| **Radix UI** | Accessible component primitives |
| **Sonner** | Toast notifications |
| **Lucide React** | Beautiful icons |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/baseball-gm-simulator.git
   cd baseball-gm-simulator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**

   Create a new project at [supabase.com](https://supabase.com) and get your credentials.

4. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Run database migrations**

   In the Supabase dashboard SQL Editor, run the migrations in order:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_smart_draft_features.sql
   supabase/migrations/003_narrative_events.sql
   supabase/migrations/004_game_progression.sql
   supabase/migrations/005_roster_tiers.sql
   supabase/migrations/005_game_results.sql
   supabase/migrations/006_player_training.sql
   supabase/migrations/007_playoffs.sql
   supabase/migrations/008_offseason_rollover.sql
   ```

   Or via Supabase CLI:
   ```bash
   npx supabase init
   npx supabase link --project-ref your-project-ref
   npx supabase db push
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open the app**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
baseball-gm-simulator/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Landing page (new/load/delete game)
│   │   ├── layout.tsx                # Root layout with Toaster
│   │   └── game/
│   │       └── [gameId]/
│   │           └── page.tsx          # Main game dashboard
│   │
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameDashboard.tsx     # Main game container
│   │   │   ├── GameOver.tsx          # Bankruptcy/fired screen
│   │   │   ├── PromotionModal.tsx    # Tier promotion modal
│   │   │   ├── FacilitiesUpgrade.tsx # Facility upgrade card
│   │   │   │
│   │   │   ├── city/                 # City building system
│   │   │   │   ├── CityMap.tsx       # City grid visualization
│   │   │   │   ├── BuildMenu.tsx     # Building construction
│   │   │   │   └── DistrictBonusPanel.tsx
│   │   │   │
│   │   │   ├── dashboard/            # Dashboard widgets
│   │   │   │   ├── RecentEvents.tsx  # Narrative events display
│   │   │   │   ├── NewsFeed.tsx      # Dynamic news headlines
│   │   │   │   ├── TeamStandings.tsx # League standings
│   │   │   │   └── LeagueLeaders.tsx # Statistical leaders
│   │   │   │
│   │   │   ├── draft/                # Draft system
│   │   │   │   └── DraftCompleteModal.tsx
│   │   │   │
│   │   │   ├── roster/               # Roster management
│   │   │   │   ├── ContractManagement.tsx
│   │   │   │   ├── FreeAgentMarket.tsx
│   │   │   │   ├── PlayerTraining.tsx
│   │   │   │   └── TrainingSummary.tsx
│   │   │   │
│   │   │   ├── season/               # Season & playoffs
│   │   │   │   ├── BoxScoreModal.tsx # Detailed game box scores
│   │   │   │   ├── GameLog.tsx       # Season game history
│   │   │   │   ├── PlayoffBracket.tsx # Playoff visualization
│   │   │   │   └── SeasonReview.tsx  # End-of-season summary
│   │   │   │
│   │   │   └── tabs/                 # Main navigation tabs
│   │   │       ├── OverviewTab.tsx   # Game overview & phase actions
│   │   │       ├── RosterTab.tsx     # Two-tier roster management
│   │   │       ├── DraftTab.tsx      # Draft with War Room toolbar
│   │   │       ├── DraftNeeds.tsx    # Roster composition targets
│   │   │       ├── SeasonTab.tsx     # Season simulation & playoffs
│   │   │       ├── CityTab.tsx       # City building visualization
│   │   │       ├── FinancesTab.tsx   # Revenue, expenses, facilities
│   │   │       └── HistoryTab.tsx    # Season records & events
│   │   │
│   │   └── ui/                       # Reusable UI components (shadcn/ui)
│   │
│   └── lib/
│       ├── actions/
│       │   └── game.ts               # Server actions (CRUD, simulation, roster)
│       │
│       ├── simulation/               # Core game engine
│       │   ├── index.ts              # Main exports
│       │   ├── math-engine.ts        # Pythagorean expectation, Log5
│       │   ├── player-development.ts # Growth formulas
│       │   ├── season.ts             # Season simulation
│       │   ├── box-score.ts          # Detailed game simulation
│       │   ├── playoffs.ts           # Playoff bracket & series
│       │   ├── offseason.ts          # Offseason rollover system
│       │   ├── training.ts           # Player training system
│       │   ├── contracts.ts          # Contract & free agency
│       │   ├── financial.ts          # Revenue/expense calculations
│       │   ├── city-growth.ts        # Building upgrades
│       │   ├── draft.ts              # Draft with Gaussian distribution
│       │   ├── headline-generator.ts # Dynamic news generation
│       │   ├── events.ts             # Narrative event engine
│       │   └── progression.ts        # Promotion/bankruptcy logic
│       │
│       ├── supabase/                 # Database clients
│       │   ├── client.ts             # Browser client
│       │   ├── server.ts             # Server client
│       │   └── middleware.ts         # Auth middleware
│       │
│       ├── types/
│       │   ├── index.ts              # Game types, facility configs, AI teams
│       │   └── database.ts           # Supabase schema types
│       │
│       └── utils/
│           ├── format.ts             # Currency, number formatting
│           └── random.ts             # Random number utilities
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql    # Core database schema
│       ├── 002_smart_draft_features.sql # Draft system tables
│       ├── 003_narrative_events.sql  # Events and effects tables
│       ├── 004_game_progression.sql  # Promotion history, game status
│       ├── 005_roster_tiers.sql      # Roster status, facilities
│       ├── 005_game_results.sql      # Game results & box scores
│       ├── 006_player_training.sql   # Training system tables
│       ├── 007_playoffs.sql          # Playoff brackets & series
│       └── 008_offseason_rollover.sql # Career stats, team history
│
├── public/                           # Static assets
├── .env.local.example                # Environment template
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## Game Mechanics

### Rating System (20-80 Scale)

| Rating | Grade | Description |
|--------|-------|-------------|
| 20-30  | Poor  | Below replacement level |
| 35-45  | Below Average | Fringe player |
| 50     | Average | MLB average |
| 55-65  | Above Average | Solid starter |
| 70-80  | Elite | All-Star / MVP caliber |

### Gaussian Talent Distribution

Player ratings follow a normal distribution (Box-Muller transform):
- Mean: 50, Standard Deviation: 15
- Most players cluster around average
- Elite talents (70+) are rare
- Creates realistic draft classes with talent scarcity

### Two-Tier Roster System

| Roster | Capacity | Purpose |
|--------|----------|---------|
| Active | 25 (fixed) | Game-day roster |
| Reserve | 5-40 (upgradeable) | Development & depth |

**Facility Upgrades:**
| Level | Name | Reserve Slots | Cost |
|-------|------|---------------|------|
| 0 | Basic Dugout | 5 | - |
| 1 | Minor League Complex | 20 | $150,000 |
| 2 | Player Development Lab | 40 | $500,000 |

### Tier Progression

| Tier | Budget | Stadium | Games | Player Ratings |
|------|--------|---------|-------|----------------|
| Low-A | $500K | 2,500 | 132 | 30-55 |
| High-A | $2M | 5,000 | 132 | 40-65 |
| Double-A | $8M | 10,000 | 138 | 50-72 |
| Triple-A | $25M | 18,000 | 144 | 60-80 |
| MLB | $150M | 42,000 | 162 | 70-85 |

### Winter Development (Offseason)

| Age Range | Effect | Description |
|-----------|--------|-------------|
| 18-21 | +1 to +3 | Young prospect high growth |
| 22-24 | +1 to +2 | Continued development |
| 25-29 | 0 to +1 | Prime years maintenance |
| 30-33 | 0 to -1 | Early aging effects |
| 34-36 | 0 to -2 | Decline phase |
| 37+ | -1 to -3 | Late career decline |

### Promotion Requirements

- Win percentage > 55%
- Positive reserves (balance > $0)
- City pride > 60%

### Bankruptcy Threshold

- Reserves below -$2,000,000 triggers game over
- Debt warnings at -$500K and -$1M

### Building States

| State | Name | Description |
|-------|------|-------------|
| 0 | Vacant | Empty lot, boarded up |
| 1 | Renovating | Construction in progress |
| 2 | Open | Business is operational |
| 3 | Expanded | Thriving, expanded operations |
| 4 | Landmark | Historic status, community icon |

## Development

```bash
# Run development server
npm run dev

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Build for production
npm run build
```

## Deploy on Vercel

The easiest way to deploy is via [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add your Supabase environment variables
4. Deploy

## Key Files Reference

| File | Description |
|------|-------------|
| `src/lib/types/index.ts` | All TypeScript types, facility configs, AI teams |
| `src/lib/types/database.ts` | Supabase database schema types |
| `src/lib/actions/game.ts` | Server actions for all game operations |
| `src/lib/simulation/math-engine.ts` | Pythagorean expectation, Log5 probability |
| `src/lib/simulation/player-development.ts` | Player growth calculations |
| `src/lib/simulation/box-score.ts` | Detailed game simulation |
| `src/lib/simulation/playoffs.ts` | Playoff bracket and series |
| `src/lib/simulation/offseason.ts` | Winter development, draft order |
| `src/lib/simulation/training.ts` | Player training system |
| `src/lib/simulation/contracts.ts` | Contract and free agency |
| `src/lib/simulation/season.ts` | Season simulation engine |
| `src/lib/simulation/financial.ts` | Financial calculations |
| `src/lib/simulation/city-growth.ts` | City evolution system |
| `src/lib/simulation/draft.ts` | Draft with Gaussian distribution |
| `src/lib/simulation/headline-generator.ts` | Dynamic news system |
| `src/lib/simulation/events.ts` | Narrative event engine |
| `src/lib/simulation/progression.ts` | Promotion and bankruptcy logic |

## What's New in v1.0.0

- **Complete Game Loop**: Full Draft → Season → Playoffs → Offseason cycle
- **Box Score System**: Detailed game simulation with batting/pitching stats
- **Game Log**: View any game's box score from the season
- **Playoff System**: 4-team bracket with best-of-7 series
- **Player Training**: Develop players during the season
- **Offseason Rollover**: Winter development, contract processing, draft order
- **Season Review UI**: Comprehensive end-of-season summary
- **Contract Management**: Full contract and free agency system
- **League Standings**: Real-time standings and statistical leaders
- **Updated Tech Stack**: Next.js 16, React 19, Tailwind CSS 4

## Roadmap

- [ ] **v1.1**: Tutorial and onboarding experience
- [ ] **v1.2**: Achievement system and milestones
- [ ] **v1.3**: Trade system between teams
- [ ] **v1.4**: Enhanced scouting with scout hiring
- [ ] **v1.5**: Mobile-responsive design improvements
- [ ] **v2.0**: Multiplayer leagues

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by classic baseball management games like OOTP and Baseball Mogul
- Built with the excellent [shadcn/ui](https://ui.shadcn.com/) component library
- Powered by [Supabase](https://supabase.com/) for backend infrastructure

---

*Start in a forgotten town. Build a dynasty. Transform a city.*
