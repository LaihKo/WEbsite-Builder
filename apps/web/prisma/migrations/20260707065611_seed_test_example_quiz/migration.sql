-- A small fixed quiz used to exercise the single-quiz-taking flow (e.g. for
-- QA, or admin's own "Take" preview) — not part of the real pub quiz
-- archive and deliberately not shown on the public homepage, which now
-- only offers Party mode's category voting. Untagged on purpose, so it
-- never gets drawn into Party mode's category pool.
INSERT INTO "Quiz" ("id", "title", "description", "folder", "updatedAt") VALUES
  ('test-example', 'Test Example', 'A fixed 5-question quiz for testing the quiz-taking flow.', 'Test', CURRENT_TIMESTAMP);

INSERT INTO "Question" ("id", "quizId", "order", "prompt", "points", "correctOptionId", "tags") VALUES
  ('test-example-q1', 'test-example', 0, 'Hvad er hovedstaden i Frankrig?', 1, 'a', ARRAY[]::TEXT[]),
  ('test-example-q2', 'test-example', 1, 'Hvilket ocean er det størst i verden?', 1, 'c', ARRAY[]::TEXT[]),
  ('test-example-q3', 'test-example', 2, 'Hvor mange strenge har en standard guitar?', 1, 'c', ARRAY[]::TEXT[]),
  ('test-example-q4', 'test-example', 3, 'Hvor mange dage har februar i et skudår?', 1, 'b', ARRAY[]::TEXT[]),
  ('test-example-q5', 'test-example', 4, 'Hvad er hovedstaden i Danmark?', 1, 'c', ARRAY[]::TEXT[]);

INSERT INTO "Option" ("id", "questionId", "value", "text") VALUES
  ('test-example-q1-a', 'test-example-q1', 'a', 'Paris'),
  ('test-example-q1-b', 'test-example-q1', 'b', 'Berlin'),
  ('test-example-q1-c', 'test-example-q1', 'c', 'Madrid'),
  ('test-example-q1-d', 'test-example-q1', 'd', 'Rom'),

  ('test-example-q2-a', 'test-example-q2', 'a', 'Atlanterhavet'),
  ('test-example-q2-b', 'test-example-q2', 'b', 'Det Indiske Ocean'),
  ('test-example-q2-c', 'test-example-q2', 'c', 'Stillehavet'),
  ('test-example-q2-d', 'test-example-q2', 'd', 'Nordlige Ishav'),

  ('test-example-q3-a', 'test-example-q3', 'a', '4'),
  ('test-example-q3-b', 'test-example-q3', 'b', '5'),
  ('test-example-q3-c', 'test-example-q3', 'c', '6'),
  ('test-example-q3-d', 'test-example-q3', 'd', '7'),

  ('test-example-q4-a', 'test-example-q4', 'a', '28'),
  ('test-example-q4-b', 'test-example-q4', 'b', '29'),
  ('test-example-q4-c', 'test-example-q4', 'c', '30'),
  ('test-example-q4-d', 'test-example-q4', 'd', '31'),

  ('test-example-q5-a', 'test-example-q5', 'a', 'Aarhus'),
  ('test-example-q5-b', 'test-example-q5', 'b', 'Odense'),
  ('test-example-q5-c', 'test-example-q5', 'c', 'København'),
  ('test-example-q5-d', 'test-example-q5', 'd', 'Aalborg');