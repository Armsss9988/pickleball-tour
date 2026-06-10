# 10 — UI/UX Spec

## 1. UX principle

MVP should follow actual operation flow on tournament day.

Primary navigation should not be feature-based only. It should mirror BTC workflow:

```txt
Tổng quan -> VĐV -> Chia đội -> Chia bảng -> Lịch -> Đội hình -> Nhập điểm -> BXH -> Knockout -> Kết quả
```

## 2. Admin Console layout

### Sidebar

```txt
1. Tổng quan
2. VĐV
3. Chia đội
4. Chia bảng
5. Lịch thi đấu
6. Đội hình trận
7. Nhập điểm
8. Bảng xếp hạng
9. Knockout
10. Giải thưởng
11. Audit log
12. Cài đặt giải
```

### Header

Show:

* Tournament name.
* Tournament status.
* Public page button.
* Current user.
## 3. Dashboard screen

Purpose: show tournament readiness.

Cards:

* VĐV: `40/40`, Nam `24/24`, Nữ `16/16`.
* Đội: `8/8`.
* Bảng: `2/2`.
* Lịch: `12 trận vòng bảng`.
* Trận đã hoàn thành.
* Trạng thái giải.
Warnings:

* Deadline đăng ký sau ngày khai mạc.
* VĐV chưa đủ.
* Đội chưa chốt.
* Có tie chưa xử lý.
## 4. Player screen

### Features

* Table of players.
* Search by name.
* Filter by gender.
* Add player modal.
* Import CSV/Excel.
* Validation summary.
### Columns

```txt
STT
Họ tên
Giới tính
SĐT
Trạng thái đăng ký
Claim status
Ghi chú
Actions
```

### Validation panel

Display:

```txt
Tổng VĐV: 40 / 40
Nam: 24 / 24
Nữ: 16 / 16
Trạng thái: Đủ điều kiện bốc thăm
```

If invalid, use red warning and list exact errors.

## 5. Team draw screen

### State before draw

Show:

* Rules: 8 đội, mỗi đội 3 nam + 2 nữ.
* Button: `Bốc thăm đội`.
* Button disabled if player validation fails.
### Preview state

Show 8 team cards.

Each card:

```txt
Đội 1
Nam:
- Nguyễn Văn A
- Nguyễn Văn B
- Nguyễn Văn C
Nữ:
- Trần Thị D
- Lê Thị E
```

Actions:

* Bốc lại.
* Chốt kết quả.
* Xuất danh sách.
Show seed:

```txt
Random seed: 20260614-GOLAB-ABC123
Algorithm: team-draw-v1
```

### Confirmed state

* Team cards locked.
* Allow edit team name.
* Allow assign captain.
* Manual change requires reason and audit.
## 6. Group assignment screen

Show two columns:

```txt
Bảng A
- Đội 1
- Đội 2
- Đội 3
- Đội 4

Bảng B
- Đội 5
- Đội 6
- Đội 7
- Đội 8
```

Features:

* Drag/drop teams.
* Random assign.
* Validate group size.
* Confirm.
## 7. Schedule screen

Views:

* Table view.
* Group by round.
* Group by court/time.
Columns:

```txt
Match No
Bảng/Vòng
Đội A
Đội B
Giờ
Sân
Trạng thái
Actions
```

Actions:

* Edit time/court.
* Open lineup.
* Open scoring.
## 8. Match lineup screen

### Layout

Header:

```txt
Match #1 — Bảng A
Đội 1 vs Đội 2
Status: Lineup pending
```

Segment order panel:

```txt
Chặng 1: Đôi Nam Nữ — đến 8 điểm
Chặng 2: Đôi Nam — đến 16 điểm
Chặng 3: Đôi Nữ — đến 24 điểm
```

If no segment order:

* Button: `Bốc thăm thứ tự nội dung`.
* Or manual selection.
### Lineup input

Two side-by-side team panels.

For each segment:

```txt
Chặng 1 - Đôi Nam Nữ
[Select male] [Select female]
```

Validation should be instant.

Show errors clearly:

```txt
Nguyễn Văn A đang được xếp ở 2 nội dung. VĐV nam chỉ được đánh tối đa 1 nội dung.
```

Actions:

* Save draft.
* Validate.
* Lock lineup.
## 9. Scorer screen

Scorer screen must be very simple and large.

### Header

```txt
Đội 1 vs Đội 2
Chặng 2 / 3 — Đôi Nam — mốc 16
```

### Score display

Large score:

```txt
Đội 1     15
Đội 2     12
```

### Buttons

* `+1 Đội 1`
* `+1 Đội 2`
* `Undo điểm cuối`
* `Bắt đầu chặng tiếp theo`
* `Xác nhận kết quả`
When segment target reached:

Show modal:

```txt
Chặng 1 kết thúc. Đội 1 đạt 8 điểm.
Vui lòng đổi sân trước khi bắt đầu chặng 2.
```

## 10. Standings screen

Show by group.

Columns:

```txt
Hạng
Đội
Trận
Thắng
Thua
Điểm ghi
Điểm thua
Hiệu số
Ghi chú tie-break
```

If unresolved tie:

* Highlight tied teams.
* Button: `Admin quyết định thứ hạng`.
* Require reason.
## 11. Bracket screen

Show bracket tree:

```txt
P1: A2 vs B3
P2: B2 vs A3
SF1: A1 vs Winner P2
SF2: B1 vs Winner P1
Final: Winner SF1 vs Winner SF2
```

Allow click match to open lineup/scoring.

## 12. Public page

Public page should be clean and mobile-friendly.

Sections:

1. Hero: tournament name, venue, date.
2. Teams.
3. Groups.
4. Schedule.
5. Live score.
6. Standings.
7. Bracket.
8. Awards.
9. Sponsors.
No login required.

## 13. Empty states

Examples:

* Player list empty: `Chưa có VĐV. Hãy nhập thủ công hoặc import file.`
* Team draw disabled: `Cần đủ 24 nam và 16 nữ trước khi bốc thăm.`
* Schedule empty: `Cần chia bảng trước khi tạo lịch.`
* Lineup empty: `Chưa bốc thăm thứ tự nội dung.`
## 14. Loading and error states

* Use skeleton loading for tables.
* Use toast for success.
* Use inline error for validation.
* Use confirmation modal for destructive actions.
## 15. Mobile considerations

Scorer and Public page must work well on mobile.

Admin console can be desktop-first.

## 16. Design tone

* Vietnamese UI.
* Clear operational wording.
* Avoid technical terms in UI.
* Use terms BTC already understands: VĐV, Đội, Bảng, Trận, Chặng, Đội hình, Bốc thăm, Chốt kết quả.
