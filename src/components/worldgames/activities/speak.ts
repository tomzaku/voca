import { createElement } from 'react';
import { ConHenStall } from '../ConHenStall';
import { RolePlay } from '../RolePlay';
import { defineActivity } from '../activity';

// Conversation, as the app's Speaking page groups it: a chat at Cô Ba's chè
// stall in Đông Ba market, everyday dialogues played or role-played, and
// IELTS Speaking with the part's real turn time.

export default defineActivity({
  id: 'speak', skill: 'speaking', kind: 'practice', key: 'Conversation',
  emoji: '🍵', place: 'Chợ Đông Ba', order: 30,
  modes: [
    { id: 'speak', nameId: 'world.actConversation', icon: 'mic', Screen: ConHenStall },
    { id: 'dialogue', nameId: 'world.actDialogue', icon: 'people', Screen: () => createElement(RolePlay, { source: 'dialogue' }) },
    { id: 'ielts-speaking', nameId: 'world.actIeltsSpeaking', icon: 'cap', Screen: () => createElement(RolePlay, { source: 'ielts' }) },
  ],
});
