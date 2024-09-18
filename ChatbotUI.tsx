'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { MessageSquare, Star, Paperclip, Mic, StopCircle, Sun, Moon, Send, Trash, Volume2 } from 'lucide-react';
import { useTheme } from 'next-themes';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  rating?: number;
  attachment?: string;
  audio?: string;
};

type Conversation = {
  id: number;
  title: string;
  messages: Message[];
};

export default function ChatbotUI() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [speechRate, setSpeechRate] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to the latest message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [currentConversation?.messages]);

  const startNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now(),
      title: `Conversation ${conversations.length + 1}`,
      messages: [],
    };
    setConversations([...conversations, newConversation]);
    setCurrentConversation(newConversation);
  };

  const handleSend = async () => {
    if ((input.trim() || audioURL || fileInputRef.current?.files?.[0]) && currentConversation) {
      const newMessage: Message = {
        id: Date.now(),
        text: input,
        sender: 'user',
        audio: audioURL || undefined,
        attachment: fileInputRef.current?.files?.[0]
          ? URL.createObjectURL(fileInputRef.current.files[0])
          : undefined,
      };
      const updatedConversation = {
        ...currentConversation,
        messages: [...currentConversation.messages, newMessage],
      };
      setCurrentConversation(updatedConversation);
  
      setInput('');
      setAudioURL(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  
      setIsLoading(true);
      try {
        const response = await fetch('http://127.0.0.1:5000/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: input }),  // Send the user's message to the backend
        });
        const data = await response.json();
  
        const botResponse: Message = {
          id: Date.now() + 1,
          text: data.response,  // Use the response from the backend
          sender: 'bot',
          rating: 0,
        };
        setCurrentConversation((prev) => ({
          ...prev!,
          messages: [...prev!.messages, botResponse],
        }));
      } catch (error) {
        console.error('Error getting chatbot response:', error);
        const errorMessage: Message = {
          id: Date.now() + 1,
          text: "There was an error processing your request.",
          sender: 'bot',
          rating: 0,
        };
        setCurrentConversation((prev) => ({
          ...prev!,
          messages: [...prev!.messages, errorMessage],
        }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  // New handleRating function
  const handleRating = (messageId: number, rating: number) => {
    if (currentConversation) {
      const updatedMessages = currentConversation.messages.map((msg) =>
        msg.id === messageId ? { ...msg, rating } : msg
      );
      setCurrentConversation({ ...currentConversation, messages: updatedMessages });
    }
  };
  
  const handleDeleteConversation = (id: number) => {
    setConversations(conversations.filter((conv) => conv.id !== id));
    if (currentConversation?.id === id) {
      setCurrentConversation(null);
    }
  };

  const handleTextToSpeech = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    window.speechSynthesis.speak(utterance);
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setAudioURL(audioUrl);
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    }
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 ease-in-out overflow-hidden border-r border-border`}
      >
        <div className="p-4">
          <Button onClick={startNewConversation} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            New Conversation
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-5rem)]">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-2 cursor-pointer ${
                currentConversation?.id === conv.id ? 'bg-blue-100 dark:bg-blue-900' : ''
              } hover:bg-blue-50 dark:hover:bg-blue-800 flex justify-between items-center`}
              onClick={() => setCurrentConversation(conv)}
            >
              <div className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-sm font-medium">{conv.title}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteConversation(conv.id);
                }}
              >
                <Trash className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <Button variant="ghost" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <MessageSquare className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Chatbot UI</h1>
          <div className="flex items-center space-x-2">
            <Switch
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            />
            <Label htmlFor="theme-toggle" className="flex items-center space-x-2">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Label>
          </div>
        </div>
        <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
          {currentConversation?.messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
              <div className={`flex items-start ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className="w-8 h-8">
                  <AvatarFallback>{message.sender === 'user' ? 'U' : 'B'}</AvatarFallback>
                </Avatar>
                <div
                  className={`mx-2 ${
                    message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                  } rounded-lg p-3 max-w-[70%]`}
                >
                  <p>{message.text}</p>
                  {message.attachment && (
                    <div className="mt-2">
                      <a
                        href={message.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 hover:underline"
                      >
                        View Attachment
                      </a>
                    </div>
                  )}
                  {message.audio && (
                    <div className="mt-2">
                      <audio controls src={message.audio} className="w-full" />
                    </div>
                  )}
                  {message.sender === 'bot' && (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Button
                            key={star}
                            variant="ghost"
                            size="icon"
                            className={`w-6 h-6 ${message.rating && message.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                            onClick={() => handleRating(message.id, star)}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </Button>
                        ))}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleTextToSpeech(message.text)}>
                        <Volume2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-2 mb-2">
            <Input
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1"
            />
            <Button onClick={handleFileAttach} variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleRecordToggle}
              variant="outline"
              className={`${isRecording ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300' : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'}`}
            >
              {isRecording ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
              {isLoading ? 'Sending...' : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" onChange={() => {}} />
          {audioURL && (
            <div className="mt-2">
              <audio controls src={audioURL} className="w-full" />
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-64 border-l border-border">
        <div className="p-4 font-medium">Settings</div>
        <div className="p-4">
          <Label htmlFor="speech-rate">Speech Rate</Label>
          <Slider
            id="speech-rate"
            min={0.5}
            max={2}
            step={0.1}
            value={[speechRate]}
            onValueChange={(value) => setSpeechRate(value[0])}
            className="mt-2"
          />
          <span className="text-sm text-muted-foreground">{speechRate.toFixed(1)}x</span>
        </div>
        <Separator />
        <div className="p-4 font-medium">Response Ratings</div>
        <ScrollArea className="h-[calc(100vh-15rem)]">
          {currentConversation?.messages
            .filter((m) => m.sender === 'bot')
            .map((message) => (
              <div key={message.id} className="p-2 border-b border-border">
                <p className="text-sm mb-2 line-clamp-2">{message.text}</p>
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      variant="ghost"
                      size="icon"
                      className={`w-6 h-6 ${message.rating && message.rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                      onClick={() => handleRating(message.id, star)}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </Button>
                  ))}
                </div>
              </div>
            ))}
        </ScrollArea>
      </div>
    </div>
  );
}
