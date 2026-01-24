import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  analyzeSentenceStream,
  isPaywallError,
  PaywallHeaders,
} from "../api/explain";
import CaptionsDisplay from "../components/CaptionsDisplay";
import ExplainButton from "../components/ExplainButton";
import ExplanationModal from "../components/ExplanationModal";
import LimitExceededModal from "../components/LimitExceededModal";
import RequestsRemainingBadge from "../components/RequestsRemainingBadge";
import YouTubePlayerComponent from "../components/YouTubePlayer";
import { useLanguage } from "../contexts/LanguageContext";
import { PaywallError, usePaywall } from "../contexts/PaywallContext";
import { useRevenueCat } from "../contexts/RevenueCatContext";
import { AnalyzeResponse, VideoData } from "../types";

// Mock video data - in real app this would come from an API
const MOCK_VIDEO_DATA: Record<string, VideoData> = {
  default: {
    videoId: "BaW_jenozKc", // YouTube Rewind - known to work with embedding
    startTime: 5,
    subtitle: {
      english: "This was kind of an awkward moment for everyone",
      russian: "Это был довольно неловкий момент для всех",
    },
  },
  awkward: {
    videoId: "BaW_jenozKc",
    startTime: 10,
    subtitle: {
      english: "This was kind of an awkward moment",
      russian: "Это был своего рода неловкий момент",
    },
  },
  hello: {
    videoId: "BaW_jenozKc",
    startTime: 5,
    subtitle: {
      english: "Hello, how are you doing today?",
      russian: "Привет, как у тебя дела сегодня?",
    },
  },
};

