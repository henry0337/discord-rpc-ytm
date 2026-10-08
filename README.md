# Discord RPC for YouTube Music

Hiển thị bài đang nghe trên **YouTube Music (web)** thành Rich Presence trên **Discord desktop**
(dạng "Listening to YouTube Music", có ảnh bìa và thanh tiến trình). Hỗ trợ Chromium và Firefox.

```
music.youtube.com ──► content script ──► background ──► Native Messaging ──► host (Node) ──► Discord IPC
```

Trình duyệt không thể nói chuyện trực tiếp với Discord, nên cần một chương trình nhỏ chạy trên máy
(**native host**) làm cầu nối. Extension tự khởi động host khi bạn bắt đầu phát nhạc.

> Hiện chỉ hỗ trợ Windows và Discord desktop (chưa hỗ trợ Discord Web).

## Cài đặt (dành cho phát triển)

Yêu cầu: Node.js 22+ và Discord desktop đang chạy.

```powershell
npm install
npm run build
npm run install-host      # đăng ký host với Chrome, Edge, Chromium, Brave và Firefox (HKCU)
```

Sau đó nạp extension:

- **Chrome / Edge / Brave:** mở `chrome://extensions`, bật Developer mode, **Load unpacked**, chọn `dist/chrome`.
- **Firefox:** mở `about:debugging` → This Firefox → **Load Temporary Add-on**, chọn `dist/firefox/manifest.json`.

Mở `music.youtube.com`, phát một bài hát. Bấm icon extension để xem trạng thái host, Discord và bài đang phát.

Gỡ đăng ký host: `npm run uninstall-host`.

## Popup và cài đặt

Bấm icon extension để mở popup:

- Công tắc **On/Off** ở góc trên: tắt thì không hiện gì lên Discord.
- Hai viên thuốc trạng thái (**Helper**, **Discord**); khi lỗi có khung giải thích kèm lệnh để sửa.
- Thẻ **On Discord** vẽ giống activity thật (ảnh bìa, tên bài, tác giả, thanh tiến trình, nút).
- **Status text** (App / Song / Artist): phần hiện cạnh tên bạn trên Discord.
- **Progress bar**, **Play button**: bật/tắt thanh tiến trình và nút.
- **Original title**: với bài có tên ngoài chữ Latin, YouTube Music viết "tên gốc - bản Latin"
  (vd. `ひとひら - Hitohira`); bật thì chỉ hiện tên gốc (`ひとひら`). Chỉ cắt khi phần sau dấu " - " toàn chữ
  Latin và không phải nhãn phiên bản (Live, Instrumental, TV Size, Remix…); ghi chú trong ngoặc như
  `(Remastered)` được giữ lại. Đây là quy tắc đoán nên có công tắc để tắt. Logic ở `src/extension/originalTitle.ts`.
  Cùng công tắc này: với bài có tên ngoài chữ Latin, phần "(feat. …)" mà YouTube Music tự thêm vào tên bài (viết
  theo ngôn ngữ giao diện nên không đọc được) được lấy từ bản tiếng Anh của cùng dữ liệu, bỏ khỏi tên bài và
  nối tên collaborator vào dòng tác giả: `ピュア - Pure (cùng với Eriko Hashimoto)` thành tên bài `ピュア`, dòng 2
  `PAS TASTA, Eriko Hashimoto` (bỏ qua tên đã có trong danh sách tác giả). Tốn thêm một request cho mỗi bài như vậy.
  Logic ở `src/extension/credit.ts`.
- **Button language**: ngôn ngữ nhãn nút (mặc định theo trình duyệt).
- **When paused**: ẩn khỏi Discord, hoặc giữ lại và ghi "Paused · tên tác giả" (không có thanh tiến trình
  vì Discord sẽ tiếp tục đếm).
- **Troubleshooting → Copy diagnostics**: copy trạng thái (phiên bản, trình duyệt, cài đặt, kết nối, bài đang
  phát) để dán vào báo lỗi. Không chứa link.

Cài đặt lưu trong `storage.local` của extension. Logic quyết định popup hiện gì nằm ở
`src/extension/popupModel.ts`; `src/extension/popup.ts` chỉ biến nó thành DOM.

## Cách hiển thị trên Discord

- **Dòng 1:** tên bài. **Dòng 2:** các tác giả nối bằng ", " (không dùng "và"/"&" theo ngôn ngữ giao diện).
- **Bấm vào dòng tác giả:** mở kênh của tác giả **đầu tiên** trên YouTube Music, nếu tác giả đó có kênh.
  Discord chỉ cho một link cho cả dòng nên không gắn link riêng cho từng tên được.
- **Bấm vào ảnh bìa:** mở trang album, nếu bài có album.
- Không có dòng thứ 3: Discord dùng `large_text` làm dòng thứ 3 (và chữ khi hover ảnh), nên extension không đặt nó.
- Quảng cáo (tài khoản không có Premium) **không** hiện lên Discord.
- Danh sách tác giả và album lấy từ API nội bộ `youtubei/v1/next` của YouTube Music, gọi từ chính trang
  (`src/extension/page.ts`). API này không công khai và có thể đổi; khi gọi lỗi, extension quay về tên tác giả
  của `mediaSession` và bỏ các link.

## Nút "Play on YouTube Music (Web)"

Activity có thêm một nút mở bài hát trên `music.youtube.com`. Lưu ý:

- Discord **không hiện nút của chính bạn**, chỉ người khác xem profile mới thấy. Để kiểm tra, mở popup
  của extension: dòng *Button* hiện đúng nhãn và link sẽ gửi cho Discord.
- Ngôn ngữ nhãn nút mặc định theo **ngôn ngữ giao diện của trình duyệt**. Discord không cung cấp
  ngôn ngữ của người dùng cho extension, nên nếu Discord của bạn dùng ngôn ngữ khác trình duyệt, hãy chọn
  ngôn ngữ trong popup (*Button language*).
- Các ngôn ngữ hỗ trợ nằm trong `src/shared/i18n.ts` (nhãn tối đa 32 ký tự, test kiểm tra điều này).
  Ngôn ngữ chưa có sẽ dùng tiếng Anh. Thêm ngôn ngữ mới chỉ cần thêm một dòng vào bảng đó.
- `videoId` được đọc từ player của trang bằng một script chạy trong world chính (`world: "MAIN"`,
  cần Chrome 111+ / Firefox 128+). Nếu không đọc được thì nút sẽ không hiện.

## Phát triển

| Lệnh | Việc làm |
|---|---|
| `npm test` | Chạy unit test (Node test runner, không cần cài thêm gì) |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run build` | Build host và hai bản extension vào `dist/` |

Log của host nằm ở `%TEMP%\ytm-discord-rpc-host.log`.

## Ghi chú

- ID extension Chromium được cố định bởi trường `key` trong `src/extension/manifest.base.json`
  (một test kiểm tra nó khớp với `CHROMIUM_EXTENSION_ID`). Khi đưa lên Chrome Web Store, store sẽ cấp ID
  riêng: chạy `node dist/host/host.cjs --install --extension-id=<ID>` để cho phép ID đó.
- Application ID của Discord nằm trong `src/host/main.ts`.
