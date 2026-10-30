import type { Catalog } from '../..';

// The world itself: the page, the HUD over the map, travel and zoom.

export default {
  'world.progressStreak': '{count, plural, one {# day} other {# days}} in a row',
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
  'world.statusYou': 'You — your clothes and your buddy',
  'world.loadingTagline': 'Learning English in the old capital',
  'world.ride.walk': 'Walk',
  'world.ride.bike': 'Bicycle',
  'world.ride.cyclo': 'Xích lô',
  'world.rideHint': 'press B to change',
} satisfies Catalog;
