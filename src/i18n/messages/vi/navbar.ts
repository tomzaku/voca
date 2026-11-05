import type en from '../en/navbar';

export default {
  'navbar.openMenu': 'Mở menu',
  'navbar.search': 'Tìm kiếm',
  'navbar.searchTitle': 'Tìm một từ ({shortcut})',
  'navbar.viewProfile': 'Xem hồ sơ — đã đăng nhập với tên {name}',
  'navbar.account': 'tài khoản',
  'navbar.signIn': 'Đăng nhập',
  'navbar.goalProgress': 'Hôm nay {done}/{goal} từ',
} satisfies Record<keyof typeof en, string>;
