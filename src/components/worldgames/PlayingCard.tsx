// A playing card in the world's games (Poker, Tiến lên): a cream face with
// its rank and suit, red for hearts and diamonds, or the patterned back when
// `card` is left out. Cards are named rank then suit — "Ah", "Td", "3s".

const SUIT: Record<string, { glyph: string; red: boolean }> = {
  // The text presentation selector, so no platform draws them as emoji.
  s: { glyph: '♠︎', red: false }, h: { glyph: '♥︎', red: true },
  d: { glyph: '♦︎', red: true }, c: { glyph: '♣︎', red: false },
};

export function PlayingCard({ card, faded, small }: { card?: string; faded?: boolean; small?: boolean }) {
  const box = `${small ? 'w-9 h-12' : 'w-11 h-[3.75rem] sm:w-12 sm:h-16'} px-notch shrink-0 shadow-[2px_2px_0_#0006]`;
  if (!card) {
    return (
      <span className={`${box} border-2 border-[#5b1f1a] bg-[repeating-linear-gradient(45deg,#a8352c_0_4px,#8a2a22_4px_8px)]`} aria-hidden />
    );
  }
  const suit = SUIT[card[1]];
  return (
    <span className={`${box} bg-[#f6f0e2] border-2 border-[#2b1a10] flex flex-col items-center justify-center leading-none ${faded ? 'opacity-50' : ''}`} style={{ color: suit.red ? '#b3261e' : '#1c1c22' }}>
      <span className={`px-title ${small ? '!text-[14px]' : '!text-[17px]'}`}>{card[0] === 'T' ? '10' : card[0]}</span>
      <span className={small ? 'text-[16px]' : 'text-[20px]'}>{suit.glyph}</span>
    </span>
  );
}
