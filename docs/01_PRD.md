# 01 — Product Requirement Document

## 1. Product name

**Golab Tournament Management Platform**

## 2. Product type

Admin-first web app để điều hành giải pickleball đồng đội Golab. Đây là MVP đầu tiên, có thiết kế nền để sau này phát triển thành Tournament SaaS.

## 3. Problem

Ban tổ chức đã có danh sách VĐV đăng ký, nhưng việc chia đội, chia bảng, tạo lịch, nhập đội hình, nhập điểm, tính bảng xếp hạng và công bố kết quả nếu làm thủ công sẽ dễ sai, khó minh bạch và khó theo dõi realtime.

Các nghiệp vụ đặc thù như:

* 40 VĐV gồm 24 nam, 16 nữ.
* 8 đội, mỗi đội 3 nam + 2 nữ.
* Bốc thăm đội công khai.
* 2 bảng A/B, mỗi bảng 4 đội.
* Vòng bảng round-robin.
* Mỗi trận đánh theo format tiếp sức 24 điểm qua 3 nội dung.
* Chọn top 3 mỗi bảng vào knock-out.
* Đội nhất bảng vào thẳng bán kết.
Nếu không có hệ thống hỗ trợ, ngày thi đấu rất dễ rối.

## 4. MVP goal

Cho phép BTC vận hành trọn vẹn Giải Pickleball đồng đội Cúp Golab lần 2 từ danh sách VĐV đã có sẵn đến kết quả cuối cùng.

## 5. Non-goals của MVP

MVP **không làm** các phần sau:

* VĐV tự tạo tài khoản.
* VĐV tự đăng ký giải.
* Payment/thu phí.
* Ranking cá nhân dài hạn.
* Mobile app native.
* Social network/community.
* Subscription/billing SaaS.
* AI nâng cao phân tích phong độ.
MVP vẫn thiết kế dữ liệu để sau này bổ sung các phần trên mà không phải đập lại hệ thống.

## 6. Primary users

### 6.1 Admin/BTC

Người quản lý giải. Có quyền:

* Nhập/import VĐV.
* Validate danh sách.
* Bốc thăm/chia đội.
* Chia bảng.
* Tạo/chỉnh lịch.
* Nhập hoặc kiểm tra lineup.
* Theo dõi trận.
* Override khi có lỗi.
* Chốt kết quả.
### 6.2 Scorer/Trọng tài nhập điểm

Người điều hành điểm số trận đấu. Có quyền:

* Mở trận được phân công.
* Xem đội hình.
* Bắt đầu trận.
* Cộng/trừ/undo điểm.
* Chuyển chặng.
* Xác nhận kết quả.
### 6.3 Captain/Đội trưởng — optional trong MVP

Có thể chưa cần tài khoản. Nếu làm portal captain thì captain có quyền:

* Xem đội mình.
* Xem lịch.
* Nhập lineup.
* Submit lineup.
Trong MVP tối giản, captain báo lineup ngoài đời, Admin hoặc Scorer nhập vào app.

### 6.4 Public viewer

Không cần đăng nhập. Có thể xem:

* Thông tin giải.
* Danh sách đội.
* Lịch thi đấu.
* Live score.
* BXH.
* Bracket.
* Kết quả.
## 7. Business rules từ điều lệ Golab

### 7.1 Thông tin giải

* Tên: Giải Pickleball đồng đội Cúp Golab lần 2 - Đường đua tiếp sức đoàn kết.
* Đơn vị tổ chức chính: GOLAB.
* Sân: Cụm sân Pickleball Hùng Hà.
* Nhà tài trợ hiện vật: ZOCKER.
* Thời gian khai mạc: 08:00 sáng Chủ Nhật 14/06/2026.
* Hạn đăng ký trong tài liệu đang ghi 24/06/2026, sau ngày khai mạc. Hệ thống cần cảnh báo bất thường, nhưng cho admin override.
### 7.2 VĐV và đội

* Tổng VĐV: 40.
* Nam: 24.
* Nữ: 16.
* Tổng đội: 8.
* Mỗi đội: 5 thành viên.
* Mỗi đội bắt buộc: 3 nam + 2 nữ.
* Cơ chế chia đội: bốc thăm ngẫu nhiên công khai.
### 7.3 Đội hình thi đấu

* Tất cả 5 thành viên trong đội phải ra sân trong một trận.
* VĐV nam chỉ được ra sân tối đa 1 nội dung trong một trận.
* 3 VĐV nam của một đội không được đánh trùng giữa Đôi Nam và Đôi Nam Nữ.
* Nữ không có ràng buộc tối đa số nội dung trong tài liệu. Vì đội có 2 nữ nhưng có Đôi Nữ và Đôi Nam Nữ, ít nhất một nữ sẽ phải đánh 2 nội dung.
### 7.4 Vòng đấu

* 8 đội chia thành 2 bảng: A và B.
* Mỗi bảng có 4 đội.
* Các đội trong bảng đấu vòng tròn một lượt.
* Mỗi bảng có 6 trận, tổng vòng bảng có 12 trận.
* Xếp hạng theo:
    1. Số trận thắng.
    2. Hiệu số điểm thắng/thua.
    3. Đối đầu trực tiếp.
