// Xin xăm at Thiên Mụ: shake the cup until one numbered stick falls, and read
// its fortune — a line of luck in both languages, and an English word to
// carry for the day, with its meaning and a sentence. One stick a day: the
// draw is kept on this device, so shaking again shows the same one until
// tomorrow, as asking twice is no way to treat a fortune.

export type Luck = 'great' | 'good' | 'fair';

export interface Fortune {
  /** The stick's number, as painted on it. */
  n: number;
  luck: Luck;
  en: string;
  vi: string;
  word: string;
  /** The word's meaning, in English and Vietnamese. */
  meaning: { en: string; vi: string };
  example: string;
}

export const FORTUNES: Fortune[] = [
  { n: 1, luck: 'great', en: 'A door you thought was shut will open this week.', vi: 'Cánh cửa bạn tưởng đã đóng sẽ mở ra trong tuần này.', word: 'opportunity', meaning: { en: 'a chance to do something good', vi: 'cơ hội' }, example: 'Every new word is an opportunity to say more.' },
  { n: 2, luck: 'good', en: 'Small steps, taken daily, cross mountains.', vi: 'Bước nhỏ mỗi ngày sẽ vượt qua núi cao.', word: 'perseverance', meaning: { en: 'continuing even when it is hard', vi: 'sự kiên trì' }, example: 'Her perseverance turned a hard language into an easy one.' },
  { n: 3, luck: 'great', en: 'Good news is already on its way to you.', vi: 'Tin vui đang trên đường đến với bạn.', word: 'fortunate', meaning: { en: 'lucky', vi: 'may mắn' }, example: 'We were fortunate to find a table by the river.' },
  { n: 4, luck: 'fair', en: 'Patience now saves sorrow later.', vi: 'Kiên nhẫn hôm nay, đỡ buồn phiền mai sau.', word: 'patience', meaning: { en: 'waiting calmly without getting upset', vi: 'sự kiên nhẫn' }, example: 'Learning to speak takes patience.' },
  { n: 5, luck: 'good', en: 'A friend will need your help — and repay it twice.', vi: 'Một người bạn sẽ cần bạn giúp — và đền đáp gấp đôi.', word: 'generous', meaning: { en: 'happy to give time or help', vi: 'hào phóng, rộng lượng' }, example: 'She was generous with her notes before the exam.' },
  { n: 6, luck: 'great', en: 'Your hard work is about to bear fruit.', vi: 'Công sức của bạn sắp đơm hoa kết trái.', word: 'flourish', meaning: { en: 'to grow well and succeed', vi: 'phát triển mạnh, thịnh vượng' }, example: 'The garden will flourish in spring.' },
  { n: 7, luck: 'fair', en: 'Listen more than you speak today.', vi: 'Hôm nay hãy nghe nhiều hơn nói.', word: 'attentive', meaning: { en: 'listening and watching carefully', vi: 'chăm chú, chu đáo' }, example: 'An attentive listener hears what is not said.' },
  { n: 8, luck: 'good', en: 'A journey, near or far, will teach you something new.', vi: 'Một chuyến đi, gần hay xa, sẽ dạy bạn điều mới.', word: 'adventure', meaning: { en: 'an exciting new experience', vi: 'cuộc phiêu lưu' }, example: 'Ordering lunch in English was a small adventure.' },
  { n: 9, luck: 'great', en: 'The new year brings health and peace to your home.', vi: 'Năm mới mang sức khỏe và bình an đến nhà bạn.', word: 'prosperity', meaning: { en: 'success and having enough money', vi: 'sự thịnh vượng' }, example: 'They wished each other prosperity for the new year.' },
  { n: 10, luck: 'good', en: 'What you learn today, you will use tomorrow.', vi: 'Điều bạn học hôm nay, ngày mai sẽ dùng đến.', word: 'valuable', meaning: { en: 'very useful or important', vi: 'quý giá' }, example: 'A good dictionary is a valuable friend.' },
  { n: 11, luck: 'fair', en: 'Calm water hides a strong current — move with care.', vi: 'Nước lặng chảy sâu — hãy thận trọng.', word: 'cautious', meaning: { en: 'careful to avoid problems', vi: 'thận trọng' }, example: 'Be cautious when crossing the busy street.' },
  { n: 12, luck: 'great', en: 'Someone admires you more than you know.', vi: 'Có người ngưỡng mộ bạn hơn bạn nghĩ.', word: 'admire', meaning: { en: 'to respect and like someone', vi: 'ngưỡng mộ' }, example: 'I admire how calmly you speak in front of people.' },
  { n: 13, luck: 'good', en: 'Laughter will find you before the week is out.', vi: 'Tiếng cười sẽ tìm đến bạn trước cuối tuần.', word: 'cheerful', meaning: { en: 'happy and bright', vi: 'vui vẻ' }, example: 'The market was cheerful with red lanterns.' },
  { n: 14, luck: 'fair', en: 'An old mistake can still become a lesson.', vi: 'Lỗi cũ vẫn có thể thành bài học.', word: 'reflect', meaning: { en: 'to think carefully about something', vi: 'suy ngẫm' }, example: 'Take a moment to reflect on what went well.' },
  { n: 15, luck: 'great', en: 'Luck sits beside you like a quiet friend.', vi: 'Vận may ngồi cạnh bạn như một người bạn lặng lẽ.', word: 'serendipity', meaning: { en: 'finding something good by chance', vi: 'sự tình cờ may mắn' }, example: 'Meeting her at the bookshop was pure serendipity.' },
  { n: 16, luck: 'good', en: 'Speak up — your idea is better than you think.', vi: 'Hãy nói ra — ý tưởng của bạn hay hơn bạn nghĩ.', word: 'confident', meaning: { en: 'sure of yourself', vi: 'tự tin' }, example: 'He felt confident after practising every day.' },
  { n: 17, luck: 'fair', en: 'Rest is part of the road, not a stop on it.', vi: 'Nghỉ ngơi là một phần của con đường, không phải dừng lại.', word: 'balance', meaning: { en: 'the right amount of different things', vi: 'sự cân bằng' }, example: 'Find a balance between work and rest.' },
  { n: 18, luck: 'great', en: 'A wish made this season will come true.', vi: 'Điều ước mùa này sẽ thành hiện thực.', word: 'aspiration', meaning: { en: 'a strong hope to achieve something', vi: 'khát vọng' }, example: 'Her aspiration is to study abroad.' },
  { n: 19, luck: 'good', en: 'Kind words return to the one who speaks them.', vi: 'Lời tử tế sẽ quay về với người nói ra.', word: 'gratitude', meaning: { en: 'the feeling of being thankful', vi: 'lòng biết ơn' }, example: 'She wrote a card to show her gratitude.' },
  { n: 20, luck: 'fair', en: 'Not every road is straight — the bends have views.', vi: 'Không con đường nào thẳng mãi — khúc quanh có cảnh đẹp.', word: 'resilient', meaning: { en: 'able to recover quickly from problems', vi: 'kiên cường, mau hồi phục' }, example: 'Children are often more resilient than we think.' },
  { n: 21, luck: 'great', en: 'Your family will gather in joy this year.', vi: 'Gia đình bạn sẽ sum vầy trong niềm vui năm nay.', word: 'reunion', meaning: { en: 'a meeting of people after time apart', vi: 'sự đoàn tụ' }, example: 'Tết is a time for family reunion.' },
  { n: 22, luck: 'good', en: 'A teacher appears when the student is ready.', vi: 'Người thầy xuất hiện khi học trò sẵn sàng.', word: 'curious', meaning: { en: 'wanting to know or learn', vi: 'tò mò, ham học hỏi' }, example: 'Stay curious and ask questions.' },
  { n: 23, luck: 'fair', en: 'Tidy one corner, and the whole room feels lighter.', vi: 'Dọn một góc nhỏ, cả căn phòng nhẹ nhõm hơn.', word: 'organise', meaning: { en: 'to plan or arrange things in order', vi: 'sắp xếp' }, example: 'Organise your notes by topic.' },
  { n: 24, luck: 'great', en: 'Bright days are ahead — walk towards them.', vi: 'Những ngày tươi sáng ở phía trước — hãy bước tới.', word: 'optimistic', meaning: { en: 'hopeful about the future', vi: 'lạc quan' }, example: 'Stay optimistic — you are improving every day.' },
];

const KEY = 'voca-fortune';

/** Today's date as YYYY-MM-DD, in local time. */
export function todayKey(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** The stick already drawn today on this device, if any. */
export function todaysFortune(now: Date): Fortune | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { day: string; n: number } | null;
    if (saved?.day !== todayKey(now)) return null;
    return FORTUNES.find((f) => f.n === saved.n) ?? null;
  } catch {
    return null;
  }
}

/** Draws today's stick — or returns the one already drawn — and keeps it. */
export function drawFortune(now: Date, rand: () => number = Math.random): Fortune {
  const kept = todaysFortune(now);
  if (kept) return kept;
  const f = FORTUNES[Math.floor(rand() * FORTUNES.length)];
  try { localStorage.setItem(KEY, JSON.stringify({ day: todayKey(now), n: f.n })); } catch { /* private mode: it just won't stick */ }
  return f;
}
