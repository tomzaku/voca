import type { IeltsChartData } from '../components/IeltsChart';

// Any IELTS Task 1 chart as a plain table — the numbers behind a line, bar or
// pie chart, laid out the way a candidate would read them off. The world's
// exam hall shows Task 1 data this way (a pixel table, not the app's SVG
// chart); the facts are the same either way.

export interface ChartTable {
  title?: string;
  /** What the numbers count, said once for the table. */
  unit?: string;
  columns: string[];
  rows: (string | number)[][];
}

export function chartTables(data: IeltsChartData): ChartTable[] {
  switch (data.kind) {
    case 'table':
      return [{ columns: data.columns, rows: data.rows }];
    case 'line':
      return [{
        unit: data.unit,
        columns: ['', ...data.xLabels],
        rows: data.series.map((s) => [s.name, ...s.values]),
      }];
    case 'bar':
      return [{
        unit: data.unit,
        columns: ['', ...data.series.map((s) => s.name)],
        rows: data.categories.map((c, i) => [c, ...data.series.map((s) => s.values[i])]),
      }];
    case 'pie':
      return data.charts.map((c) => ({
        title: c.title,
        columns: ['', '%'],
        rows: c.slices.map((sl) => [sl.name, sl.value]),
      }));
  }
}