* Chọn 3 đội tốt nhất mỗi bảng vào knock-out.
* Đội nhất mỗi bảng vào thẳng bán kết.
### 7.5 Match format: Đường đua Tiếp sức 24

* Một trận có 3 nội dung: Đôi Nam, Đôi Nữ, Đôi Nam Nữ.
* Trước mỗi trận, thứ tự 3 nội dung được bốc thăm.
* Điểm được kế thừa liên tục qua 3 chặng.
* Chặng 1 kết thúc khi một đội đạt 8 điểm.
* Chặng 2 kết thúc khi một đội đạt 16 điểm.
* Chặng 3 kết thúc khi một đội đạt 24 điểm.
* Đội chạm 24 trước thắng trận.
* Không áp dụng luật cách biệt 2 điểm.
* Sau chặng 1 và chặng 2 có đổi sân.
## 8. MVP functional requirements

### FR-01: Authentication cho BTC/Scorer

* Admin đăng nhập bằng email/password.
* Scorer đăng nhập bằng tài khoản được tạo sẵn.
* Không bắt buộc VĐV có tài khoản.
### FR-02: Tournament setup

* Admin tạo/mở giải Golab.
* Admin xem/sửa thông tin cơ bản của giải.
* Hệ thống lưu ruleset của giải.
### FR-03: Player import

* Admin thêm VĐV thủ công.
* Admin import CSV/Excel.
* Mỗi VĐV có tối thiểu: họ tên, giới tính.
* SĐT, ghi chú là optional.
* Hệ thống tạo `player_profile` unclaimed và `tournament_registration` approved.
### FR-04: Player validation

Hệ thống kiểm tra:

* Tổng VĐV = 40.
* Nam = 24.
* Nữ = 16.
* Không thiếu tên.
* Không thiếu giới tính.
* Cảnh báo tên trùng.
### FR-05: Team draw

* Admin bấm bốc thăm đội.
* Hệ thống tạo 8 đội.
* Mỗi đội có 3 nam + 2 nữ.
* Có preview trước khi chốt.
* Có thể bốc lại trước khi chốt.
* Mọi lần bốc thăm lưu audit.
* Khi chốt, khóa danh sách đội.
### FR-06: Group assignment

* Admin chia 8 đội vào Bảng A/B.
* Hỗ trợ kéo thả hoặc bốc thăm bảng.
* Mỗi bảng phải có 4 đội.
### FR-07: Schedule generation

* Hệ thống tạo lịch round-robin cho mỗi bảng.
* Admin có thể chỉnh giờ/sân/thứ tự trận.
* Public page hiển thị lịch.
### FR-08: Match lineup

* Admin/Scorer nhập lineup cho từng đội trong từng trận.
* Hệ thống bốc thăm hoặc nhập thứ tự 3 nội dung.
* Hệ thống validate lineup theo ruleset.
* Không cho bắt đầu trận nếu lineup không hợp lệ.
### FR-09: Scoring

* Scorer bắt đầu trận.
* Scorer cộng điểm cho đội A/B.
* Hệ thống tự nhận biết đạt mốc 8/16/24.
* Hệ thống chuyển trạng thái chặng.
* Hỗ trợ undo điểm.
* Lưu từng điểm vào `score_events`.
* Khi một đội chạm 24, trận kết thúc.
### FR-10: Standings

* Hệ thống tự tính BXH sau mỗi trận vòng bảng.
* Tiêu chí: wins, point_diff, head_to_head.
* Nếu vẫn bằng, hệ thống cần cảnh báo admin cần rule phụ/decision.
### FR-11: Knockout bracket

* Hệ thống lấy top 3 mỗi bảng.
* A1 và B1 vào thẳng bán kết.
* Playoff: A2 vs B3, B2 vs A3.
* Winner playoff gặp đội nhất bảng đối diện.
* Winner bán kết vào chung kết.
* Hai đội thua bán kết đồng giải ba.
### FR-12: Public page

Public viewer xem được:

* Tổng quan giải.
* Danh sách đội.
* VĐV theo đội.
* Bảng A/B.
* Lịch đấu.
* Live score.
* BXH.
* Bracket.
* Kết quả trao giải.
## 9. Non-functional requirements

### NFR-01: Auditability

Mọi thao tác quan trọng phải có audit log.

### NFR-02: Data integrity

Không cho trạng thái sai như:

* Bắt đầu trận khi chưa có lineup.
* Chốt đội khi không đủ 3 nam + 2 nữ.
* Tạo lịch khi bảng chưa đủ 4 đội.
* Cộng điểm khi trận đã completed.
### NFR-03: Realtime

Live scoreboard phải cập nhật gần realtime. MVP có thể dùng WebSocket trong NestJS.

### NFR-04: Extensibility

Không hard-code Golab quá sâu. Các rule quan trọng phải lấy từ ruleset config.

### NFR-05: AI-readable codebase

Repo cần có docs, tests, typed DTO, clear module boundaries để AI coding agent có thể sửa chính xác.

