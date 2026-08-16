// Renders the structured chart data attached to a Task 1 question
// (IeltsWritingQuestion.chartData, src/data/ieltsWriting.ts) as a small inline
// SVG/table — line, grouped bar, pie, or a plain table. Hand-rolled rather
// than a charting dependency: the shapes are simple and fixed (at most a
// handful of series/slices per question), and this keeps the bundle free of
// a new library for four small illustrative charts.
//
// Colours are a fixed, never-cycled order pulled from the app's own accent
// tokens (the same set useQuestionAccent.ts uses for decorative rotation),
// deliberately excluding green/red — those are reserved for correct/incorrect
// feedback elsewhere in the app, and a chart series turning "red" would read
// as a wrong answer.

export type IeltsChartData =
  | { kind: 'line'; xLabels: string[]; unit?: string; series: { name: string; values: number[] }[] }
  | { kind: 'bar'; categories: string[]; unit?: string; series: { name: string; values: number[] }[] }
  | { kind: 'pie'; charts: { title: string; slices: { name: string; value: number }[] }[] }
  | { kind: 'table'; columns: string[]; rows: (string | number)[][] };

const SERIES_COLORS = [
  'var(--color-accent-cyan)',
  'var(--color-accent-purple)',
  'var(--color-accent-orange)',
  'var(--color-accent-yellow)',
  'var(--color-accent-pink)',
];

function Legend({ names }: { names: string[] }) {
  if (names.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
      {names.map((name, i) => (
        <span key={name} className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
          {name}
        </span>
      ))}
    </div>
  );
}

const W = 480;
const H = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 40 };

function LineChart({ data }: { data: Extract<IeltsChartData, { kind: 'line' }> }) {
  const allValues = data.series.flatMap((s) => s.values);
  const max = Math.max(...allValues, 0);
  const min = Math.min(...allValues, 0);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const xStep = data.xLabels.length > 1 ? plotW / (data.xLabels.length - 1) : 0;
  const yFor = (v: number) => PAD.top + plotH - ((v - min) / (max - min || 1)) * plotH;
  const xFor = (i: number) => PAD.left + i * xStep;
  const gridLines = 4;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Line chart">
        {/* Recessive horizontal gridlines */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = PAD.top + (plotH / gridLines) * i;
          return <line key={i} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="var(--color-border)" strokeWidth={1} opacity={0.4} />;
        })}
        {/* X axis labels */}
        {data.xLabels.map((label, i) => (
          <text key={label} x={xFor(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)">
            {label}
          </text>
        ))}
        {/* Series lines */}
        {data.series.map((s, si) => {
          const points = s.values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ');
          return (
            <g key={s.name}>
              <polyline points={points} fill="none" stroke={SERIES_COLORS[si % SERIES_COLORS.length]} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {s.values.map((v, i) => (
                <circle key={i} cx={xFor(i)} cy={yFor(v)} r={3} fill={SERIES_COLORS[si % SERIES_COLORS.length]}>
                  <title>{`${s.name}, ${data.xLabels[i]}: ${v}${data.unit ? ` ${data.unit}` : ''}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <Legend names={data.series.map((s) => s.name)} />
    </div>
  );
}

function BarChart({ data }: { data: Extract<IeltsChartData, { kind: 'bar' }> }) {
  const allValues = data.series.flatMap((s) => s.values);
  const max = Math.max(...allValues, 0);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const groupW = plotW / data.categories.length;
  const barGap = 2;
  const barW = (groupW - barGap * (data.series.length + 1)) / data.series.length;
  const yFor = (v: number) => PAD.top + plotH - (v / (max || 1)) * plotH;
  const gridLines = 4;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Bar chart">
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = PAD.top + (plotH / gridLines) * i;
          return <line key={i} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="var(--color-border)" strokeWidth={1} opacity={0.4} />;
        })}
        {data.categories.map((cat, ci) => (
          <text key={cat} x={PAD.left + groupW * ci + groupW / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)">
            {cat}
          </text>
        ))}
        {data.series.map((s, si) => (
          <g key={s.name}>
            {s.values.map((v, ci) => {
              const x = PAD.left + groupW * ci + barGap + si * (barW + barGap);
              const y = yFor(v);
              return (
                <rect key={ci} x={x} y={y} width={Math.max(barW, 1)} height={PAD.top + plotH - y} rx={2} fill={SERIES_COLORS[si % SERIES_COLORS.length]}>
                  <title>{`${s.name}, ${data.categories[ci]}: ${v}${data.unit ? ` ${data.unit}` : ''}`}</title>
                </rect>
              );
            })}
          </g>
        ))}
      </svg>
      <Legend names={data.series.map((s) => s.name)} />
    </div>
  );
}

function Pie({ title, slices }: { title: string; slices: { name: string; value: number }[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const r = 60;
  const cx = 70;
  const cy = 70;
  const toXY = (a: number) => {
    const rad = (a * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  // Each slice's start angle is the running total of every slice before it —
  // computed by re-summing rather than a mutable accumulator, so this stays a
  // pure derivation of `slices` instead of state that drifts across renders.
  const paths = slices.map((s, i) => {
    const priorFrac = slices.slice(0, i).reduce((sum, p) => sum + p.value, 0) / total;
    const frac = s.value / total;
    const startAngle = -90 + priorFrac * 360;
    const endAngle = startAngle + frac * 360;
    const [x1, y1] = toXY(startAngle);
    const [x2, y2] = toXY(endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { d, color: SERIES_COLORS[i % SERIES_COLORS.length], name: s.name, value: s.value, pct: Math.round(frac * 100) };
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 140" className="w-32 h-32" role="img" aria-label={`Pie chart: ${title}`}>
        {paths.map((p) => (
          <path key={p.name} d={p.d} fill={p.color} stroke="var(--color-bg-card)" strokeWidth={2}>
            <title>{`${p.name}: ${p.value}%`}</title>
          </path>
        ))}
      </svg>
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider mt-1">{title}</p>
    </div>
  );
}

function PieChart({ data }: { data: Extract<IeltsChartData, { kind: 'pie' }> }) {
  const names = data.charts[0]?.slices.map((s) => s.name) ?? [];
  return (
    <div>
      <div className="flex flex-wrap justify-center gap-6">
        {data.charts.map((c) => (
          <Pie key={c.title} title={c.title} slices={c.slices} />
        ))}
      </div>
      <Legend names={names} />
    </div>
  );
}

function DataTable({ data }: { data: Extract<IeltsChartData, { kind: 'table' }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {data.columns.map((col) => (
              <th key={col} className="text-left text-[11px] font-bold text-text-muted uppercase tracking-wider px-2.5 py-1.5 border-b border-border">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={`px-2.5 py-1.5 ${j === 0 ? 'font-bold text-text-primary' : 'text-text-secondary tabular-nums'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IeltsChart({ data }: { data: IeltsChartData }) {
  switch (data.kind) {
    case 'line': return <LineChart data={data} />;
    case 'bar': return <BarChart data={data} />;
    case 'pie': return <PieChart data={data} />;
    case 'table': return <DataTable data={data} />;
  }
}
