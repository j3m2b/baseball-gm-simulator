# Baseball GM Simulator

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

## Features

### Five-Tier Progression System
- **Low-A** → **High-A** → **Double-A** → **Triple-A** → **MLB**
- Each tier unlocks larger stadiums, bigger budgets, and tougher competition
- Promotion requires sustained success: winning records, playoff appearances, and city development

### Deep Player Development
- 20-80 rating scale for all attributes
- Hidden traits (work ethic, injury proneness, personality) discovered through scouting
- Annual growth based on coaching quality, playing time, and tier appropriateness
- The "promotion dilemma": promote too early and stunt development, too late and lose morale

### 40-Round Annual Draft
- 800 prospects per draft class with realistic talent distribution
- Three scouting tiers reveal increasingly accurate ratings
- 19 AI teams with distinct draft philosophies compete for talent
- Strategic decisions: best available vs. positional need

### Dynamic City Visualization
- 50 buildings that evolve based on team success
- Buildings progress: Vacant → Renovating → Open → Expanded → Landmark
- Watch your struggling town transform into a thriving baseball city

### Realistic Financial Simulation
- Revenue streams: tickets, concessions, parking, merchandise, sponsorships
- Expenses: player salaries, coaching staff, stadium maintenance, travel
- Budget grows with tier progression and city development
- Bankruptcy risk if reserves go negative

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router and Server Actions |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **Supabase** | PostgreSQL database with Row Level Security |
| **Radix UI** | Accessible component primitives |

## Development Roadmap

- [x] **Phase 1: Core Simulation Engine**
  - Player development formulas
  - Season simulation
  - Financial calculations
  - City growth mechanics

- [x] **Phase 2: Core UI**
  - Landing page with new/load game
  - Game dashboard with navigation
  - Roster management interface
  - 40-round draft system with AI teams

- [x] **Phase 3: City Visualization & Game Loop**
  - Season simulation with batch processing
  - City building grid visualization
  - Financial projections and history
  - Season records and draft history

- [ ] **Phase 4: Narrative Events & Polish**
  - Random events (injuries, media moments, city milestones)
  - Tier promotion ceremonies
  - Advanced AI decision-making
  - Coaching hiring/firing

- [ ] **Phase 5: Launch**
  - Tutorial and onboarding
  - Achievement system
  - Performance optimization
  - Mobile responsiveness

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

   In the Supabase dashboard SQL Editor, run the contents of:
   ```
   supabase/migrations/001_initial_schema.sql
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
│   │   ├── page.tsx                  # Landing page (new/load game)
│   │   ├── layout.tsx                # Root layout
│   │   └── game/
│   │       └── [gameId]/
│   │           └── page.tsx          # Main game dashboard
│   │
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameDashboard.tsx     # Main game container
│   │   │   └── tabs/
│   │   │       ├── OverviewTab.tsx   # Game overview & phase actions
│   │   │       ├── RosterTab.tsx     # Player roster management
│   │   │       ├── DraftTab.tsx      # 40-round draft interface
│   │   │       ├── SeasonTab.tsx     # Season simulation
│   │   │       ├── CityTab.tsx       # City building visualization
│   │   │       ├── FinancesTab.tsx   # Revenue & expenses
│   │   │       └── HistoryTab.tsx    # Season records & events
│   │   │
│   │   └── ui/                       # Reusable UI components (shadcn/ui)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── table.tsx
│   │       └── ...
│   │
│   └── lib/
│       ├── actions/
│       │   └── game.ts               # Server actions (CRUD, simulation)
│       │
│       ├── simulation/               # Core game engine
│       │   ├── player-development.ts # Growth formulas
│       │   ├── season.ts             # Game simulation
│       │   ├── financial.ts          # Revenue/expense calculations
│       │   ├── city-growth.ts        # Building upgrades
│       │   └── draft.ts              # Draft class generation
│       │
│       ├── supabase/                 # Database clients
│       │   ├── client.ts             # Browser client
│       │   ├── server.ts             # Server client
│       │   └── middleware.ts         # Auth middleware
│       │
│       ├── types/
│       │   ├── index.ts              # Game types & constants
│       │   └── database.ts           # Supabase schema types
│       │
│       └── utils/
│           ├── format.ts             # Currency, number formatting
│           └── random.ts             # Seeded random utilities
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Database schema
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

### Annual Player Growth Formula

```
Growth = Base Growth × Age Modifier
       + Coaching Quality (±3)
       + Playing Time (±1.5)
       + Tier Appropriateness (±2)
       + Work Ethic (±2)
       + Injury Impact (-3)
       ± Random Variance (20%)

Clamped to: -5 to +5 per year
```

### Tier Progression

| Tier | Budget | Stadium | Games | Player Ratings |
|------|--------|---------|-------|----------------|
| Low-A | $500K | 2,500 | 132 | 30-55 |
| High-A | $2M | 5,000 | 132 | 40-65 |
| Double-A | $8M | 10,000 | 138 | 50-72 |
| Triple-A | $25M | 18,000 | 144 | 60-80 |
| MLB | $150M | 42,000 | 162 | 70-85 |

### Building States

| State | Name | Description |
|-------|------|-------------|
| 0 | Vacant | Empty lot, boarded up |
| 1 | Renovating | Construction in progress |
| 2 | Open | Business is operational |
| 3 | Expanded | Thriving, expanded operations |
| 4 | Landmark | Historic status, community icon |

### City Growth Formula

```
Success Score = (Win% - 0.5) × 100
              + (Attendance / Capacity) × 30
              + (Made Playoffs ? 20 : 0)

Buildings to Upgrade = floor(Success Score / 20)
```

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
| `src/lib/types/index.ts` | All TypeScript types, tier configs, AI teams |
| `src/lib/types/database.ts` | Supabase database schema types |
| `src/lib/actions/game.ts` | Server actions for all game operations |
| `src/lib/simulation/player-development.ts` | Player growth calculations |
| `src/lib/simulation/season.ts` | Season simulation engine |
| `src/lib/simulation/financial.ts` | Financial calculations |
| `src/lib/simulation/city-growth.ts` | City evolution system |
| `src/lib/simulation/draft.ts` | Draft and scouting system |

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
