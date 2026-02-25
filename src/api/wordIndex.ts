import { Config } from '../config';

const API_BASE_URL = Config.api.baseUrl;

export interface Caption {
  start: number;
  end: number;
  text: string;
}

export interface WordExample {
  caption: string;
  endTime: number;
  videoId: string;
  captions: Caption[];
  videoUrl: string;
  startTime: number;
  popularity?: {
    score: number;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    calculatedAt: string;
  };
}

/**
 * Fetches pre-indexed examples for a word from the word-index endpoint
 * @param word The word to fetch examples for
 * @returns Array of examples or null if none found (404)
 */
export async function getWordExamples(word: string): Promise<WordExample[] | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/word-index/examples/${encodeURIComponent(word)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      // No examples found in index
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch word examples: ${response.status}`);
    }

    const data: WordExample[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching word examples:', error);
    throw error;
  }
}

/**
 * Gets a random example from the word index
 * @param word The word to fetch examples for
 * @returns A random example or null if none found
 */
export async function getRandomWordExample(word: string): Promise<WordExample | null> {
  const examples = await getWordExamples(word);

  if (!examples || examples.length === 0) {
    return null;
  }

  // Weighted random selection: popular videos appear more frequently
  const weights = examples.map(e => e.popularity?.score ?? 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < examples.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return examples[i];
    }
  }

  return examples[examples.length - 1];
}
