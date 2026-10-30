import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, lookLayers, parseLook, wearGarment } from './wardrobe';

describe('lookLayers', () => {
  it('draws the body in its garment and colour, then the hair, then the hat', () => {
    expect(lookLayers({ hair: 'longhair', hairColor: 'brown', outfit: 'aoDai', outfitColor: 'purple', hat: 'none' }))
      .toEqual(['body.aoDai.purple', 'hair.longhair.brown']);
  });
  it('trims the hair to the crown under a hat', () => {
    expect(lookLayers({ hair: 'spikeyhair', hairColor: 'grey', outfit: 'aoThe', outfitColor: 'black', hat: 'khanDong' }))
      .toEqual(['body.aoThe.black', 'hair.spikeyhair.grey.hat', 'hat.khanDong']);
  });
  it('leaves the hair out when bald', () => {
    expect(lookLayers(DEFAULT_LOOK)).toEqual(['body.everyday.red']);
  });
});

describe('wearGarment', () => {
  it('keeps the colour when the new garment comes in it', () => {
    expect(wearGarment({ ...DEFAULT_LOOK, outfitColor: 'blue' }, 'aoDai').outfitColor).toBe('blue');
  });
  it('starts on the garment’s first colour otherwise', () => {
    expect(wearGarment({ ...DEFAULT_LOOK, outfitColor: 'red' }, 'aoThe').outfitColor).toBe('black');
  });
});

describe('parseLook', () => {
  it('keeps what it knows and defaults the rest', () => {
    expect(parseLook({ hair: 'longhair', outfit: 'ballgown', hat: 7 })).toEqual({ ...DEFAULT_LOOK, hair: 'longhair' });
  });
  it('puts a garment in a colour it comes in', () => {
    expect(parseLook({ outfit: 'aoThe', outfitColor: 'pink' })).toMatchObject({ outfit: 'aoThe', outfitColor: 'black' });
  });
  it('dresses you in the default from nothing', () => {
    expect(parseLook(null)).toEqual(DEFAULT_LOOK);
  });
});
