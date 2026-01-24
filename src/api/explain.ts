import { PaywallError } from "../contexts/PaywallContext";
import { Config } from "../config";
import {
  AnalyzeRequest,
  AnalyzeResponse,
  ExplainRequest,
  ExplainResponse,
} from "../types";

const API_BASE_URL = Config.api.baseUrl;

export interface AnalyzeResponseWithHeaders {
  data: AnalyzeResponse;
  headers: Headers;
}

export interface PaywallHeaders {
  requestsUsed: number | null;
  requestsLimit: number | "unlimited" | null;
  hasSubscription: boolean | null;
}

// Parse paywall headers from response
export function parsePaywallHeaders(headers: Headers): PaywallHeaders {
  const requestsUsed = headers.get("X-Paywall-Requests-Used");
  const requestsLimit = headers.get("X-Paywall-Requests-Limit");
  const hasSubscription = headers.get("X-Paywall-Has-Subscription");

  return {
    requestsUsed: requestsUsed !== null ? parseInt(requestsUsed, 10) : null,
    requestsLimit:
      requestsLimit !== null
        ? requestsLimit === "unlimited"
          ? "unlimited"
          : parseInt(requestsLimit, 10)
        : null,
    hasSubscription:
      hasSubscription !== null ? hasSubscription === "true" : null,
  };
}

// Check if error is a paywall error
export function isPaywallError(error: any): error is PaywallError {
  return (
    error?.code === "USER_ID_REQUIRED" ||
    error?.code === "PAYWALL_LIMIT_EXCEEDED"
  );
}

export async function explainSentence(
  request: ExplainRequest,
): Promise<ExplainResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/explain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ExplainResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error explaining sentence:", error);
    throw error;
  }
}

export async function analyzeSentence(
  request: AnalyzeRequest,
): Promise<AnalyzeResponseWithHeaders> {
  try {
    console.log("=== Analyze Request ===");
    console.log("URL:", `${API_BASE_URL}/api/analyze`);
    console.log("Request data:", JSON.stringify(request, null, 2));

    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": request.userId,
      },
      body: JSON.stringify(request),
    });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    // Parse response body
    const responseText = await response.text();
    console.log("Response body:", responseText);

    // Handle paywall errors
    if (response.status === 401 || response.status === 403) {
      try {
        const errorData = JSON.parse(responseText);
        if (isPaywallError(errorData)) {
          throw errorData;
        }
      } catch (parseError) {
        if (isPaywallError(parseError)) {
          throw parseError;
        }
      }
    }

    if (!response.ok) {
      // Try to parse error as JSON to get detailed error information
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        console.error("Parsed error response:", errorData);

        // Extract meaningful error information
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          // PostgreSQL error detail
          errorMessage = `Database error: ${errorData.detail}`;
        }
      } catch (parseError) {
        // If JSON parsing fails, use the raw text
        console.error("Could not parse error response as JSON:", parseError);
        errorMessage = responseText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data: AnalyzeResponse = JSON.parse(responseText);
    console.log("Response data received:", data);

    return {
      data,
      headers: response.headers,
    };
  } catch (error) {
    console.error("Error analyzing sentence:", error);
    throw error;
  }
}

// Streaming version of analyzeSentence - uses XMLHttpRequest for React Native compatibility
export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: (response: string) => void;
  onError: (error: Error | PaywallError) => void;
  onHeaders?: (headers: PaywallHeaders) => void;
}

export function analyzeSentenceStream(
  request: AnalyzeRequest,
  onChunk: (chunk: string) => void,
  onComplete: (response: string) => void,
  onError: (error: Error | PaywallError) => void,
  onHeaders?: (headers: PaywallHeaders) => void,
): XMLHttpRequest {
  console.log("=== Analyze Stream Request ===");
  console.log("URL:", `${API_BASE_URL}/api/analyze/stream`);
  console.log("Request data:", JSON.stringify(request, null, 2));

  const xhr = new XMLHttpRequest();
  let buffer = "";
  let lastProcessedIndex = 0;
  let headersProcessed = false;

  xhr.open("POST", `${API_BASE_URL}/api/analyze/stream`, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.setRequestHeader("x-user-id", request.userId);

  // Handle progress events for streaming
  xhr.onprogress = () => {
    // Process headers on first progress event
    if (!headersProcessed && onHeaders) {
      try {
        const paywallHeaders: PaywallHeaders = {
          requestsUsed: null,
          requestsLimit: null,
          hasSubscription: null,
        };

        const requestsUsed = xhr.getResponseHeader("X-Paywall-Requests-Used");
        const requestsLimit = xhr.getResponseHeader("X-Paywall-Requests-Limit");
        const hasSubscription = xhr.getResponseHeader(
          "X-Paywall-Has-Subscription",
        );

        if (requestsUsed !== null) {
          paywallHeaders.requestsUsed = parseInt(requestsUsed, 10);
        }
        if (requestsLimit !== null) {
          paywallHeaders.requestsLimit =
            requestsLimit === "unlimited"
              ? "unlimited"
              : parseInt(requestsLimit, 10);
        }
        if (hasSubscription !== null) {
          paywallHeaders.hasSubscription = hasSubscription === "true";
        }

        onHeaders(paywallHeaders);
        headersProcessed = true;
      } catch (e) {
        console.error("Error processing headers:", e);
      }
    }

    // Get new data since last processed position
    const newData = xhr.responseText.substring(lastProcessedIndex);
    lastProcessedIndex = xhr.responseText.length;

    // Add new data to buffer
    buffer += newData;

    // Process complete lines from buffer
    const lines = buffer.split("\n");
    // Keep the last incomplete line in the buffer
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.substring(6));

          if (data.chunk) {
            onChunk(data.chunk);
          } else if (data.done && data.fullResponse) {
            onComplete(data.fullResponse);
          } else if (data.done) {
            console.log("Stream done but no fullResponse:", data);
          } else if (data.error) {
            console.error("Stream error:", data.error);
            onError(new Error(data.error));
          }
        } catch (parseError) {
          console.error("Error parsing SSE data:", parseError, "Line:", line);
        }
      }
    }
  };

  xhr.onload = () => {
    // Handle paywall errors (401, 403)
    if (xhr.status === 401 || xhr.status === 403) {
      try {
        const errorData = JSON.parse(xhr.responseText);
        if (isPaywallError(errorData)) {
          // console.error('Paywall error:', errorData);
          onError(errorData);
          return;
        }
      } catch (e) {
        // Not a JSON paywall error, fall through
      }
    }

    if (xhr.status >= 200 && xhr.status < 300) {
      console.log("Stream completed successfully");
    } else {
      const error = new Error(`HTTP error! status: ${xhr.status}`);
      console.error("Stream failed:", error);
      onError(error);
    }
  };

  xhr.onerror = () => {
    const error = new Error("Network error occurred");
    console.error("Stream network error:", error);
    onError(error);
  };

  xhr.ontimeout = () => {
    const error = new Error("Request timeout");
    console.error("Stream timeout:", error);
    onError(error);
  };

  // Send the request
  xhr.send(JSON.stringify(request));

  return xhr;
}
