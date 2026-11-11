import type en from '../en/pron';

export default {
  'pron.check': 'Kiểm tra phát âm',
  'pron.tryAgain': 'Thử lại',
  'pron.stop': 'Dừng',
  'pron.sayNow': 'Hãy đọc từ này…',
  'pron.firstTime': 'Chạy trên máy của bạn — tải một lần {mb}MB',
  'pron.downloading': 'Đang tải mô hình… {pct}%',
  'pron.checking': 'Đang kiểm tra…',
  'pron.denied': 'Quyền truy cập micro đã bị chặn.',
  'pron.error': 'Không kiểm tra được — hãy thử lại.',
  'pron.nothingHeard': 'Chưa nghe thấy gì — hãy thử lại to hơn một chút.',
  'pron.heardInstead': '/{expected}/ nghe giống /{heard}/ ({score}) — mở âm này',
  'pron.notHeard': 'Không nghe thấy /{expected}/ — mở âm này',
  'pron.weHeard': 'Chúng tôi nghe thấy {ipa}',
} satisfies Record<keyof typeof en, string>;
