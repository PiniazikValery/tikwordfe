import AsyncStorage from "@react-native-async-storage/async-storage";
import { SupportedLanguage, Library } from "../types";

const LIBRARIES_KEY_PREFIX = "vocabulary_libraries";

function getLibrariesKey(languageCode: SupportedLanguage): string {
  return `${LIBRARIES_KEY_PREFIX}_${languageCode}`;
}

export async function getLibraries(
  languageCode: SupportedLanguage,
): Promise<Library[]> {
  try {
    const data = await AsyncStorage.getItem(getLibrariesKey(languageCode));
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("Error loading libraries:", error);
    return [];
  }
}

export async function saveLibrary(
  library: Library,
  languageCode: SupportedLanguage,
): Promise<void> {
  try {
    const libraries = await getLibraries(languageCode);
    libraries.push(library);
    await AsyncStorage.setItem(
      getLibrariesKey(languageCode),
      JSON.stringify(libraries),
    );
  } catch (error) {
    console.error("Error saving library:", error);
    throw error;
  }
}

export async function updateLibrary(
  updatedLibrary: Library,
  languageCode: SupportedLanguage,
): Promise<void> {
  try {
    const libraries = await getLibraries(languageCode);
    const index = libraries.findIndex((l) => l.id === updatedLibrary.id);
    if (index !== -1) {
      libraries[index] = { ...updatedLibrary, updatedAt: Date.now() };
      await AsyncStorage.setItem(
        getLibrariesKey(languageCode),
        JSON.stringify(libraries),
      );
    }
  } catch (error) {
    console.error("Error updating library:", error);
    throw error;
  }
}

export async function deleteLibrary(
  id: string,
  languageCode: SupportedLanguage,
): Promise<void> {
  try {
    const libraries = await getLibraries(languageCode);
    const filtered = libraries.filter((l) => l.id !== id);
    await AsyncStorage.setItem(
      getLibrariesKey(languageCode),
      JSON.stringify(filtered),
    );
  } catch (error) {
    console.error("Error deleting library:", error);
    throw error;
  }
}

export function generateLibraryId(): string {
  return "lib_" + Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

/**
 * Find a library by its source shared library ID
 */
export async function findLibraryBySourceId(
  sourceSharedLibraryId: string,
  languageCode: SupportedLanguage
): Promise<Library | undefined> {
  const libraries = await getLibraries(languageCode);
  return libraries.find(
    (lib) =>
      lib.sourceSharedLibraryId === sourceSharedLibraryId ||
      lib.sharedLibraryId === sourceSharedLibraryId
  );
}

/**
 * Import a shared library from the backend into local storage
 * Returns the new local library ID
 */
export async function importSharedLibrary(
  sharedLibrary: {
    id: string; // Backend UUID
    name: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    description?: string;
    color?: string;
    icon?: string;
  },
  languageCode: SupportedLanguage
): Promise<string> {
  const newLibrary: Library = {
    id: generateLibraryId(),
    name: sharedLibrary.name,
    difficulty: sharedLibrary.difficulty,
    description: sharedLibrary.description,
    color: sharedLibrary.color,
    icon: sharedLibrary.icon,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sourceSharedLibraryId: sharedLibrary.id, // Track the source
  };

  await saveLibrary(newLibrary, languageCode);
  return newLibrary.id;
}
