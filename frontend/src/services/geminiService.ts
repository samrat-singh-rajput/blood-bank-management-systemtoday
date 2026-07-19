
import { fetchAPI } from "./api";
import { User, UserRole } from "../types";

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
): Promise<string> => {
  try {
    // First attempt through fetchAPI (which routes to /api.php or backend URL)
    const response = await fetchAPI('chat_samrat', 'POST', {
      message,
      context,
      useThinking,
      history
    });

    if (response && (response.response || response.text)) {
      return response.response || response.text;
    }

    // Direct fallback to standalone /api/chat endpoint if fetchAPI returned null (e.g. storage mode or CORS edge case)
    const directRes = await fetch('http://localhost:5000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, useThinking, history })
    });

    if (directRes.ok) {
      const data = await directRes.json();
      if (data && (data.response || data.text)) {
        return data.response || data.text;
      }
    }

    return "My systems are currently experiencing high traffic. Please try asking again in a moment.";
  } catch (error) {
    console.error("Samrat AI Chat Error:", error);
    return "My systems are temporarily unavailable right now. Please check back shortly or consult our FAQ section.";
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
