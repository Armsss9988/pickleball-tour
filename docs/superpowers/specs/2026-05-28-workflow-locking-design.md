# Workflow Locking And Ruleset Editing Design

## Context

The admin tournament UI currently shows locked tabs in the sidebar, but the lock is only applied to sidebar links. Users can still bypass a locked tab through dashboard quick actions or by entering a direct URL. The ruleset page is read-only in the web app, while the API already exposes a ruleset update endpoint that only accepts updates while the tournament is in `DRAFT`.

The existing domain model already defines the core workflow constraints:

- Ruleset configuration is locked after `DRAFT`.
- Team draw remains mutable until the tournament advances beyond team draw completion.
- Tournament status transitions are explicit and validated by the domain entity.

## Goals

- Make tab locking consistent across sidebar navigation, dashboard quick actions, and direct URL access.
- Make lock reasons visible to admins so they understand how to unlock the next step.
- Keep backend mutation endpoints as the final enforcement layer.
- Add a clear ruleset edit guideline: editable in `DRAFT`, read-only after `DRAFT`.
- Allow post-progress correction only through controlled workflow rollback, not silent override.

## Non-Goals

- No free-form admin override that edits ruleset, teams, schedules, or scores while dependent data remains active.
- No unrelated redesign of the admin UI.
- No broad role/permission redesign beyond the existing role guards.

## Recommended Approach

Use a hybrid workflow policy:

- Default behavior is strict workflow locking based on tournament status.
- Admins may move backward through explicit, domain-valid rollback actions when they need to reopen an earlier step.
- Rollback actions must explain affected downstream data and write audit logs.

This avoids inconsistent tournament data while still giving operators a recoverable path when setup mistakes happen.

## Architecture

Add a shared frontend workflow policy module under the web app, for example `apps/web/src/lib/tournament-workflow.ts`. This module owns:

- Status-to-unlock-level mapping.
- Tab/action metadata.
- `canAccessAdminArea(status, area)` checks.
- Lock reason messages.
- Next-step guidance labels and hrefs.

The sidebar and dashboard quick actions should both consume this policy rather than duplicating phase logic. The tournament admin layout should also use it to guard direct URL access. If the current path is locked, the layout redirects to the tournament dashboard and shows a toast or inline notice explaining why the tab is locked.

Backend services keep validating status before mutating state. UI locks improve clarity; API checks protect data integrity.

## Components

### Workflow Policy

The workflow policy exposes a small typed API:

- `getUnlockLevel(status)`.
- `getAdminAreaAccess(status, areaKey)`.
- `getAdminNavGroups(tournamentId, status)`.
- `getQuickActions(tournamentId, status)`.

Each access result includes:

- `allowed`.
- `requiredStatus` or `requiredPhase`.
- `reason`.
- `recoveryHref` for the page that can unlock the step.

### Sidebar

The sidebar should render locked items as disabled navigation with a lock badge and tooltip/title. It should not be the source of truth for workflow rules.

### Dashboard Quick Actions

Quick actions should render the same locked state as sidebar items. Locked actions stay visible, but clicking them does not navigate. This makes the workflow discoverable without allowing bypass.

### Route Guard

The tournament admin layout should derive the current admin area from the pathname and enforce the policy. Direct URL access to a locked tab redirects to the tournament dashboard. The dashboard then displays a short notice such as: `Boc tham bi khoa: can hoan tat import van dong vien truoc.`

### Ruleset Page

Ruleset supports two modes:

- `DRAFT`: editable form with validate and save actions.
- After `DRAFT`: read-only detail view with a locked banner.

The locked banner explains that changing ruleset after setup can invalidate players, teams, schedules, lineups, and scoring. If the current user has an admin role, the banner can offer a rollback action such as `Mo lai cau hinh`, which transitions the tournament back through valid states or starts a dedicated backend rollback endpoint.

## Data Flow

1. `useActiveTournament()` loads the tournament and status.
2. Layout computes current admin area access from the shared policy.
3. If locked, layout redirects to dashboard with a lock reason.
4. Sidebar and dashboard render from the same policy.
5. Mutation pages still call backend endpoints normally.
6. Backend services reject invalid mutations based on current status.
7. Successful mutations reload tournament state so the next workflow area unlocks immediately.

## Backend Enforcement

Existing ruleset update behavior should remain strict: only `DRAFT` can update ruleset.

Mutation endpoints should be reviewed and aligned with workflow rules:

- Player import/update requires `DRAFT` or `PLAYER_IMPORT`.
- Team draw preview/confirm requires `PLAYERS_READY`.
- Group assignment and schedule generation require completed team draw.
- Lineup/scoring requires schedule or running states.

Where a service already enforces these checks, keep the existing behavior. Where it does not, add status checks and focused tests.

## Rollback Guideline

Rollback should be explicit and data-aware:

- To edit ruleset after progress, the admin must return to `DRAFT`.
- Returning to `DRAFT` invalidates or removes downstream setup data that depends on the old ruleset.
- The confirmation modal must list affected data categories before proceeding.
- Every rollback writes an audit event with before and after status.

Initial implementation may support only forward-safe locks and read-only ruleset after `DRAFT`. Full rollback can be implemented as a follow-up if the backend cleanup semantics are not already clear.

## Error Handling

- Locked UI actions should show a short, actionable reason.
- Direct URL access should redirect instead of rendering a broken or unauthorized page.
- Backend invalid-status errors should return clear `BadRequestException` messages.
- If tournament status is unknown, use the safest state: lock status-dependent actions and keep always-available areas accessible.

## Testing

Frontend tests should cover the policy module:

- Each tournament status maps to the expected unlock level.
- Sidebar and dashboard actions receive consistent access results.
- Locked areas return a reason and recovery target.

Backend tests should cover mutation status checks for high-risk endpoints:

- Ruleset update rejected after `DRAFT`.
- Team draw rejected before players are ready.
- Schedule/scoring actions rejected before prerequisites.

Manual verification should include:

- Locked dashboard quick actions cannot bypass.
- Direct URL to a locked tab redirects to dashboard.
- Ruleset edit controls appear only in `DRAFT`.
- Completing a step reloads status and unlocks the next tab.
