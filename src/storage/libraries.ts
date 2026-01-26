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
