// Which Listening items this learner has done or saved — the same
// device-local rules as Short Conversation (useSpeakingProgress), one store
// per bank so each counts separately. "Practiced" means listened to the end
// for podcasts, and answers checked for Comprehension and IELTS (which also
// keep the last score).

import { createPracticeProgress } from './useSpeakingProgress';

export const useListeningProgress = createPracticeProgress('voca-listening-progress');
export const useComprehensionProgress = createPracticeProgress('voca-comprehension-progress');
export const useIeltsListeningProgress = createPracticeProgress('voca-ielts-listening-progress');

export type PracticeProgressStore = typeof useListeningProgress;
