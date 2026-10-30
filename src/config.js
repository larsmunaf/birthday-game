// Everything personal lives here: names, looks, puzzles, the gift.
export const CONFIG = {
  brother: 'Thies',
  age: 19,

  // shown when the big gift box opens
  // TODO: replace with the real Terraria gift / code
  gift: {
    title: 'Alles Gute zum Geburtstag, Thies! 🎉',
    text: 'PLATZHALTER: Hier kommt dein Geschenk hin.',
  },
};

// The family. Each one has a puzzle; solving it earns a heart (and a hug).
// position: [x, z] on the map (the gift box is at 0,0)
// puzzle.correct: index into answers (0 = A, 1 = B, ...)
export const FAMILY = [
  {
    id: 'lars',
    name: 'Lars',
    position: [16, 8],
    look: { shirt: '#f6f6f2', pants: '#3d4a6b', hair: '#1c1a1e' }, // black hair, white shirt
    greeting: 'Na, Geburtstagskind? Beantworte mir eine Frage!',
    puzzle: {
      question: 'Wie alt bist du?',
      answers: ['6', '7', '67', 'Mein Name ist Thies!'],
      correct: 3,
    },
    wrong: ['Falsch! 😜', 'Nö. Nochmal!', 'Echt jetzt?', 'Haha, nein.'],
    hugText: '♥ Hab dich lieb, Bruder!',
  },
  {
    id: 'mama',
    name: 'Mama',
    position: [-18, -10],
    // brown/grey hair, blue pullover, dark blue jeans
    look: { shirt: '#4d7cc7', pants: '#2b3f6e', hair: '#7b6a5c', scale: 1.05 },
    greeting: 'Hallo mein kleiner Großer! Ich hab ein Rätsel für dich.',
    // TODO: real puzzle from Mama
    puzzle: {
      question: 'Platzhalter-Frage von Mama?',
      answers: ['Richtig', 'Falsch', 'Falsch', 'Falsch'],
      correct: 0,
    },
    wrong: ['Nicht ganz, mein kleiner Großer!', 'Versuch es nochmal!'],
    hugText: '♥ Hab dich lieb, mein kleiner Großer!',
  },
  {
    id: 'papa',
    name: 'Papa',
    position: [6, -24],
    // black/grey hair, dark polo, dark jeans
    look: { shirt: '#2e3340', collar: true, pants: '#33476b', hair: '#45454b', scale: 1.1 },
    greeting: 'Hey Großer! Mal sehen, ob du das weißt.',
    // TODO: real puzzle from Papa
    puzzle: {
      question: 'Platzhalter-Frage von Papa?',
      answers: ['Richtig', 'Falsch', 'Falsch', 'Falsch'],
      correct: 0,
    },
    wrong: ['Nee, nee!', 'Denk nochmal nach!'],
    hugText: '♥ Stolz auf dich, Großer!',
  },
];
