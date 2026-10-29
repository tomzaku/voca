import { useIntl } from 'react-intl';
import { REAL_GUESS_GAMES, type RealGuessGameMode } from '../../hooks/useGuessGame';

/** The guess games the world can draw (LearnRoundHud). The smart ladder's
 *  'speak' plays as 'listen' until the world has a speaking screen. */
export const PLAYABLE_GAMES: RealGuessGameMode[] = ['choice', 'letters', 'listen', 'scramble'];

/** The name of the game being played, for a building's top bar. */
export function useGameLabel(game: RealGuessGameMode): string {
  const intl = useIntl();
  return intl.formatMessage({ id: REAL_GUESS_GAMES.find((g) => g.id === game)?.labelId ?? 'games.modeChoice' });
}
