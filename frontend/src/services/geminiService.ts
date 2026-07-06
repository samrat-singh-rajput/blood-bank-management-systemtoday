
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { User, UserRole } from "../types";

// Helper to get Gemini client using process.env.API_KEY directly as required by guidelines.
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getHealthTips = async (userRole: string): Promise<string[]> => {
  const ai = getAiClient();

  try {
    const model = 'gemini-3-flash-preview';
    const dateStr = new Date().toDateString();
    const prompt = `Provide exactly 3 short, inspiring, distinct health tips or facts specifically for a blood bank system donor for today, ${dateStr}. 
    Each tip should be a single sentence. Focus on hydration, nutrition, and the positive impact of donation. 
    Return them as a simple list separated by newlines.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const text = response.text || "";
    const tips = text.split('\n').map(t => t.replace(/^\d+\.\s*/, '').trim()).filter(t => t.length > 5);
    
    if (tips.length >= 3) return tips.slice(0, 3);
    return [
      "Stay hydrated by drinking plenty of water throughout the day.",
      "Eat iron-rich foods like spinach and lentils to keep your levels high.",
      "Every single blood donation can save up to three lives."
    ];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [
      "Drink extra fluids before and after your donation.",
      "Maintain a healthy iron level in your diet.",
      "Your donation makes a real difference in your community."
    ];
  }
};

export const chatWithSamrat = async (message: string, context: string, useThinking: boolean = false): Promise<string> => {
  const ai = getAiClient();

  try {
    const model = useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    const systemInstruction = `You are Samrat, a friendly, intelligent, and 24/7 AI assistant for the BloodBank System. 
    Your goal is to help Admins, Donors, and Recipients with their queries about blood donation, health, or navigating the system.
    
    Current User Context: ${context}
    
    Keep answers concise, professional, and helpful. 
    If asked about medical advice, strictly advise consulting a doctor. 
    Use a warm, encouraging tone.`;

    const config: any = {
      systemInstruction: systemInstruction,
      tools: [{ googleSearch: {} }]
    };

    if (useThinking) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const response = await ai.models.generateContent({
      model,
      contents: message,
      config: config
    });

    let text = response.text || "I didn't quite catch that. Could you rephrase?";
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      const links = chunks
        .map((chunk: any) => chunk.web?.uri || chunk.maps?.uri)
        .filter(Boolean);
      if (links.length > 0) {
        const uniqueLinks = Array.from(new Set(links));
        text += "\n\nSources:\n" + uniqueLinks.map(link => `- ${link}`).join("\n");
      }
    }

    return text;
  } catch (error) {
    console.error("Samrat Error:", error);
    return "My systems are having a moment. Please try again later.";
  }
};

export const analyzeMedicalImage = async (base64Data: string, mimeType: string): Promise<string> => {
  const ai = getAiClient();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          {
            text: "Analyze this medical certificate or document for a blood bank system. Extract the blood type, date of donation, and hospital name if visible. Format the output clearly: Hospital Name: [name], Date: [date], Blood Type: [type]."
          }
        ]
      }
    });
    return response.text || "Could not analyze the image.";
  } catch (error) {
    console.error("Image Analysis Error:", error);
    return "Failed to process image.";
  }
};

export const transcribeAudio = async (base64Audio: string): Promise<string> => {
  const ai = getAiClient();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Audio,
              mimeType: 'audio/wav'
            }
          },
          {
            text: "Transcribe the following audio precisely."
          }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    return "Failed to transcribe audio.";
  }
};
