import { describe, expect, it } from 'vitest';
import { chartTables } from './ieltsChartTable';

describe('chartTables', () => {
  it('puts a line chart’s series in rows and its x labels across', () => {
    expect(chartTables({ kind: 'line', xLabels: ['2000', '2010'], unit: '%', series: [{ name: 'A', values: [1, 2] }] }))
      .toEqual([{ unit: '%', columns: ['', '2000', '2010'], rows: [['A', 1, 2]] }]);
  });
  it('puts a bar chart’s categories in rows and its series across', () => {
    expect(chartTables({ kind: 'bar', categories: ['X', 'Y'], unit: 'million', series: [{ name: 'S', values: [3, 4] }] }))
      .toEqual([{ unit: 'million', columns: ['', 'S'], rows: [['X', 3], ['Y', 4]] }]);
  });
  it('makes one table per pie', () => {
    const t = chartTables({ kind: 'pie', charts: [{ title: 'P', slices: [{ name: 'a', value: 60 }] }, { title: 'Q', slices: [] }] });
    expect(t.map((x) => x.title)).toEqual(['P', 'Q']);
    expect(t[0].rows).toEqual([['a', 60]]);
  });
  it('passes a table through', () => {
    expect(chartTables({ kind: 'table', columns: ['a'], rows: [[1]] })).toEqual([{ columns: ['a'], rows: [[1]] }]);
  });
});
