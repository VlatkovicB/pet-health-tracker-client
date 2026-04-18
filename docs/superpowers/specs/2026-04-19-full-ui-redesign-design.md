# Full UI Redesign — Design Spec

**Date:** 2026-04-19  
**Status:** Approved  
**Scope:** Visual redesign of entire pet-health-tracker-client — theme, layout, all pages, all components. No changes to data-fetching, API, or business logic.

---

## 1. Design Direction

**Style:** Playful & Vibrant  
**Personality:** Friendly consumer wellness app — rounded, warm, energetic but not childish.  
**Reference mood:** A beloved mobile health/wellness app that feels genuinely designed, not generic.

---

## 2. Design System

### 2.1 Color Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `primary.main` | `#6c63ff` | `#a78bfa` | Buttons, active states, links |
| `primary.dark` | `#5a52d5` | `#8b75e8` | Button hover |
| `primary.light` | `#a78bfa` | `#c4b5fd` | Hover tints |
| primary gradient | `linear-gradient(135deg, #6c63ff, #a78bfa)` | same | AppBar, FAB, filled buttons, hero headers, species tags |
| `secondary.main` (rose) | `#fb7185` | `#fb7185` | Urgent/error, DOG tags |
| `success.main` (emerald) | `#34d399` | `#34d399` | Healthy/active status |
| `warning.main` (amber) | `#fbbf24` | `#fbbf24` | Upcoming/pending indicators |
| `error.main` | `#f43f5e` | `#fb7185` | Validation errors |
| `background.default` | `#f0f4ff` | `#1a1828` | Page background |
| `background.paper` | `#ffffff` | `#252240` | Cards, dialogs, nav bar |
| `background.activeNav` | `#ede9fe` | `#3d3580` | Active nav item background |
| `text.primary` | `#1a1340` | `#e8e3ff` | Headings, body text |
| `text.secondary` | `#6b7280` | `#9ca3af` | Supporting text, metadata |
| `text.disabled` | `#9ca3af` | `#5a5478` | Placeholders, inactive |
| `divider` | `#e0daf8` | `#2a2840` | Borders, separators |

### 2.2 Typography

**Font family:** `'Nunito', sans-serif` — loaded from Google Fonts.  
**Load string:** `https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap`

Never use system font stacks (San Francisco, Segoe UI, Roboto, Inter, Arial).

| Role | Weight | Size | Letter spacing |
|------|--------|------|----------------|
| Page title (h1) | 900 | 28–32px | -1px |
| Section heading (h2) | 800 | 22px | -0.5px |
| Card/dialog title (h3) | 800 | 15–16px | -0.3px |
| Body / label | 700 | 14px | 0 |
| Supporting text | 600 | 13px | 0 |
| Caption / metadata | 600 | 11–12px | 0 |
| Section label (CAPS) | 800 | 10–11px | 2–3px + uppercase |

### 2.3 Shape & Spacing

| Element | Border radius |
|---------|--------------|
| Cards | 16–18px |
| Dialogs / sheets | 20–24px |
| Buttons (filled/outlined) | 14px |
| Chips / tags / pills | 20px |
| Inputs / search | 12px |
| FAB | 16px |
| Nav items (sidebar) | 12px |
| Avatar / pet avatar | 13–16px |

Page horizontal padding: 16–24px. Card gap: 10–12px. Section gap: 24–32px.

---

## 3. Navigation

### 3.1 Mobile (< 960px) — Bottom Navigation

Persistent bottom tab bar with 4 tabs:

| Tab | Icon | Route |
|-----|------|-------|
| Calendar | CalendarMonth | `/` |
| Pets | Pets | `/pets` |
| Vets | LocalHospital | `/vets` |
| Profile | Person | `/profile` |

- Active tab: background `background.activeNav`, label `primary.main`
- Inactive: label `text.disabled`
- No hamburger menu, no MUI Drawer for primary navigation
- FAB (+ button) sits at `bottom: 76px, right: 18px` above bottom bar; `border-radius: 16px`, gradient background, used as primary create action per page

### 3.2 Desktop (≥ 960px) — Left Sidebar

220px fixed sidebar replacing the bottom nav:

