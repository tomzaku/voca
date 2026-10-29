import { describe, it, expect } from 'vitest';
import { classifyDevice, recommendEngine, isHeavyFor, type DeviceSignals } from './deviceTier';

const desktop: DeviceSignals = { mobile: false, memoryGb: 8, cores: 8, constrainedNetwork: false, webgpu: true, safari: false };

describe('classifyDevice', () => {
  it('puts a strong desktop with WebGPU on Kokoro', () => {
    expect(classifyDevice(desktop)).toBe('high');
    expect(recommendEngine(desktop)).toBe('kokoro');
  });

  it('keeps phones and tablets on the native voice, however fast', () => {
    expect(recommendEngine({ ...desktop, mobile: true })).toBe('native');
  });

  it('keeps data-saver and 2G connections off the big downloads', () => {
    expect(recommendEngine({ ...desktop, constrainedNetwork: true })).toBe('native');
  });

  it('treats little memory or few cores as low', () => {
    expect(classifyDevice({ ...desktop, memoryGb: 2 })).toBe('low');
    expect(classifyDevice({ ...desktop, cores: 2 })).toBe('low');
  });

  it('drops to Piper without WebGPU, on Safari, or when tight on memory', () => {
    expect(recommendEngine({ ...desktop, webgpu: false })).toBe('piper');
    expect(recommendEngine({ ...desktop, safari: true })).toBe('piper');
    expect(recommendEngine({ ...desktop, memoryGb: 4 })).toBe('piper');
  });

  it('needs 8 cores for Kokoro when memory is unknown (Firefox/Safari)', () => {
    expect(recommendEngine({ ...desktop, memoryGb: undefined, cores: 8 })).toBe('kokoro');
    expect(recommendEngine({ ...desktop, memoryGb: undefined, cores: 6 })).toBe('piper');
  });
});

describe('recommendEngine cap', () => {
  it('never goes heavier than a recorded cap', () => {
    expect(recommendEngine(desktop, 'piper')).toBe('piper');
    expect(recommendEngine(desktop, 'native')).toBe('native');
  });

  it('a cap above the pick changes nothing', () => {
    expect(recommendEngine({ ...desktop, mobile: true }, 'kokoro')).toBe('native');
  });
});

describe('isHeavyFor', () => {
  it('flags only engines heavier than the recommendation', () => {
    expect(isHeavyFor('kokoro', 'piper')).toBe(true);
    expect(isHeavyFor('piper', 'piper')).toBe(false);
    expect(isHeavyFor('native', 'kokoro')).toBe(false);
  });
});
