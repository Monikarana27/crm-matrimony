const WORDS = [
  "Tiger", "Falcon", "River", "Maple", "Ember", "Comet", "Harbor", "Cedar",
  "Quartz", "Aspen", "Delta", "Ridge", "Willow", "Nova", "Orbit", "Crest",
];

export function generateTempPassword(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const number = Math.floor(100 + Math.random() * 900);
  return `${word}${number}`;
}
