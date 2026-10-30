import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl, type IntlShape } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { useImproveWriting } from '../../hooks/useImproveWriting';
import { allTemplates, useWritingTemplates, type AnyWritingTemplate } from '../../hooks/useWritingTemplates';
import { diffOption } from '../../lib/textDiff';
import { playSelect } from '../../lib/sfx';
import { HudCenter, PixelButton, PixelChip, PixelIcon, PixelLoader } from './pixel';

// The scribe at Văn Miếu — the Writing page's Improve Writing: paste any
// text, pick a template (the built-ins and your own), and get it back revised,
// each change marked word by word (textDiff) and explained. Same call and
// prefs as the app (useImproveWriting); Pro, like the app.

const name = (intl: IntlShape, t: AnyWritingTemplate) =>
  ('isDefault' in t && t.isDefault ? intl.formatMessage({ id: t.nameId }) : t.name);

export function ImproveWriting() {
  const intl = useIntl();
  const navigate = useNavigate();
  const { user } = useAuth();
  const custom = useWritingTemplates((s) => s.custom);
  const templates = useMemo(() => allTemplates(custom), [custom]);
  useEffect(() => { if (user) void useWritingTemplates.getState().fetchMine(); }, [user]);

  const [templateId, setTemplateId] = useState('default-general');
  const template = templates.find((t) => t.id === templateId) ?? templates[0];
  const [text, setText] = useState('');
  const { submit, result, sourceText, loading, locked, clear } = useImproveWriting();

  const copy = async (s: string) => {
    await navigator.clipboard.writeText(s);
    toast.success(intl.formatMessage({ id: 'writing.copied' }));
  };

  if (loading) return <HudCenter><PixelLoader label={<FormattedMessage id="world.scribeWorking" />} /></HudCenter>;

  if (result) {
    return (
      <HudCenter wide>
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="px-title !text-[18px] text-[var(--px-gold)]">
            <FormattedMessage id={result.options.length > 1 ? 'writing.revisedPickOne' : 'writing.revised'} />
          </p>
          <PixelButton tone="paper" onClick={() => { playSelect(); clear(); }}>
            <PixelIcon name="pencil" size={2} /> <FormattedMessage id="world.scribeEdit" />
          </PixelButton>
        </div>
        <div className="space-y-4">
          {result.options.map((o, i) => (
            <div key={i}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                {result.options.length > 1 && <span className="px-title !text-[12px] text-[var(--px-accent)]"><FormattedMessage id="world.scribeOption" values={{ n: i + 1 }} /></span>}
                <span className="flex-1" />
                <PixelButton tone="sky" className="!py-1.5 !px-3" onClick={() => void copy(o.text)}>
                  <PixelIcon name="share" size={2} /> <FormattedMessage id="world.scribeCopy" />
                </PixelButton>
              </div>
              <p className="px-inset px-notch p-3 text-[16px] leading-relaxed whitespace-pre-wrap">
                {diffOption(sourceText, o.text).map((seg, k) => (
                  <span key={k} className={seg.added ? 'text-[var(--px-good)] font-bold' : seg.removed ? 'text-[var(--px-bad)] line-through opacity-80' : ''}>
                    {seg.value}
                  </span>
                ))}
              </p>
              {o.corrections.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {o.corrections.map((c, k) => (
                    <li key={k} className="text-[14px] leading-snug">
                      <span className="px-title !text-[10px] text-[var(--px-muted)] mr-1.5">{c.category}</span>
                      <span className="text-[var(--px-bad)] line-through">{c.original}</span>
                      {' → '}
                      <span className="text-[var(--px-good)] font-bold">{c.corrected}</span>
                      <span className="block text-[var(--px-muted)]">{c.explanation}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </HudCenter>
    );
  }

  return (
    <HudCenter wide>
      <p className="px-title !text-[18px] text-[var(--px-gold)] mb-2"><FormattedMessage id="writing.template" /></p>
      <div className="flex flex-wrap gap-1.5 mb-1">
        {templates.map((t) => (
          <PixelChip key={t.id} on={t.id === template?.id} onClick={() => setTemplateId(t.id)}>{name(intl, t)}</PixelChip>
        ))}
      </div>
      {template && 'isDefault' in template && template.isDefault && (
        <p className="text-[13px] text-[var(--px-muted)] leading-snug mb-3"><FormattedMessage id={template.descriptionId} /></p>
      )}
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 6000))}
        rows={8}
        placeholder={intl.formatMessage({ id: 'world.scribePlaceholder' })}
        className="px-inset px-notch w-full resize-y mt-2 px-3 py-2.5 text-[16px] leading-relaxed text-[var(--px-text)] placeholder:text-[var(--px-muted)] focus:outline-none"
      />
      {locked && (
        <p className="text-[14px] text-[var(--px-gold)] mt-2">
          <FormattedMessage id={user ? 'writing.improveProFeature' : 'writing.improveSignInPro'} />
        </p>
      )}
      <div className="flex justify-end mt-2">
        {locked ? (
          <PixelButton tone="gold" onClick={() => navigate('/pro')}>
            <PixelIcon name="star" size={2} /> <FormattedMessage id="world.stelePro" />
          </PixelButton>
        ) : (
          <PixelButton tone="red" onClick={() => void submit(template, text)} disabled={!text.trim()}>
            <PixelIcon name="pencil" size={2} /> <FormattedMessage id="world.scribeImprove" />
          </PixelButton>
        )}
      </div>
    </HudCenter>
  );
}
