'use client';

import { useState, useRef, useEffect } from 'react';
import { useBeatzStore } from '@/store/beatz-store';
import { SpotifyTrack } from '@/types/spotify';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Play,
  Plus,
  Check,
  Bot,
  User,
  Music2,
  Zap,
  Brain,
  Moon,
  HelpCircle,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  tracks?: SpotifyTrack[];
  followUpOptions?: string[];
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { label: 'Boost Energy', query: 'Queue up 3 high-energy upbeat electronic tracks for a workout' },
  { label: 'Deep Focus', query: 'Recommend 3 chill instrumental lofi beats for coding concentration' },
  { label: 'Late Night Chill', query: 'Find 3 mellow ambient tracks for late night listening' },
  { label: 'Explain Song Lore', query: 'Tell me the background trivia, history, and meaning of the current track' },
];

interface BeatzChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BeatzChatDrawer({ isOpen, onClose }: BeatzChatDrawerProps) {
  const currentTrack = useBeatzStore((state) => state.currentTrack);
  const playTrack = useBeatzStore((state) => state.playTrack);
  const addToQueue = useBeatzStore((state) => state.addToQueue);
  const addMultipleToQueue = useBeatzStore((state) => state.addMultipleToQueue);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addedTrackIds, setAddedTrackIds] = useState<Record<string, boolean>>({});
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [lastArtist, setLastArtist] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "👋 Hey there! I'm your **Beatz AI Co-Pilot**, powered by Google Gemini. Ask me to change your musical vibe, queue up underground gems, or uncover trivia about what's currently playing!",
      followUpOptions: ['Recommend Nepali acoustic songs', 'Queue 3 upbeat tracks', 'Deep focus coding beats'],
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          currentTrack,
          lastArtist,
          lastQuery,
        }),
      });

      const data = await response.json();

      if (data.searchedArtist) {
        setLastArtist(data.searchedArtist);
      }
      setLastQuery(query);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.text || "Here are your music recommendations!",
        tracks: data.tracks || [],
        followUpOptions: data.followUpOptions || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Automatically bridge tool results directly to the live player and queue
      if (data.action === 'queue' && data.tracks && data.tracks.length > 0) {
        addMultipleToQueue(data.tracks);
        data.tracks.forEach((t: SpotifyTrack) => {
          setAddedTrackIds((prev) => ({ ...prev, [t.id]: true }));
        });
        setQueueNotice(`⚡ Added ${data.tracks.length} track${data.tracks.length > 1 ? 's' : ''} directly to your queue!`);
        setTimeout(() => setQueueNotice(null), 4000);
      } else if (data.action === 'play' && data.tracks && data.tracks.length > 0) {
        playTrack(data.tracks[0]);
        if (data.tracks.length > 1) {
          addMultipleToQueue(data.tracks.slice(1));
          setQueueNotice(`▶ Playing now + added ${data.tracks.length - 1} more track${data.tracks.length > 2 ? 's' : ''} to queue!`);
          setTimeout(() => setQueueNotice(null), 4000);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: "I had a quick hiccup reaching Gemini, but you can try selecting one of the quick vibe chips below!",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToQueue = (track: SpotifyTrack) => {
    addToQueue(track);
    setAddedTrackIds((prev) => ({ ...prev, [track.id]: true }));
    setTimeout(() => {
      setAddedTrackIds((prev) => ({ ...prev, [track.id]: false }));
    }, 2000);
  };

  const handleQueueAll = (tracks?: SpotifyTrack[]) => {
    if (!tracks || tracks.length === 0) return;
    addMultipleToQueue(tracks);
    tracks.forEach((track) => {
      setAddedTrackIds((prev) => ({ ...prev, [track.id]: true }));
    });
    setQueueNotice(`⚡ Added all ${tracks.length} tracks to queue!`);
    setTimeout(() => setQueueNotice(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <aside
          role="dialog"
          aria-label="Beatz AI Co-Pilot Chat"
          className="w-screen max-w-md bg-spotify-surface border-l border-spotify-border flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-spotify-border px-5 py-4 bg-spotify-surface/90 backdrop-blur sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-spotify-green to-emerald-400 flex items-center justify-center shadow-lg shadow-spotify-green/20">
                <Sparkles className="h-5 w-5 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white">Beatz AI Co-Pilot</h2>
                  <span className="text-[10px] uppercase tracking-wider bg-spotify-green/20 text-spotify-green px-1.5 py-0.5 rounded font-bold">
                    Gemini 1.5
                  </span>
                </div>
                <p className="text-[11px] text-spotify-subtext">Conversational Queue &amp; Lore Engine</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-zinc-400 hover:bg-spotify-elevated hover:text-white transition"
              title="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Real-time Queue Notification Banner */}
          {queueNotice && (
            <div className="bg-spotify-green text-black text-xs font-semibold px-4 py-2 flex items-center justify-between animate-fadeIn transition shadow-md">
              <span>{queueNotice}</span>
              <button
                onClick={() => setQueueNotice(null)}
                className="text-black/70 hover:text-black font-bold text-sm"
              >
                ×
              </button>
            </div>
          )}

          {/* Quick Prompt Chips */}
          <div className="px-4 py-2.5 bg-spotify-elevated/40 border-b border-spotify-border/60 overflow-x-auto overscroll-x-contain flex items-center gap-2 no-scrollbar">
            {QUICK_PROMPTS.map((chip, idx) => (
              <button
                key={idx}
                disabled={isLoading}
                onClick={() => handleSend(chip.query)}
                className="whitespace-nowrap rounded-full bg-spotify-elevated hover:bg-spotify-green/20 hover:text-spotify-green hover:border-spotify-green/40 border border-spotify-border px-3 py-1 text-[11px] font-medium text-zinc-300 transition-all disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="h-7 w-7 rounded-lg bg-spotify-green/20 text-spotify-green flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2.5`}>
                  <div
                    className={`rounded-2xl px-5 py-3.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-spotify-green text-black font-medium ml-auto shadow-md'
                        : 'bg-spotify-elevated text-zinc-200 border border-spotify-border'
                    }`}
                  >
                    {msg.sender === 'ai' ? (
                      <ReactMarkdown components={{ p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p> }}>
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>

                  {/* Render Track Recommendation Cards */}
                  {msg.tracks && msg.tracks.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 px-1">
                        <span className="flex items-center gap-1.5">
                          <Music2 className="h-3.5 w-3.5 text-spotify-green" />
                          Recommended Tracks ({msg.tracks.length})
                        </span>
                        <button
                          onClick={() => handleQueueAll(msg.tracks)}
                          className="text-spotify-green hover:underline text-[10px]"
                        >
                          Queue All
                        </button>
                      </div>

                      {msg.tracks.map((track) => {
                        const isAdded = !!addedTrackIds[track.id];
                        return (
                          <div
                            key={track.id}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-spotify-surface border border-spotify-border hover:border-spotify-green/30 transition group"
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                              {track.album?.images?.[0]?.url ? (
                                <img
                                  src={track.album.images[0].url}
                                  alt={track.name}
                                  className="h-10 w-10 rounded-lg object-cover shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                                  <Music2 className="h-5 w-5" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-white group-hover:text-spotify-green transition">
                                  {track.name}
                                </p>
                                <p className="truncate text-[11px] text-spotify-subtext">
                                  {track.artists?.map((a) => a.name).join(', ')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => playTrack(track)}
                                className="h-7 w-7 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition"
                                title="Play Track Now"
                              >
                                <Play className="h-3.5 w-3.5 ml-0.5 fill-current" />
                              </button>
                              <button
                                onClick={() => handleAddToQueue(track)}
                                className={`h-7 w-7 rounded-full flex items-center justify-center transition ${
                                  isAdded
                                    ? 'bg-spotify-green text-black'
                                    : 'bg-spotify-elevated hover:bg-spotify-green hover:text-black text-zinc-300'
                                }`}
                                title={isAdded ? 'Added to Queue' : 'Add to Queue'}
                              >
                                {isAdded ? (
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                ) : (
                                  <Plus className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Render Follow-up Option Chips */}
                  {msg.sender === 'ai' && msg.followUpOptions && msg.followUpOptions.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-1">
                        Suggested actions:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.followUpOptions.map((opt, idx) => (
                          <button
                            key={idx}
                            disabled={isLoading}
                            onClick={() => handleSend(opt)}
                            className="rounded-full bg-spotify-elevated hover:bg-spotify-green hover:text-black border border-spotify-border hover:border-spotify-green px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition shadow-sm text-left disabled:opacity-40"
                          >
                            💬 {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="h-7 w-7 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-zinc-400 text-xs px-2 py-1">
                <Loader2 className="h-4 w-4 animate-spin text-spotify-green" />
                <span className="animate-pulse">Beatz AI is curating your tracks...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-4 border-t border-spotify-border bg-spotify-surface/90 backdrop-blur">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex h-11 items-stretch overflow-hidden rounded-xl border border-spotify-border bg-spotify-elevated transition focus-within:border-spotify-green"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Beatz AI (e.g. 'Queue 3 upbeat synthwave songs')..."
                disabled={isLoading}
                maxLength={300}
                className="min-w-0 flex-1 bg-transparent text-xs text-white px-3.5 py-0 outline-none placeholder:text-zinc-400 transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-full w-12 shrink-0 items-center justify-center border-l border-spotify-surface bg-spotify-green text-black transition hover:bg-spotify-green-hover disabled:opacity-40"
                title="Send Prompt"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
