import { GoogleGenerativeAI } from "@google/generative-ai";

// Get API key (don't throw error at module level)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize Gemini AI only if API key exists
let genAI = null;
let model = null;

if (API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.8, // Increased for more natural conversation
        topK: 64,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
  } catch (error) {
    console.error('Failed to initialize Gemini AI:', error);
  }
}

// Enhanced system prompt for conversational AI
const SYSTEM_PROMPT = `You are a helpful, intelligent, and conversational AI assistant. Your name is "AI Assistant". Follow these guidelines:

🎯 **Conversation Style:**
- Be natural, friendly, and engaging in conversation
- Remember and reference previous parts of our conversation
- Ask follow-up questions when appropriate
- Show genuine interest in the user's topics
- Maintain consistency throughout the conversation

📝 **Response Quality:**
- Provide accurate, helpful, and well-structured responses
- Use clear and conversational language
- Format responses with proper markdown when needed
- Be detailed when asked, concise when appropriate
- If unsure about something, honestly acknowledge it

🌍 **Language Support:**
- Support both English and Urdu languages naturally
- Switch between languages based on user preference
- Understand mixed language conversations
- Maintain cultural context and sensitivity

💡 **Engagement:**
- Build on previous conversation points
- Reference earlier topics when relevant
- Show understanding of the conversation flow
- Be helpful while maintaining a conversational tone
- Use examples and analogies when helpful

Always maintain context from our conversation and respond as if you're having a continuous, meaningful dialogue with the user.`;

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 800; // Reduced for better conversation flow

export const generateResponse = async (prompt, conversationHistory = []) => {
  try {
    // Check if API key is available
    if (!API_KEY) {
      throw new Error('API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
    }

    // Check if model is initialized
    if (!model) {
      throw new Error('Gemini AI model is not initialized. Please check your API key.');
    }

    // Rate limiting check
    const now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - (now - lastRequestTime)));
    }
    lastRequestTime = Date.now();

    // Validate input
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Invalid prompt provided');
    }

    // Enhanced conversation context (increased from 10 to 20 messages for better context)
    const recentHistory = conversationHistory.slice(-20);
    let conversationContext = SYSTEM_PROMPT;
    
    if (recentHistory.length > 0) {
      conversationContext += "\n\n📚 **Recent Conversation Context:**\n";
      
      // Better formatting of conversation history
      recentHistory.forEach((msg, index) => {
        const timestamp = new Date(msg.timestamp).toLocaleTimeString();
        const role = msg.type === 'user' ? '👤 User' : '🤖 Assistant';
        const messageNumber = recentHistory.length - index;
        
        // Add message with better formatting
        conversationContext += `\n[${messageNumber} messages ago - ${timestamp}]\n`;
        conversationContext += `${role}: ${msg.content}\n`;
        
        // Add separator for clarity
        if (index < recentHistory.length - 1) {
          conversationContext += "---\n";
        }
      });
    }
    
    // Current user message with emphasis
    conversationContext += `\n\n🎯 **Current User Message:**\n👤 User: ${prompt}\n\n🤖 Assistant: `;

    // Generate response
    const result = await model.generateContent(conversationContext);
    const response = await result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      throw new Error('Empty response received from API');
    }

    return text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // Enhanced error handling
    if (error.message?.includes('API key is not configured')) {
      throw error; // Pass through our custom error
    } else if (error.message?.includes('API_KEY') || error.message?.includes('not initialized')) {
      throw new Error('API key is invalid or missing. Please check your VITE_GEMINI_API_KEY.');
    } else if (error.message?.includes('quota')) {
      throw new Error('API quota exceeded. Please try again later.');
    } else if (error.message?.includes('rate limit')) {
      throw new Error('Rate limit exceeded. Please wait a moment before sending another message.');
    } else if (error.message?.includes('network') || error.name === 'NetworkError') {
      throw new Error('Network error. Please check your internet connection and try again.');
    } else {
      throw new Error('Unable to generate response. Please try again.');
    }
  }
};

// Utility function to check API key validity
export const validateApiKey = () => {
  return !!API_KEY && API_KEY.length > 10;
};

// New utility function to analyze conversation context
export const getConversationSummary = (messages) => {
  if (messages.length === 0) return "New conversation";
  
  const topics = messages
    .filter(msg => msg.type === 'user')
    .map(msg => msg.content.slice(0, 50))
    .join(', ');
    
  return `Discussing: ${topics}...`;
};

export default { generateResponse, validateApiKey, getConversationSummary }; 