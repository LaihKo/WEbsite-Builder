import type { Quiz } from "./types";

export const sampleQuiz: Quiz = {
  id: "geography-basics",
  title: "Geography Basics",
  description: "A short quiz to sanity-check the quiz engine end to end.",
  questions: [
    {
      id: "q1",
      prompt: "What is the capital of France?",
      options: [
        { id: "a", text: "Paris" },
        { id: "b", text: "Berlin" },
        { id: "c", text: "Madrid" },
      ],
      correctOptionId: "a",
      points: 1,
    },
    {
      id: "q2",
      prompt: "Which is the largest ocean on Earth?",
      options: [
        { id: "a", text: "Atlantic" },
        { id: "b", text: "Indian" },
        { id: "c", text: "Pacific" },
      ],
      correctOptionId: "c",
      points: 1,
    },
    {
      id: "q3",
      prompt: "Mount Everest is located in which mountain range?",
      options: [
        { id: "a", text: "Andes" },
        { id: "b", text: "Himalayas" },
        { id: "c", text: "Alps" },
      ],
      correctOptionId: "b",
      points: 1,
    },
  ],
};
