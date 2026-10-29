import type en from '../en/quickPrefs';

export default {
  'quickPrefs.title': 'Ngôn ngữ & giọng đọc',
  'quickPrefs.engineAuto': 'Tự động',
  'quickPrefs.autoUsing': 'Đã tự chọn {engine} cho thiết bị này.',
  'quickPrefs.heavy': 'Có thể chậm trên thiết bị này',
  'quickPrefs.heavyWarning': 'Giọng này có thể bị giật hoặc treo trên thiết bị này. Chế độ Tự động sẽ dùng {engine}.',
  'quickPrefs.engineNative': 'Thiết bị',
  'quickPrefs.enginePiper': 'Piper',
  'quickPrefs.engineKokoro': 'Kokoro',
  'quickPrefs.kokoroUnavailable': 'Kokoro không dùng được trên Safari — hãy thử Piper',
  'quickPrefs.nativeHint': 'Dùng giọng đọc có sẵn của thiết bị. Chọn Piper hoặc Kokoro để có thêm giọng.',
  'quickPrefs.preview': 'Nghe thử giọng',
  'quickPrefs.stop': 'Dừng',
  'quickPrefs.allSettings': 'Tất cả cài đặt',
} satisfies Record<keyof typeof en, string>;
