# Role-Aware Dependency Locking UX Design

## Context

The previous workflow locking design focused on preventing bypasses by mapping tournament status to a linear unlock level. That prevents some bugs, but it is too strict for real operators. Non-technical users need clear guidance, not a rigid phase wall around every tab.

This design supersedes the linear phase-lock portions of:

- `docs/superpowers/specs/2026-05-28-workflow-locking-design.md`
- `docs/superpowers/plans/2026-05-28-workflow-locking.md`

The implementation should keep the security goal from the earlier design: direct URLs and quick actions must not bypass required prerequisites. The implementation should replace broad phase locking with dependency-based checks and role-aware visibility.

## Goals

- Keep one app, but show each user only the work relevant to their role.
- Make the UI clear enough for non-technical operators: BTC/admin, referee/scorer, coach/captain, and guest.
- Lock only actions that truly require missing input data.
- Keep pages discoverable when possible, using empty states, guidance, and next-step CTAs instead of hiding everything.
- Prevent guests from seeing operational controls.
- Allow public publishing only when required tournament information and completion rules are satisfied.

## Roles

### Guest

Guests can only view public information:

- Tournament overview.
- Schedule and match results.
- Live scores.
- Standings.
- Teams.
- Bracket when available.

Guests must not see admin sidebar, setup actions, lineup controls, scoring controls, edit buttons, rollback actions, or publish controls.

### BTC/Admin

BTC/admin users can operate the tournament setup and management flow:

- Tournament information.
- Ruleset/config.
- Players.
- Team draw.
- Groups.
- Schedule configuration and schedule generation.
- Match management.
- Result confirmation.
- Publishing.
- Audit.

The admin dashboard becomes the primary command center.

### Referee/Scorer

Referee/scorer users should see match-scoring work only:

- Matches that are ready, running, in segment break, completed, or awaiting confirmation according to their permission.
- Clear button to open the scoring console.
- Current match status and score.
- Error states that explain why scoring is unavailable.

They should not see tournament setup, ruleset edit, player import, draw, group assignment, or publish controls.

### Coach/Captain

Coach/captain users should see their team work only:

- Team schedule.
- Matches requiring lineup submission.
- Submitted/locked lineup state.
- Team results.

They should not see tournament setup, player import, draw, group assignment, scoring controls, or publish controls.

### Super/Admin Support View

Higher-level admin users may see all operational areas and can switch perspective between BTC/admin, referee/scorer, and coach/captain views for support. The default view remains BTC/admin command center.

## Dependency-Based Locking

The app should distinguish hard locks from soft guidance.

### Hard Lock

Use a hard lock only when the user cannot safely perform the action without required data. A hard-locked action stays visible to allowed roles, but is disabled and explains:

- Why it is locked.
- What is required.
- Where to go next.

### Soft Guidance

Use soft guidance when a page can still be useful without prerequisites. The page opens, shows an empty state or setup card, and gives the next recommended action.

## Dependency Matrix

### Tournament Information

- Visibility: BTC/admin.
- Page access: open immediately.
- Mutation access: open to allowed admin roles.
- Guidance: show missing public fields, such as venue, opening time, and registration deadline.

### Ruleset / Config

- Visibility: BTC/admin.
- Page access: open immediately.
- Edit access: allowed while no dependent setup data exists.
- Read-only mode: after players, draw, groups, matches, lineups, or scoring data exists.
- Recovery: show rollback guidance when editing would invalidate downstream data.

Ruleset should not be locked just because the tournament status is not `DRAFT`; it should be locked because dependent data exists or backend rollback semantics are not active.

### Players

- Visibility: BTC/admin.
- Page access: open immediately.
- Add/import access: open early.
- Validation access: requires enough ruleset/config to know expected counts.
- Guidance: if config is missing, allow entering players but show that validation and draw need a valid ruleset.

### Team Draw

- Visibility: BTC/admin.
- Page access: open to BTC/admin so they can see requirements.
- Preview/confirm access: hard lock until a valid ruleset exists and the registered players meet the ruleset count/composition.
- Guidance: show exact missing requirements, for example `Cần 40 VĐV: 24 nam, 16 nữ`.

### Groups

- Visibility: BTC/admin.
- Page access: open to BTC/admin.
- Assignment access: hard lock until confirmed teams exist.
- Guidance: if teams do not exist, link to team draw.

### Schedule

Schedule must be split conceptually:

- Schedule setup: courts, time slots, default match duration, opening time, breaks. This opens from the beginning for BTC/admin.
- Match generation: actual match schedule generation. This is hard-locked until teams are assigned to groups.

The UI may keep one schedule page, but it should clearly separate `Cấu hình lịch` from `Sinh lịch thi đấu`.

### Lineup

- Visibility: BTC/admin and coach/captain.
- Page access: open to allowed roles.
- Submission access: hard lock until matches exist and the selected match is in a lineup-ready state.
- Captain filtering: coach/captain users only see matches and teams they are allowed to manage.
- Guidance: if no matches exist, explain that BTC must generate the schedule first.

### Scoring

- Visibility: BTC/admin and referee/scorer.
- Page access: open to allowed roles.
- Scoring access: hard lock until a match is ready/running and required lineups are locked.
- Guidance: if no match is ready, show the next dependency: lineup lock or schedule generation.

