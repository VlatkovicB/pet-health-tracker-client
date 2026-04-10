# Pet Health Tracker

Web app for tracking pet health records across a shared group of users.

## Stack

- **Framework:** React + TypeScript (Vite)
- **UI:** MUI v6 (dark navy theme)
- **Data fetching:** TanStack React Query (infinite scroll on all lists)
- **HTTP:** axios with JWT interceptor
- **Routing:** react-router-dom

## Features

- **Auth** — login / register with JWT stored in localStorage
- **Groups** — view groups you belong to; create new groups
- **Pets** — list pets per group; create pets; edit name/species/breed/birth date; upload profile photo
- **Vets** — group-scoped vet directory with contact details and maps link
- **Vet visits** — list, add, edit (with confirmation prompt), attach photos; next-visit scheduling
- **Medications** — placeholder (coming soon)
- **Infinite scroll** — all lists preload the next page 400px before the sentinel

## Pages

| Route | Page |
|---|---|
| `/login` | Login |
| `/register` | Register |
| `/` | Groups list |
| `/groups/:groupId` | Pets list |
| `/groups/:groupId/pets/:petId` | Pet detail (vet visits, medications) |
| `/groups/:groupId/vets` | Vet directory |

## Setup

```bash
pnpm install
cp .env.example .env   # set VITE_API_URL and VITE_SERVER_URL
pnpm dev
```

Expects the API running at `VITE_API_URL` (default `http://localhost:3000/api/v1`).
