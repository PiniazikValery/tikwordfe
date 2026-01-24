export interface Word {
  id: string;
  word: string;
  translation: string;
  transcription?: string; // phonetic transcription
  rememberPercent: number; // 0-100, how well user remembers this word
  correctCount: number; // total correct answers
  incorrectCount: number; // total incorrect answers
  lastAnsweredAt?: number; // timestamp of last answer (for spaced repetition)
}

export interface Subtitle {
  english: string;
  russian: string;
}

export interface Caption {
  start: number;
  end: number;
  text: string;
}

export interface VideoData {
  videoId: string;
  startTime: number;
  endTime?: number;
  subtitle: Subtitle;
  captions?: Caption[];
}

export interface ExplainRequest {
  word: string;
  sentence: string;
}

export interface ExplainResponse {
  explanation: string;
}

export interface WordBreakdown {
  word: string;
  baseForm: string;
  function: string;
  translation: string;
  partOfSpeech: string;
  usageInContext: string;
  meaningInSentence: string;
  alternativeMeanings: string[];
}

export interface TargetWordAnalysis {
  baseForm: string;
  partOfSpeech: string;
  usageInContext: string;
  alternativeMeanings: string[];
}

export interface Idiom {
  phrase: string;
  meaning: string;
  literalTranslation: string;
}

export interface AnalyzeRequest {
  sentence: string;
  targetWord: string;
  targetLanguage: string;
  nativeLanguage: string;
  userId: string;
}

export interface AnalyzeResponse {
  fullTranslation: string;
  literalTranslation: string;
  grammarAnalysis: string;
  breakdown: WordBreakdown[];
  targetWordAnalysis: TargetWordAnalysis;
  idioms: Idiom[];
  difficultyNotes: string;
  cached: boolean;
  accessCount: number;
}

// Language types
export type SupportedLanguage = "es" | "fr" | "de" | "ru" | "zh";

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  googleTranslateCode: string;
}

export interface LanguagePreference {
  selectedLanguage: SupportedLanguage;
  isFirstTimeSetup: boolean;
}
