-- Five more looks for a test: arctic, beach, sports, music, farm. The names
-- only — src/lib/testThemes.ts draws them, and _shared/tests.ts lists the
-- same eleven.
alter table collection_tests drop constraint if exists collection_tests_theme_check;
alter table collection_tests
  add constraint collection_tests_theme_check
  check (theme in ('classic', 'ocean', 'space', 'jungle', 'candy', 'castle', 'arctic', 'beach', 'sports', 'music', 'farm'));
