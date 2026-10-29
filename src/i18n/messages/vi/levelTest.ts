import type en from '../en/levelTest';

export default {
  'levelTest.title': 'Tìm trình độ của bạn',
  'levelTest.round': 'Vòng {current}/{total}',
  'levelTest.tapKnown': 'Chạm vào mọi từ bạn biết.',
  'levelTest.phaseSimple': 'Từ đơn giản',
  'levelTest.phaseSimpleDesc': 'Cơ bản hằng ngày · A1–A2',
  'levelTest.phaseEveryday': 'Từ thông dụng',
  'levelTest.phaseEverydayDesc': 'Giao tiếp và đọc hiểu · B1–B2',
  'levelTest.phaseAdvanced': 'Từ nâng cao',
  'levelTest.phaseAdvancedDesc': 'Từ học thuật và hiếm gặp · C1–C2',
  'levelTest.knowAll': '✓ Tôi biết hết',
  'levelTest.knowAllNext': '✓ Tôi biết hết — từ khó hơn →',
  'levelTest.nextRound': 'Vòng tiếp: từ khó hơn →',
  'levelTest.seeLevel': 'Xem trình độ của tôi',
  'levelTest.yourLevel': 'Trình độ của bạn: {level}',
  'levelTest.startThere': 'Hãy bắt đầu từ đây — ứng dụng sẽ lên lịch cho mọi từ bạn học và điều chỉnh theo câu trả lời của bạn.',
  'levelTest.studyingToast': 'Đang học “{level}”',
  'levelTest.study': 'Học {level}',
  'levelTest.retake': 'Làm lại',
} satisfies Record<keyof typeof en, string>;