### Public Publishing

- Visibility: BTC/admin.
- Publish access: hard lock until required public data is complete.
- The user requirement for this project is strict: public publishing should require tournament completion.
- Completion means the tournament has enough final data for guests to view without operational gaps: tournament info, ruleset summary, teams, schedule/results, standings, bracket when a knockout stage is part of the tournament or has already been generated, and final/completed state.

## Command Center UX

The admin dashboard should become a role-aware command center.

### For BTC/Admin

Show:

- One primary `Việc cần làm tiếp theo` card.
- Role work summary cards: BTC, Trọng tài, HLV/Captain.
- Setup completeness checklist.
- Locked action cards with reasons and next links.
- Public readiness/publish checklist.

The next action card is computed from data dependencies, not from status phase alone.

Examples:

- `Cần bổ sung thông tin giải: địa điểm và thời gian khai mạc.`
- `Có thể nhập vận động viên. Bốc thăm sẽ mở khi đủ 40 VĐV theo ruleset.`
- `Đã có đội. Bước tiếp theo: phân bảng.`
- `Đã phân bảng. Bước tiếp theo: sinh lịch thi đấu.`
- `Giải chưa thể công khai vì chưa hoàn tất kết quả.`

### For Referee/Scorer

Show:

- `Trận cần xử lý` list.
- Large `Mở bàn trọng tài` action for ready/running matches.
- Empty state: `Chưa có trận nào sẵn sàng chấm điểm. BTC cần tạo lịch và khóa lineup trước.`

### For Coach/Captain

Show:

- `Đội của tôi`.
- `Trận cần nhập lineup`.
- `Lineup đã khóa`.
- Team schedule and results.
- Empty state: `Chưa có trận cần khai báo lineup.`

### For Guest

Route guests to the public tournament center. If they reach an admin route, redirect them to the public page or login page, depending on auth state.

## Language Guidelines

Do not use raw technical status or role enum values as primary UI copy.

Use human-readable labels:

- `DRAFT` -> `Đang chuẩn bị giải`
- `PLAYER_IMPORT` -> `Đang nhập vận động viên`
- `PLAYERS_READY` -> `Đủ vận động viên, có thể bốc thăm`
- `TEAM_DRAW_COMPLETED` -> `Đã có đội`
- `GROUP_ASSIGNED` -> `Đã phân bảng`
- `SCHEDULE_GENERATED` -> `Đã có lịch thi đấu`
- `RUNNING` -> `Đang thi đấu`
- `COMPLETED` -> `Đã hoàn tất`
- `PUBLISHED` -> `Đã công khai`

Locked messages should follow this pattern:

`[Tên chức năng] đang khóa vì [thiếu dữ liệu]. Hãy [hành động tiếp theo].`

Examples:

- `Bốc thăm đang khóa vì chưa đủ vận động viên. Hãy nhập đủ 40 VĐV theo ruleset.`
- `Sinh lịch thi đấu đang khóa vì chưa phân bảng. Hãy phân 8 đội vào bảng trước.`
- `Chấm điểm đang khóa vì lineup chưa được khóa. Hãy hoàn tất lineup của hai đội.`

## Data Flow

1. Auth/session identifies the user's role.
2. Tournament data loads with ruleset, player counts, teams, groups, matches, and public status where needed.
3. A shared policy computes:
   - Visible areas by role.
   - Access state by dependency.
   - Human lock reason.
   - Next recommended action.
4. Navigation, dashboard, route guards, and action buttons consume the same policy.
5. Backend endpoints enforce the same dependency constraints for mutations.

## Shared Policy Requirements

The shared policy should replace simple phase mapping with dependency checks.

It should expose functions such as:

- `getVisibleAreasForRole(role, tournamentContext)`.
- `getActionAccess(actionKey, role, tournamentContext)`.
- `getNextRecommendedAction(role, tournamentContext)`.
- `getHumanStatusLabel(status)`.
- `getPublishReadiness(tournamentContext)`.

`tournamentContext` should include only data needed for decisions:

- Tournament status and public flag.
- Ruleset presence/validity.
- Player total and composition counts.
- Team count.
- Group assignment status.
- Schedule/match count.
- Lineup readiness count.
- Completed/result-confirmed match count.
- Current user's team ownership when relevant.

## Error Handling

- Guest access to admin routes should redirect cleanly.
- Role-forbidden actions should show `Bạn không có quyền thực hiện thao tác này.` without exposing internal role names.
- Dependency-blocked actions should show missing data and next step.
- Backend dependency errors should be mapped to the same human language where possible.

## Testing

Policy tests should cover:

- Guest sees only public viewing areas.
- BTC/admin sees setup and operational areas.
- Referee/scorer sees scoring work only.
- Coach/captain sees team/lineup work only.
- Team draw is locked until ruleset and valid player counts exist.
- Group assignment is locked until teams exist.
- Schedule setup is open early.
- Match generation is locked until groups are assigned.
- Publish is locked until tournament completion/readiness requirements pass.

Manual verification should cover:

- Non-technical copy appears instead of raw enum values.
- Direct URLs cannot bypass role visibility or hard dependencies.
- Pages with soft guidance open and show useful empty states.
- Guest users cannot see operational controls.
