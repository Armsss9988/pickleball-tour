# 16 — Acceptance Criteria

This file defines when MVP is considered done.

## 1. Global acceptance

MVP is accepted when BTC can operate Golab tournament from imported player list to final result without using spreadsheets for core scoring/ranking.

## 2. Auth acceptance

* Admin can login.
* Scorer can login.
* Unauthorized user cannot access admin pages.
* Public viewer can access public page without login.
## 3. Player acceptance

* Admin can add player manually.
* Admin can import 40 players.
* System stores players as `player_profiles` without requiring user account.
* System creates tournament registrations.
* System validates:
    * Total 40.
    * Male 24.
    * Female 16.
* System warns duplicate names.
## 4. Team draw acceptance

* Team draw cannot run if player validation fails.
* Team draw creates preview of 8 teams.
* Each team has exactly 5 players.
* Each team has exactly 3 male and 2 female.
* No player appears in more than one team.
* Admin can redraw before confirm.
* Every draw is saved in audit/history.
* Confirming draw creates teams and team members.
## 5. Group acceptance

* Admin can assign teams to Bảng A/B.
* Each group must have exactly 4 teams.
* A team cannot be in both groups.
* System blocks invalid group confirmation.
## 6. Schedule acceptance

* System generates 6 matches per group.
* Total group-stage matches = 12.
* Each pair in same group plays exactly once.
* Admin can edit court/time.
* Public page shows schedule.
## 7. Lineup acceptance

* System supports 3 contents:
    * Đôi Nam.
    * Đôi Nữ.
    * Đôi Nam Nữ.
* System supports drawing/manual setting segment order before match.
* Segment target scores are 8, 16, 24 by order.
* Admin/Scorer can enter lineup for both teams.
* System validates gender composition.
* System validates all 5 members play.
* System validates male player appears max once.
* System blocks match start if lineup invalid.
## 8. Scoring acceptance

* Scorer can start ready match.
* Score starts at 0-0.
* Scorer can add point for Team A/B.
* Each point creates score event.
* Segment 1 ends when a team reaches 8.
* Segment 2 inherits score and ends when a team reaches 16.
* Segment 3 inherits score and match ends when a team reaches 24.
* Final 24-23 is accepted.
* Scorer can undo latest point before result confirmation.
* Cannot add score after match completed.
* Cannot mutate result after confirmed without override permission.
## 9. Realtime acceptance

* Public live score updates after scoring event.
* Match page updates segment completion.
* Scoreboard displays active segment and target score.
## 10. Standing acceptance

* After confirmed group match, standings recalculate.
* Standings show:
    * matches played.
    * wins.
    * losses.
    * points for.
    * points against.
    * point diff.
    * rank.
* Ranking follows:
    1. wins.
    2. point diff.
    3. head-to-head.
* Unresolved tie is flagged.
## 11. Bracket acceptance

* Knockout generation requires group stage completed.
* System selects top 3 per group.
* A1 and B1 get bye to semifinal.
* P1 = A2 vs B3.
* P2 = B2 vs A3.
* SF1 = A1 vs Winner P2.
* SF2 = B1 vs Winner P1.
* Final = Winner SF1 vs Winner SF2.
* Winners advance automatically after result confirmation.
## 12. Award acceptance

* Champion = final winner.
* Runner-up = final loser.
* Co-third = semifinal losers.
* Award recipients generated for all 5 members of awarded teams.
## 13. Public page acceptance

Public page shows:

* Tournament info.
* Teams and players.
* Groups.
* Schedule.
* Live score.
* Standings.
* Bracket.
* Awards.
Public page does not show:

* User emails.
* Internal notes.
* Audit logs.
* Passwords or sensitive fields.
## 14. Audit acceptance

Audit log records:

* Player import.
* Team draw preview.
* Team draw confirm.
* Group assignment.
* Schedule generation.
* Lineup lock.
* Score undo.
* Result confirm.
* Manual override.
Override actions require reason.

## 15. Production readiness acceptance

Before real tournament:

* DB backup plan ready.
* Admin account secured.
* Scorer device tested.
* Public URL tested on mobile.
* Offline/manual fallback exported.
* Seed/fake tournament test completed end-to-end.
