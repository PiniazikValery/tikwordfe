const PIXABAY_API_KEY = '54001713-ddce2e17a28cde04a52644eea'; // Free API key - replace with your own for production
const PIXABAY_API_URL = 'https://pixabay.com/api/';

export async function getWordImage(word: string): Promise<string | null> {
  try {
    // Clean the word - take first word if it's a phrase
    const searchWord = word.trim().split(/\s+/)[0].toLowerCase();
    
    const params = new URLSearchParams({
      key: PIXABAY_API_KEY,
      q: searchWord,
      image_type: 'photo',
      safesearch: 'true',
      per_page: '5',
    });

    const response = await fetch(`${PIXABAY_API_URL}?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const data = await response.json();
    
    if (data.hits && data.hits.length > 0) {
      // Return a random image from the top results for variety
      const randomIndex = Math.floor(Math.random() * Math.min(data.hits.length, 5));
      return data.hits[randomIndex].webformatURL;
    }
    
    return null;
  } catch (error) {
    console.error('Pixabay API error:', error);
    return null;
  }
}
