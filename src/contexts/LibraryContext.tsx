import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Library, LibraryDifficulty } from '../types';
import {
  getLibraries,
  saveLibrary,
  updateLibrary,
  deleteLibrary as deleteLibraryStorage,
  generateLibraryId,
} from '../storage/libraries';
import { removeLibraryFromAllWords } from '../storage/words';
import { useLanguage } from './LanguageContext';

interface LibraryContextType {
  libraries: Library[];
  selectedLibraryId: string | null;
  isLoading: boolean;
  createLibrary: (library: Omit<Library, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Library>;
  editLibrary: (library: Library) => Promise<void>;
  deleteLibrary: (id: string) => Promise<void>;
  selectLibrary: (id: string | null) => void;
  refreshLibraries: () => Promise<void>;
  getLibraryById: (id: string) => Library | undefined;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { selectedLanguage } = useLanguage();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshLibraries = useCallback(async () => {
    if (!selectedLanguage) {
      setLibraries([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const loaded = await getLibraries(selectedLanguage);
      setLibraries(loaded);
    } catch (error) {
      console.error('Failed to load libraries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    refreshLibraries();
  }, [refreshLibraries]);

  useEffect(() => {
    setSelectedLibraryId(null);
  }, [selectedLanguage]);

  async function createLibrary(
    libraryData: Omit<Library, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Library> {
    if (!selectedLanguage) throw new Error('No language selected');

    const now = Date.now();
    const library: Library = {
      ...libraryData,
      id: generateLibraryId(),
      createdAt: now,
      updatedAt: now,
    };

    await saveLibrary(library, selectedLanguage);
    setLibraries((prev) => [...prev, library]);
    return library;
  }

  async function editLibrary(library: Library): Promise<void> {
    if (!selectedLanguage) throw new Error('No language selected');
    const updated = { ...library, updatedAt: Date.now() };
    await updateLibrary(updated, selectedLanguage);
    setLibraries((prev) => prev.map((l) => (l.id === library.id ? updated : l)));
  }

  async function deleteLibrary(id: string): Promise<void> {
    if (!selectedLanguage) throw new Error('No language selected');
    await deleteLibraryStorage(id, selectedLanguage);
    await removeLibraryFromAllWords(id, selectedLanguage);
    setLibraries((prev) => prev.filter((l) => l.id !== id));
    if (selectedLibraryId === id) {
      setSelectedLibraryId(null);
    }
  }

  function selectLibrary(id: string | null) {
    setSelectedLibraryId(id);
  }

  function getLibraryById(id: string): Library | undefined {
    return libraries.find((l) => l.id === id);
  }

  return (
    <LibraryContext.Provider
      value={{
        libraries,
        selectedLibraryId,
        isLoading,
        createLibrary,
        editLibrary,
        deleteLibrary,
        selectLibrary,
        refreshLibraries,
        getLibraryById,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
