import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Search, Circle, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversations } from '@/hooks/useConversations';
import { useUserStatus } from '@/hooks/useUserStatus';
import { supabase } from '@/integrations/supabase/client';

export const ChatList = () => {
  const { conversations, loading } = useConversations();
  const { isUserOnline, formatLastSeen, getUserStatus } = useUserStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [userRoles, setUserRoles] = useState<Map<string, string>>(new Map());
  const navigate = useNavigate();

  const getInitials = (name: string | null, userId: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return userId?.substring(0, 2).toUpperCase() || 'U';
  };

  const isUserAdmin = (userId: string): boolean => {
    return userRoles.get(userId) === 'admin';
  };

  // Fetch user roles
  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user roles:', error);
        return;
      }

      const rolesMap = new Map<string, string>();
      if (data) {
        data.forEach((roleData) => {
          rolesMap.set(roleData.user_id, roleData.role);
        });
      }
      setUserRoles(rolesMap);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  useEffect(() => {
    fetchUserRoles();
  }, []);

  const handleChatClick = (conversation: any) => {
    navigate('/messages', {
      state: {
        chatWith: conversation.otherUser.user_id,
        chatWithName: conversation.otherUser.display_name
      }
    });
  };

  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (!content) return '';
    
    // Try to decrypt if it's encrypted (simple check)
    try {
      const parsed = JSON.parse(content);
      if (parsed.encrypted) {
        return 'New message';
      }
    } catch {
      // Not JSON, treat as plain text
    }
    
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...' 
      : content;
  };

  const filteredConversations = conversations.filter(conv => {
    const name = conv.otherUser.display_name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading conversations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <MessageCircle className="h-5 w-5" />
          <span className="flex-1 min-w-0">Recent Conversations</span>
          <Badge variant="secondary">{conversations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {conversations.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No conversations yet.</p>
            <p className="text-sm">Start chatting with someone to see them here!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredConversations.map((conversation) => {
              const userStatus = getUserStatus(conversation.otherUser.user_id);
              const userIsOnline = isUserOnline(conversation.otherUser.user_id);
              const userIsAnAdmin = isUserAdmin(conversation.otherUser.user_id);
              
              return (
                <div
                  key={conversation.id}
                  onClick={() => handleChatClick(conversation)}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                      <AvatarImage 
                        src={conversation.otherUser.avatar_url || ''} 
                        alt={conversation.otherUser.display_name || 'User'} 
                      />
                      <AvatarFallback>
                        {getInitials(conversation.otherUser.display_name, conversation.otherUser.user_id)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online status indicator */}
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                      userIsOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    {/* Single admin crown overlay */}
                    {userIsAnAdmin && (
                      <div className="absolute -top-1 -right-1">
                        <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 bg-background rounded-full p-0.5" title="Admin" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">
                          {conversation.otherUser.display_name || 'Anonymous User'}
                        </p>
                        {userIsOnline && (
                          <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(conversation.lastMessage.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1 gap-1 sm:gap-2">
                      <p className="text-sm text-muted-foreground truncate flex-1">
                        {conversation.lastMessage 
                          ? truncateMessage(conversation.lastMessage.content)
                          : userIsOnline 
                            ? 'Online - Start a conversation!'
                            : userStatus 
                            ? `Last seen ${formatLastSeen(userStatus.last_seen)} - Start a conversation!`
                            : 'Start a conversation!'
                        }
                      </p>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs whitespace-nowrap">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 