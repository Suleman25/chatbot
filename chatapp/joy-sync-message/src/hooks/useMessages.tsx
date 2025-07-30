import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';
import { useToast } from './use-toast';

interface Message {
  id: string;
  content: string;
  user_id: string;
  receiver_id?: string;
  created_at: string;
  message_type?: 'text' | 'image' | 'video' | 'file';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
  like_count?: number;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ExtendedMessage extends Message {
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const useMessages = (otherUserId?: string) => {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();

  // Get user display name from known users or profiles
  const getUserDisplayName = (userId: string, profileMap: Map<string, any>): string => {
    // First try to get from profile map
    const profile = profileMap.get(userId);
    if (profile?.display_name) {
      return profile.display_name;
    }

    // Fallback to known users
    const knownUsers: { [key: string]: string } = {
      '6cc043e9-a56c-40a2-9504-46265dc7f36b': 'Jack',
      '4c296628-ed91-47c2-96db-14640269f17d': 'Marium',
      '033314da-63a8-4789-ab4d-8b1f51659342': 'suleman',
      '3e40ef5f-d957-4374-9a90-a1570c7ee1d6': 'sam'
    };

    return knownUsers[userId] || 'Unknown User';
  };

  // Robust send message function with comprehensive error handling
  const sendMessage = async (content: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to send messages",
        variant: "destructive",
      });
      return false;
    }

    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return false;
    }

    try {
      console.log('🚀 Sending message:', { 
        content: content.substring(0, 50) + '...', 
        user_id: user.id, 
        receiver_id: otherUserId || null
      });

      // Prepare message data
      const messageData = {
        content: content.trim(),
        user_id: user.id,
        receiver_id: otherUserId || null,
        message_type: 'text' as const
      };

      // Try to insert message
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error sending message:', error);
        
        // Handle specific database schema errors
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          toast({
            title: "Database Setup Required",
            description: "Please run the complete database setup. Copy and run COMPLETE_DATABASE_SETUP.sql in Supabase SQL Editor.",
            variant: "destructive",
          });
        } else if (error.message.includes('message_type') || error.message.includes('column')) {
          toast({
            title: "Database Schema Issue",
            description: "Database schema needs updating. Please run COMPLETE_DATABASE_SETUP.sql to fix all issues.",
            variant: "destructive",
          });
        } else if (error.code === 'PGRST301' || error.message.includes('permission')) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to send messages. Please check your authentication.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Failed to Send Message",
            description: `Unable to send message: ${error.message}. Please try again.`,
            variant: "destructive",
          });
        }
        return false;
      }

      console.log('✅ Message sent successfully:', data.id);
      
      // Add the new message to the local state
      setMessages(prev => [...prev, {
        ...data,
        message_type: data.message_type || 'text',
        profiles: {
          display_name: 'You',
          avatar_url: null
        }
      }]);

      return true;
    } catch (error) {
      console.error('❌ Unexpected error sending message:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending the message. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Simplified media message function without foreign key joins
  const sendMediaMessage = async (file: File, type: 'image' | 'video') => {
    if (!user || !otherUserId) {
      toast({
        title: "Error",
        description: "Cannot send media message",
        variant: "destructive",
      });
      return false;
    }

    // Validate file
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        title: "File Too Large",
        description: "File size must be less than 50MB",
        variant: "destructive",
      });
      return false;
    }

    setUploading(true);
    try {
      console.log(`📎 Uploading ${type}:`, file.name);
      
      // Upload file to storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, file);

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        toast({
          title: "Upload Error",
          description: `Failed to upload ${type}: ${uploadError.message}`,
          variant: "destructive",
        });
        return false;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      // Prepare media message data
      const mediaMessageData = {
        content: `${type === 'image' ? '📸' : '🎥'} ${file.name}`,
        user_id: user.id,
        receiver_id: otherUserId,
        message_type: type,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type
      };

      // Insert message record without complex joins
      const { data, error } = await supabase
        .from('messages')
        .insert(mediaMessageData)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error saving media message:', error);
        
        // Clean up uploaded file if message creation fails
        await supabase.storage.from('chat-media').remove([fileName]);
        
        if (error.message.includes('message_type')) {
          toast({
            title: "Database Error",
            description: "Please run the database migration first. Check SIMPLE_MESSAGES_FIX.sql",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: `Failed to save ${type} message: ${error.message}`,
            variant: "destructive",
          });
        }
        return false;
      }

      console.log(`✅ ${type} message sent:`, data.id);
      
      // Get sender profile separately
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      // Add to local state with profile data
      const messageWithProfile = {
        ...data,
        profiles: senderProfile || null
      };
      
      setMessages(prev => [...prev, messageWithProfile]);
      
      return true;
    } catch (error) {
      console.error(`💥 ${type} upload error:`, error);
      toast({
        title: "Error",
        description: `Failed to upload ${type}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Send image wrapper
  const sendImage = async (file: File) => {
    return await sendMediaMessage(file, 'image');
  };

  // Send video wrapper  
  const sendVideo = async (file: File) => {
    return await sendMediaMessage(file, 'video');
  };

  // Robust fetch messages function with comprehensive error handling
  const fetchMessages = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (!otherUserId) {
      console.log('❌ No other user specified, cannot fetch messages');
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching messages for conversation...');

      // Try to get messages
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          user_id,
          receiver_id,
          message_type,
          file_url,
          file_name,
          file_size,
          mime_type,
          is_deleted,
          deleted_at,
          deleted_by,
          like_count,
          created_at
        `)
        .or(`and(user_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching messages:', error);
        
        // Handle specific database errors
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          toast({
            title: "Database Setup Required",
            description: "The messages table doesn't exist. Please run COMPLETE_DATABASE_SETUP.sql in Supabase SQL Editor to set up the database.",
            variant: "destructive",
          });
        } else if (error.message.includes('column') && error.message.includes('does not exist')) {
          toast({
            title: "Database Schema Issue",
            description: "Some database columns are missing. Please run COMPLETE_DATABASE_SETUP.sql to update the schema.",
            variant: "destructive",
          });
        } else if (error.code === 'PGRST301' || error.message.includes('permission')) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access messages. Please check your authentication.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Failed to Load Messages",
            description: `Unable to fetch messages: ${error.message}. Please try refreshing the page.`,
            variant: "destructive",
          });
        }
        setMessages([]);
        setLoading(false);
        return;
      }

      console.log('✅ Messages loaded:', messagesData?.length || 0);

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // Try to get profiles, but don't fail if profiles table doesn't exist
      let profileMap = new Map();
      try {
        const userIds = Array.from(new Set(messagesData.map(msg => msg.user_id)));
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        if (profiles) {
          profiles.forEach(profile => {
            profileMap.set(profile.user_id, profile);
          });
          console.log('✅ Profiles loaded for messages:', profiles.length);
        }
      } catch (profilesError) {
        console.log('⚠️ Profiles query failed for messages:', profilesError);
      }

      // Combine messages with profile data using improved name handling
      const messagesWithProfiles = messagesData.map(msg => {
        const displayName = getUserDisplayName(msg.user_id, profileMap);
        const profile = profileMap.get(msg.user_id);
        
        return {
          ...msg,
          message_type: msg.message_type || 'text',
          profiles: {
            display_name: msg.user_id === user.id ? 'You' : displayName,
            avatar_url: profile?.avatar_url || null
          }
        };
      });

      console.log('✅ Messages with profiles processed:', messagesWithProfiles.length);
      setMessages(messagesWithProfiles);
      
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try refreshing the page.",
        variant: "destructive",
      });
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Delete message (users can delete their own messages, admins can delete any)
  const deleteMessage = async (messageId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to delete messages",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use the database function for proper permission checking
      const { data, error } = await supabase.rpc('delete_message', {
        message_uuid: messageId
      });

      if (error) {
        console.error('❌ Error deleting message:', error);
        toast({
          title: "Error",
          description: "Failed to delete message",
          variant: "destructive",
        });
      } else if (data) {
        // Remove the message from state immediately
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        toast({
          title: "Success",
          description: "Message deleted successfully",
        });
      } else {
        toast({
          title: "Access Denied",
          description: "You can only delete your own messages",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('💥 Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  // Toggle message like
  const toggleMessageLike = async (messageId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to like messages",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('toggle_message_like', {
        message_uuid: messageId
      });

      if (error) {
        console.error('❌ Error toggling message like:', error);
        toast({
          title: "Error",
          description: "Failed to like/unlike message",
          variant: "destructive",
        });
      } else {
        // Update the message like count in state
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            const newLikeCount = data ? (msg.like_count || 0) + 1 : Math.max(0, (msg.like_count || 0) - 1);
            return { ...msg, like_count: newLikeCount };
          }
          return msg;
        }));
        
        toast({
          title: "Success",
          description: data ? "Message liked!" : "Message unliked!",
        });
      }
    } catch (error) {
      console.error('💥 Error toggling message like:', error);
      toast({
        title: "Error",
        description: "Failed to like/unlike message",
        variant: "destructive",
      });
    }
  };

  // Get message likes
  const getMessageLikes = async (messageId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_message_likes', {
        message_uuid: messageId
      });

      if (error) {
        console.error('❌ Error getting message likes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('💥 Error getting message likes:', error);
      return [];
    }
  };

  // Set up simplified real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchMessages();

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('⚡ New message received:', payload.new);
          const newMessage = payload.new as Message;
          
          // Check if message should be shown in current chat
          let shouldShow = false;
          if (otherUserId) {
            shouldShow = (
              (newMessage.user_id === user.id && newMessage.receiver_id === otherUserId) ||
              (newMessage.user_id === otherUserId && (newMessage.receiver_id === user.id || newMessage.receiver_id === null))
            );
          } else {
            shouldShow = true; // Show all messages if no specific chat
          }

          if (shouldShow) {
            // Get profile data for sender separately to avoid relationship issues
            const { data: profileData } = await supabase
              .from('profiles')
              .select('user_id, display_name, avatar_url')
              .eq('user_id', newMessage.user_id)
              .single();

            const messageWithProfile: ExtendedMessage = {
              ...newMessage,
              profiles: profileData ? {
                display_name: profileData.display_name,
                avatar_url: profileData.avatar_url,
              } : null
            };

            setMessages(prev => {
              if (prev.find(msg => msg.id === messageWithProfile.id)) {
                return prev; // Avoid duplicates
              }
              return [...prev, messageWithProfile];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherUserId]);

  return {
    messages,
    loading,
    uploading,
    sendMessage,
    sendImage,
    sendVideo,
    deleteMessage,
    toggleMessageLike,
    getMessageLikes,
    fetchMessages,
  };
};