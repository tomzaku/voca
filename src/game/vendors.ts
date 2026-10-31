import type { KeeperDress } from './keeperLooks';

// The food market's vendors (scripts/hue: places/southBank.mjs STALLS), one
// beside each stall, dressed the way Huế's market women and men are — áo bà
// ba, a nón lá. Walk up to one and they tell you about their dish, in the
// message box the keepers use; the map's `stall` points carry the dish's
// story id (places.dishBunBo…).
//
// Kept dependency-free like the rest of src/game/'s data.

export const VENDOR_DRESS: Record<string, KeeperDress> = {
  dishBunBo: { look: { hair: 'longhair', hairColor: 'dark', outfit: 'aoBaBa', outfitColor: 'maroon', hat: 'nonLa' } },
  dishComHen: { look: { hair: 'longhair', hairColor: 'grey', outfit: 'aoBaBa', outfitColor: 'brown', hat: 'none' } },
  dishBanhBeo: { look: { hair: 'bowlhair', hairColor: 'dark', outfit: 'aoBaBa', outfitColor: 'white', hat: 'none' } },
  dishBanhLoc: { look: { hair: 'longhair', hairColor: 'dark', outfit: 'aoBaBa', outfitColor: 'teal', hat: 'nonLa' } },
  dishNemLui: { look: { hair: 'shorthair', hairColor: 'dark', outfit: 'everyday', outfitColor: 'orange', hat: 'cap' } },
  dishBanhKhoai: { look: { hair: 'curlyhair', hairColor: 'dark', outfit: 'aoBaBa', outfitColor: 'cream', hat: 'none' } },
  dishChe: { look: { hair: 'longhair', hairColor: 'dark', outfit: 'aoDai', outfitColor: 'purple', hat: 'none' } },
  dishMeXung: { look: { hair: 'shorthair', hairColor: 'grey', outfit: 'aoThe', outfitColor: 'maroon', hat: 'none' } },
  dishPho: { look: { hair: 'shorthair', hairColor: 'dark', outfit: 'everyday', outfitColor: 'white', hat: 'none' } },
  dishXoi: { look: { hair: 'longhair', hairColor: 'grey', outfit: 'aoBaBa', outfitColor: 'navy', hat: 'nonLa' } },
  dishBanhCanh: { look: { hair: 'bowlhair', hairColor: 'grey', outfit: 'aoBaBa', outfitColor: 'black', hat: 'none' } },
  dishBunHen: { look: { hair: 'longhair', hairColor: 'brown', outfit: 'aoBaBa', outfitColor: 'teal', hat: 'none' } },
  dishBanhUot: { look: { hair: 'curlyhair', hairColor: 'grey', outfit: 'aoBaBa', outfitColor: 'maroon', hat: 'nonLa' } },
  dishBanhMi: { look: { hair: 'spikeyhair', hairColor: 'dark', outfit: 'everyday', outfitColor: 'blue', hat: 'cap' } },
  dishCaPheMuoi: { look: { hair: 'mophair', hairColor: 'dark', outfit: 'everyday', outfitColor: 'black', hat: 'none' } },
};
