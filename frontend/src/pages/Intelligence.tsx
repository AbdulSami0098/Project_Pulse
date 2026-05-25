import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Sparkles, Send, AlertTriangle, User, Bot } from 'lucide-react';
import { useProjectContext } from '../contexts/ProjectContext';
import { API_URL } from '../lib/env';

const SUGGESTED = [
  'Who moved the last Jira ticket?',
  'What commits were made today?',
  "What's the latest activity on this project?",
  'Who has been most active this week?',
];

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

function timeStr(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Typing indicator — three bouncing dots
const TypingIndicator = () => (
  <div className="flex items-end gap-3">
    <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
      <Bot className="w-3.5 h-3.5 text-blue-400" />
    </div>
    <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);

const ApiKeyBanner = () => (
  <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-4 mb-4">
    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-yellow-300 text-sm font-medium">API key required</p>
      <p className="text-gray-400 text-xs mt-1">
        AI analysis requires an Anthropic API key. Add your key to{' '}
        <code className="text-gray-300">backend/.env</code> to enable this feature.
      </p>
      <pre className="mt-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-green-400 font-mono select-all">
        ANTHROPIC_API_KEY=your_key_here
      </pre>
    </div>
  </div>
);

const UserBubble = ({ msg }: { msg: Message }) => (
  <div className="flex justify-end">
    <div className="max-w-[75%]">
      <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
        {msg.text}
      </div>
      <p className="text-gray-600 text-xs mt-1 text-right">{timeStr(msg.timestamp)}</p>
    </div>
    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 ml-3 mt-0.5">
      <User className="w-3.5 h-3.5 text-gray-300" />
    </div>
  </div>
);

const AssistantBubble = ({ msg }: { msg: Message }) => (
  <div className="flex items-end gap-3">
    <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
      <Bot className="w-3.5 h-3.5 text-blue-400" />
    </div>
    <div className="max-w-[75%]">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
        {msg.text}
      </div>
      <p className="text-gray-600 text-xs mt-1">{timeStr(msg.timestamp)}</p>
    </div>
  </div>
);

export const Intelligence = () => {
  const { selectedProject } = useProjectContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages or loading changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const ask = async (question: string) => {
    if (!question.trim() || loading || !selectedProject) return;

    const userMsg: Message = {
      id: nextId.current++,
      role: 'user',
      text: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setApiKeyMissing(false);

    try {
      const res = await fetch(
        `${API_URL}/api/projects/${selectedProject.id}/query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': '1',
          },
          body: JSON.stringify({ question: question.trim() }),
        }
      );

      const data = await res.json() as { answer?: string | null; error?: string };

      if (data.error === 'api_key_missing') {
        setApiKeyMissing(true);
        // Remove the user message so the UI stays clean
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return;
      }

      const text =
        data.answer ??
        (data.error ? `Error: ${data.error}` : 'No response received.');

      const assistantMsg: Message = {
        id: nextId.current++,
        role: 'assistant',
        text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const assistantMsg: Message = {
        id: nextId.current++,
        role: 'assistant',
        text: 'Could not reach the backend. Make sure the server is running.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-white font-semibold text-xl leading-none">Project Intelligence</h2>
            <p className="text-gray-500 text-sm mt-1">Ask anything about your project</p>
          </div>
        </div>
      </div>

      {/* API key missing banner */}
      {apiKeyMissing && (
        <div className="px-6 flex-shrink-0">
          <ApiKeyBanner />
        </div>
      )}

      {/* Message history */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center pt-8">
            <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-blue-400" />
            </div>
            <p className="text-white font-medium text-lg">Ask about your project</p>
            <p className="text-gray-500 text-sm mt-1 max-w-xs">
              I have access to all GitHub, Jira, Slack and Teams events. Ask me anything.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white text-xs rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === 'user'
            ? <UserBubble key={msg.id} msg={msg} />
            : <AssistantBubble key={msg.id} msg={msg} />
        )}

        {loading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 px-6 pb-6 pt-2">
        {/* Suggested chips shown above input once conversation has started */}
        {!isEmpty && !loading && (
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white text-xs rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 focus-within:border-blue-500 rounded-xl px-4 py-2.5 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about commits, tickets, activity…"
            disabled={loading}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => ask(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-gray-700 text-xs mt-1.5 text-center">Enter to send</p>
      </div>
    </div>
  );
};
