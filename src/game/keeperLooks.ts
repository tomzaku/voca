import type { Look } from './wardrobe';

// How each keeper is dressed, and what they carry — so you can tell who's who
// the way a game shows it, by the person rather than a sign over them. Drawn
// from the wardrobe's layers like your buddy (prop.* in
// scripts/compose-wardrobe.mjs): their own hair, Huế's clothes, and the tool
// of their trade.
//
// Kept dependency-free like the rest of src/game/'s data.

export interface KeeperDress {
  look: Look;
  /** A wardrobe prop layer — what they hold, or wear on their head. */
  prop?: string;
}

export const KEEPER_DRESS: Record<string, KeeperDress> = {
  // Cô Ba the word-seller, a book in hand.
  vocabulary: { look: { hair: 'longhair', hairColor: 'dark', outfit: 'aoDai', outfitColor: 'red', hat: 'none' }, prop: 'book' },
  // Chú Năm, who keeps the tea stall, a cup ready to pour.
  speaking: { look: { hair: 'shorthair', hairColor: 'dark', outfit: 'everyday', outfitColor: 'blue', hat: 'none' }, prop: 'teacup' },
  // Ông Sáu the boatman, listening in.
  listening: { look: { hair: 'shorthair', hairColor: 'grey', outfit: 'aoThe', outfitColor: 'brown', hat: 'none' }, prop: 'headphones' },
  // Thầy Đồ the scholar, in áo the and khăn đóng, his brush in hand.
  writing: { look: { hair: 'shorthair', hairColor: 'grey', outfit: 'aoThe', outfitColor: 'black', hat: 'khanDong' }, prop: 'brush' },
  // Mệ Hai of An Hiên, in Huế's purple.
  you: { look: { hair: 'longhair', hairColor: 'grey', outfit: 'aoDai', outfitColor: 'purple', hat: 'none' } },
  // The keeper of the collections, a scroll of word lists.
  collections: { look: { hair: 'bowlhair', hairColor: 'dark', outfit: 'aoThe', outfitColor: 'navy', hat: 'none' }, prop: 'scroll' },
};

/** The wardrobe layers a prop adds on top of a look. */
export const propLayers = (d?: KeeperDress): string[] => (d?.prop ? [`prop.${d.prop}`] : []);
