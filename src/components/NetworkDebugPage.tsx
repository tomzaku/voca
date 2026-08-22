// A phone-side network log. Built to chase the "pro status sometimes shows
// free on mobile" report: the client already collapses a failed /me lookup
// into "not Pro" (see useProStatus.ts), so the only way to tell "the server
// said no" apart from "the request never landed" is to watch it happen on the
// device where it's happening. Nothing here leaves the phone except by the
// Copy button.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Icon } from '@iconify/react';
import { useNetworkDebug, formatNetworkLog, type NetworkLogEntry } from '../lib/networkDebug';
import { ToggleSwitch } from './ToggleSwitch';

function statusColor(entry: { ok: boolean; status: number }): string {
  if (entry.ok) return 'text-accent-green';
  if (entry.status === 0) return 'text-accent-red';
  return 'text-accent-orange';
}

/** Expandable detail — auth flag, error, and truncated request/response bodies. Collapsed by default: most rows are only interesting for their status/timing, and a screen of JSON per row would bury those. */
function LogRow({ entry }: { entry: NetworkLogEntry }) {
  const [open, setOpen] = useState(false);
  const hasDetail = entry.error || entry.requestBody || entry.responseBody;

  return (
    <div className="px-3 py-2">
      <button
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 text-xs font-code text-left ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className="text-text-muted shrink-0 w-16 tabular-nums">{entry.startedAt.slice(11, 19)}</span>
        <span className="text-text-secondary shrink-0 w-10">{entry.method}</span>
        <span className={`shrink-0 w-10 font-medium ${statusColor(entry)}`}>{entry.status || 'ERR'}</span>
        <span className="text-text-primary flex-1 min-w-0 truncate">{entry.path}</span>
        <span className="text-text-muted shrink-0 w-14 text-right tabular-nums">{entry.durationMs}ms</span>
        {hasDetail && (
          <Icon icon={open ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="text-text-muted shrink-0" />
        )}
      </button>

      {open && (
        <div className="mt-2 ml-[76px] space-y-1.5 text-[11px] font-code">
          <p className="text-text-muted">{entry.authenticated ? 'signed in' : 'anonymous'}</p>
          {entry.error && <p className="text-accent-red">{entry.error}</p>}
          {entry.requestBody && (
            <div>
              <p className="text-text-muted mb-0.5">request</p>
              <pre className="whitespace-pre-wrap break-words bg-bg-tertiary rounded p-2 overflow-x-auto text-text-secondary">
                {entry.requestBody}
              </pre>
            </div>
          )}
          {entry.responseBody && (
            <div>
              <p className="text-text-muted mb-0.5">response</p>
              <pre className="whitespace-pre-wrap break-words bg-bg-tertiary rounded p-2 overflow-x-auto text-text-secondary">
                {entry.responseBody}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NetworkDebugPage() {
  const enabled = useNetworkDebug((s) => s.enabled);
  const setEnabled = useNetworkDebug((s) => s.setEnabled);
  const log = useNetworkDebug((s) => s.log);
  const clear = useNetworkDebug((s) => s.clear);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatNetworkLog(log));
      setCopied(true);
      toast.success('Copied — paste it wherever you need to share it');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  return (
    <div className="max-w-page mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-text-primary mb-1">Network debug</h1>
      <p className="text-sm text-text-muted mb-1">
        A log of every call this device makes to the app's server, kept only here — nothing is sent
        anywhere unless you copy it. Turn it on, then use the app normally; failures (timeouts, no
        connection, server errors) show up as they happen. Tap a row for the request/response body.
      </p>
      <p className="text-xs text-text-muted/70 mb-8">
        Bodies are truncated and your session token is never included — but a body can contain
        whatever you typed (writing, chat), so treat a copied log the way you'd treat a screenshot
        before pasting it somewhere.
      </p>

      <section className="mb-6">
        <button
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            toast.success(next ? 'Logging on' : 'Logging off');
          }}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-bg-card hover:border-border-light transition-all cursor-pointer"
        >
          <div className="flex-1 text-left">
            <span className="text-sm font-medium text-text-primary block">Log network requests</span>
            <span className="text-xs text-text-muted mt-0.5 block">
              Keeps the last 200 calls (method, path, status, timing) in memory on this device.
            </span>
          </div>
          <ToggleSwitch checked={enabled} />
        </button>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider">
            Log ({log.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={log.length === 0}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:border-accent-cyan/30 hover:text-accent-cyan transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} className="text-sm" />
              Copy
            </button>
            <button
              onClick={clear}
              disabled={log.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-accent-red hover:border-accent-red/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {log.length === 0 ? (
          <div className="p-6 rounded-lg border border-border bg-bg-card text-center">
            <p className="text-sm text-text-muted">
              {enabled
                ? 'No requests yet — go use the app, then come back here.'
                : 'Turn logging on above, then use the app normally.'}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-bg-card divide-y divide-border overflow-hidden">
            {[...log].reverse().map((entry) => (
              <LogRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
