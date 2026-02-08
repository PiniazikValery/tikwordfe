import { Config } from '../config';

const API_BASE_URL = Config.api.baseUrl;

export interface SharedWord {
  id: string;
  word: string;
  translation: string;
  transcription?: string;
  position?: number;
}

export interface SharedLibrary {
  id: string;
  name: string;
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  color?: string;
  icon?: string;
  sourceLanguage: string;
  targetLanguage: string;
  authorName?: string;
  wordCount: number;
  downloadCount: number;
  tags?: string[];
  isFeatured?: boolean;
  createdAt: string;
}

export interface SharedLibraryWithWords extends SharedLibrary {
  words: SharedWord[];
}

export interface PaginatedResponse<T> {
  libraries: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QuerySharedLibrariesParams {
  targetLanguage: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
  tags?: string;
  sortBy?: 'popular' | 'newest' | 'wordCount';
  page?: number;
  limit?: number;
}

/**
 * Browse shared libraries with filters and pagination
 */
export async function getSharedLibraries(
  params: QuerySharedLibrariesParams
): Promise<PaginatedResponse<SharedLibrary>> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('targetLanguage', params.targetLanguage);

    if (params.difficulty) queryParams.append('difficulty', params.difficulty);
    if (params.search) queryParams.append('search', params.search);
    if (params.tags) queryParams.append('tags', params.tags);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(
      `${API_BASE_URL}/shared-libraries?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch shared libraries: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching shared libraries:', error);
    throw error;
  }
}

/**
 * Get a single shared library with all its words
 */
export async function getSharedLibrary(id: string): Promise<SharedLibraryWithWords> {
  try {
    const response = await fetch(`${API_BASE_URL}/shared-libraries/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch shared library: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching shared library:', error);
    throw error;
  }
}

/**
 * Download a library (increments download counter and returns full library)
 */
export async function downloadSharedLibrary(
  id: string,
  deviceId?: string
): Promise<SharedLibraryWithWords> {
  try {
    const response = await fetch(`${API_BASE_URL}/shared-libraries/${id}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to download shared library: ${response.status}`);
    }

    const data = await response.json();
    return data.library;
  } catch (error) {
    console.error('Error downloading shared library:', error);
    throw error;
  }
}

/**
 * Get featured libraries for a target language
 */
export async function getFeaturedLibraries(
  targetLanguage: string
): Promise<SharedLibrary[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/shared-libraries/featured?targetLanguage=${targetLanguage}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch featured libraries: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching featured libraries:', error);
    throw error;
  }
}

/**
 * Upload/share a library to the backend
 */
export async function shareLibrary(params: {
  name: string;
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  color?: string;
  icon?: string;
  sourceLanguage: string;
  targetLanguage: string;
  authorName?: string;
  tags?: string[];
  words: Array<{
    word: string;
    translation: string;
    transcription?: string;
  }>;
}): Promise<{ id: string; name: string; wordCount: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/shared-libraries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to share library: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sharing library:', error);
    throw error;
  }
}

/**
 * Update an existing shared library on the backend
 */
export async function updateSharedLibrary(
  id: string,
  params: {
    name: string;
    description?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    color?: string;
    icon?: string;
    words: Array<{
      word: string;
      translation: string;
      transcription?: string;
    }>;
  }
): Promise<{ id: string; name: string; wordCount: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/shared-libraries/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to update shared library: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating shared library:', error);
    throw error;
  }
}

/**
 * Report a library for inappropriate content
 */
export async function reportLibrary(
  id: string,
  reason: string,
  description?: string
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/shared-libraries/${id}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason, description }),
    });

    if (!response.ok) {
      throw new Error(`Failed to report library: ${response.status}`);
    }
  } catch (error) {
    console.error('Error reporting library:', error);
    throw error;
  }
}
