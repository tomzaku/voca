import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { CollectionDetail } from './CollectionDetailPage';

/**
 * A dimmed popup — over /collections on desktop, and over the flash card when
 * its collection chip is tapped. Portalled to <body>, and
 * the backdrop is a sibling of the panel, not its parent: a filter or
 * transform on an ancestor would trap the content's own fixed-position layers
 * (quiz picker, full-screen quiz) inside it.
 */
export function Popup({ width, actions, bare = false, onClose, children }: {
  width: string;
  actions?: React.ReactNode;
  /** Content runs to the edges (a cover on top); the buttons float over it. */
  bare?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const intl = useIntl();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 lg:p-10" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div className={`relative w-full ${width} max-h-full overflow-y-auto rounded-3xl border-2 border-border bg-bg-primary shadow-2xl ${bare ? '' : 'p-6'}`}>
        {/* Zero height either way, so it takes no room from the content; in
            bare mode the buttons hang down over the cover. */}
        <div className={`sticky top-0 z-10 flex justify-end gap-2 h-0 ${bare ? 'translate-x-[-1rem] translate-y-4' : '-mt-2 -mr-2 mb-2'}`}>
          {actions}
          <button
            onClick={onClose}
            title={intl.formatMessage({ id: 'collections.close' })}
            aria-label={intl.formatMessage({ id: 'collections.close' })}
            className={bare ? POPUP_GLASS_BUTTON : POPUP_BUTTON}
          >
            <Icon icon="lucide:x" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

const POPUP_BUTTON = 'w-9 h-9 rounded-full flex items-center justify-center bg-bg-card/90 border border-border text-text-muted hover:text-text-primary shadow-sm';
// Over a cover photo — and still readable over the list once it scrolls up.
const POPUP_GLASS_BUTTON = 'w-9 h-9 rounded-full flex items-center justify-center bg-black/35 ring-1 ring-white/30 backdrop-blur-sm text-white hover:bg-black/50 shadow-sm';

/**
 * A collection's detail view in a popup. `onPickOther` adds a "Choose another
 * collection" button — for the flash card, where this opens on the list being
 * studied and the next question is usually "or something else?".
 */
export function CollectionDetailModal({ id, onClose, onPickOther }: {
  id: string;
  onClose: () => void;
  onPickOther?: () => void;
}) {
  const intl = useIntl();
  const navigate = useNavigate();
  return (
    <Popup
      width="max-w-5xl"
      bare
      onClose={onClose}
      actions={
        <>
        {onPickOther && (
          <button
            onClick={onPickOther}
            className="h-9 px-3.5 rounded-full flex items-center gap-1.5 bg-black/35 ring-1 ring-white/30 backdrop-blur-sm text-white text-xs font-bold hover:bg-black/50 shadow-sm"
          >
            <Icon icon="lucide:library" /> <FormattedMessage id="collections.chooseAnother" />
          </button>
        )}
        <button
          onClick={() => navigate(`/collections/${id}`)}
          title={intl.formatMessage({ id: 'collections.openAsPage' })}
          aria-label={intl.formatMessage({ id: 'collections.openAsPage' })}
          className={POPUP_GLASS_BUTTON}
        >
          <Icon icon="lucide:maximize-2" />
        </button>
        </>
      }
    >
      <CollectionDetail id={id} onClose={onClose} />
    </Popup>
  );
}

export default CollectionDetailModal;
