import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Message, Profile } from '@/lib/supabase-types';
import { Send, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  partnerId: string;
  partner: Profile;
  lastMessage: Message;
}

export default function Messages() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle URL params for direct messaging
  useEffect(() => {
    const targetUser = searchParams.get('user');
    if (targetUser) {
      setSelectedConversation(targetUser);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchConversations();
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (selectedConversation && user) {
      fetchMessages(selectedConversation);
      fetchPartnerProfile(selectedConversation);
    }
  }, [selectedConversation, user]);

  useEffect(() => {
    // Real-time subscription for new messages
    if (!user) return;
    
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === selectedConversation) {
            setMessages(prev => [...prev, newMsg]);
          }
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    setLoading(true);
    
    // Get all unique conversation partners
    const { data: sentMessages, error: sentError } = await supabase
      .from('messages')
      .select('receiver_id')
      .eq('sender_id', user!.id);

    const { data: receivedMessages, error: receivedError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', user!.id);

    if (sentError || receivedError) {
      toast.error('Failed to load conversations');
      setLoading(false);
      return;
    }

    const partnerIds = new Set([
      ...(sentMessages?.map(m => m.receiver_id) || []),
      ...(receivedMessages?.map(m => m.sender_id) || []),
    ]);

    // Fetch profiles and last messages for each partner
    const conversationData: Conversation[] = [];
    
    for (const partnerId of partnerIds) {
      const { data: partnerData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', partnerId)
        .single();

      const { data: lastMessageData } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user!.id})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (partnerData && lastMessageData) {
        conversationData.push({
          partnerId,
          partner: partnerData as Profile,
          lastMessage: lastMessageData as Message,
        });
      }
    }

    // Sort by last message time
    conversationData.sort((a, b) => 
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );

    setConversations(conversationData);
    setLoading(false);
  };

  const fetchMessages = async (partnerId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user!.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to load messages');
      return;
    }
    setMessages(data as Message[]);
  };

  const fetchPartnerProfile = async (partnerId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single();

    if (!error && data) {
      setPartnerProfile(data as Profile);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedConversation,
          content: newMessage.trim(),
          listing_id: searchParams.get('listing') || null,
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data as Message]);
      setNewMessage('');
      fetchConversations();
      inputRef.current?.focus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-primary">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container py-6">
        <h1 className="font-display text-3xl font-bold mb-6">Messages</h1>
        
        <div className="grid md:grid-cols-[300px_1fr] gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="border rounded-lg overflow-hidden bg-card">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Conversations</h2>
            </div>
            <ScrollArea className="h-[calc(100%-60px)]">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p>No conversations yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.partnerId}
                    className={`w-full p-4 text-left hover:bg-accent transition-colors border-b ${
                      selectedConversation === conv.partnerId ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv.partnerId)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conv.partner.avatar_url || undefined} />
                        <AvatarFallback>
                          {conv.partner.username?.[0]?.toUpperCase() || 
                           conv.partner.organization_name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {conv.partner.username || conv.partner.organization_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage.content}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Chat Window */}
          <div className="border rounded-lg overflow-hidden bg-card flex flex-col">
            {selectedConversation && partnerProfile ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={partnerProfile.avatar_url || undefined} />
                    <AvatarFallback>
                      {partnerProfile.username?.[0]?.toUpperCase() || 
                       partnerProfile.organization_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {partnerProfile.username || partnerProfile.organization_name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {partnerProfile.role}
                    </p>
                  </div>
                </div>

                {/* Privacy Warning */}
                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border-b flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Do not share personal contact info. Coordinate pickups in public places.</span>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === user!.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            msg.sender_id === user!.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${
                            msg.sender_id === user!.id 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                  />
                  <Button type="submit" disabled={sending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
