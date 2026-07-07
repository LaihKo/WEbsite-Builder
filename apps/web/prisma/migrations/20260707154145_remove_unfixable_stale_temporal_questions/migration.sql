-- Remove questions whose entire premise depends on a floating point in
-- time ("i år", "sidste år", "de seneste", "lige nu", "indtil videre")
-- with no durable anchor available to reword them by — unlike the
-- earlier reword passes, these can't be fixed without inventing a year
-- or fact that isn't verifiable from the question's own content.
DELETE FROM "Question" WHERE "prompt" = 'Er følgende udsagn fra en nytårstale sandt eller falsk: ''Når isen smelter ved Grønland, åbner der sig nye muligheder for sejlads i farvande, som aldrig før har været tilgængelige.''?';
DELETE FROM "Question" WHERE "prompt" = 'Er følgende udsagn fra en nytårstale sandt eller falsk: ''I morgen, den 1. januar, er det fyrre år siden, at Danmark trådte ind i det europæiske fællesskab.''?';
DELETE FROM "Question" WHERE "prompt" = 'Er følgende udsagn fra en nytårstale sandt eller falsk: ''Vi har store fordele og mange muligheder i Danmark, måske netop fordi landet ikke er så stort, og vi ikke er så mange.''?';
DELETE FROM "Question" WHERE "prompt" = 'I år er det 15 år siden, at verdens bedste øl begyndte at blive produceret af Albani. Hvilken øl er det?';
DELETE FROM "Question" WHERE "prompt" = 'Der er dating-apps til alle - singler, gifte, skilte og folk med børn. Men hvem er den nyeste dating-app rettet mod?';
DELETE FROM "Question" WHERE "prompt" = 'Hvor mange nytårstaler havde Dronning Margrethe 2. ifølge quizzen holdt indtil videre?';
DELETE FROM "Question" WHERE "prompt" = 'Hvem er den unge, flotte målmand, der har startet mange af de seneste kampe for det danske herrehåndboldlandshold?';
DELETE FROM "Question" WHERE "prompt" = 'Hvor mange julelys har Tivoli i år sat op til deres julearrangement?';
DELETE FROM "Question" WHERE "prompt" = 'Hvor mange dildoer blev sidste år solgt til de trængende kvinder, vi mænd ikke kan håndtere?';
DELETE FROM "Question" WHERE "prompt" = 'Hvor mange mennesker døde ifølge quizzens facit sidste år af kræft i USA alene?';
DELETE FROM "Question" WHERE "prompt" = 'Hvor mange asylansøgere havde der været i Danmark de seneste 7 dage?';
DELETE FROM "Question" WHERE "prompt" = 'Hvor mange nytårstaler havde Dronning Margrethe 2. holdt indtil videre ifølge quizzen?';
DELETE FROM "Question" WHERE "prompt" = 'Hvad hedder det nyeste skud på stammen i Samsung Galaxy-serien, som kom i starten af september?';
DELETE FROM "Question" WHERE "prompt" = 'Tie-Breaker: Hvor mange personer var lige nu i gang med en ph.d. i hele Danmark?';
DELETE FROM "Question" WHERE "prompt" = 'I dette spil er planlægning og strategi nøgleordene. Med over 550 kort at vælge imellem er der rig mulighed for at skille sig ud, når man kæmper mod millioner af andre i Blizzards nyeste udvidelse til deres populære online-kortspil. Hvilken udvidelse?';
