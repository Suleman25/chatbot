import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Search, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { decrypt, isEncrypted } from '@/utils/encryption';

interface Conversation {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  last_message: string;
  last_message_time: string;
  last_message_type: 'text' | 'image' | 'video' | 'file';
  unread_count: number;
  message_status: 'sent' | 'delivered' | 'read';
}

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const getInitials = (name: string | null, userId: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return userId.substring(0, 2).toUpperCase();
  };

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

  // Get unread count for a conversation
  const getUnreadCount = async (partnerId: string): Promise<number> => {
    if (!user) return 0;
    
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', partnerId)
        .eq('receiver_id', user.id)
        .is('read_at', null);
      
      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  };

  // Get message status for sent messages
  const getMessageStatus = async (messageId: string): Promise<'sent' | 'delivered' | 'read'> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('read_at, delivered_at')
        .eq('id', messageId)
        .single();
      
      if (error || !data) return 'sent';
      
      if (data.read_at) return 'read';
      if (data.delivered_at) return 'delivered';
      return 'sent';
    } catch (error) {
      console.error('Error getting message status:', error);
      return 'sent';
    }
  };

  // Simplified conversation fetching without RPC function
  const fetchConversations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('💬 Fetching conversations...');
      
      // Get all messages involving current user (simplified approach)
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          user_id,
          receiver_id,
          created_at,
          content,
          message_type
        `)
        .or(`user_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('❌ Error fetching messages:', error);
        setLoading(false);
        return;
      }

      if (!messages || messages.length === 0) {
        console.log('📭 No messages found');
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs for conversation partners
      const partnerIds = new Set<string>();
      messages.forEach((msg: any) => {
        if (msg.user_id === user.id && msg.receiver_id) {
          partnerIds.add(msg.receiver_id);
        } else if (msg.user_id !== user.id) {
          partnerIds.add(msg.user_id);
        }
      });

      if (partnerIds.size === 0) {
        console.log('📭 No conversation partners found');
        setConversations([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for all conversation partners
      let profileMap = new Map();
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', Array.from(partnerIds));

        if (!profilesError && profiles) {
          profiles.forEach(profile => {
            profileMap.set(profile.user_id, profile);
          });
          console.log('✅ Profiles loaded:', profiles.length);
        } else {
          console.log('⚠️ Profiles query failed, using fallback names');
        }
      } catch (profilesError) {
        console.log('⚠️ Profiles approach failed:', profilesError);
      }

      // Group messages by conversation partner
      const userConversations = new Map<string, Conversation>();
      
      for (const msg of messages) {
        let partnerId: string;
        let isFromCurrentUser = false;
        
        if (msg.user_id === user.id && msg.receiver_id) {
          partnerId = msg.receiver_id;
          isFromCurrentUser = true;
        } else if (msg.user_id !== user.id) {
          partnerId = msg.user_id;
          isFromCurrentUser = false;
        } else {
          continue; // Skip messages without clear partner
        }
        
        const existing = userConversations.get(partnerId);
        
        if (!existing || new Date(msg.created_at) > new Date(existing.last_message_time)) {
          let lastMessageText = msg.content || 'No message';
          
          // Decrypt message if it's encrypted
          if (isEncrypted(lastMessageText)) {
            try {
              const decryptedText = decrypt(lastMessageText);
              // If decryption returns the same text, it might be a fallback
              if (decryptedText === lastMessageText) {
                // Try to extract plain text from the JSON
                try {
                  const parsed = JSON.parse(lastMessageText);
                  if (parsed.encrypted) {
                    // If it's still encrypted, show a simple indicator
                    lastMessageText = 'New message';
                  } else {
                    lastMessageText = decryptedText;
                  }
                } catch {
                  // Try old format decryption
                  if (lastMessageText.includes('|')) {
                    try {
                      const parts = lastMessageText.split('|');
                      if (parts.length === 2) {
                        const decrypted = decodeURIComponent(escape(atob(parts[0])));
                        lastMessageText = decrypted;
                      } else {
                        lastMessageText = 'New message';
                      }
                    } catch {
                      lastMessageText = 'New message';
                    }
                  } else {
                    lastMessageText = 'New message';
                  }
                }
              } else {
                lastMessageText = decryptedText;
              }
            } catch (error) {
              console.error('Failed to decrypt message:', error);
              lastMessageText = 'New message';
            }
          }
          
          // Format message based on type
          if (msg.message_type === 'image') {
            lastMessageText = '📸 Image';
          } else if (msg.message_type === 'video') {
            lastMessageText = '🎥 Video';
          } else if (lastMessageText.length > 50) {
            lastMessageText = lastMessageText.substring(0, 50) + '...';
          }

          // Add "You: " prefix if current user sent the message
          if (isFromCurrentUser) {
            lastMessageText = `You: ${lastMessageText}`;
          }

          // Get unread count for this conversation
          const unreadCount = await getUnreadCount(partnerId);
          
          // Get message status (for sent messages)
          const messageStatus = isFromCurrentUser ? await getMessageStatus(msg.id) : 'sent';

          // Always use the partner's display name, not the current user's
          const displayName = getUserDisplayName(partnerId, profileMap);
          const profile = profileMap.get(partnerId);

          userConversations.set(partnerId, {
            user_id: partnerId,
            display_name: displayName,
            avatar_url: profile?.avatar_url || null,
            last_message: lastMessageText,
            last_message_time: msg.created_at,
            last_message_type: msg.message_type || 'text',
            unread_count: unreadCount,
            message_status: messageStatus
          });
        }
      }

      const sortedConversations = Array.from(userConversations.values())
        .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

      console.log('✅ Conversations loaded:', sortedConversations.length);
      console.log('📊 Conversations:', sortedConversations.map(c => ({
        display_name: c.display_name,
        last_message: c.last_message.substring(0, 30)
      })));
      
      setConversations(sortedConversations);
      
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
    
    // Refresh every 15 seconds to show new messages
    const interval = setInterval(fetchConversations, 15000);
    
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => 
    conv.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenChat = (conversation: Conversation) => {
    navigate('/chat', {
      state: {
        chatWith: conversation.user_id,
        chatWithName: conversation.display_name
      }
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="bg-background p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-12 w-12 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b bg-gradient-to-r from-slate-50 to-blue-50">
          <CardTitle className="flex items-center gap-3 text-slate-800">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold">Messages</span>
            <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary border-primary/20">
              {filteredConversations.length}
            </Badge>
          </CardTitle>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-slate-200 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200"
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="p-4 bg-muted/30 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <MessageCircle className="h-10 w-10 opacity-50" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-slate-700">No Conversations Yet</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {searchQuery ? 
                  `No conversations found matching "${searchQuery}"` :
                  'Start chatting with friends to see your conversations here!'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.user_id}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50/80 transition-all duration-200 cursor-pointer group border-l-4 border-transparent hover:border-primary/30"
                  onClick={() => handleOpenChat(conversation)}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10 sm:h-14 sm:w-14 ring-2 ring-slate-100 group-hover:ring-primary/20 transition-all duration-200">
                      <AvatarImage src={conversation.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg text-sm sm:text-lg">
                        {getInitials(conversation.display_name, conversation.user_id)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Online indicator */}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                  </div>

                  {/* Conversation info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-base text-slate-800 truncate">
                        {conversation.display_name}
                      </h4>
                      <div className="flex items-center gap-2">
                        {/* Message status indicator for sent messages */}
                        {conversation.last_message.startsWith('You: ') && (
                          <div className="flex items-center">
                            {conversation.message_status === 'read' ? (
                              <CheckCheck className="h-3 w-3 text-blue-500" />
                            ) : conversation.message_status === 'delivered' ? (
                              <CheckCheck className="h-3 w-3 text-gray-400" />
                            ) : (
                              <Check className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        )}
                        <span className="text-xs text-slate-500 font-medium">
                          {formatTime(conversation.last_message_time)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600 truncate pr-4">
                        {conversation.last_message}
                      </p>
                      {/* Unread count badge */}
                      {conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold bg-red-500 hover:bg-red-600">
                          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Messages; 