import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, lookLayers, parseLook } from './wardrobe';

describe('lookLayers', () => {
  it('draws the body, then the hair, then the hat', () => {
    expect(lookLayers({ figure: 'boy', hair: 'longhair', hairColor: 'brown', outfit: 'aoDaiPurple', hat: 'none' }))
      .toEqual(['body.aoDaiPurple', 'hair.longhair.brown']);
  });
  it('trims the hair to the crown under a hat', () => {
    expect(lookLayers({ figure: 'boy', hair: 'spikeyhair', hairColor: 'grey', outfit: 'aoThe', hat: 'khanDong' }))
      .toEqual(['body.aoThe', 'hair.spikeyhair.grey.hat', 'hat.khanDong']);
  });
  it('draws the girl’s body for a girl', () => {
    expect(lookLayers({ ...DEFAULT_LOOK, figure: 'girl' })[0]).toBe('body.everyday.girl');
  });
  it('leaves the hair out when bald', () => {
    expect(lookLayers(DEFAULT_LOOK)).toEqual(['body.everyday']);
  });
});

describe('parseLook', () => {
  it('keeps what it knows and defaults the rest', () => {
    expect(parseLook({ hair: 'longhair', outfit: 'ballgown', hat: 7 })).toEqual({ ...DEFAULT_LOOK, hair: 'longhair' });
  });
  it('dresses you in the default from nothing', () => {
    expect(parseLook(null)).toEqual(DEFAULT_LOOK);
  });
});
