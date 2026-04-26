# Pet Health Tracker

Web app for tracking pet health records across a shared group of users.

## Stack

- **Framework:** React + TypeScript (Vite)
- **UI:** MUI v6 (dark navy theme, light/dark toggle)
- **Data fetching:** TanStack React Query (infinite scroll on all lists)
- **HTTP:** axios with JWT interceptor
- **Routing:** react-router-dom

## Features

- **Auth** — login / register with JWT stored in localStorage
- **Pets** — list pets; create, edit (name/species/breed/birth date); upload profile photo; share pets with other users with configurable permissions; transfer ownership via email invite
- **Vets** — group-scoped vet directory with contact details, maps link, and Google Places search
- **Vet visits** — list, add, edit with photo attachments; next-visit reminders; mark visits complete
- **Medications** — log medications with dosage; configure daily/weekly/monthly reminders with exact times
- **Notes** — multi-pet journal with image attachments
- **Calendar** — month view of upcoming vet visits across all pets, with per-pet filtering
- **Profile** — display name and theme preference
- **Inbox** — accept/decline incoming pet share invitations and ownership transfers
- **Infinite scroll** — all lists preload the next page 400px before the sentinel

## Pages

| Route | Page |
|---|---|
| `/login` | Login |
| `/register` | Register |
| `/` | Calendar (month view) |
| `/pets` | Pets list |
| `/pets/:petId` | Pet detail (vet visits, medications, notes, sharing) |
| `/vets` | Vet directory |
| `/profile` | User profile & theme toggle |

## Setup

```bash
pnpm install
cp .env.example .env   # set VITE_API_URL and VITE_SERVER_URL
pnpm dev
```

Expects the API running at `VITE_API_URL` (default `http://localhost:3000/api/v1`).
