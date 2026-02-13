🧠 Smart Helper — Auto-Assignment House Help System

A production-style web application that automatically assigns the nearest available helper when a user books a house-help service.
Built for a 15-minute service promise using realtime location, skill matching, and automated reassignment logic.

🚀 Project Overview

Smart Helper solves the problem of slow manual booking by instantly matching users with the best available helper based on:

📍 Live GPS location

🛠 Skill matching

⭐ Helper rating

✅ Availability status

If a helper rejects or doesn’t respond, the system automatically assigns another nearby helper within seconds.

🧩 Core Features
👤 User

Book house services (cleaning, plumbing, electrician, cooking, etc.)

Real-time booking status tracking

Live helper assignment updates

Automatic reassignment if helper declines

🧑‍🔧 Helper

Toggle availability (Available / Busy / Offline)

Receive assignment offers in realtime

Accept / Reject jobs

Update live location

🛠 Admin

Monitor helpers and bookings

View assignment attempts

Track system metrics (assignment time, rejection rate)

⚙️ Tech Stack

Frontend

Next.js (App Router)

TypeScript

Tailwind CSS

Backend

Supabase Auth

Supabase Postgres + PostGIS

Supabase Edge Functions

Supabase Realtime

Core Concepts

Geospatial queries (distance-based helper selection)

Row Level Security (RLS)

Event-driven assignment pipeline

🏗 System Architecture
User Books Service
        ↓
createBooking()
        ↓
runAssignmentPipeline()
        ↓
Find nearest helper (Skill + Availability + Distance + Rating)
        ↓
Offer sent → Helper Accepts / Rejects / Timeout
        ↓
Auto Reassign if needed

🗄 Database Tables

profiles

helper_profiles

bookings

assignment_attempts

helper_blocks

Includes:

PostGIS geography fields for GPS distance calculation

Status tracking for helpers and bookings

Attempt history for auto-assignment logic

🔐 Security

Row Level Security policies enforce:

Users can only access their own bookings

Helpers only see assignments sent to them

Admin has global visibility

Edge functions use service role safely

⚡ Edge Functions
createBooking

Creates a booking and triggers assignment pipeline.

runAssignmentPipeline

Filters helpers by skill & availability

Sorts by nearest distance + highest rating

Sends assignment offer

Handles reject/timeout logic

respondToOffer

Helper accepts or rejects an assignment.

updateHelperLocation

Updates live helper GPS coordinates.

🧪 Realtime Events

Booking updates pushed instantly to users

Assignment offers pushed to helpers

Admin dashboard updates live

🧱 Project Structure
smart-helper/
│
├── app/
│   ├── user/
│   ├── helper/
│   ├── admin/
│   └── auth/
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│
├── components/
├── lib/
└── styles/

🛠 Local Setup
1️⃣ Clone Repo
git clone <your-repo-url>
cd smart-helper

2️⃣ Install Dependencies
npm install

3️⃣ Environment Variables

Create .env.local

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

4️⃣ Run Development Server
npm run dev


App runs at:

http://localhost:3000

📡 Supabase Setup

Create project in Supabase

Enable PostGIS extension

Run database migrations

Deploy Edge Functions

🧪 Testing Checklist

✅ Booking auto-assigns nearest helper

✅ Reject triggers reassignment

✅ Timeout auto-retries

✅ Helper status updates to Busy on accept

✅ “No helper available” state works

🎯 Demo Accounts
User:
demo_user@test.com

Helper:
demo_helper@test.com


(Replace with seeded credentials)

📈 Future Improvements

ETA prediction using Maps API

Payment integration

Push notifications

AI-based helper recommendation scoring

📄 License

MIT License