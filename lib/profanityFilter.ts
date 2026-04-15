// Common English profanity list — catches exact words and common obfuscations
const BAD_WORDS = [
  "fuck", "shit", "ass", "damn", "bitch", "bastard", "dick", "cock", "pussy",
  "cunt", "whore", "slut", "fag", "nigger", "nigga", "retard", "twat",
  "wanker", "bollocks", "piss", "crap", "douche", "asshole", "arsehole",
  "motherfucker", "bullshit", "horseshit", "dipshit", "dumbass", "jackass",
  "goddamn", "hell", "penis", "vagina", "boobs", "tits",
];

// Build regex: match whole words, case-insensitive
// Also catches simple leet-speak: @ for a, 0 for o, 1 for i/l, 3 for e, $ for s
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/@/g, "a")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/\$/g, "s")
    .replace(/5/g, "s")
    .replace(/[^a-z\s]/g, "");
}

export function containsProfanity(text: string): boolean {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/);
  return words.some((word) => BAD_WORDS.includes(word));
}
