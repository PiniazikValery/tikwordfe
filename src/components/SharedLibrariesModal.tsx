import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  downloadSharedLibrary,
  getSharedLibraries,
  getSharedLibrary,
  SharedLibrary,
  SharedLibraryWithWords,
  SharedWord,
} from "../api/sharedLibraries";
import { useLanguage } from "../contexts/LanguageContext";
import { useLibrary } from "../contexts/LibraryContext";
import { findLibraryBySourceId, getLibraries, importSharedLibrary } from "../storage/libraries";
import { importSharedWords } from "../storage/words";
import { Library, LibraryDifficulty } from "../types";
import DifficultyBadge from "./DifficultyBadge";

interface SharedLibrariesModalProps {
  visible: boolean;
  onClose: () => void;
  onLibraryImported?: () => void;
}

type DifficultyFilter = LibraryDifficulty | "all";

export default function SharedLibrariesModal({
  visible,
  onClose,
  onLibraryImported,
}: SharedLibrariesModalProps) {
  const { t } = useTranslation();
  const { languageConfig } = useLanguage();
  const { refreshLibraries } = useLibrary();

  const [libraries, setLibraries] = useState<SharedLibrary[]>([]);
  const [localLibraries, setLocalLibraries] = useState<Library[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [previewLibrary, setPreviewLibrary] = useState<SharedLibraryWithWords | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Check if a shared library exists locally
  const isLibraryLocal = useCallback(
    (sharedLibraryId: string) => {
      return localLibraries.some(
        (lib) =>
          lib.sourceSharedLibraryId === sharedLibraryId ||
          lib.sharedLibraryId === sharedLibraryId
      );
    },
    [localLibraries]
  );

  // Load local libraries to check which ones already exist
  const loadLocalLibraries = useCallback(async () => {
    if (!languageConfig) return;
    try {
      const libs = await getLibraries(languageConfig.code);
      setLocalLibraries(libs);
    } catch (error) {
      console.error("Error loading local libraries:", error);
    }
  }, [languageConfig]);

  const loadLibraries = useCallback(
    async (reset = false) => {
      if (!languageConfig) return;

      if (reset) {
        setIsLoading(true);
        setPage(1);
      }

      try {
        const result = await getSharedLibraries({
          targetLanguage: languageConfig.code,
          difficulty:
            difficultyFilter !== "all" ? difficultyFilter : undefined,
          search: searchQuery || undefined,
          page: reset ? 1 : page,
          limit: 20,
          sortBy: "popular",
        });

        if (reset) {
          setLibraries(result.libraries);
        } else {
          setLibraries((prev) => [...prev, ...result.libraries]);
        }

        setHasMore(result.pagination.page < result.pagination.totalPages);
        setPage(result.pagination.page + 1);
      } catch (error) {
        console.error("Error loading shared libraries:", error);
        Alert.alert(
          t("common.error"),
          t("sharedLibraries.errorLoading")
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [languageConfig, difficultyFilter, searchQuery, page, t]
  );

  useEffect(() => {
    if (visible && languageConfig) {
      loadLibraries(true);
      loadLocalLibraries();
    }
  }, [visible, languageConfig, difficultyFilter]);

  useEffect(() => {
    if (visible && languageConfig && searchQuery !== undefined) {
      const debounce = setTimeout(() => {
        loadLibraries(true);
      }, 500);
      return () => clearTimeout(debounce);
    }
  }, [searchQuery]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLibraries(true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadLibraries(false);
    }
  };

  const handleDownload = async (library: SharedLibrary) => {
    if (!languageConfig) return;

    setDownloadingId(library.id);

    try {
      // Download from backend
      const fullLibrary = await downloadSharedLibrary(library.id);

      // Check if this library already exists locally
      const existingLibrary = await findLibraryBySourceId(
        library.id,
        languageConfig.code
      );

      let libraryId: string;
      let isUpdate = false;

      if (existingLibrary) {
        // Library already exists - just add new words to it
        libraryId = existingLibrary.id;
        isUpdate = true;
      } else {
        // Import new library locally
        libraryId = await importSharedLibrary(
          {
            id: fullLibrary.id,
            name: fullLibrary.name,
            difficulty: fullLibrary.difficulty,
            description: fullLibrary.description,
            color: fullLibrary.color,
            icon: fullLibrary.icon,
          },
          languageConfig.code
        );
      }

      // Import words (will skip duplicates automatically)
      const result = await importSharedWords(
        fullLibrary.words,
        libraryId,
        languageConfig.code
      );

      // Refresh local libraries
      await refreshLibraries();
      await loadLocalLibraries();

      Alert.alert(
        t("common.success"),
        isUpdate
          ? t("sharedLibraries.updateSuccess", {
              name: library.name,
              imported: result.imported,
              skipped: result.skipped,
            })
          : t("sharedLibraries.downloadSuccess", {
              name: library.name,
              imported: result.imported,
              skipped: result.skipped,
            })
      );

      onLibraryImported?.();
    } catch (error) {
      console.error("Error downloading library:", error);
      Alert.alert(t("common.error"), t("sharedLibraries.errorDownloading"));
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (library: SharedLibrary) => {
    setIsPreviewLoading(true);
    try {
      const fullLibrary = await getSharedLibrary(library.id);
      setPreviewLibrary(fullLibrary);
    } catch (error) {
      console.error("Error loading library preview:", error);
      Alert.alert(t("common.error"), t("sharedLibraries.errorLoading"));
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownloadFromPreview = async () => {
    if (!previewLibrary) return;

    // Find the SharedLibrary object from libraries list
    const library = libraries.find((l) => l.id === previewLibrary.id);
    if (library) {
      setPreviewLibrary(null); // Close preview first
      await handleDownload(library);
    }
  };

  const renderPreviewWordItem = ({ item }: { item: SharedWord }) => (
    <View style={styles.previewWordItem}>
      <Text style={styles.previewWord}>{item.word}</Text>
      <Text style={styles.previewTranslation}>{item.translation}</Text>
      {item.transcription && (
        <Text style={styles.previewTranscription}>[{item.transcription}]</Text>
      )}
    </View>
  );

  const renderDifficultyFilter = () => (
    <View style={styles.filterRow}>
      {(["all", "beginner", "intermediate", "advanced"] as DifficultyFilter[]).map(
        (difficulty) => (
          <TouchableOpacity
            key={difficulty}
            style={[
              styles.filterChip,
              difficultyFilter === difficulty && styles.filterChipActive,
            ]}
            onPress={() => setDifficultyFilter(difficulty)}
          >
            <Text
              style={[
                styles.filterChipText,
                difficultyFilter === difficulty && styles.filterChipTextActive,
              ]}
            >
              {difficulty === "all"
                ? t("sharedLibraries.filterAll")
                : t(`libraries.${difficulty}`)}
            </Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );

  const renderItem = ({ item }: { item: SharedLibrary }) => {
    const isLocal = isLibraryLocal(item.id);

    return (
      <View style={styles.libraryItem}>
        <TouchableOpacity
          style={styles.libraryLeft}
          onPress={() => handlePreview(item)}
          activeOpacity={0.7}
        >
          {item.color && (
            <View
              style={[styles.colorIndicator, { backgroundColor: item.color }]}
            />
          )}
          {item.icon && (
            <Ionicons
              name={item.icon as any}
              size={20}
              color="#666"
              style={styles.libraryIcon}
            />
          )}
          <View style={styles.libraryInfo}>
            <View style={styles.libraryNameRow}>
              <Text style={styles.libraryName}>{item.name}</Text>
              {isLocal && (
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              )}
            </View>
            <View style={styles.libraryMeta}>
              <DifficultyBadge difficulty={item.difficulty} />
              <Text style={styles.wordCount}>
                {t("libraries.wordCount", { count: item.wordCount })}
              </Text>
              <View style={styles.downloadCountContainer}>
                <Ionicons name="download-outline" size={12} color="#999" />
                <Text style={styles.downloadCount}>{item.downloadCount}</Text>
              </View>
            </View>
            {item.description && (
              <Text style={styles.libraryDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            {item.authorName && (
              <Text style={styles.authorName}>
                {t("sharedLibraries.by", { author: item.authorName })}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            isLocal ? styles.refreshButton : styles.downloadButton,
            downloadingId === item.id && styles.downloadButtonDisabled,
          ]}
          onPress={() => handleDownload(item)}
          disabled={downloadingId === item.id}
        >
          {downloadingId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={isLocal ? "refresh" : "download"}
              size={20}
              color="#fff"
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="cloud-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>
          {searchQuery
            ? t("sharedLibraries.noResults")
            : t("sharedLibraries.empty")}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || libraries.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>{t("sharedLibraries.title")}</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={t("sharedLibraries.searchPlaceholder")}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {renderDifficultyFilter()}

        {isLoading && libraries.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            data={libraries}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            contentContainerStyle={
              libraries.length === 0 ? styles.emptyContainer : styles.list
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
          />
        )}

        {/* Loading overlay for preview */}
        {isPreviewLoading && (
          <View style={styles.previewLoadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
      </SafeAreaView>

      {/* Preview Modal */}
      <Modal
        visible={previewLibrary !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPreviewLibrary(null)}
      >
        {previewLibrary && (
          <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setPreviewLibrary(null)}
                style={styles.headerButton}
              >
                <Ionicons name="arrow-back" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={1}>
                {previewLibrary.name}
              </Text>
              <View style={styles.headerButton} />
            </View>

            {/* Library info header */}
            <View style={styles.previewHeader}>
              <View style={styles.previewHeaderTop}>
                {previewLibrary.color && (
                  <View
                    style={[
                      styles.previewColorIndicator,
                      { backgroundColor: previewLibrary.color },
                    ]}
                  />
                )}
                <View style={styles.previewHeaderInfo}>
                  <View style={styles.libraryMeta}>
                    <DifficultyBadge difficulty={previewLibrary.difficulty} />
                    <Text style={styles.wordCount}>
                      {t("libraries.wordCount", {
                        count: previewLibrary.words.length,
                      })}
                    </Text>
                    {isLibraryLocal(previewLibrary.id) && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#34C759"
                      />
                    )}
                  </View>
                  {previewLibrary.authorName && (
                    <Text style={styles.authorName}>
                      {t("sharedLibraries.by", {
                        author: previewLibrary.authorName,
                      })}
                    </Text>
                  )}
                </View>
              </View>
              {previewLibrary.description && (
                <Text style={styles.previewDescription}>
                  {previewLibrary.description}
                </Text>
              )}
            </View>

            {/* Words list */}
            <View style={styles.previewWordsHeader}>
              <Ionicons name="book-outline" size={18} color="#666" />
              <Text style={styles.previewWordsTitle}>
                {t("sharedLibraries.previewWords")}
              </Text>
            </View>

            <FlatList
              data={previewLibrary.words}
              keyExtractor={(item, index) => item.id ?? `${item.word}-${index}`}
              renderItem={renderPreviewWordItem}
              contentContainerStyle={styles.previewWordsList}
              showsVerticalScrollIndicator={true}
            />

            {/* Download button */}
            <View style={styles.previewFooter}>
              <TouchableOpacity
                style={[
                  isLibraryLocal(previewLibrary.id)
                    ? styles.previewRefreshButton
                    : styles.previewDownloadButton,
                  downloadingId === previewLibrary.id &&
                    styles.downloadButtonDisabled,
                ]}
                onPress={handleDownloadFromPreview}
                disabled={downloadingId === previewLibrary.id}
              >
                {downloadingId === previewLibrary.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        isLibraryLocal(previewLibrary.id)
                          ? "refresh"
                          : "download"
                      }
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.previewButtonText}>
                      {isLibraryLocal(previewLibrary.id)
                        ? t("sharedLibraries.updateLibrary")
                        : t("sharedLibraries.downloadLibrary")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerButton: {
    padding: 4,
    width: 32,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#000",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
  },
  filterChipActive: {
    backgroundColor: "#007AFF",
  },
  filterChipText: {
    fontSize: 13,
    color: "#666",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  list: {
    padding: 16,
  },
  libraryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginBottom: 12,
  },
  libraryLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  colorIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginRight: 12,
  },
  libraryIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  libraryInfo: {
    flex: 1,
  },
  libraryNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  libraryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  libraryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  wordCount: {
    fontSize: 12,
    color: "#666",
  },
  downloadCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  downloadCount: {
    fontSize: 12,
    color: "#999",
  },
  libraryDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  authorName: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    fontStyle: "italic",
  },
  downloadButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  refreshButton: {
    backgroundColor: "#34C759",
    padding: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  downloadButtonDisabled: {
    backgroundColor: "#ccc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
    textAlign: "center",
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  // Preview modal styles
  previewLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  previewHeaderTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  previewColorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  previewHeaderInfo: {
    flex: 1,
  },
  previewDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    lineHeight: 20,
  },
  previewWordsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f5f5f5",
  },
  previewWordsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  previewWordsList: {
    padding: 16,
  },
  previewWordItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 8,
  },
  previewWord: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  previewTranslation: {
    fontSize: 14,
    color: "#666",
  },
  previewTranscription: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
    fontStyle: "italic",
  },
  previewFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  previewDownloadButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  previewRefreshButton: {
    backgroundColor: "#34C759",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  previewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
