# Web Limit Extension

An advanced, highly-customizable Chrome Extension built on Manifest V3 designed to help users restrict their access to distracting websites. With flexible temporal rules, individual or aggregated tracking modes, and a "typing challenge" feature to prevent impulse changes, this extension acts as a powerful tool for digital minimalism and productivity.

## Features

*   **Custom Limit Policies:** Create multiple policies grouping various websites (using exact domains or wildcards like `*://*.youtube.com/*`).
*   **Time-Based Rules:** Set daily limits, time-of-day windows (e.g., limit social media from 9 AM to 5 PM), and customize rules based on the day of the week (e.g., stricter limits on weekdays than weekends).
*   **Limit Tracking Strategies:**
    *   **Aggregate Time:** Pool your time allowance across an entire category of sites.
    *   **Per-Website Time:** Grant an independent time allowance to every individual site matched out of your policy list.
*   **Pause Allowances:** Once a site is blocked, optionally allow a configurable amount of 5-minute "pauses" per day for emergency access. 
*   **Hardcore Typing Challenge:** Enable a setting that forces you to type out a randomly selected, 50-100 word paragraph (with up to 2% error tolerance) before you are permitted to edit or delete any established rules.
*   **Usage Reports:** View your daily browsing history across all tracked sites and policies. Easily clear old data after a configurable number of days.
*   **Smart Idle Tracking:** The extension monitors your system's idle state. It will instantly pause tracking your time if you step away from your computer, letting your screen lock or sleep.
*   **Dynamic Visual Icons:** The extension icon changes color dynamically as you browse, visually indicating when a tab is actively being tracked.

## Installation (Developer Mode)

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** via the toggle switch in the top right corner.
4. Click the **Load unpacked** button in the top left.
5. Select the folder containing the extension files (`manifest.json`, etc.).
6. The *Web Limit* extension is now installed. Pin it to your toolbar for easy access!

## Usage Guide

1. **Accessing Settings:** Click on the Web Limit icon in your Chrome toolbar, then click "Manage Policies".
2. **Creating Rules:** Click "+ New Policy" on the manage page. Define your websites, tracking mode, allowed pauses, and your specific time limits or boundaries. 
3. **Tracking Progress:** While on a restricted website, simply click the extension icon to view a live, running progress bar of your remaining time allowance.
4. **Viewing Reports:** Inside the settings page, click the "Reports" tab to see a breakdown of time spent on restricted sites grouped by date.

---

# Tiện ích mở rộng Web Limit

Một tiện ích mở rộng Chrome tiên tiến, dễ dàng tùy chỉnh, được xây dựng trên Manifest V3. Tiện ích này được thiết kế để giúp người dùng hạn chế việc truy cập vào các trang web gây xao nhãng. Với các quy tắc thời gian linh hoạt, chế độ theo dõi độc lập hoặc tổng hợp, cùng với tính năng "thử thách gõ phím" để ngăn chặn các thay đổi bốc đồng, tiện ích này đóng vai trò như một công cụ mạnh mẽ cho lối sống tối giản kỹ thuật số và tăng hiệu suất làm việc.

## Các Tính Năng Chính

*   **Chính Sách Hạn Chế Tùy Chỉnh:** Tạo nhiều chính sách, nhóm các trang web khác nhau lại (sử dụng tên miền chính xác hoặc ký tự đại diện như `*://*.youtube.com/*`).
*   **Quy Tắc Theo Thời Gian:** Thiết lập giới hạn theo ngày, khung giờ trong ngày (ví dụ: giới hạn mạng xã hội từ 8 giờ sáng đến 5 giờ chiều), và tùy chỉnh lịch biểu theo các ngày trong tuần (ví dụ: siết chặt giới hạn vào các ngày trong tuần so với cuối tuần).
*   **Chiến Lược Theo Dõi Giới Hạn:**
    *   **Thời Gian Tổng Hợp (Aggregate):** Gộp chung thời gian cho phép sử dụng trên toàn bộ danh mục trang web.
    *   **Thời Gian Từng Trang Web (Per-Website):** Cấp thời gian cho phép một cách độc lập cho từng trang web cụ thể khớp với chính sách của bạn.
*   **Tính Năng Tạm Dừng:** Khi một trang web bị chặn, bạn có thể thiết lập cho phép tạm ngưng lệnh chặn trong vòng 5 phút (với số lượng lần tạm dừng tối đa có thể cấu hình mỗi ngày) nhằm mục đích truy cập khẩn cấp.
*   **Thử Thách Gõ Phím Cực Khó:** Bật chế độ buộc bạn phải gõ lại một đoạn văn dài 50-100 từ (được chọn ngẫu nhiên, với tỷ lệ sai sót tối đa cho phép là 2%) trước khi bạn được quyền chỉnh sửa hoặc xóa bất kỳ quy tắc nào bạn đã thiết lập.
*   **Báo Cáo Sử Dụng:** Theo dõi lịch sử duyệt web hàng ngày của bạn với tất cả các trang web và chính sách bị giới hạn. Dễ dàng xóa dữ liệu cũ sau một số ngày nhất định.
*   **Theo Dõi Trạng Thái Chờ Thông Minh (Idle Tracking):** Tiện ích sẽ theo dõi trạng thái nhàn rỗi trên hệ thống máy tính của bạn. Bộ đếm thời gian sẽ lập tức tạm dừng nếu bạn rời khỏi máy tính và để màn hình khóa hoặc chuyển sang chế độ ngủ.
*   **Biểu Tượng Động (Dynamic Icons):** Biểu tượng của tiện ích sẽ tự động đổi màu trong quá trình bạn duyệt web, thể hiện trực quan khi tab hiện tại bắt đầu bị theo dõi và tính thời gian.

## Cài đặt (Chế Độ Nhà Phát Triển)

1. Clone hoặc tải mã nguồn extension này về máy.
2. Mở Google Chrome và truy cập vào đường dẫn: `chrome://extensions/`.
3. Bật tùy chọn **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên bên phải màn hình.
4. Bấm vào nút **Load unpacked (Tải tiện ích đã giải nén)**.
5. Chọn thư mục có chứa tệp `manifest.json`.
6. Tiện ích *Web Limit* đã được cài đặt. Hãy ghim nó lên thanh công cụ để dễ dàng sử dụng!

## Hướng Dẫn Sử Dụng

1. **Truy Cập Cài Đặt:** Nhấn vào biểu tượng Web Limit trên thanh công cụ, chọn "Manage Policies" (Quản lý các chính sách).
2. **Tạo Bộ Quy Tắc:** Bấm nút "+ New Policy" (Chính sách mới). Hãy khai báo các trang web, chọn chế độ hẹn giờ, giới hạn số lần tạm dừng, và quy định giới hạn thời gian cụ thể của bạn.
3. **Theo Dõi Tiến Trình:** Khi truy cập vào một website đang bị theo dõi, hãy nhấp vào biểu tượng của tiện ích, bạn sẽ thấy một thanh tiến trình đang chạy theo thời gian thực thể hiện thời gian lượng còn lại trong ngày.
4. **Xem Báo Cáo:** Trong màn hình Cài đặt, chuyển tới thẻ "Reports" (Báo cáo) để xem thống kê chi tiết thời gian đã sử dụng dành cho các trang web bị giới hạn, được liệt kê cụ thể theo từng ngày.