- Logo row: 32px gradient icon + "PetPal" wordmark (Nunito 900)
- Nav items: icon + label, active state uses `background.activeNav` tint + `primary` label color
- Spacer pushes user profile section to bottom
- User section at bottom: avatar (gradient, initials) + name + email, no logout button inline (logout in Profile page)
- No FAB on desktop; Add button in page header instead

### 3.3 AppBar and Drawer removal

The current MUI AppBar with hamburger and `NavigationDrawer.tsx` (MUI Drawer) are removed entirely. `NavigationDrawer.tsx` can be deleted. The Layout shell becomes: `sidebar | content` on desktop, `content + bottom-nav` on mobile. MUI `BottomNavigation` component on mobile; MUI `Drawer` variant `permanent` (or plain div) for the sidebar on desktop.

### 3.4 Profile page (new route)

`/profile` replaces the current avatar menu for settings/logout:
- Gradient hero header with user initials avatar, name, email
- Settings rows: Dark Mode toggle, Notifications (link), Group Members (link), Sign Out (rose color)
- Sign out calls `AuthContext.logout()` and redirects to `/login`

---

## 4. Page Designs

### 4.1 Login & Register

**Layout:** Centered card on `background.default`, no AppBar.

**Login:**
- PetPal logo (emoji + wordmark, centered)
- Tagline: "Your pets' health, organised"
- Frosted card (`background: linear-gradient(135deg, #6c63ff15, #a78bfa10)`, `border-radius: 16px`)
- Fields: Email, Password (each with uppercase purple label above input)
- Input style: `background.default` fill, `divider` border, `border-radius: 12px`, Nunito 600
- Primary CTA: full-width gradient button "Sign In"
- Footer link: "Don't have an account? **Sign up**"

**Register:** Same layout. Fields: Name, Email, Password. CTA: "Create Account".

### 4.2 Calendar Page (`/`)

**Header:**
- Page title "April 2026" (Nunito 900, 22px) + prev/next chevron buttons (tinted `background.activeNav`)
- Pet filter chips row: "All" chip (filled primary) + one chip per pet (tinted in pet color)

**Calendar grid:**
- 7-column grid, Mon–Sun headers (uppercase, `text.disabled`)
- Cells: `background.paper` with `border-radius: 8px`, min-height 56px desktop / 30px mobile
- Today cell: `background.activeNav`
- Event ribbons inside cells (existing logic preserved): colored by pet, `border-radius: 4px`
- Clicking a day opens the existing `DayDetailModal`

**FAB (mobile):** Opens "Schedule vet visit" flow (uses existing DayDetailModal inline form).  
**Add button (desktop):** In page header, triggers same flow.

### 4.3 Pets Page (`/pets`)

**Header:** "My Pets" title + subtitle ("3 pets · N upcoming visits") + Add Pet button/FAB.

**Layout:**
- Mobile: vertical list of pet cards
- Desktop: 3-column card grid

**Pet card:**
- White card, `border-radius: 16–18px`, `box-shadow: 0 2px 12px rgba(108,99,255,0.08)`
- Pet avatar: 44–48px square, `border-radius: 13–14px`, tinted background (species-based default: cat=`#ede9fe`, dog=`#fce7f3`, rabbit=`#d1fae5`, other=`#e0f2fe`)
- Pet name: Nunito 800, 14–15px, `text.primary`
- Metadata: species · age, Nunito 600, 10–11px, `text.secondary`
- Status badge: 6px colored dot + 700-weight text in status color (purple=upcoming visit, emerald=all clear, amber=upcoming med, rose=overdue)
- Species tag (top-right): gradient pill per species (CAT=primary, DOG=rose, RABBIT=emerald, other=amber)
- Desktop hover: `translateY(-2px)`, shadow deepens

**Upcoming vet visits section removed.** The current PetsPage renders a separate "Upcoming Vet Visits" list below the pet grid. This is replaced by the per-card status badge ("Checkup in 3 days"). The `useUpcomingVetVisits` query is kept and its data is used to populate the badge on each card, but the separate section UI is not rendered.

### 4.4 Pet Detail Page (`/pets/:petId`)

**Hero header:** Full-width gradient (`#6c63ff → #a78bfa`), pet avatar (semi-transparent white bg), name (Nunito 900, white), species/age subtitle, Edit button (ghost white).

