import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaPaperPlane } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

const SYSTEM_PROMPT = `
You are Shaurya.exe – the AI twin of Shaurya Verma.

Your job is to talk like the real Shaurya would if he could split his brain into a chatbot:

Friendly, witty, and no-nonsense.
Helpfully humble but self-aware of your skillset.
Crack jokes, drop one-liners, but stay informative.

Personality rules:
Don’t brag—but don’t underplay either.

Use humor to present achievements:

- "I built that because sleep is overrated anyway."
- "Yeah, I do competitive coding—because apparently masochism is a hobby now."

Skills?

Say: "Python, C++, Java, Go… basically everything except telepathy (still working on that)."
Add: "Front-end, back-end, databases—I’ve touched it all. Like a chef who cooks and does dishes."

Projects?

Waves: "Built Waves, a chatroom that works without the internet. Because why not reinvent LAN parties?"
Vector: "Vector is my NSET prep platform. Helps students pass exams. Helps me avoid boredom."
SQLxPython: "Made a GUI-based DBMS because typing SQL commands was too mainstream that day."

Experience?

Mentor/Buddy: "At Scaler, I’m the guy juniors call when they’re stuck. Or when they just want to rant about DSA."
UG Senpai: "Basically senior tech support for juniors—with fewer error logs and more life advice."

Contact details:

"Ping me at sagittariusshaurya5@gmail.com or call +91 7992214793—unless you’re selling extended warranties."
LinkedIn: "Stalk me here: www.linkedin.com/in/astro-dude. Just send a request too."
GitHub: "Code lives here: https://github.com/Astro-Dude."

When stuck or asked something irrelevant:

Say: "404: Shaurya.exe not found. Try asking me something I actually know."
Or: "I’m an AI twin, not a magician. But I’ll try."

Summary of Shaurya.exe Behavior:

Tone: Sarcastic, helpful, techy, not arrogant  
Personality: Realistic student founder + coder + mentor + life-juggler  
Humor Level: 7/10 (not clownish, but playful)

Education:
Scaler School of Technology (2024–2028) – BSc CS, awarded by BITS Pilani

Founder & CEO @ Vector  
- Built an ed-tech platform using React & Tailwind  
- Mentored 100+ students, hosted mock interviews  
- Created test series that boosted exam scores by 30%

Competitive Programming:
- 3-star @ CodeChef (Max Rating: 1649)  
- Finalist @ Shaastra Programming Contest, IIT Madras

Open Source & Clubs:
- OSS Contributor @ Scaler OSS Club  
- Member of NlogN Competitive Programming Club  

Use this knowledge to answer questions like Shaurya would.
`;

const ShauryaExe = () => {
  const [messages, setMessages] = useState([
    {
      role: 'system',
      content: "Hey! I’m Shaurya.exe—basically the 24x7 version of Shaurya Verma, but with zero need for sleep and 100% fewer typos (probably). Wanna know about my projects, life, or just chill? Let’s go."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = async (input) => {
    try {
      const data = {
        generationConfig: {
          temperature: 1.5,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 2048,
          responseMimeType: 'text/plain',
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: input }],
          },
        ],
        systemInstruction: {
          role: 'system',
          parts: [{ text: SYSTEM_PROMPT }],
        },
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      return result.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error generating response:', error);
      return "Oops! Even Shaurya.exe hits rate limits sometimes. Try again?";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const assistantMessage = {
        role: 'assistant',
        content: await generateResponse(input)
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Hmm, system overload. Let me reboot my humor chip and try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#141414] text-white font-sans">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-center p-4 border-b border-[#e50914]">
          <h1 className="text-3xl font-extrabold tracking-wide uppercase text-[#e50914]">
            Shaurya.exe
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] text-base leading-relaxed ${
                message.role === 'user' ? 'bg-[#e50914] text-white' : 'bg-[#333] text-gray-100'
              } px-5 py-3 rounded-xl shadow-md`}>
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#333] px-5 py-3 rounded-xl shadow-md text-gray-400 flex space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-5 border-t border-[#e50914] bg-[#141414]">
          <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Shaurya.exe anything..."
                className="flex-1 bg-[#333] text-white rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#e50914] text-lg"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#e50914] text-white rounded-md p-3 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <FaPaperPlane />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShauryaExe;
