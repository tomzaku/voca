import type en from '../en/friends';

export default {
  'friends.title': 'Bạn bè',
  'friends.add': 'Kết bạn',
  'friends.requested': 'Đã gửi lời mời',
  'friends.cancelHint': 'Đã gửi lời mời — bấm để rút lại',
  'friends.accept': 'Đồng ý',
  'friends.decline': 'Từ chối',
  'friends.cancel': 'Huỷ',
  'friends.remove': 'Huỷ kết bạn',
  'friends.isFriend': 'Bạn bè',
  'friends.requestSent': 'Đã gửi lời mời kết bạn tới {name}',
  'friends.nowFriends': 'Bạn và {name} đã là bạn bè',
  'friends.confirmRemove': 'Huỷ kết bạn với {name}?',
  'friends.openWorld': 'Mở thế giới',
  'friends.loading': 'Đang tải danh sách bạn bè…',
  'friends.loadFailed': 'Không tải được danh sách bạn bè.',
  'friends.incoming': '{n} lời mời',
  'friends.outgoing': 'Đang chờ trả lời',
  'friends.unread': '{n} tin nhắn chưa đọc',
  'friends.empty': 'Chưa có bạn bè. Chạm vào ai đó trong thế giới, hoặc một người học trên bảng của bộ từ hay đội, rồi chọn Kết bạn.',
} satisfies Record<keyof typeof en, string>;
