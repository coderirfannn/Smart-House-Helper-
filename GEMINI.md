# GEMINI.md - Project Context: Smart Helper

## Project Overview
**Smart Helper** is a real-time, automated house-help assignment system designed for a "15-minute service promise." It matches users with the nearest available helpers using geospatial queries and automated reassignment logic.

### Core Technologies
- **Frontend**: React 18 (Vite SPA), TypeScript, Tailwind CSS, Shadcn UI.
- **Routing & State**: `react-router-dom`, TanStack Query (`@tanstack/react-query`).
- **Backend**: Supabase (PostgreSQL + PostGIS, Auth, Edge Functions, Realtime).
- **Utilities**: `lucide-react` (icons), `date-fns`, `framer-motion`, `sonner` (toasts).

### System Architecture
1. **User Side**: Users book services (e.g., cleaning, plumbing) with their location.
2. **Assignment Engine**: A Supabase Edge Function (`create-booking`) triggers a PostGIS RPC function (`find_available_helpers`) to find the nearest helper based on skill, rating, and availability.
3. **Real-time Pipeline**: 
   - Offers are sent to helpers via Supabase Realtime.
   - Helpers have 30 seconds to accept/reject.
   - Timeouts or rejections trigger automatic reassignment to the next best helper.
4. **Helper Tracking**: Helpers update their live GPS coordinates, which are stored as `geography(Point, 4326)` in the database.

---

## Building and Running

### Prerequisites
- Node.js (Latest LTS recommended)
- Supabase CLI (for local development/edge functions)

### Key Commands
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the production-ready application.
- `npm run lint`: Runs ESLint to check for code quality.
- `npm run test`: Executes the test suite using Vitest.
- `npm run test:watch`: Runs tests in watch mode.

---

## Development Conventions

### Code Structure
- `/src/components/ui`: Shadcn UI components (managed via CLI).
- `/src/components/booking`: Specialized booking components (Timeline, Form, etc.).
- `/src/contexts`: Context providers (e.g., `AuthContext`).
- `/src/hooks`: Custom hooks for realtime subscriptions (`useRealtimeBooking`, `useRealtimeOffers`).
- `/src/integrations/supabase`: Supabase client and auto-generated types.
- `/supabase/migrations`: Versioned SQL migrations for schema and RLS policies.
- `/supabase/functions`: Deno-based Edge Functions for server-side logic.

### Database Patterns
- **PostGIS**: Used for all location-based logic (`ST_Distance`, `ST_DWithin`).
- **RLS (Row Level Security)**: Strictly enforced. Helpers only see their offers; users only see their bookings; admins have global visibility.
- **Triggers**: Automated `updated_at` timestamps and role-change prevention.

### Testing
- **Vitest**: Used for unit and integration testing.
- **Setup**: Configured in `src/test/setup.ts`.

---

## Key Files
- `supabase/migrations/`: Contains the database schema including PostGIS setup and RLS policies.
- `supabase/functions/create-booking/index.ts`: The entry point for the assignment pipeline.
- `src/contexts/AuthContext.tsx`: Manages authentication state and user profiles.
- `src/hooks/useRealtimeBooking.ts`: Handles live updates for users following their booking status.
- `src/pages/Index.tsx`: Main landing page and service selection.