**Tabs:** "Vet Visits" | "Medications" — Nunito 800, active tab has `primary.main` border-bottom. Sits on white strip below hero.

**Desktop side panel:** 260px right panel showing:
- Active medications summary (name, dosage, reminder times)
- Nearest upcoming visit highlight card (indigo tint bg)

**Vet Visits tab:** List of visit cards. Each card: visit name (800), date · vet · clinic (secondary), Scheduled/Logged chip. Existing add/edit/delete dialogs restyled.

**Medications tab:** List of medication cards. Each card: name (800), dosage + frequency (secondary), active toggle, reminder bell + times. Existing add/edit/delete dialogs restyled.

### 4.5 Vets Page (`/vets`)

**Header:** "Vets" title + search input + Add Vet button.

**Layout:** 
- Mobile: vertical list
- Desktop: 3-column card grid

**Vet card:** White card, clinic name (800), phone + doctor name (secondary), address (secondary), star rating (amber), Open/Closed badge (emerald/rose tint). Action buttons: Edit, Maps, Sync — all `background.activeNav` tint style.

**Existing functionality preserved:** Google Places search, work hours editor, sync dialog — all restyled to match new design system.

---

## 5. Component Patterns

### Buttons
| Variant | Style |
|---------|-------|
| Primary | gradient fill, white text, `border-radius: 14px`, Nunito 800 |
| Secondary | `background.activeNav` fill, `primary.main` text |
| Outlined | `2px solid primary.main`, `primary.light` text |
| Destructive | rose tint bg, rose text |

### Status Chips
| State | Background | Text |
|-------|-----------|------|
| Scheduled | `#ede9fe` + border `#d4d0f8` | `primary.main` |
| Logged / Active | `#34d39922` | `#059669` |
| Upcoming | `#fbbf2422` | `#b45309` |
| Urgent / Overdue | `#fb718522` | `#fb7185` |
| Inactive | `#f3f4f6` | `text.disabled` |

### Species Tags
| Species | Gradient |
|---------|----------|
| Cat | `#6c63ff → #a78bfa` (white text) |
| Dog | `#fb7185 → #f9a8d4` (white text) |
| Rabbit | `#34d399 → #6ee7b7` (`#064e3b` text) |
| Other | `#fbbf24 → #fde68a` (`#451a03` text) |

### Inputs
`background: paper`, `border: 1.5px solid divider`, `border-radius: 12px`, padding `10px 14px`, Nunito 600 13px.

### Dialogs / Sheets
`border-radius: 20–24px`, white/dark background, `box-shadow: 0 20px 60px rgba(108,99,255,0.15)` (light). Mobile: bottom sheet style (drag handle). Desktop: centered dialog.

### Section Labels
10–11px, weight 800, uppercase, letter-spacing 2–3px, `text.disabled` color, `margin-bottom: 12–16px`.

---

## 6. Implementation Approach

**Approach B — Theme + targeted component redesign:**
- Deep `src/theme.ts` rewrite (colors, Nunito, radii, shadows, component overrides)
- `src/index.html` or `index.css`: add Nunito Google Fonts link
- `src/components/Layout.tsx`: replace AppBar+Drawer with responsive sidebar/bottom-nav shell
- New `src/pages/profile/ProfilePage.tsx` + route at `/profile`
- Redesign auth pages: `LoginPage.tsx`, `RegisterPage.tsx`
- Redesign card/list items in: `PetsPage.tsx`, `PetDetailPage.tsx`, `VetsPage.tsx`, `CalendarPage.tsx`
- Restyle existing dialogs: `DayDetailModal`, `MedicationDetailDialog`, `ScheduledVisitDetailDialog`, `PlacesSyncDialog`, `WorkHoursEditor`
- No changes to API calls, query hooks, state management, or routing logic

---

## 7. What Does NOT Change

- All React Query hooks, API calls, data-fetching logic
- Routing structure (except adding `/profile`)
- All business logic (auth, group scoping, reminder scheduling, etc.)
- The `pet.color` system (custom per-pet colors already implemented — must be preserved in new design)
- Dark mode infrastructure (`ThemeContext`, localStorage + server sync)
- MUI component library (stay on MUI v9)
- All existing functionality (Places sync, work hours editor, reminder editor, etc.)
