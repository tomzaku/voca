import { t } from '../i18n';
import { getCollections } from './collections';
import type { TestSummary } from './testsApi';

// How a test is named and whether it's open, the same on every screen. A
// built-in collection's practice test has no due date and is named in the
// reader's language here, since the server only knows its number.

/** Still open to take: before its due date — or a practice test, which never closes. */
export function isTestOpen(test: Pick<TestSummary, 'dueAt'>, now: number): boolean {
  return test.dueAt === null || Date.parse(test.dueAt) > now;
}

/** "Test 2" for a built-in practice test; a teacher's own title otherwise. */
export function testTitle(test: Pick<TestSummary, 'title' | 'practiceNumber'>): string {
  return test.practiceNumber != null ? t('tests.practiceTitle', { n: test.practiceNumber }) : test.title;
}

/** Its collection's name — a built-in one's in the reader's language. */
export function testCollectionName(test: Pick<TestSummary, 'collectionId' | 'collectionName'>): string {
  return getCollections().find((c) => c.system && c.id === test.collectionId)?.name ?? test.collectionName;
}
