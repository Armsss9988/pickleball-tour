# Tournament Control Room Design

## Goal

Give BTC/admin users one operational screen for running a tournament without replacing the existing dashboard or deleting the detailed management pages.

The dashboard remains the overview and readiness screen. The new `/admin/[tournamentId]/control-room` route becomes the live operations workspace for the connected flow across team draw, group assignment, lineup, matches, standings, and bracket.

## Decisions

- Keep the current dashboard at `/admin/[tournamentId]`.
- Add a separate Control Room route at `/admin/[tournamentId]/control-room`.
- Keep the existing dedicated routes for draw, groups, lineup, matches, standings, and bracket as detailed fallback pages.
- Use a vertical scrolling layout with a sticky scrollspy index.
- Use centralized reactivity: after a child section mutates data, the parent reloads the shared tournament operation dataset from the API.

## Scope

### In Scope

- Add a BTC/admin navigation item for the Control Room.
- Add route access policy support for the new area.
- Build a first version of the Control Room page as a vertical operations workspace.
- Add compact sections for:
  - Overview
  - Draw
  - Groups
  - Lineup
  - Matches
  - Standings
  - Bracket
- Use existing APIs and page logic patterns where possible.
- Reload all relevant page data after operational mutations.

### Out of Scope

- Replacing the dashboard.
- Removing or hiding the existing detailed pages.
- Rebuilding the scoring console.
- Reworking the tournament information page.
- Reworking the court and schedule configuration page.
- Introducing new backend endpoints unless the current APIs prove insufficient during implementation.

## Information Architecture

The Control Room should not repeat the full tournament profile or court configuration forms. Those areas already have dedicated pages and are also represented in the dashboard readiness flow.

The Control Room only shows operational status and shortcuts:

- Tournament identity: compact title, status badge, public state, and venue summary.
- Court and schedule readiness: compact warning or ready state, with a link to `/admin/[tournamentId]/schedule`.
- Tournament configuration gaps: compact warnings from existing dependency policy, with links to the owning page.

This avoids duplicating "tournament information" and "court configuration" editing across multiple places.

## Layout

The page uses a two-zone layout on desktop:

- Left sticky scrollspy index with section anchors.
- Main vertical content column with full-width operation sections.

On mobile, the scrollspy becomes a horizontally scrollable sticky anchor bar below the page header.

Section order:

1. Overview
2. Draw
3. Groups
4. Lineup
5. Matches
6. Standings
7. Bracket

The order follows the real tournament operation sequence, with standings placed immediately after match operation so BTC can see result changes without switching pages.

## Components

### ControlRoomPage

Route component at `apps/web/src/app/admin/[tournamentId]/control-room/page.tsx`.

Responsibilities:

- Load active tournament.
- Load all shared operational data.
- Own global loading and refresh state.
- Provide `refreshAll()` to sections.
- Render page header, scrollspy, sections, and shared error/empty states.

### ControlRoomScrollspy

Client component that renders section anchors and highlights the active section based on scroll position.

It should use stable section ids:

- `overview`
- `draw`
- `groups`
- `lineup`
- `matches`
- `standings`
- `bracket`

### ControlRoomOverviewSection

Shows compact operational readiness:

- Tournament status.
- Publish/public state.
- Counts for teams, groups, matches, lineup-ready matches, completed matches, confirmed results.
- Dependency warnings from existing UX policy.
- Manual refresh button.

### DrawSection

Compact team operations:

- Official team list summary.
- Active preview draw state if available.
- Primary action shortcuts for automatic draw preview and confirm when the existing draw access rules allow it.
- Manual/team assignment detail remains on `/draw` if the compact version becomes too dense.

### GroupsSection

Compact group operations:

- Current groups and assigned teams.
- Assignment readiness.
- Random assignment action when the existing group access rules allow it.
- Manual drag/drop assignment remains on `/groups` for the first version.
- Provide an "Open groups" link for detailed manual operations.

### LineupSection

Compact lineup operations:

- Matches that are scheduled, lineup-pending, lineup-ready, or ready.
- Highlight matches needing action.
- Allow BTC/admin to open the dedicated lineup page for a selected match context.
- Show lock/readiness state in the compact list.
- Keep complex captain-specific behavior on the dedicated lineup page unless required later.

### MatchesSection

Compact match operations:

- Group/playoff match summary.
- Conflict warnings.
- Timeline/list preview.
- Shortcut to the dedicated matches page with the current operational context.
- Inline schedule editing and lineup drawers remain on `/matches` for the first version.

### StandingsSection

Displays current standings using the existing standings data endpoint.

It must refresh after match, result, lineup-lock, tie-break, and bracket-related actions through `refreshAll()`.

Tie-break manual resolution can remain on the detailed standings page for the first version unless the existing component is extracted cleanly.

### BracketSection

Displays current bracket nodes and generation readiness.

It should:

- Show current playoff bracket if nodes exist.
- Offer "Generate bracket" when the existing access and readiness rules allow it.
- Refresh tournament, standings, matches, and bracket data after generation.

## Data Flow

`ControlRoomPage` loads data in one coordinated flow:

- Active tournament via existing `useActiveTournament`.
- Team draws from `/tournaments/:id/team-draws`.
- Teams from `/tournaments/:id/teams`.
- Groups from `/tournaments/:id/groups`.
- Matches from `/tournaments/:id/matches`.
- Courts from `/tournaments/:id/courts` when match conflict display needs court context.
- Court conflicts from `/tournaments/:id/courts/conflicts`.
- Standings from `/tournaments/:id/standings`.
- Bracket from `/tournaments/:id/bracket`.

All section mutations call the relevant existing endpoint, then call `refreshAll()`.

`refreshAll()` should reload the shared dataset and call the tournament reload function from `useActiveTournament`. It should guard against stale response ordering by either using a request sequence id or ignoring updates after unmount.

## Access Control

Add a new `control-room` area key to the admin UX policy.

Visibility:

- `btc_admin`: visible and allowed.
- `super_admin`: visible and allowed.
- `scorer`: hidden and forbidden.
- `captain`: hidden and forbidden.
- `guest`: hidden and forbidden.

The sidebar should place the Control Room under the competition/operations group, before or near Groups/Matches.

Direct route access must use the existing route-access redirect flow. Users without access should be redirected to their appropriate default route.

## Error Handling

- If the tournament cannot load, show the existing empty/error state pattern.
- If one secondary dataset fails, keep the page usable where possible and show a compact section-level error with retry.
- If a mutation fails, show the existing toast error.
- If refresh fails after a successful mutation, keep the mutation success toast separate from a reload warning so the user understands that the action succeeded but the view may need refresh.
- Disable mutation buttons while that section is processing.

## Testing

Add focused tests around logic that can be tested without a browser:

- `areaFromPath` maps `/admin/:id/control-room` to the new area.
- BTC/admin and super admin can see/access `control-room`.
- scorer, captain, and guest cannot access `control-room`.

For UI verification:

- Run the web test suite.
- Run lint/build or the repo's closest available validation.
- Smoke the local route:
  - `/admin/[tournamentId]` still renders the dashboard.
  - `/admin/[tournamentId]/control-room` renders the new page for BTC/admin.
  - Sidebar highlights Control Room on the new route.
  - Dedicated pages still render.

## Implementation Notes

Prefer extracting small presentational or data-summary components from existing pages only when it reduces duplication. Avoid moving entire page files into shared components in the first pass, because the existing pages include large interaction surfaces and role-specific behavior.

The first version should be useful even if some sections link to their detailed page for complex operations. The key product improvement is the single vertical operational picture and centralized refresh after changes.
