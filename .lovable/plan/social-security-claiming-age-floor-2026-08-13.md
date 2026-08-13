# Social Security claiming age floor

Make the claiming age never fall below the person's current age (capped at 70).

## Behavior

- Minimum selectable claiming age = `min(max(62, currentAge), 70)`.
- If the stored claiming age is below that minimum, it is bumped up automatically on load and whenever the current age changes.
- Dropdown options below the minimum are removed, so a past claiming age can't be chosen.
- Anyone already 70 or older gets 70.
- Applies independently to each spouse using that spouse's own age (single filers only use spouse 1).

## Technical notes

- `src/components/SocialSecurityPlanner.tsx`: compute `minClaimAge` per spouse from the `spouse1Age` / `spouse2Age` props; filter the claiming-age `Select` options to start at `minClaimAge`; add an effect that calls `onChange` to raise `claimAge` when it is below `minClaimAge`.
- `src/pages/Index.tsx`: keep the initial default of 67; the clamp handles older users.
- Note under the dropdown explaining that claiming ages in the past aren't selectable.
