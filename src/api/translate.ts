// Using Google Translate unofficial API (free, no key required)
export async function translateToLanguage(
  text: string,
  targetLanguageCode: string
): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLanguageCode}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();

    // Google returns nested array: [[["translation","original",...]]]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }

    throw new Error('No translation found');
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

// Backward compatibility - keep existing function
export async function translateToRussian(text: string): Promise<string> {
  return translateToLanguage(text, 'ru');
}