export default function VideoContextScreen({
  word: wordProp,
  videoData: videoDataProp,
}: { word?: string; videoData?: VideoData } = {}) {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ word: string }>();
  const { languageConfig } = useLanguage();
  const { showPaywall } = useRevenueCat();
  const {
    state: paywallState,
    getUserId,
    checkSubscriptionStatus,
    updateFromPaywallHeaders,
    handlePaywallError,
    showLimitModal,
    setShowLimitModal,
  } = usePaywall();

  const word = wordProp || params.word;
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(
    null,
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);

  // Ref to store the XMLHttpRequest for cancellation
  const streamRequestRef = useRef<XMLHttpRequest | null>(null);

  // Use provided video data or fallback to mock data
  const videoData =
    videoDataProp ||
    MOCK_VIDEO_DATA[word?.toLowerCase() || ""] ||
    MOCK_VIDEO_DATA.default;

  // Cleanup: cancel stream on unmount
  useEffect(() => {
    return () => {
      if (streamRequestRef.current) {
        console.log("Cancelling stream on unmount");
        streamRequestRef.current.abort();
        streamRequestRef.current = null;
      }
    };
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const cancelStream = useCallback(() => {
    if (streamRequestRef.current) {
      console.log("Cancelling stream");
      streamRequestRef.current.abort();
      streamRequestRef.current = null;
      setIsStreaming(false);
      setLoading(false);
    }
  }, []);

  // Handle paywall headers callback
  const handlePaywallHeaders = useCallback(
    (headers: PaywallHeaders) => {
      console.log("Paywall headers received:", headers);
      updateFromPaywallHeaders(headers);
    },
    [updateFromPaywallHeaders],
  );

  // Handle get premium button from limit exceeded modal
  const handleGetPremium = useCallback(async () => {
    setShowLimitModal(false);
    const purchased = await showPaywall();

    // If purchase was successful, check subscription status again
    if (purchased) {
      await checkSubscriptionStatus();
    }
  }, [showPaywall, setShowLimitModal, checkSubscriptionStatus]);

  async function handleExplainPress() {
    if (!languageConfig) return;

    // First, check fresh subscription status from RevenueCat
    // This handles the case when user just purchased a subscription
    const hasSubscription = await checkSubscriptionStatus();

    // Get userId from RevenueCat
    let userId: string;
    try {
      userId = await getUserId();
    } catch (error) {
      console.error("Failed to get user ID:", error);
      return;
    }

    // Cancel any ongoing stream
    if (streamRequestRef.current) {
      console.log("Cancelling previous stream");
      streamRequestRef.current.abort();
      streamRequestRef.current = null;
    }

    setLoading(true);
    setIsStreaming(true);
    setAnalysisData(null);
    setModalVisible(true); // Open modal immediately

    try {
      console.log("videoData:", videoData);
      const sentence = videoData.subtitle.english;

      let accumulatedText = "";

      // Use streaming API and store the request reference
      const xhr = analyzeSentenceStream(
        {
          sentence,
          targetWord: word || "",
          targetLanguage: "en",
          nativeLanguage: languageConfig.googleTranslateCode,
          userId,
        },
        // onChunk callback - try to parse and update partial data
        (chunk: string) => {
          accumulatedText += chunk;

          // Try to parse accumulated text as JSON to get partial data
          try {
            // Attempt to parse what we have so far
            const parsed = parseIncompleteJSON(accumulatedText);

            setAnalysisData(parsed as AnalyzeResponse);
            setLoading(false);
          } catch (e) {
            console.log("err");
            // JSON not complete yet, that's okay - keep accumulating
            // Try to extract and display whatever complete fields we have
            tryParsePartialJSON(accumulatedText);
          }
        },
        // onComplete callback - set final structured data
        (_response: string) => {
          console.log(
            "Skipping onComplete data set - already parsed from chunks",
          );
          // Just ensure flags are set correctly
          setIsStreaming(false);
          setLoading(false);
        },
        // onError callback
        (error: Error | PaywallError) => {
          // console.error("Streaming error:", error);
          setIsStreaming(false);
          setLoading(false);
          setModalVisible(false);

          // Check if it's a paywall error
          if (isPaywallError(error)) {
            handlePaywallError(error);
          } else {
            // Show mock response on other errors
            showMockResponse();
          }
        },
        // onHeaders callback
        handlePaywallHeaders,
      );

      // Store the request reference for cancellation
      streamRequestRef.current = xhr;
    } catch (error) {
      console.error("Error analyzing sentence:", error);
      setIsStreaming(false);
      setLoading(false);
      showMockResponse();
    }

    // Check if limit is exceeded (only for non-subscribers)
    if (!hasSubscription && !paywallState.canMakeRequest) {
      setShowLimitModal(true);
      return;
    }
  }

  function parseIncompleteJSON(text: string): Partial<AnalyzeResponse> {
    // First try to parse as complete JSON
    try {
      return JSON.parse(text) as AnalyzeResponse;
    } catch (e) {
      // JSON is incomplete, fall back to regex-based extraction
    }

    const result: any = {};

    const unescapeString = (str: string) =>
      str
        .replace(/\\"/g, '"')
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\\\/g, "\\");

    // Helper to extract array content with proper bracket matching
    function extractArrayContent(
      text: string,
      fieldName: string,
    ): { content: string; fullMatch: string } | null {
      const startPattern = new RegExp(`"${fieldName}"\\s*:\\s*\\[`);
      const match = startPattern.exec(text);
      if (!match) return null;

      const startIndex = match.index + match[0].length;
      let depth = 1;
      let i = startIndex;
      let inString = false;
      let escapeNext = false;

      while (i < text.length && depth > 0) {
        const char = text[i];

        if (escapeNext) {
          escapeNext = false;
          i++;
          continue;
        }

        if (char === "\\" && inString) {
          escapeNext = true;
          i++;
          continue;
        }

        if (char === '"') {
          inString = !inString;
        } else if (!inString) {
          if (char === "[") depth++;
          else if (char === "]") depth--;
        }

        i++;
      }

      const content = text.slice(startIndex, depth === 0 ? i - 1 : i);
      const fullMatch = text.slice(match.index, i);

      return { content, fullMatch };
    }

    // Extract complete objects from array content
    function extractCompleteObjects(content: string): any[] {
      const objects: any[] = [];
      let depth = 0;
      let startIdx = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === "\\" && inString) {
          escapeNext = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
        } else if (!inString) {
          if (char === "{") {
            if (depth === 0) startIdx = i;
            depth++;
          } else if (char === "}") {
            depth--;
            if (depth === 0 && startIdx !== -1) {
              const objStr = content.slice(startIdx, i + 1);
              try {
                objects.push(JSON.parse(objStr));
              } catch (e) {
                // Skip malformed objects
              }
              startIdx = -1;
            }
          }
        }
      }

      return objects;
    }

    // Extract partial object from incomplete content
    function extractPartialObject(
      content: string,
      expectedFields: string[],
    ): any | null {
      // Find the last incomplete object (starts with { but doesn't end with })
      let depth = 0;
      let lastObjStart = -1;
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === "\\" && inString) {
          escapeNext = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
        } else if (!inString) {
          if (char === "{") {
            if (depth === 0) lastObjStart = i;
            depth++;
          } else if (char === "}") {
            depth--;
            if (depth === 0) lastObjStart = -1; // Complete object, reset
          }
        }
      }

      // If we have an incomplete object (depth > 0 and we found a start)
      if (depth > 0 && lastObjStart !== -1) {
        const partialContent = content.slice(lastObjStart);
        return extractFieldsFromPartialObject(partialContent, expectedFields);
      }

      return null;
    }

    // Extract whatever fields we can from a partial object string
    function extractFieldsFromPartialObject(
      objStr: string,
      expectedFields: string[],
    ): any {
      const result: any = {};

      for (const field of expectedFields) {
        // Try to extract complete string field
        const stringMatch = new RegExp(
          `"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`,
        ).exec(objStr);
        if (stringMatch) {
          result[field] = unescapeString(stringMatch[1]);
          continue;
        }

        // Try to extract array field (like alternativeMeanings)
        const arrayPattern = new RegExp(`"${field}"\\s*:\\s*\\[`);
        const arrayMatch = arrayPattern.exec(objStr);
        if (arrayMatch) {
          const startIdx = arrayMatch.index + arrayMatch[0].length;
          let depth = 1;
          let i = startIdx;
          let inStr = false;
          let esc = false;

          while (i < objStr.length && depth > 0) {
            const char = objStr[i];
            if (esc) {
              esc = false;
              i++;
              continue;
            }
            if (char === "\\" && inStr) {
              esc = true;
              i++;
              continue;
            }
            if (char === '"') inStr = !inStr;
            else if (!inStr) {
              if (char === "[") depth++;
              else if (char === "]") depth--;
            }
            i++;
          }

          if (depth === 0) {
            // Complete array found
            const arrayContent = objStr.slice(arrayMatch.index, i);
            try {
              const parsed = JSON.parse(`{${arrayContent}}`);
              result[field] = parsed[field];
            } catch (e) {
              // Extract string items from partial array
              const items: string[] = [];
              const itemRegex = /"((?:[^"\\]|\\.)*)"/g;
              const arrayStr = objStr.slice(startIdx, i - 1);
              let itemMatch;
              while ((itemMatch = itemRegex.exec(arrayStr)) !== null) {
                items.push(unescapeString(itemMatch[1]));
              }
              if (items.length > 0) result[field] = items;
            }
          }
        }
      }

      // Only return if we extracted something
      return Object.keys(result).length > 0 ? result : null;
    }

    // Define expected fields for breakdown items
    const breakdownFields = [
      "word",
      "baseForm",
      "partOfSpeech",
      "translation",
      "meaningInSentence",
      "function",
      "usageInContext",
      "alternativeMeanings",
    ];

    // 1. Extract breakdown array
    const breakdownResult = extractArrayContent(text, "breakdown");
    let breakdownSection = "";
    if (breakdownResult) {
      breakdownSection = breakdownResult.fullMatch;
      const completeObjects = extractCompleteObjects(breakdownResult.content);
      const partialObject = extractPartialObject(
        breakdownResult.content,
        breakdownFields,
      );

      const breakdown = [...completeObjects];
      if (partialObject) {
        breakdown.push(partialObject);
      }

      if (breakdown.length > 0) {
        result.breakdown = breakdown;
      }
    }

    // 2. Extract idioms array (same logic)
    const idiomFields = ["phrase", "meaning", "literalTranslation"];
    const idiomsResult = extractArrayContent(text, "idioms");
    let idiomsSection = "";
    if (idiomsResult) {
      idiomsSection = idiomsResult.fullMatch;
      const completeObjects = extractCompleteObjects(idiomsResult.content);
      const partialObject = extractPartialObject(
        idiomsResult.content,
        idiomFields,
      );

      const idioms = [...completeObjects];
      if (partialObject) {
        idioms.push(partialObject);
      }

      if (idioms.length > 0) {
        result.idioms = idioms;
      }
    }

    // 3. Extract targetWordAnalysis object
    const targetWordMatch = text.match(
      /"targetWordAnalysis"\s*:\s*(\{[^}]*\})/,
    );
    let targetWordSection = "";
    if (targetWordMatch) {
      targetWordSection = targetWordMatch[0];
      try {
        result.targetWordAnalysis = JSON.parse(targetWordMatch[1]);
      } catch (e) {
        // Try to extract partial targetWordAnalysis
        const targetFields = [
          "word",
          "baseForm",
          "partOfSpeech",
          "translation",
          "meaningInSentence",
        ];
        const partial = extractFieldsFromPartialObject(
          targetWordMatch[1],
          targetFields,
        );
        if (partial) result.targetWordAnalysis = partial;
      }
    }

    // 4. Remove nested sections
    let textForStringFields = text;
    if (breakdownSection)
      textForStringFields = textForStringFields.replace(breakdownSection, "");
    if (idiomsSection)
      textForStringFields = textForStringFields.replace(idiomsSection, "");
    if (targetWordSection)
      textForStringFields = textForStringFields.replace(targetWordSection, "");

    // 5. Extract root-level string fields
    const stringFieldRegex = /"(\w+)"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/g;
    let match;
    while ((match = stringFieldRegex.exec(textForStringFields)) !== null) {
      const key = match[1];
      const value = unescapeString(match[2]);
      if (
        [
          "fullTranslation",
          "literalTranslation",
          "grammarAnalysis",
          "difficultyNotes",
        ].includes(key)
      ) {
        if (value.trim()) result[key] = value;
      }
    }

    // 6-7. Boolean and number fields
    const cachedMatch = text.match(/"cached"\s*:\s*(true|false)/);
    if (cachedMatch) result.cached = cachedMatch[1] === "true";

    const accessCountMatch = text.match(/"accessCount"\s*:\s*(\d+)/);
    if (accessCountMatch)
      result.accessCount = parseInt(accessCountMatch[1], 10);

    return result;
  }

  function tryParsePartialJSON(text: string) {
    // Try to extract complete fields from partial JSON
    try {
      const updates: Partial<AnalyzeResponse> = {};

      // First try to use the general incomplete JSON parser
      const parsedFields = parseIncompleteJSON(text);
      Object.assign(updates, parsedFields);

      // Extract breakdown array - match complete objects within the array
      const breakdownMatch = text.match(
        /"breakdown"\s*:\s*\[([\s\S]*?)(?:\]|$)/,
      );
      if (breakdownMatch) {
        const breakdownContent = breakdownMatch[1];
        const breakdown: any[] = [];

        // Match complete breakdown items (objects that end with })
        const itemRegex = /\{[\s\S]*?\}/g;
        let match;
        while ((match = itemRegex.exec(breakdownContent)) !== null) {
          try {
            const item = JSON.parse(match[0]);
            breakdown.push(item);
          } catch (e) {
            // Item not complete yet, skip
          }
        }

        if (breakdown.length > 0) {
          updates.breakdown = breakdown;
        }
      }

      // Extract targetWordAnalysis object
      const targetWordMatch = text.match(
        /"targetWordAnalysis"\s*:\s*(\{[\s\S]*?\})\s*(?:,|\})/,
      );
      if (targetWordMatch) {
        try {
          const targetWord = JSON.parse(targetWordMatch[1]);
          updates.targetWordAnalysis = targetWord;
        } catch (e) {
          // Not complete yet
        }
      }

      // Extract idioms array
      const idiomsMatch = text.match(/"idioms"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
      if (idiomsMatch) {
        const idiomsContent = idiomsMatch[1];
        const idioms: any[] = [];

        // Match complete idiom items
        const itemRegex = /\{[\s\S]*?\}/g;
        let match;
        while ((match = itemRegex.exec(idiomsContent)) !== null) {
          try {
            const item = JSON.parse(match[0]);
            idioms.push(item);
          } catch (e) {
            // Item not complete yet, skip
          }
        }

        if (idioms.length > 0) {
          updates.idioms = idioms;
        }
      }

      // Update state if we found any fields
      if (Object.keys(updates).length > 0) {
        console.log("Partial JSON update:", Object.keys(updates));
        setAnalysisData(
          (prev) =>
            ({
              fullTranslation:
                updates.fullTranslation || prev?.fullTranslation || "",
              literalTranslation:
                updates.literalTranslation || prev?.literalTranslation || "",
              grammarAnalysis:
                updates.grammarAnalysis || prev?.grammarAnalysis || "",
              breakdown: updates.breakdown || prev?.breakdown || [],
              targetWordAnalysis:
                updates.targetWordAnalysis || prev?.targetWordAnalysis,
              idioms: updates.idioms || prev?.idioms || [],
              difficultyNotes:
                updates.difficultyNotes || prev?.difficultyNotes || "",
              cached: prev?.cached || false,
              accessCount: prev?.accessCount || 0,
            }) as AnalyzeResponse,
        );
      }
    } catch (e) {
      // Ignore parsing errors for partial data
    }
  }

  function showMockResponse() {
    // For MVP, show a mock response if API fails
    setAnalysisData({
      fullTranslation: videoData.subtitle.russian,
      literalTranslation: videoData.subtitle.russian,
      grammarAnalysis: `This sentence uses "${word || "the word"}" in a conversational context.`,
      breakdown: [
        {
          word: word || "word",
          baseForm: word || "word",
          function: "Used in conversational context",
          translation: "перевод",
          partOfSpeech: "unknown",
          usageInContext:
            "This word is commonly used in everyday conversation.",
          meaningInSentence:
            "The word carries its standard meaning in this context.",
          alternativeMeanings: [
            "Alternative meaning 1",
            "Alternative meaning 2",
          ],
        },
      ],
      targetWordAnalysis: {
        baseForm: word || "",
        partOfSpeech: "unknown",
        usageInContext:
          "The phrase demonstrates how native speakers use this word in everyday situations.",
        alternativeMeanings: [],
      },
      idioms: [],
      difficultyNotes:
        "Notice how it naturally fits into the flow of conversation.",
      cached: false,
      accessCount: 1,
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("videoContext.title")}</Text>
        </View>
        <RequestsRemainingBadge style={styles.badge} />

        {word && (
          <Text style={styles.wordLabel}>
            {t("videoContext.learningWord")}
            <Text style={styles.wordHighlight}>{word}</Text>
          </Text>
        )}

        <YouTubePlayerComponent
          videoId={videoData.videoId}
          startTime={videoData.startTime}
          endTime={videoData.endTime}
          onTimeUpdate={handleTimeUpdate}
        />

        {videoData.captions && videoData.captions.length > 0 ? (
          <CaptionsDisplay
            captions={videoData.captions}
            currentTime={currentTime}
            highlightWord={word}
          />
        ) : (
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitleEnglish}>
              {videoData.subtitle.english}
            </Text>
            <Text style={styles.subtitleRussian}>
              {videoData.subtitle.russian}
            </Text>
          </View>
        )}

        <ExplainButton onPress={handleExplainPress} loading={loading} />

        <ExplanationModal
          visible={modalVisible}
          sentence={videoData.subtitle.english}
          analysisData={analysisData}
          onClose={() => {
            cancelStream();
            setModalVisible(false);
          }}
          isStreaming={isStreaming}
        />
        {(() => {
          console.log("paywallState.retryAfterFormatted:", paywallState);
          return null;
        })()}
        <LimitExceededModal
          visible={showLimitModal}
          retryAfterFormatted={paywallState.retryAfterFormatted}
          onClose={() => setShowLimitModal(false)}
          onGetPremium={handleGetPremium}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 8,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
  badge: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  wordLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  wordHighlight: {
    fontWeight: "bold",
    color: "#007AFF",
  },
  subtitleContainer: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginVertical: 16,
  },
  subtitleEnglish: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subtitleRussian: {
    fontSize: 16,
    color: "#666",
  },
});
