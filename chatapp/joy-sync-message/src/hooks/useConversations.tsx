import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Conversation {
  id: string;
  otherUser: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  lastMessage: {
    content: string;
    created_at: string;
    user_id: string;
  } | null;
  unreadCount: number;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Create conversation ID between two users (consistent ordering)
  const createConversationId = (userId1: string, userId2: string): string => {
    const sortedIds = [userId1, userId2].sort();
    return `conv_${sortedIds[0]}_${sortedIds[1]}`;
  };

  // Get conversation between current user and another user
  const getConversationId = (otherUserId: string): string => {
    if (!user) return '';
    return createConversationId(user.id, otherUserId);
  };

  // Fetch user's conversations
  const fetchConversations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching conversations for user:', user.id);

      // Get all messages to find conversations
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          user_id,
          created_at,
          profiles:user_id (
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        setLoading(false);
        return;
      }

      // Get all users to create potential conversations
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .neq('user_id', user.id);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        setLoading(false);
        return;
      }

      console.log('Messages:', messages?.length || 0);
      console.log('Other users:', allUsers?.length || 0);

      // Create conversations map
      const conversationMap = new Map<string, Conversation>();

      // First, create conversations with users who have exchanged messages
      const messagesByUser = new Map<string, any[]>();
      
      messages?.forEach(message => {
        // Group messages by the other user (not current user)
        let otherUserId = '';
        
        if (message.user_id === user.id) {
          // Message sent by current user - we need more context to know recipient
          // For now, skip or handle differently
          return;
        } else {
          // Message received by current user
          otherUserId = message.user_id;
        }

        if (!messagesByUser.has(otherUserId)) {
          messagesByUser.set(otherUserId, []);
        }
        messagesByUser.get(otherUserId)?.push(message);
      });

      // Create conversations from users who have sent messages to current user
      messagesByUser.forEach((userMessages, otherUserId) => {
        const otherUser = allUsers?.find(u => u.user_id === otherUserId);
        if (!otherUser) return;

        const convId = createConversationId(user.id, otherUserId);
        const lastMessage = userMessages[0]; // First message (most recent due to ordering)

        conversationMap.set(convId, {
          id: convId,
          otherUser: {
            user_id: otherUser.user_id,
            display_name: otherUser.display_name,
            avatar_url: otherUser.avatar_url,
          },
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            created_at: lastMessage.created_at,
            user_id: lastMessage.user_id,
          } : null,
          unreadCount: 0,
        });
      });

      // Also check for messages sent by current user to others
      messages?.forEach(message => {
        if (message.user_id === user.id) {
          // This is a message sent by current user
          // We don't know the recipient, so add to all potential conversations
          allUsers?.forEach(otherUser => {
            const convId = createConversationId(user.id, otherUser.user_id);
            const existingConv = conversationMap.get(convId);
            
            if (!existingConv) {
              conversationMap.set(convId, {
                id: convId,
                otherUser: {
                  user_id: otherUser.user_id,
                  display_name: otherUser.display_name,
                  avatar_url: otherUser.avatar_url,
                },
                lastMessage: {
                  content: message.content,
                  created_at: message.created_at,
                  user_id: message.user_id,
                },
                unreadCount: 0,
              });
            } else if (!existingConv.lastMessage || 
                     new Date(message.created_at) > new Date(existingConv.lastMessage.created_at)) {
              existingConv.lastMessage = {
                content: message.content,
                created_at: message.created_at,
                user_id: message.user_id,
              };
            }
          });
        }
      });

      // Convert map to array and sort by last message time
      const conversationsArray = Array.from(conversationMap.values())
        .filter(conv => conv.lastMessage) // Only show conversations with messages
        .sort((a, b) => {
          if (!a.lastMessage && !b.lastMessage) return 0;
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.created_at).getTime() - 
                 new Date(a.lastMessage.created_at).getTime();
        });

      console.log('Final conversations:', conversationsArray);
      setConversations(conversationsArray);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          console.log('New message detected, refreshing conversations');
          // Refresh conversations when new messages arrive
          fetchConversations();
        }
      )
      .subscribe((status) => {
        console.log('Conversations subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    conversations,
    loading,
    getConversationId,
    fetchConversations,
  };
}; 