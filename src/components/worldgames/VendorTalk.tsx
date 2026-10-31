import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { PLACE_DETAILS } from '../../game/placeDetails';
import { VILLAGER_LOOKS } from '../../game/textures';
import { VENDOR_DRESS } from '../../game/vendors';
import { KeeperDialog } from './KeeperDialog';

// A food stall's vendor telling you about their dish, a line at a time the
// way an old handheld game's townsfolk do: a greeting, what the dish is, then
// something worth knowing about it — with a photo of the real thing held up
// over the message box. Keyed by stall, so walking to the next one starts
// its talk afresh.

export function VendorTalk({ id, onClose }: { id: string; onClose: () => void }) {
  const intl = useIntl();
  const [page, setPage] = useState(0);
  const dish = intl.formatMessage({ id: `places.${id}` });
  const lines = [
    intl.formatMessage({ id: 'world.vendorHello' }, { dish }),
    intl.formatMessage({ id: `places.${id}About` }),
    intl.formatMessage({ id: `places.${id}Fact` }),
  ];
  const last = page === lines.length - 1;
  const photo = PLACE_DETAILS[id]?.photos[0];
  return (
    <>
      {photo && (
        <figure className="px absolute m-0 left-1/2 -translate-x-1/2 pointer-events-auto px-in-up"
          style={{ bottom: '10.5rem' }}>
          <div className="px-notch px-frame p-1.5 w-[min(300px,calc(100vw-2rem))]">
            <img
              src={`${import.meta.env.BASE_URL}${photo.src}`}
              alt={dish}
              width={photo.w}
              height={photo.h}
              className="block w-full aspect-[4/3] object-cover"
            />
            <figcaption className="mt-1 text-[10px] leading-snug opacity-70 text-center">
              <a href={photo.page} target="_blank" rel="noreferrer" className="underline decoration-dotted">
                <FormattedMessage id="places.photoBy" values={{ author: photo.author, license: photo.license }} />
              </a>
            </figcaption>
          </div>
        </figure>
      )}
      <KeeperDialog
        look={VILLAGER_LOOKS[0]}
        dress={VENDOR_DRESS[id]}
        name={<>{dish} · <FormattedMessage id={`places.${id}En`} /></>}
        line={lines[page]}
        primary={<FormattedMessage id={last ? 'world.vendorThanks' : 'world.vendorNext'} />}
        onPrimary={() => (last ? onClose() : setPage(page + 1))}
        secondary={<FormattedMessage id="world.vendorLeave" />}
        onSecondary={onClose}
      />
    </>
  );
}
