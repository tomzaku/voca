// Which podcast episodes this learner has listened to or saved — the same
// device-local rules as Short Conversation (useSpeakingProgress), kept apart
// so the two banks count separately. "Practiced" here means listened.

import { createPracticeProgress } from './useSpeakingProgress';

export const useListeningProgress = createPracticeProgress('voca-listening-progress');
