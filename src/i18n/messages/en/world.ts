import type { Catalog } from '../..';

// The world itself: the page, the HUD over the map, travel and zoom.

export default {
  'world.progressFlag': '{count, plural, one {# day} other {# days}} · the flag on Kỳ Đài',
  'world.progressLanterns': '{count, plural, one {# lantern} other {# lanterns}} · words mastered',
  'world.areaFallback': 'Area {n}',
  'world.close': 'Close',
  'world.hintWalkDesktop': 'Walk with WASD / arrows, or tap the ground',
  'world.hintWalkMobile': 'Tap the ground to walk',
  'world.chooseBuddy': 'Choose your buddy',
  'world.fastTravel': 'Fast travel',
  'world.travel': 'Travel',
  'world.zoomIn': 'Zoom in (+)',
  'world.zoomReset': 'Reset zoom (0)',
  'world.zoomOut': 'Zoom out (−)',
  'world.enter': 'Enter',
  'world.leaveBuilding': 'Leave',
  'world.menu': 'Menu',
  'world.menuApp': 'Back to Voca',
  'world.menuSettings': 'Settings',
  'world.statusYou': 'You — your buddy and its home',
  'world.loadingTagline': 'Learning English in the old capital',
} satisfies Catalog;
