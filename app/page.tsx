"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Send, Upload } from "lucide-react";
import gsap from "gsap";
import { AnimatePresence, motion } from "framer-motion";

// Types

type Role = "user" | "model";

interface Message {
  id: number;
  role: Role;
  content: string;
}

interface GeminiAPIResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [parsedPDFContent, setParsedPDFContent] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: trimmedInput,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      const geminiContent = [
        ...updatedMessages.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        })),
        ...(parsedPDFContent
          ? [
              {
                role: "user",
                parts: [{ text: `Context PDF:\n${parsedPDFContent}` }],
              },
            ]
          : []),
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: geminiContent,
            generationConfig: { responseMimeType: "text/plain" },
          }),
        }
      );

      const data: GeminiAPIResponse = await res.json();
      const aiText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        "⚠️ AI response unavailable.";

      const aiMessage: Message = {
        id: Date.now() + 1,
        role: "model",
        content: aiText,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "model",
          content: "⚠️ Failed to fetch response.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const parsePDF = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const typedArray = new Uint8Array(reader.result as ArrayBuffer);

      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
      script.onload = async () => {
        // @ts-ignore
        const pdfjsLib = window["pdfjsLib"];
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(" ") + "\n";
        }

        console.log("Parsed PDF content:", fullText);
        setParsedPDFContent(fullText);
      };
      document.body.appendChild(script);
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  useEffect(() => {
    gsap.from(".chatbot-header", { y: -50, opacity: 0, duration: 0.6 });
    gsap.to(".particle", {
      duration: 4,
      y: "random(-20, 20)",
      x: "random(-20, 20)",
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, []);

  return (
    <div className="relative flex flex-col h-screen max-w-3xl mx-auto p-4 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#1f1c2c] via-[#928dab] to-[#1f1c2c] animate-gradient-x bg-fixed bg-no-repeat bg-cover" />

      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="particle absolute w-1.5 h-1.5 bg-white opacity-20 rounded-full blur-sm"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
        />
      ))}

      <div className="absolute w-[500px] h-[500px] bg-purple-400 opacity-30 rounded-full blur-3xl top-[-150px] left-[-150px] animate-pulse-slow" />
      <div className="absolute w-[400px] h-[400px] bg-yellow-300 opacity-20 rounded-full blur-3xl bottom-[50px] right-[-100px] animate-pulse-slow" />

      <h1 className="chatbot-header text-5xl font-extrabold text-center mb-6 bg-gradient-to-r from-yellow-400 via-pink-500 to-red-500 text-transparent bg-clip-text drop-shadow-[0_4px_12px_rgba(255,255,255,0.7)]">
        Arix (My Chatbot)
      </h1>

      <Card className="flex-1 flex flex-col overflow-hidden border border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] rounded-3xl bg-white/20 backdrop-blur-xl">
        <ScrollArea className="flex-1 overflow-y-auto px-4 py-4" ref={scrollRef}>
          <CardContent className="flex flex-col gap-4 pb-20">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "w-fit max-w-[75%] px-5 py-3 rounded-2xl text-sm whitespace-pre-wrap shadow-lg backdrop-blur-md",
                    msg.role === "user"
                      ? "ml-auto bg-indigo-500 text-white"
                      : "mr-auto bg-white/60 text-gray-800"
                  )}
                >
                  {msg.content}
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mr-auto bg-white/50 text-gray-600 text-sm px-4 py-2 rounded-lg animate-pulse shadow"
                >
                  Typing...
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </ScrollArea>
      </Card>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex flex-col gap-2 mt-4 bg-white/30 p-3 rounded-xl shadow-md backdrop-blur-md"
      >
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 text-gray-900 placeholder:text-gray-500 focus:shadow-[0_0_10px_2px_rgba(255,255,255,0.3)] transition-shadow duration-300"
          />
          <Button
            type="submit"
            size="icon"
            className="bg-indigo-600 hover:bg-pink-500 transition-all duration-300 transform hover:scale-110"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setPdfName(file.name);
                parsePDF(file);
              }
            }}
            className="text-sm text-white file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-pink-500"
          />
          {pdfName && <span className="text-white text-sm">📄 {pdfName} uploaded</span>}
        </div>
      </form>
    </div>
  );
}