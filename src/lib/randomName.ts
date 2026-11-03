// A name for someone who hasn't given one: a guest in the world starts out
// as, say, "Sunny Heron" rather than "User", and can keep it or roll another.
// Things of Huế and the river — and nothing that could read as an insult in
// either language, whichever pair comes up.

const EN_ADJ = ['Sunny', 'Brave', 'Quiet', 'Lucky', 'Swift', 'Gentle', 'Bright', 'Merry', 'Clever', 'Calm', 'Bold', 'Kind', 'Golden', 'Jade', 'Misty', 'Happy'];
const EN_NOUN = ['Heron', 'Lotus', 'Lantern', 'Crane', 'Bamboo', 'Dragon', 'Kite', 'Firefly', 'Turtle', 'Sparrow', 'Willow', 'Pearl', 'Phoenix', 'Otter', 'Tiger', 'Fox'];

// Vietnamese puts the noun first: "Cò Vui Vẻ", the cheerful heron.
const VI_NOUN = ['Cò', 'Sen', 'Đèn Lồng', 'Hạc', 'Tre', 'Rồng', 'Diều', 'Đom Đóm', 'Rùa', 'Chim Sẻ', 'Liễu', 'Ngọc', 'Phượng', 'Rái Cá', 'Hổ', 'Cáo'];
const VI_ADJ = ['Vui Vẻ', 'Dũng Cảm', 'Hiền', 'May Mắn', 'Nhanh Nhẹn', 'Dịu Dàng', 'Sáng', 'Tinh Nghịch', 'Thông Minh', 'Điềm Tĩnh', 'Tốt Bụng', 'Vàng', 'Xanh', 'Mơ Màng', 'Hạnh Phúc', 'Lém Lỉnh'];

const pick = <T,>(list: readonly T[], rnd: () => number) => list[Math.floor(rnd() * list.length)];

/** A friendly two-word name in the given locale, never the one passed as `not`. */
export function randomName(locale: string, not?: string, rnd: () => number = Math.random): string {
  for (let i = 0; i < 8; i++) {
    const name = locale.startsWith('vi')
      ? `${pick(VI_NOUN, rnd)} ${pick(VI_ADJ, rnd)}`
      : `${pick(EN_ADJ, rnd)} ${pick(EN_NOUN, rnd)}`;
    if (name !== not) return name;
  }
  return locale.startsWith('vi') ? 'Cò Vui Vẻ' : 'Sunny Heron';
}
