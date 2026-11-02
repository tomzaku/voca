-- A Lunar New Year (Tết) look for tests: red and gold, lanterns and blossom.
-- Names only — src/lib/testThemes.ts draws it; _shared/tests.ts lists the same twelve.
alter table collection_tests drop constraint if exists collection_tests_theme_check;
alter table collection_tests
  add constraint collection_tests_theme_check
  check (theme in ('classic', 'ocean', 'space', 'jungle', 'candy', 'castle', 'arctic', 'beach', 'sports', 'music', 'farm', 'lunar'));
