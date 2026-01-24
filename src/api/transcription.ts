const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

async function getSingleWordTranscription(word: string): Promise<string> {
  const response = await fetch(`${DICTIONARY_API_URL}/${encodeURIComponent(word)}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch transcription');
  }

  const data = await response.json();
  
  // Try to find phonetic transcription in the response
  if (data && data.length > 0) {
    const entry = data[0];
    
    // First try the main phonetic field
    if (entry.phonetic) {
      return entry.phonetic;
    }
    
    // Then try phonetics array
    if (entry.phonetics && entry.phonetics.length > 0) {
      for (const phonetic of entry.phonetics) {
        if (phonetic.text) {
          return phonetic.text;
        }
      }
    }
  }
  
  throw new Error('No phonetic transcription found');
}

export async function getPhoneticTranscription(input: string): Promise<string> {
  try {
    const trimmedInput = input.trim();
    
    // Check if it's a single word
    if (!trimmedInput.includes(' ')) {
      if (trimmedInput.length > 30) {
        return '';
      }
      return await getSingleWordTranscription(trimmedInput);
    }
    
    // Handle multiple words (sentence)
    const words = trimmedInput
      .split(/\s+/)
      .map(w => w.replace(/[.,!?;:'"()]/g, '').trim()) // Remove punctuation
      .filter(w => w.length > 0 && w.length <= 30);
    
    if (words.length === 0) {
      return '';
    }
    
    // Fetch transcriptions for all words in parallel
    const transcriptionPromises = words.map(async (word) => {
      try {
        return await getSingleWordTranscription(word);
      } catch {
        return null; // Skip words without transcription
      }
    });
    
    const transcriptions = await Promise.all(transcriptionPromises);
    
    // Combine transcriptions, using the original word if transcription not found
    const result = words.map((word, index) => {
      const transcription = transcriptions[index];
      return transcription || `[${word}]`;
    }).join(' ');
    
    // Return empty if no transcriptions were found at all
    const hasAnyTranscription = transcriptions.some(t => t !== null);
    return hasAnyTranscription ? result : '';
  } catch (error) {
    throw error;
  }
}
