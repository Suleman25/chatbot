import { useState, useCallback, useEffect } from 'react';
import { generateResponse, validateApiKey, getConversationSummary } from '../services/geminiApi';

const useChat = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);
  const [conversationContext, setConversationContext] = useState('');

  // Check API key on mount
  useEffect(() => {
    setIsApiKeyValid(validateApiKey());
  }, []);

  // Update conversation context when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setConversationContext(getConversationSummary(messages));
    }
  }, [messages]);

  const generateId = () => Date.now().toString();

  const createNewChat = useCallback(() => {
    const newChatId = generateId();
    const newChat = {
      id: newChatId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setMessages([]);
    setError(null);
    setConversationContext('');
  }, []);

  const selectChat = useCallback((chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages);
      setError(null);
    }
  }, [chatHistory]);

  const deleteChat = useCallback((chatId) => {
    setChatHistory(prev => prev.filter(c => c.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([]);
      setError(null);
      setConversationContext('');
    }
  }, [currentChatId]);

  const updateChatTitle = useCallback((chatId, newTitle) => {
    setChatHistory(prev => 
      prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, title: newTitle, lastUpdated: new Date().toISOString() } 
          : chat
      )
    );
  }, []);

  const addMessage = useCallback((content, type = 'user', metadata = {}) => {
    const message = {
      id: generateId(),
      type,
      content,
      timestamp: new Date().toISOString(),
      isLiked: false,
      ...metadata
    };

    setMessages(prev => {
      const newMessages = [...prev, message];
      
      // Update chat history with enhanced title generation for conversations
      if (currentChatId) {
        setChatHistory(prevHistory => 
          prevHistory.map(chat => 
            chat.id === currentChatId 
              ? { 
                  ...chat, 
                  messages: newMessages,
                  lastUpdated: new Date().toISOString(),
                  title: chat.title === 'New Chat' && type === 'user' 
                    ? generateChatTitle(content, newMessages)
                    : chat.title
                }
              : chat
          )
        );
      }
      
      return newMessages;
    });

    return message;
  }, [currentChatId]);

  // Enhanced chat title generation based on conversation context
  const generateChatTitle = (firstUserMessage, allMessages) => {
    // If there's a conversation, create a contextual title
    const userMessages = allMessages.filter(msg => msg.type === 'user');
    
    if (userMessages.length <= 1) {
      // For first message, create a descriptive title
      if (firstUserMessage.length > 40) {
        return firstUserMessage.slice(0, 40) + '...';
      }
      return firstUserMessage;
    } else {
      // For ongoing conversations, create a topic-based title
      const topics = userMessages.slice(0, 3).map(msg => {
        const words = msg.content.split(' ').slice(0, 3);
        return words.join(' ');
      });
      
      return `${topics[0]} & more...`;
    }
  };

  const likeMessage = useCallback((messageId) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, isLiked: !msg.isLiked } : msg
      )
    );
    
    // Update in chat history as well
    if (currentChatId) {
      setChatHistory(prevHistory => 
        prevHistory.map(chat => 
          chat.id === currentChatId 
            ? { 
                ...chat, 
                messages: messages.map(msg => 
                  msg.id === messageId ? { ...msg, isLiked: !msg.isLiked } : msg
                ),
                lastUpdated: new Date().toISOString()
              }
            : chat
        )
      );
    }
  }, [currentChatId, messages]);

  const validateMessage = (content) => {
    if (!content || typeof content !== 'string') {
      return { isValid: false, error: 'Message cannot be empty' };
    }
    
    const trimmedContent = content.trim();
    
    if (trimmedContent.length === 0) {
      return { isValid: false, error: 'Message cannot be empty' };
    }
    
    if (trimmedContent.length > 4000) {
      return { isValid: false, error: 'Message is too long. Please keep it under 4000 characters.' };
    }

    // Check for spam (repeated characters or simple patterns)
    if (/(.)\1{20,}/.test(trimmedContent)) {
      return { isValid: false, error: 'Please enter a meaningful message' };
    }

    return { isValid: true, content: trimmedContent };
  };

  const retryLastMessage = useCallback(async () => {
    const lastUserMessage = [...messages].reverse().find(m => m.type === 'user');
    if (lastUserMessage) {
      // Remove the last assistant message if it was an error
      setMessages(prev => prev.filter(m => !(m.type === 'assistant' && m.isError)));
      await sendMessage(lastUserMessage.content, true);
    }
  }, [messages]);

  const sendMessage = useCallback(async (content, isRetry = false) => {
    // API key validation
    if (!isApiKeyValid) {
      setError('API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
      return;
    }

    // Input validation
    const validation = validateMessage(content);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    const messageContent = validation.content;

    // Create new chat if none exists
    if (!currentChatId) {
      createNewChat();
    }

    // Clear previous error
    setError(null);

    // Add user message (only if not retry)
    if (!isRetry) {
      addMessage(messageContent, 'user');
    }
    
    setIsLoading(true);

    try {
      // Get enhanced conversation context (last 20 messages for better context)
      const conversationContext = messages.slice(-20);
      
      console.log(`🤖 Generating response with ${conversationContext.length} context messages...`);
      
      // Call Gemini API with full conversation context
      const aiResponse = await generateResponse(messageContent, conversationContext);
      
      // Add assistant response with conversation metadata
      addMessage(aiResponse, 'assistant', { 
        contextLength: conversationContext.length,
        responseTime: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      // Add error message
      const errorMessage = error.message || 'An unexpected error occurred. Please try again.';
      addMessage(
        `⚠️ ${errorMessage}`, 
        'assistant', 
        { isError: true }
      );
      
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentChatId, createNewChat, addMessage, messages, isApiKeyValid]);

  const copyMessage = useCallback((content) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(content).then(() => {
        console.log('Message copied to clipboard');
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    chatHistory,
    currentChatId,
    messages,
    isLoading,
    error,
    isApiKeyValid,
    conversationContext,
    createNewChat,
    selectChat,
    deleteChat,
    updateChatTitle,
    sendMessage,
    copyMessage,
    likeMessage,
    retryLastMessage,
    clearError
  };
};

export default useChat; 