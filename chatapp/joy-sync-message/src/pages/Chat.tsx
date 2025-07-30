import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Send, Smile, Trash2, Circle, Crown, Image, Video, Paperclip, Loader2, Check, CheckCheck, Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useToast } from '@/hooks/use-toast';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { encrypt, decrypt, isEncrypted } from '@/utils/encryption';
import { supabase } from '@/integrations/supabase/client';

const Chat = () => {
  const [newMessage, setNewMessage] = useState('');
  const [userRoles, setUserRoles] = useState<Map<string, string>>(new Map());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { isUserOnline, formatLastSeen, getUserStatus } = useUserStatus();
  const { toast } = useToast();

  // Get chat partner info from navigation state
  const chatWith = location.state?.chatWith;
  const chatWithName = location.state?.chatWithName;

  // Use messages hook
  const { messages, sendMessage, sendImage, sendVideo, deleteMessage, toggleMessageLike, getMessageLikes, loading, uploading } = useMessages(chatWith);

  const getInitials = (name: string | null, userId?: string) => {
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

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch user roles on component mount
  useEffect(() => {
    fetchUserRoles();
  }, []);

  // Mark conversation as read when chat is opened
  useEffect(() => {
    const markAsRead = async () => {
      if (chatWith && user) {
        try {
          console.log('📖 Marking conversation as read with:', chatWith);
          await supabase.rpc('mark_conversation_as_read', {
            other_user_id: chatWith
          });
        } catch (error) {
          console.error('❌ Error marking conversation as read:', error);
        }
      }
    };

    markAsRead();
  }, [chatWith, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      console.log('🚀 Sending message from chat page:', newMessage);
      console.log('📝 Message contains emojis:', /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(newMessage));

      // Ensure proper UTF-8 encoding for emojis
      const encodedMessage = encodeURIComponent(newMessage);
      const decodedMessage = decodeURIComponent(encodedMessage);
      console.log('🔤 UTF-8 encoding test passed:', decodedMessage === newMessage);

      // For admin, send plain text. For others, encrypt
      let messageToSend = newMessage;
      if (!isAdmin) {
        messageToSend = await encrypt(newMessage);
        console.log('🔐 Encrypted payload for non-admin user');
      } else {
        console.log('👑 Admin sending plain text message with emojis');
      }
      
      // Send message
      const success = await sendMessage(messageToSend);
      if (success) {
        setNewMessage('');
        console.log('✅ Message with emojis sent successfully from chat page');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    console.log('😀 Emoji selected:', emoji);
    const emojiChar = emoji.native || emoji.emoji;
    console.log('📝 Adding emoji to message:', emojiChar);
    setNewMessage(prev => {
      const newMsg = prev + emojiChar;
      console.log('💬 New message with emoji:', newMsg);
      return newMsg;
    });
  };

  // Media upload handlers
  const handleImageUpload = () => {
    imageInputRef.current?.click();
  };

  const handleVideoUpload = () => {
    videoInputRef.current?.click();
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('📸 Image selected:', file.name);
      await sendImage(file);
    }
    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('🎥 Video selected:', file.name);
      await sendVideo(file);
    }
    // Reset input
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      deleteMessage(messageId);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Simple message display without encryption indicators for admin
  const getMessageContent = (content: string) => {
    try {
      // Admin sees everything as plain text
      if (isAdmin) {
        // Try to decrypt if it's encrypted, otherwise show as is
        if (isEncrypted(content)) {
          const decrypted = decrypt(content);
          // If decryption returns the same content, it might be a fallback
          if (decrypted === content) {
            try {
              const parsed = JSON.parse(content);
              if (parsed.encrypted) {
                // If still encrypted, show original content
                return content;
              }
            } catch {
              return content;
            }
          }
          return decrypted;
        }
        return content;
      }
      
      // Regular users get normal decryption
      if (isEncrypted(content)) {
        const decrypted = decrypt(content);
        // If decryption returns the same content, it might be a fallback
        if (decrypted === content) {
          try {
            const parsed = JSON.parse(content);
            if (parsed.encrypted) {
              // If still encrypted, show original content
              return content;
            }
          } catch {
            return content;
          }
        }
        return decrypted;
      }
      return content;
    } catch (error) {
      console.error('❌ Error processing message content:', error);
      return content; // Return original content instead of error message
    }
  };

  // Function to detect and properly render emojis
  const renderMessageWithEmojis = (content: string) => {
    // Ensure proper emoji rendering
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    
    if (emojiRegex.test(content)) {
      console.log('😀 Message contains emojis, rendering with proper support');
    }
    
    return content;
  };

  // Function to render media messages
  const renderMediaContent = (message: any) => {
    if (message.message_type === 'image' && message.file_url) {
      return (
        <div className="max-w-sm">
          <img 
            src={message.file_url} 
            alt={message.file_name || 'Shared image'}
            className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity max-w-full h-auto"
            onClick={() => window.open(message.file_url, '_blank')}
            onError={(e) => {
              console.error('Image load error:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
          {message.file_name && (
            <p className="text-xs text-muted-foreground mt-1">{message.file_name}</p>
          )}
        </div>
      );
    }

    if (message.message_type === 'video' && message.file_url) {
      return (
        <div className="max-w-[70%] sm:max-w-xs md:max-w-sm lg:max-w-md">
          <video 
            src={message.file_url}
            controls
            className="rounded-lg w-full h-auto max-w-full"
            onError={(e) => {
              console.error('Video load error:', e);
              e.currentTarget.style.display = 'none';
            }}
          >
            Your browser does not support the video tag.
          </video>
          {message.file_name && (
            <p className="text-xs text-muted-foreground mt-1">{message.file_name}</p>
          )}
        </div>
      );
    }

    // Default text message
    return (
      <div
        className="whitespace-pre-wrap"
        style={{ 
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          unicodeBidi: 'normal'
        }}
      >
        {renderMessageWithEmojis(getMessageContent(message.content))}
      </div>
    );
  };

  // Get online status for chat partner
  const partnerStatus = chatWith ? getUserStatus(chatWith) : null;
  const partnerIsOnline = chatWith ? isUserOnline(chatWith) : false;
  const partnerIsAdmin = chatWith ? isUserAdmin(chatWith) : false;

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

  const chatTitle = chatWith && chatWithName 
    ? `${chatWithName}` 
    : 'Joy Sync Chat';

  // If no chat partner is provided, show a welcome message
  if (!chatWith) {
    return (
      <div className="flex flex-col bg-background">
        <Card className="rounded-none border-b">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <span>Joy Sync Chat</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-xs sm:max-w-md">
            <div className="p-4 bg-muted/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 opacity-50" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-slate-700">Welcome to Chat</h3>
            <p className="text-sm text-slate-500 mb-4">
              Select a conversation from the Messages page to start chatting with your friends.
            </p>
            <Button 
              onClick={() => navigate('/messages')}
              className="bg-primary hover:bg-primary/90 text-sm sm:text-base"
            >
              Go to Messages
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background">
      {/* Chat Header */}
      <Card className="rounded-none border-b">
        <CardHeader className="py-2 sm:py-3">
          <CardTitle className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/messages')}
              className="p-1 h-7 w-7 sm:h-8 sm:w-8"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            {chatWith && (
              <div className="relative flex-shrink-0">
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                  <AvatarFallback>
                    {getInitials(chatWithName, chatWith)}
                  </AvatarFallback>
                </Avatar>
                {/* Online status indicator */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-background ${
                  partnerIsOnline ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                {/* Single admin crown overlay for chat partner */}
                {partnerIsAdmin && (
                  <div className="absolute -top-0.5 -right-0.5">
                    <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500 bg-background rounded-full p-0.5" title="Admin" />
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <span className="truncate text-base sm:text-lg font-semibold">
                  {chatTitle}
                  {partnerIsAdmin && (
                    <Crown className="inline h-3 w-3 text-yellow-500 ml-1" title="Admin" />
                  )}
                </span>
              </div>
              {chatWith && (
                <p className="text-xs text-muted-foreground truncate">
                  {partnerIsOnline ? (
                    <span className="flex items-center gap-1">
                      <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                      Online
                    </span>
                  ) : (
                    partnerStatus && `Last seen ${formatLastSeen(partnerStatus.last_seen)}`
                  )}
                </p>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-2 sm:p-4" ref={scrollAreaRef}>
        <div className="space-y-3 sm:space-y-4">
          {loading ? (
            <div className="text-center py-6 sm:py-8">
              <div className="animate-spin rounded-full h-7 w-7 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground text-sm sm:text-base">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <p className="text-base sm:text-lg">No messages yet.</p>
              <p className="text-sm sm:text-base mt-1">
                {chatWith ? "Start the conversation!" : "Send the first message!"}
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.user_id === user?.id;
              const messageContent = getMessageContent(message.content);
              const messageUserIsAdmin = isUserAdmin(message.user_id);
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-2 sm:gap-3 group ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwnMessage && (
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                        <AvatarImage 
                          src={message.profiles?.avatar_url || ''} 
                          alt={message.profiles?.display_name || 'User'} 
                        />
                        <AvatarFallback className="text-xs sm:text-sm">
                          {getInitials(message.profiles?.display_name, message.user_id)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Admin crown overlay */}
                      {messageUserIsAdmin && (
                        <div className="absolute -top-0.5 -right-0.5">
                          <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500 bg-background rounded-full p-0.5" title="Admin" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwnMessage && chatWith && (
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        {message.profiles?.display_name || 'Anonymous'}
                        {messageUserIsAdmin && (
                          <Crown className="h-2 w-2 text-yellow-500" title="Admin" />
                        )}
                      </p>
                    )}
                    
                    <div className="relative">
                      <div
                        className={`px-3 py-2 rounded-lg break-words text-sm sm:text-base whitespace-pre-wrap transition-all duration-200 hover:shadow-sm ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                        style={{ 
                          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                          unicodeBidi: 'normal'
                        }}
                      >
                        {renderMediaContent(message)}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {formatTime(message.created_at)}
                        </p>
                        
                        {/* Like button - all users can like */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => toggleMessageLike(message.id)}
                          title="Like message"
                        >
                          <Heart className={`h-3 w-3 transition-colors ${
                            message.like_count && message.like_count > 0 
                              ? 'fill-red-500 text-red-500' 
                              : 'text-muted-foreground'
                          }`} />
                        </Button>
                        
                        {/* Like count */}
                        {message.like_count && message.like_count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {message.like_count}
                          </span>
                        )}
                        
                        {/* Delete button - users can delete their own messages, admins can delete any */}
                        {(isOwnMessage || isAdmin) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={() => handleDeleteMessage(message.id)}
                            title={isOwnMessage ? "Delete your message" : "Delete message (Admin)"}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isOwnMessage && (
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                        <AvatarImage 
                          src={message.profiles?.avatar_url || ''} 
                          alt={message.profiles?.display_name || 'You'} 
                        />
                        <AvatarFallback className="text-xs sm:text-sm">
                          {getInitials(message.profiles?.display_name, message.user_id)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Admin crown overlay on own avatar */}
                      {messageUserIsAdmin && (
                        <div className="absolute -top-0.5 -right-0.5">
                          <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500 bg-background rounded-full p-0.5" title="Admin" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <Card className="rounded-none border-t">
        <CardContent className="p-2 sm:p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={
                  chatWith 
                    ? `Message ${chatWithName || 'user'}...` 
                    : "Type your message..."
                }
                className="pr-8 sm:pr-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm sm:text-base"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 sm:h-8 sm:w-8 hover:bg-muted/50 transition-colors"
                  >
                    <Smile className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Media Upload Buttons */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImageUpload}
              disabled={uploading}
              className="px-2 sm:px-3 hover:bg-muted/50 transition-colors h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0"
              title="Upload Image"
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Image className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleVideoUpload}
              disabled={uploading}
              className="px-2 sm:px-3 hover:bg-muted/50 transition-colors h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0"
              title="Upload Video"
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Video className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>

            {/* Hidden File Inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleVideoSelect}
              className="hidden"
            />

            <Button 
              type="submit" 
              disabled={!newMessage.trim() || uploading} 
              size="sm" 
              className="px-3 sm:px-4 hover:bg-primary/90 transition-colors h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0"
            >
              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Chat;