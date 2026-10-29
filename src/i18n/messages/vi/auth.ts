import type en from '../en/auth';

export default {
  'auth.signIn': 'Đăng nhập',
  'auth.continueGoogle': 'Tiếp tục với Google',
  'auth.syncTitle': 'Đăng nhập để đồng bộ tiến độ',
  'auth.syncBody': 'Các từ bạn đã học và đã lưu sẽ được đồng bộ trên mọi thiết bị của bạn.',
  'auth.continueWithout': 'Bạn cũng có thể <link>tiếp tục mà không đăng nhập</link>. Tiến độ sẽ được lưu trên máy này.',
  'auth.someone': 'Ai đó',
  'auth.invitedYou': '<name>{owner}</name> đã mời bạn tham gia một bộ sưu tập từ vựng',
  'auth.learnerCount': '{count} người học',
  'auth.takeIt': 'Nhận lời mời',
  'auth.gateTitle': 'Đăng nhập để tiếp tục',
  'auth.gateBody': 'Đăng nhập để bắt đầu học — tiến độ của bạn được đồng bộ trên mọi thiết bị.',
} satisfies Record<keyof typeof en, string>;
