-- Add "journalistic-article" as a genre_tag option, requested by the
-- Hello World team for direct journalistic coverage (distinct from
-- institutional-report). Weight vector is PROVISIONAL — cloned from
-- institutional-report as a working default, pending Giselle's
-- methodology validation. See lib/scoring/weights.ts and the message
-- sent to Giselle on 2026-07-16.
alter type genre_tag add value 'journalistic-article';
