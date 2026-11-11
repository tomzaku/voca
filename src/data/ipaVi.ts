// Vietnamese for the IPA page's per-sound prose (`howTo`, `tip` in ipa.ts)
// and the mouth diagram's tags and contrast phrases (articulation.ts). These
// are content keyed by symbol, not UI strings, so they live beside the data
// rather than in the message catalogs. A symbol missing here reads in English.

export const IPA_SOUNDS_VI: Record<string, { howTo: string; tip: string }> = {
  ɪ: {
    howTo: 'Lưỡi nâng cao và đưa về trước, môi thả lỏng, hơi bành ra — ngắn và lỏng hơn /iː/.',
    tip: 'Đừng kéo dài thành /iː/ — "ship" ngắn và lỏng, "sheep" dài và căng.',
  },
  e: {
    howTo: 'Miệng mở một nửa, lưỡi ở giữa và đưa về trước, môi thả lỏng — giống /ɪ/ nhưng hạ hàm thấp hơn một chút.',
    tip: 'Đừng hạ hàm thấp như /æ/ — "pen", không phải "pan".',
  },
  æ: {
    howTo: 'Hạ hàm thấp, môi bành rộng, lưỡi thấp và đưa về trước — nụ cười rộng nhất trong các nguyên âm ngắn.',
    tip: 'Hạ hàm thấp hơn /e/ và bành môi ra. Không phải /ʌ/ — "cat", không phải "cut".',
  },
  ʌ: {
    howTo: 'Miệng hé mở, lưỡi ở giữa và thả lỏng, môi tự nhiên — một tiếng "ă" ngắn, gọn.',
    tip: 'Giữ miệng thả lỏng, lưỡi ở giữa — ít mở hơn /ɑː/, lùi sau hơn /æ/.',
  },
  ɒ: {
    howTo: 'Môi tròn, hạ hàm, lưỡi thấp và lùi về sau — âm "o" kiểu Anh trong "hot" (nhiều người Mỹ đọc lẫn với /ɑː/).',
    tip: 'Ngắn, môi tròn — kéo dài sẽ thành /ɔː/ ("cot" → "caught").',
  },
  ʊ: {
    howTo: 'Môi tròn nhẹ, lưỡi cao và lùi về sau, ngắn và thả lỏng — không căng và tròn như /uː/.',
    tip: 'Ngắn và lỏng — môi căng, chu ra sẽ thành /uː/ ("full" và "fool").',
  },
  ə: {
    howTo: 'Nguyên âm thả lỏng nhất tiếng Anh ("schwa") — miệng gần như không động, lưỡi ở giữa. Chỉ xuất hiện ở âm tiết không nhấn.',
    tip: 'Chỉ có ở âm tiết không nhấn — đọc nhanh, nhẹ, và không bao giờ nhấn vào nó.',
  },
  iː: {
    howTo: 'Môi bành thành nụ cười căng, lưỡi cao và đưa về trước, giữ lâu và căng hơn /ɪ/.',
    tip: 'Giữ lâu hơn và cười rộng hơn /ɪ/ — "leave", không phải "live".',
  },
  ɜː: {
    howTo: 'Môi tự nhiên, lưỡi ở giữa, hàm hơi mở — giữ dài, như "ơ" kéo dài kiểu Anh.',
    tip: 'Trong tiếng Anh-Anh không có âm r — chỉ là một nguyên âm dài ở giữa, môi thả lỏng.',
  },
  ɑː: {
    howTo: 'Mở miệng rộng, lưỡi thấp và lùi về sau, môi thả lỏng — một tiếng "a" dài và mở.',
    tip: 'Mở rộng và kéo lưỡi lùi về sau — dài hơn và lùi sau hơn /ʌ/.',
  },
  ɔː: {
    howTo: 'Môi tròn và chu ra trước, lưỡi ở giữa-sau, hạ hàm — giữ dài.',
    tip: 'Tròn môi chắc và giữ lâu — dài hơn và cao hơn /ɒ/.',
  },
  uː: {
    howTo: 'Môi tròn chặt và chu ra trước, lưỡi cao và lùi về sau, giữ dài và căng.',
    tip: 'Chu môi tròn chặt và giữ — "pool", không phải "pull".',
  },
  eɪ: {
    howTo: 'Bắt đầu ở /e/ rồi lướt lên /ɪ/ — môi chuyển từ thả lỏng sang hơi bành khi đọc.',
    tip: 'Lướt từ /e/ lên /ɪ/ — đọc phẳng một âm /e/ sẽ biến "late" thành "let".',
  },
  aɪ: {
    howTo: 'Bắt đầu mở và thấp, lướt lên /ɪ/ — hàm khép lại khi âm kết thúc.',
    tip: 'Bắt đầu với hàm mở, rồi lướt lên — đọc phẳng sẽ biến "like" thành "lack".',
  },
  ɔɪ: {
    howTo: 'Bắt đầu tròn môi như /ɔː/, lướt sang /ɪ/ — môi bớt tròn khi lưỡi nâng lên.',
    tip: 'Bắt đầu với môi tròn, rồi bành môi ra khi lưỡi nâng lên /ɪ/.',
  },
  aʊ: {
    howTo: 'Bắt đầu mở và thấp, lướt sang /ʊ/ — môi tròn lại khi âm khép.',
    tip: 'Mở trước, rồi tròn môi — /ʊ/ ở cuối giúp "now" không nghe như "nah".',
  },
  əʊ: {
    howTo: 'Bắt đầu ở giữa (schwa), lướt sang /ʊ/ — môi chỉ tròn ở cuối.',
    tip: 'Bắt đầu ở giữa, thả lỏng, rồi tròn môi — đọc thành /ɔː/ sẽ khiến "low" nghe như "law".',
  },
  ɪə: {
    howTo: 'Bắt đầu ở /ɪ/, lướt sang schwa — hay gặp trước chữ "r" trong tiếng Anh-Anh (không đọc r).',
    tip: 'Lướt từ /ɪ/ sang /ə/ nhẹ — hai phần, và không có âm r ở cuối trong tiếng Anh-Anh.',
  },
  eə: {
    howTo: 'Bắt đầu ở /e/, lướt sang schwa — hàm hơi mở ra khi âm nhỏ dần.',
    tip: 'Bắt đầu ở /e/ rồi thả lỏng về /ə/ — không có âm r mạnh ở cuối.',
  },
  ʊə: {
    howTo: 'Bắt đầu ở /ʊ/, lướt sang schwa — ngày càng hiếm trong cách nói hiện đại, thường được thay bằng /ɔː/, nên ví dụ thật khá ít.',
    tip: 'Hiếm trong tiếng Anh-Anh hiện đại — nhiều người đọc /ɔː/ trong "poor" và "sure". Cả hai đều được.',
  },
  p: {
    howTo: 'Hai môi mím lại, rồi bật ra với một luồng hơi — vô thanh, cổ họng không rung.',
    tip: 'Ở đầu từ được nhấn, bật thêm một luồng hơi — thiếu nó, "pen" nghe như "Ben".',
  },
  b: {
    howTo: 'Hai môi mím lại, rồi bật ra — cùng vị trí với /p/ nhưng dây thanh rung (hữu thanh).',
    tip: 'Rung dây thanh ngay từ đầu, không bật hơi. Câm sau m: "climb", "comb".',
  },
  t: {
    howTo: 'Đầu lưỡi chạm vào lợi phía sau răng trên, rồi bật ra với một luồng hơi — vô thanh.',
    tip: 'Đầu lưỡi đặt ở lợi, không phải ở răng, và bật hơi ở đầu từ được nhấn.',
  },
  d: {
    howTo: 'Đầu lưỡi chạm vào lợi phía sau răng trên, rồi bật ra — cùng vị trí với /t/ nhưng hữu thanh.',
    tip: 'Giữ rung dây thanh ở cuối từ — "bed", không phải "bet".',
  },
  k: {
    howTo: 'Cuống lưỡi chạm vòm miệng mềm, rồi bật ra với một luồng hơi — vô thanh.',
    tip: 'Bật hơi ở đầu từ được nhấn. Chữ k câm trước n: "knee", "know".',
  },
  g: {
    howTo: 'Cuống lưỡi chạm vòm miệng mềm, rồi bật ra — cùng vị trí với /k/ nhưng hữu thanh.',
    tip: 'Giữ rung dây thanh ở cuối từ — "bag", không phải "back".',
  },
  f: {
    howTo: 'Răng trên đặt nhẹ lên môi dưới, đẩy hơi qua khe hở — vô thanh.',
    tip: 'Răng trên đặt lên môi dưới — dùng cả hai môi sẽ trượt sang /p/.',
  },
  v: {
    howTo: 'Răng trên đặt nhẹ lên môi dưới, đẩy hơi qua — giống /f/ nhưng hữu thanh, cảm thấy môi rung.',
    tip: 'Như /f/ nhưng có rung. Đừng tròn môi, kẻo thành /w/ ("vest" và "west").',
  },
  θ: {
    howTo: 'Đầu lưỡi thò nhẹ ra giữa hai hàm răng, hơi rít qua lưỡi — vô thanh, như trong "think".',
    tip: 'Đầu lưỡi giữa hai hàm răng, rồi thổi hơi — không phải /s/ ("think" → "sink") hay /t/ ("tree" thay cho "three").',
  },
  ð: {
    howTo: 'Đầu lưỡi thò nhẹ ra giữa hai hàm răng, hơi rít qua lưỡi — cùng vị trí với /θ/ nhưng hữu thanh, như trong "this".',
    tip: 'Lưỡi giống /θ/, thêm rung dây thanh — không phải /d/ ("they" → "day") hay /z/.',
  },
  s: {
    howTo: 'Đầu lưỡi gần lợi sau răng trên, hơi rít qua một khe hẹp — vô thanh.',
    tip: 'Tiếng rít mảnh và sắc, lưỡi ở sau răng trên — không đặt giữa hai hàm răng.',
  },
  z: {
    howTo: 'Lưỡi ở vị trí giống /s/ — nhưng hữu thanh, cảm thấy rung.',
    tip: 'Giữ tiếng rung đến hết — /z/ ở cuối từ hay bị trượt thành /s/ ("eyes" và "ice").',
  },
  ʃ: {
    howTo: 'Lưỡi lùi về sau hơn /s/ một chút, môi hơi tròn — âm "sh" vô thanh.',
    tip: 'Tròn môi một chút và kéo lưỡi lùi lại — lưỡi phẳng hơn và đưa về trước sẽ thành /s/ ("she" và "see").',
  },
  ʒ: {
    howTo: 'Lưỡi ở vị trí giống /ʃ/ — nhưng hữu thanh. Hiếm trong tiếng Anh, và gần như không bao giờ đứng đầu từ.',
    tip: 'Như /ʃ/ nhưng có rung dây thanh. Gần như không bao giờ đứng đầu một từ tiếng Anh.',
  },
  h: {
    howTo: 'Một luồng hơi nhẹ từ cổ họng, lưỡi không chạm vào đâu trong miệng — vô thanh.',
    tip: 'Chỉ là hơi thở từ cổ họng, không khàn. Câm trong "hour", "honest" và "honour".',
  },
  tʃ: {
    howTo: 'Một âm /t/ bật thẳng sang /ʃ/ trong một động tác nhanh — vô thanh, như trong "church".',
    tip: 'Chặn hơi hoàn toàn trước, rồi bật sang /ʃ/ — "watch", không phải "wash".',
  },
  dʒ: {
    howTo: 'Một âm /d/ bật thẳng sang /ʒ/ trong một động tác nhanh — hữu thanh, như trong "judge".',
    tip: 'Chặn hơi rồi rung, như /tʃ/ có rung dây thanh — không phải /j/ ("jet" và "yet").',
  },
  m: {
    howTo: 'Hai môi mím lại, hơi ngân ra qua mũi — hữu thanh.',
    tip: 'Khép kín hai môi và ngân qua mũi.',
  },
  n: {
    howTo: 'Đầu lưỡi chạm lợi sau răng trên, hơi ngân ra qua mũi — hữu thanh.',
    tip: 'Đầu lưỡi ở lợi, hơi qua mũi — đừng bỏ mất âm này ở cuối từ.',
  },
  ŋ: {
    howTo: 'Cuống lưỡi chạm vòm miệng mềm, hơi ngân ra qua mũi — không bao giờ đứng đầu một từ tiếng Anh.',
    tip: 'Cuống lưỡi nâng lên, đầu lưỡi hạ xuống — trong "sing", đừng thêm âm /g/ ở cuối.',
  },
  l: {
    howTo: 'Đầu lưỡi chạm lợi sau răng trên, hơi đi qua hai bên lưỡi — hữu thanh.',
    tip: 'Đầu lưỡi ở lợi; ở cuối từ ("ball") cuống lưỡi cũng nâng lên — gọi là "l tối".',
  },
  r: {
    howTo: 'Lưỡi cong nhẹ về sau, không chạm vòm miệng — hữu thanh, tiếng Anh không rung lưỡi.',
    tip: 'Cong đầu lưỡi về sau, không chạm vào đâu. Trong tiếng Anh-Anh, r câm trừ khi có nguyên âm theo sau: "car" và "carry".',
  },
  j: {
    howTo: 'Lưỡi cao và đưa về trước như /iː/, rồi lướt nhanh sang nguyên âm sau — hữu thanh, như trong "yes".',
    tip: 'Lướt nhanh từ khẩu hình /iː/ — không phải /dʒ/ ("yet" và "jet").',
  },
  w: {
    howTo: 'Môi tròn chặt như /uː/, rồi lướt nhanh sang nguyên âm sau — hữu thanh, như trong "wet".',
    tip: 'Tròn môi chặt rồi mở ra — răng trên không chạm môi, nếu không sẽ thành /v/.',
  },
};

