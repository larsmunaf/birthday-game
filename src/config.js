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
    look: { shirt: '#5cc28a', pants: '#3d4a6b', hair: '#6b4226' },
    greeting: 'Na, Geburtstagskind? Beantworte mir eine Frage!',
    puzzle: {
      question: 'Wie alt bist du?',
      answers: ['6', '7', '67', 'Mein Name ist Thies!'],
      correct: 3,
    },
    wrong: ['Falsch! 😜', 'Nö. Nochmal!', 'Echt jetzt?', 'Haha, nein.'],
    hugText: '❤️ Hab dich lieb, Bruder!',
  },
  {
    id: 'mama',
    name: 'Mama',
    position: [-18, -10],
    look: { shirt: '#d46bb8', pants: '#5a4a8a', hair: '#c9913d', longHair: true, scale: 1.05 },
    greeting: 'Hallo mein Schatz! Ich hab ein Rätsel für dich.',
    // TODO: real puzzle from Mama
    puzzle: {
      question: 'Platzhalter-Frage von Mama?',
      answers: ['Richtig', 'Falsch', 'Falsch', 'Falsch'],
      correct: 0,
    },
    wrong: ['Nicht ganz, Schatz!', 'Versuch es nochmal!'],
    hugText: '❤️ Hab dich lieb, mein Schatz!',
  },
  {
    id: 'papa',
    name: 'Papa',
    position: [6, -24],
    look: { shirt: '#4f8fd6', pants: '#4a4a4a', hair: '#7a6a5a', beard: '#7a6a5a', hat: 'cap', hatColor: '#d9533b', scale: 1.1 },
    greeting: 'Hey Großer! Mal sehen, ob du das weißt.',
    // TODO: real puzzle from Papa
    puzzle: {
      question: 'Platzhalter-Frage von Papa?',
      answers: ['Richtig', 'Falsch', 'Falsch', 'Falsch'],
      correct: 0,
    },
    wrong: ['Nee, nee!', 'Denk nochmal nach!'],
    hugText: '❤️ Stolz auf dich, Großer!',
  },
];
