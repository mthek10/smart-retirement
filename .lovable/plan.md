
# Fix: Always-Visible Pinned Scrollbars on Projection Table

## Problem
The CSS custom scrollbar styling with `overflow: auto` does not force scrollbars to always display. On macOS (and some Windows configs), scrollbars are hidden until the user hovers or scrolls, making them invisible.

## Solution
Replace the CSS-only approach with `overflow: scroll` (instead of `auto`) which forces scrollbars to always render, and keep the existing custom styling so they look good.

## Technical Details

### 1. Update `src/index.css`
- Change `.hide-horizontal-scrollbar` to use `overflow-y: scroll` (forces vertical scrollbar always visible)
- Change `.always-show-scrollbar` to use `overflow-x: scroll` (forces horizontal scrollbar always visible)

### 2. Update `src/components/ProjectionTable.tsx`
- On the table container (line 159), change `overflow-y-auto` to `overflow-y-scroll` to guarantee the vertical scrollbar is always rendered
- On the top scroll container (line 156), ensure it also uses `overflow-x: scroll` via the utility class

The key difference: `overflow: auto` shows scrollbars only when needed, while `overflow: scroll` always shows them regardless of content size. Combined with the existing `::-webkit-scrollbar` styling, this will produce always-visible, themed scrollbars.
