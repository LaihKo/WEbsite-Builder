-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "questionStartedAt" TIMESTAMP(3),
ADD COLUMN     "roundIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "roundStartIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tiebreakAnswers" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "tiebreakSeats" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "tiebreakStartedAt" TIMESTAMP(3),
ADD COLUMN     "tiebreakerQuestionId" TEXT,
ADD COLUMN     "usedTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "winnerSeats" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateTable
CREATE TABLE "TiebreakerQuestion" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "answer" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TiebreakerQuestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_tiebreakerQuestionId_fkey" FOREIGN KEY ("tiebreakerQuestionId") REFERENCES "TiebreakerQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed placeholder "closest guess wins" tiebreaker questions — only used
-- when 2+ players are tied for the top score at the end of a game. These
-- are intentionally absurd trivia with an arbitrary "reference" answer (the
-- format only works if there's a single definitive number to compare
-- guesses against), matching the tone requested when this feature was
-- designed. Editable/deletable from /admin like regular quiz content.
INSERT INTO "TiebreakerQuestion" ("id", "prompt", "answer") VALUES
  ('seed-tb-01', 'How many standard sized army ants from Australia can stand ass to mouth on the back of an average Danish warmblood horse?', 141),
  ('seed-tb-02', 'How many Danish flag pins, placed end to end, would it take to circle a regulation dartboard?', 47),
  ('seed-tb-03', 'How many grains of rice fit inside an empty 33cl beer bottle, packed as tight as physically reasonable?', 2830),
  ('seed-tb-04', 'How many house flies, laid wingtip to wingtip, would it take to span the length of a standard bowling lane?', 3960),
  ('seed-tb-05', 'How many table tennis balls would fit inside an empty Volkswagen Beetle with the seats removed?', 2500),
  ('seed-tb-06', 'How many paperclips, linked into a chain, would it take to reach from the floor to the ceiling of an average Danish living room (2.6m)?', 118),
  ('seed-tb-07', 'How many onion rings, stacked, would it take to reach the height of a standard IKEA BILLY bookshelf (202cm)?', 674),
  ('seed-tb-08', 'How many earthworms end to end would it take to stretch across a football pitch (105m)?', 700),
  ('seed-tb-09', 'How many grains of salt fit on the flat head of a single pin?', 620),
  ('seed-tb-10', 'How many seconds does it take an average garden snail to cross a standard door width (80cm) at top speed?', 800),
  ('seed-tb-11', 'How many jellybeans fit in a 1-litre mason jar?', 750),
  ('seed-tb-12', 'How many standard 2x4 Lego bricks, stacked directly on top of one another, would it take to reach the top of a regulation Danish street lamp (roughly 8 metres)?', 6667),
  ('seed-tb-13', 'How many bees would need to link legs to form a chain long enough to stretch across an Olympic swimming pool (50m)?', 3333),
  ('seed-tb-14', 'How many times does the average Dane blink during a 90-minute football match?', 1710),
  ('seed-tb-15', 'How many roasted almonds does it take to fill an average Christmas stocking?', 480),
  ('seed-tb-16', 'How many mosquito bites, laid edge to edge, would it take to cover the surface area of one human palm?', 96),
  ('seed-tb-17', 'How many blades of grass are there, on average, in one square metre of a Danish lawn?', 15000),
  ('seed-tb-18', 'How many raindrops fall on an open umbrella during a 10-minute walk in typical Danish drizzle?', 9400),
  ('seed-tb-19', 'How many times does a hummingbird''s heart beat in the time it takes a human to sneeze once?', 20),
  ('seed-tb-20', 'How many licks does it take to get to the centre of a lollipop, according to the one university study that tested it with a licking machine?', 364)
ON CONFLICT ("id") DO NOTHING;