/** articulation.ts's tags and contrast phrases, by their English text. */
export const MOUTH_TEXT_VI: Record<string, string> = {
  'Lips rounded': 'Môi tròn',
  'Lips relaxed': 'Môi thả lỏng',
  'Glides between two vowels': 'Lướt giữa hai nguyên âm',
  'Lips change shape': 'Môi đổi khẩu hình',
  'Both lips': 'Hai môi',
  'Stop': 'Chặn hơi',
  'Nasal': 'Âm mũi',
  'Lip + top teeth': 'Môi dưới + răng trên',
  'Hiss': 'Rít hơi',
  'Buzz': 'Rung',
  'Tongue between teeth': 'Lưỡi giữa hai hàm răng',
  'Tip on gum ridge': 'Đầu lưỡi ở lợi',
  'Air round the sides': 'Hơi đi hai bên lưỡi',
  'Tip near gum ridge': 'Đầu lưỡi gần lợi',
  'Tongue behind gum ridge': 'Lưỡi sau lợi',
  'Lips forward': 'Môi chu ra',
  'Stop, then hiss': 'Chặn hơi, rồi rít',
  'Stop, then buzz': 'Chặn hơi, rồi rung',
  'Tip curled back': 'Đầu lưỡi cong về sau',
  'No contact': 'Không chạm',
  'Tongue up to hard palate': 'Lưỡi nâng lên vòm cứng',
  'Back of tongue up': 'Cuống lưỡi nâng lên',
  'Open mouth': 'Mở miệng',
  'Breath from throat': 'Hơi từ cổ họng',
  'Voiced': 'Hữu thanh',
  'Voiceless': 'Vô thanh',
  'Tongue higher, jaw more closed': 'Lưỡi cao hơn, hàm khép hơn',
  'Tongue lower, jaw more open': 'Lưỡi thấp hơn, hàm mở hơn',
  'Tongue further forward': 'Lưỡi đưa về trước hơn',
  'Tongue further back': 'Lưỡi lùi về sau hơn',
  'Lips more rounded': 'Môi tròn hơn',
  'Lips less rounded': 'Môi bớt tròn',
  'Glides to a second shape': 'Lướt sang khẩu hình thứ hai',
  'Long — hold it': 'Dài — giữ lâu',
  'Short and relaxed': 'Ngắn và thả lỏng',
  'No stop — air from the start': 'Không chặn — hơi ra ngay từ đầu',
  'Voice on — throat buzzes': 'Có rung — cổ họng rung',
  'Voice off — only air': 'Không rung — chỉ có hơi',
};

const HEIGHT_VI: Record<string, string> = { high: 'cao', mid: 'giữa', low: 'thấp' };
const FRONT_VI: Record<string, string> = { front: 'trước', central: 'giữa', back: 'sau' };

/** One of articulation.ts's phrases in Vietnamese, or as given if unknown. */
export function mouthTextVi(text: string): string {
  const vowel = /^Tongue (high|mid|low) · (front|central|back)$/.exec(text);
  if (vowel) return `Lưỡi ${HEIGHT_VI[vowel[1]]} · ${FRONT_VI[vowel[2]]}`;
  return MOUTH_TEXT_VI[text] ?? text;
}
