import { dialogues } from '../../../data/englishDialogues';
import { ieltsConversations } from '../../../data/englishIelts';
import { isPracticed, useSpeakingProgress } from '../../../hooks/useSpeakingProgress';
import { speakingAdvice } from '../../../lib/keeperAdvice';
import { defineKeeper } from '../keeper';

// Cô Ba, who sells chè at Đông Ba market.

function useLeft() {
  const progress = useSpeakingProgress((s) => s.questions);
  const left = (ids: string[]) => ids.filter((id) => !isPracticed(progress[id])).length;
  return {
    dialogues: { left: left(dialogues.map((d) => d.id)), total: dialogues.length },
    ielts: { left: left(ieltsConversations.map((c) => c.id)), total: ieltsConversations.length },
  };
}

export default defineKeeper({
  skill: 'speaking',
  nameId: 'world.keeperSpeaking',
  useAdvice(recap) {
    const { dialogues: d, ielts } = useLeft();
    return speakingAdvice({ dialoguesLeft: d.left, ieltsLeft: ielts.left, recap });
  },
  useBadges() {
    const { dialogues: d, ielts } = useLeft();
    return {
      dialogue: `${d.total - d.left} / ${d.total}`,
      'ielts-speaking': `${ielts.total - ielts.left} / ${ielts.total}`,
    };
  },
});
