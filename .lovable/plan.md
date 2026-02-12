

# Visual Theme Refresh -- "Retirement Drawdown Planner"

## Overview
A light visual polish pass across the entire app to make it feel more polished and professional without changing any functionality. The goal is subtle refinement: better header presence, improved card depth, smoother transitions, and a more cohesive color story.

## Changes

### 1. Header Upgrade
- Add a subtle gradient background to the header (from primary/5% to transparent)
- Make the title slightly smaller (text-2xl) with a primary-colored accent bar or icon (e.g., a small TrendingUp icon)
- Add a bottom shadow instead of just a border for more depth

### 2. Tab Bar Polish
- Add rounded-lg background container with slight shadow
- Active tab gets a subtle bottom border accent in primary color
- Smooth transition on tab switches

### 3. Card Enhancements
- Add a subtle hover effect to all summary cards (slight scale + shadow lift)
- Add a thin left-border accent color to cards based on their type (green for positive, red for depleted, blue for neutral)
- Slightly increase card border-radius for a softer feel

### 4. Progress Bar (Setup Wizard)
- Use a gradient fill on the progress bar (primary to secondary) instead of flat color
- Add a slight glow/shadow effect to the filled portion

### 5. Button Polish
- Primary buttons get a subtle shadow and hover lift effect
- "Calculate & Go to Dashboard" button gets a gradient background (primary to a slightly darker shade)

### 6. Collapsible Section Headers
- Add a subtle left accent border when expanded
- Smoother open/close animation

### 7. Global Refinements in CSS
- Add smooth transitions to interactive elements (buttons, cards, tabs)
- Slightly warm up the background color for a less clinical feel
- Add subtle animation keyframes for card entry (fade-in-up)

## Technical Details

### Files to modify:

**`src/index.css`**
- Add new utility classes for card hover effects, gradient backgrounds
- Add keyframes for fade-in-up animation
- Tweak `--background` slightly (add a touch of warmth)
- Add `.card-hover` utility with transform + shadow transition

**`tailwind.config.ts`**
- Add `fade-in-up` keyframe and animation
- Add `card-hover` animation

**`src/pages/Index.tsx`**
- Update header markup: add gradient bg, shadow, icon next to title
- Add transition classes to tab triggers

**`src/components/SetupWizard.tsx`**
- Add gradient to Progress bar via className
- Add animation to step pills

**`src/components/SummaryCards.tsx`**
- Add hover effect classes to SummaryCard
- Add left-border accent based on card color
- Add fade-in-up animation to card grid

**`src/components/ui/card.tsx`**
- Add default transition classes for hover state

**`src/components/ui/button.tsx`**
- Add subtle shadow and hover lift transition to default variant

No new dependencies required. All changes are CSS/Tailwind only.
