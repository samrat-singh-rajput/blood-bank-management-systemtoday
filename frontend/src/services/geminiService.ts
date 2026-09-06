
import { fetchAPI } from "./api";
import { User, UserRole, SamratChatResponse, RagSource, ToolUsage } from "../types";

export type { SamratChatResponse, RagSource, ToolUsage };

// Helper to check if we can reach backend or fallback locally
export const getHealthTips = async (userRole: string = "Donor"): Promise<string[]> => {
  try {
    const response = await fetchAPI('get_health_tips', 'POST', { userRole });
    if (response && Array.isArray(response.tips) && response.tips.length > 0) {
      return response.tips;
    }
    // Fallback if API response is empty
    return [
      "Stay hydrated by drinking plenty of water throughout the day.",
      "Eat iron-rich foods like spinach and lentils to keep your levels high.",
      "Every single blood donation can save up to three lives."
    ];
  } catch (error) {
    console.error("Gemini API Error (getHealthTips):", error);
    return [
      "Drink extra fluids before and after your donation.",
      "Maintain a healthy iron level in your diet.",
      "Your donation makes a real difference in your community."
    ];
  }
};

export interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

export const chatWithSamrat = async (
  message: string,
  context: string = "",
  useThinking: boolean = false,
  history: ChatHistoryItem[] = []
): Promise<SamratChatResponse> => {
  try {
    let response = null;
    try {
      response = await fetchAPI('chat_samrat', 'POST', {
        message,
        context,
        useThinking,
        history
      });
    } catch (apiErr) {
      console.warn("fetchAPI attempt failed, trying direct local endpoints...", apiErr);
    }

    if (response && (response.response || response.text)) {
      return {
        text: response.text || response.response,
        response: response.response || response.text,
        sources: Array.isArray(response.sources) ? response.sources : [],
        toolUsage: Array.isArray(response.toolUsage) ? response.toolUsage : []
      };
    }

    // Fallback 1: Direct local Express endpoint
    try {
      const directRes = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, useThinking, history })
      });
      if (directRes.ok) {
        const data = await directRes.json();
        if (data && (data.response || data.text)) {
          return {
            text: data.text || data.response,
            response: data.response || data.text,
            sources: Array.isArray(data.sources) ? data.sources : [],
            toolUsage: Array.isArray(data.toolUsage) ? data.toolUsage : []
          };
        }
      }
    } catch (err) {
      // Continue to next fallback
    }

    // Fallback 2: Relative /api/chat or /api.php endpoint
    try {
      const relRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, useThinking, history })
      });
      if (relRes.ok) {
        const data = await relRes.json();
        if (data && (data.response || data.text)) {
          return {
            text: data.text || data.response,
            response: data.response || data.text,
            sources: Array.isArray(data.sources) ? data.sources : [],
            toolUsage: Array.isArray(data.toolUsage) ? data.toolUsage : []
          };
        }
      }
    } catch (err) {
      // Continue
    }

    return {
      text: "My systems are currently experiencing high traffic. Please try asking again in a moment.",
      response: "My systems are currently experiencing high traffic. Please try asking again in a moment.",
      sources: [],
      toolUsage: []
    };
  } catch (error) {
    console.error("Samrat AI Chat Error:", error);
    return {
      text: "My systems are temporarily unavailable right now. Please check back shortly or consult our FAQ section.",
      response: "My systems are temporarily unavailable right now. Please check back shortly or consult our FAQ section.",
      sources: [],
      toolUsage: []
    };
  }
};

export const analyzeMedicalImage = async (base64Data: string, mimeType: string = "image/jpeg"): Promise<string> => {
  try {
    const response = await fetchAPI('analyze_medical_image', 'POST', {
      base64Data,
      mimeType
    });
    if (response && response.text) {
      return response.text;
    }
    return "Could not analyze the image from backend response.";
  } catch (error) {
    console.error("Image Analysis Error:", error);
    return "Failed to process image due to server unavailability.";
  }
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  try {
    const response = await fetchAPI('transcribe_audio', 'POST', {
      base64Audio
    });
    if (response && response.text !== undefined) {
      return response.text;
    }
    return "";
  } catch (error) {
    console.error("Transcription Error:", error);
    return "Failed to transcribe audio.";
  }
};
