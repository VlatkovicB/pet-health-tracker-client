---
name: design-system
description: Use when building, editing, or reviewing any UI component, page, or theme file in pet-health-tracker-client. Reference for colors, typography, spacing, navigation structure, and component patterns.
---

# Design System — Pet Health Tracker Client

## Overview

**Electric Purple + Nunito + Bottom Navigation.** All UI work must follow this design system. Never revert to the old teal/orange palette, system fonts, or hamburger drawer nav.

---

## Color Tokens

| Token | Light value | Dark value | Usage |
|-------|------------|------------|-------|
| `primary.main` | `#6c63ff` | `#a78bfa` | Buttons, active states, links |
| `primary.gradient` | `linear-gradient(135deg, #6c63ff, #a78bfa)` | same | AppBar, FAB, filled buttons, tags |
| `primary.light` | `#a78bfa` | `#c4b5fd` | Hover states, secondary accents |
| `primary.contrastText` | `#ffffff` | `#ffffff` | Text on primary bg |
| `secondary.main` (rose) | `#fb7185` | `#fb7185` | Urgent/error indicators, alerts |
| `success.main` (emerald) | `#34d399` | `#34d399` | Healthy/active status dots |
| `warning.main` (amber) | `#fbbf24` | `#fbbf24` | Upcoming/scheduled indicators |
| `background.default` | `#f0f4ff` | `#1a1828` | Page background |
| `background.paper` | `#ffffff` | `#252240` | Cards, dialogs, nav bar |
| `background.activeNav` | `#ede9fe` | `#3d3580` | Active bottom nav item bg |
| `text.primary` | `#1a1340` | `#e8e3ff` | Headings, body text |
| `text.secondary` | `#6b7280` | `#9ca3af` | Supporting text, metadata |
| `text.muted` | `#9ca3af` | `#5a5478` | Placeholders, inactive labels |
| `divider` | `#e0daf8` | `#2a2840` | Borders, dividers |

---

## Typography — Nunito

**Font:** `'Nunito', sans-serif` — loaded from Google Fonts. **Never** use system fonts (San Francisco, Roboto, Segoe UI, Inter, or any generic stack).

| Role | Weight | Size | Letter spacing |
|------|--------|------|----------------|
| Page title (h1) | 900 | 28–32px | -1px |
| Section heading (h2) | 800 | 22px | -0.5px |
| Card title (h3) | 800 | 15–16px | -0.3px |
| Body / dialog label | 700 | 14px | 0 |
| Supporting text | 600 | 13px | 0 |
| Caption / metadata | 600 | 11–12px | 0 |
| Section label (caps) | 800 | 10–11px | 2–3px + `text-transform: uppercase` |

---

## Spacing & Shape

- **Card border radius:** 16–18px
- **Dialog border radius:** 20–24px
- **Button border radius:** 14px
- **Chip / tag border radius:** 20px (pill)
- **Input border radius:** 12px
- **Bottom nav border radius:** 0 0 0 0 (flush) or 0 (full-width)
- **FAB border radius:** 16px
- **Page padding:** 16–18px horizontal
- **Card gap:** 10–12px
- **Section gap:** 24–32px

---

## Navigation — Bottom Bar

**Structure:** 4 tabs, always visible at bottom. No hamburger, no drawer.

| Tab | Icon | Route |
|-----|------|-------|
| Calendar | 📅 | `/` |
| Pets | 🐾 | `/pets` |
| Vets | 🏥 | `/vets` |
| Profile | 👤 | `/profile` (or avatar/settings) |

**Active tab style:**
- Background: `background.activeNav` (`#ede9fe` / `#3d3580`)
- Label color: `primary.main` (`#6c63ff` / `#a78bfa`)
- Inactive label: `text.muted`

**FAB:** Gradient primary button (`border-radius: 16px`) positioned `bottom: 76px, right: 18px` — sits above bottom nav. Used for primary create action on each page.

---

## Component Patterns

### Pet / Vet Cards
```
background: paper
border-radius: 16–18px
padding: 14px
box-shadow: 0 2px 12px rgba(108,99,255,0.08)   ← light
box-shadow: 0 2px 12px rgba(0,0,0,0.2)          ← dark
gap between cards: 10px
```
- Avatar: 44×44px, `border-radius: 14px`, tinted background (not image unless photo exists)
- Name: 800 weight, `text.primary`
- Metadata row: 600 weight, `text.secondary`, 11–12px
- Status badge: colored dot (6px circle) + 700-weight text in status color

### Species / Type Tags (pill badges on cards)
```
background: linear-gradient(135deg, primary colors OR accent colors)
color: white
font-size: 9–10px, font-weight: 800
padding: 3px 8–10px
border-radius: 20px
letter-spacing: 0.5px
```
- CAT → primary gradient (`#6c63ff → #a78bfa`)
- DOG → rose gradient (`#fb7185 → #f9a8d4`)
- RABBIT / other → emerald gradient (`#34d399 → #6ee7b7`, color `#064e3b`)

### Buttons
| Variant | Style |
|---------|-------|
| Primary (filled) | `background: linear-gradient(135deg, #6c63ff, #a78bfa)`, white text, `border-radius: 14px`, `font-weight: 800` |
| Secondary (tinted) | `background: #ede9fe`, `color: #6c63ff`, same radius/weight |
| Outlined | `border: 2px solid #6c63ff`, `color: #a78bfa` |

### Status Chips (inline)
```
Urgent:    background #fb718522, color #fb7185
Active:    background #34d39922, color #34d399
Upcoming:  background #fbbf2422, color #b45309 (light) / #fbbf24 (dark)
Scheduled: background #f0f4ff, color #6c63ff, border 1px solid #d4d0f8
```
Font: 11px, weight 800, padding `5px 12px`, border-radius `20px`.

### Inputs / Search
```
background: paper (white / #252240)
border: 1.5px solid divider (#e0daf8 / #3d3580)
border-radius: 12px
padding: 10px 14px
font: Nunito 600 13px
color: text.secondary when empty
```

### Section Labels (page section headers)
```
font-size: 10–11px, font-weight: 800
color: text.muted
letter-spacing: 2–3px
text-transform: uppercase
margin-bottom: 12–16px
```

---

## Dark Mode

Dark mode is supported. The `ThemeContext` wraps the app and syncs to `localStorage` + backend. When writing components:

- Use MUI `sx` theme tokens (`background.default`, `text.primary`, etc.) — never hardcode hex colors directly in JSX
- The theme factory `createAppTheme(mode)` in `src/theme.ts` supplies all tokens
- Test both modes when reviewing visual changes

---

## What Not To Do

- ❌ Do not use `#2a9d8f` (old teal) or `#e76f51` (old orange) anywhere
- ❌ Do not use system font stacks — always load and reference Nunito
- ❌ Do not use the hamburger + MUI Drawer for primary navigation
- ❌ Do not add `border-radius < 12px` on cards or dialogs
- ❌ Do not use purple/lavender gradients on white backgrounds (cliché AI look) — use `#f0f4ff` background instead
- ❌ Do not use MUI default shadows (they look wrong with this palette) — use custom rgba shadows per above
