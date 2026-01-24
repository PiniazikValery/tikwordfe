import AsyncStorage from "@react-native-async-storage/async-storage";
import { SupportedLanguage, Word } from "../types";

const WORDS_KEY_PREFIX = "vocabulary_words";

function getWordsKey(languageCode: SupportedLanguage): string {
  return `${WORDS_KEY_PREFIX}_${languageCode}`;
}

export async function getWords(
  languageCode: SupportedLanguage,
): Promise<Word[]> {
  try {
    const data = await AsyncStorage.getItem(getWordsKey(languageCode));
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("Error loading words:", error);
    return [];
  }
}

export async function saveWord(
  word: Word,
  languageCode: SupportedLanguage,
): Promise<void> {
  try {
    const words = await getWords(languageCode);
    words.push(word);
    await AsyncStorage.setItem(
      getWordsKey(languageCode),
      JSON.stringify(words),
    );
  } catch (error) {
    console.error("Error saving word:", error);
    throw error;
  }
}

export async function deleteWord(
  id: string,
  languageCode: SupportedLanguage,
): Promise<void> {
  try {
    const words = await getWords(languageCode);
    const filtered = words.filter((w) => w.id !== id);
    await AsyncStorage.setItem(
      getWordsKey(languageCode),
      JSON.stringify(filtered),
    );
  } catch (error) {
    console.error("Error deleting word:", error);
    throw error;
  }
}

export async function updateWord(
  updatedWord: Word,
  languageCode: SupportedLanguage,
): Promise<void> {
  try {
    const words = await getWords(languageCode);
    const index = words.findIndex((w) => w.id === updatedWord.id);
    if (index !== -1) {
      words[index] = updatedWord;
      await AsyncStorage.setItem(
        getWordsKey(languageCode),
        JSON.stringify(words),
      );
    }
  } catch (error) {
    console.error("Error updating word:", error);
    throw error;
  }
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

// Minimum time (in ms) that must pass before correct answer increases percentage
// This prevents "cheating" by quickly tapping correct answers
// Real learning requires time for memory consolidation
const MIN_TIME_BETWEEN_CORRECT_ANSWERS_MS = 12 * 60 * 60 * 1000; // 12 hours (half a day)

// Calculate new remember percentage based on answer
// Using spaced repetition model similar to Anki/Duolingo
// - Correct: grows slower as percentage increases (harder to "max out")
// - Incorrect: loses less when percentage is low (less to forget)
// - Time check: correct answer only counts if enough time has passed
export function calculateRememberPercent(
  currentPercent: number,
  isCorrect: boolean,
  lastAnsweredAt?: number,
): { newPercent: number; shouldUpdate: boolean } {
  const LEARNING_COEFFICIENT = 0.2; // k - how fast you learn
  const FORGETTING_COEFFICIENT = 0.3; // m - how fast you forget

  if (isCorrect) {
    // Check if enough time has passed since last answer
    const now = Date.now();
    const timeSinceLastAnswer = lastAnsweredAt
      ? now - lastAnsweredAt
      : Infinity;

    if (timeSinceLastAnswer < MIN_TIME_BETWEEN_CORRECT_ANSWERS_MS) {
      // Not enough time passed - don't increase percentage
      return { newPercent: currentPercent, shouldUpdate: false };
    }

    // L = L + (100 − L) × k
    // Example: 0% → +20% → 20%, 60% → +8% → 68%
    const increase = (100 - currentPercent) * LEARNING_COEFFICIENT;
    return {
      newPercent: Math.round(currentPercent + increase),
      shouldUpdate: true,
    };
  } else {
    // L = L − L × m
    // Example: 60% → −18% → 42%, 30% → −9% → 21%
    // Wrong answers always count (no time restriction)
    const decrease = currentPercent * FORGETTING_COEFFICIENT;
    return {
      newPercent: Math.round(currentPercent - decrease),
      shouldUpdate: true,
    };
  }
}
