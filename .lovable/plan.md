

## Fix Age Input in Life Events Editor

**Problem**: The age field clamps on every keystroke, making it nearly impossible to type a two-digit age. Typing "7" immediately snaps to the minimum (e.g., 55).

**Solution**: Apply the same local-state + on-blur validation pattern already used in `HouseholdInputs.tsx`'s `AgeInput` component.

### Changes

**src/components/LifeEventsEditor.tsx**
1. Replace the raw `<Input type="number">` for the age field with a local-state approach:
   - Use `useState` to hold the raw text while typing
   - Only commit the clamped value `onChange` when the parsed number is within range
   - On blur, snap to valid range or revert to the current value
   - Use `type="text"` with `inputMode="numeric"` and `maxLength={3}` (to allow age 100)

This is a single-component change — extract an inline `EventAgeInput` sub-component or apply the pattern directly to the age field's `onChange`/`onBlur`.

