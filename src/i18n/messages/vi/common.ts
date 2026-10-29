import type en from '../en/common';

export default {
  'common.close': 'Đóng',
  'common.back': 'Quay lại',
  'common.copy': 'Sao chép',
  'common.clear': 'Xóa',
  'common.more': '+{count} nữa',
  'common.wordCount': '{count} từ',
  'common.previewSample': '{shown} trên {total} từ, chọn ngẫu nhiên',
  'common.previewReshuffle': 'Xem các từ khác',
  'common.searchPlaceholder': 'Tìm bằng {learn} hoặc {mother}…',
  'common.searchEnterHint': 'Nhấn Enter để tra từ',
  'common.searchEscHint': '<kbd>Esc</kbd> để đóng',
  'common.filterRecent': 'Gần đây',
  'common.filterSaved': 'Đã lưu',
  'common.noResponse': 'Không nhận được phản hồi.',
  'common.errNotConnected': 'Chưa kết nối.',
  'common.errUnreachable': 'Không thể kết nối máy chủ.',
  'common.errSignIn': 'Vui lòng đăng nhập.',
  'common.errRequestFailed': 'Yêu cầu thất bại ({status}).',
} satisfies Record<keyof typeof en, string>;
