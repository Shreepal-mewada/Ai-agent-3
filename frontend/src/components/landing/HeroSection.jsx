import { useEffect, useState, useRef } from "react";
import { Button } from "../ui/button";
import { ArrowRight, LogIn, Sparkles, Plus } from "lucide-react";
import { AnimatedSphere } from "./AnimatedSphere";

const words = ["create", "build", "scale", "ship"];

export function HeroSection({ user, onLogin, onStartCreating }) {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const [inputValue, setInputValue] = useState("");
  const [placeholderText, setPlaceholderText] = useState("");
  const inputRef = useRef(null);

  // Typing animation effect for the prompt input placeholder
  useEffect(() => {
    let isMounted = true;
    const prompts = [
      "Build a SaaS dashboard with real-time analytics",
      "Create an interactive kanban board with drag and drop",
      "Design a beautiful personal portfolio for a developer",
      "Build a recipe finder app using Gemini API",
      "Create a habit tracker with streak counting",
      "Build a real-time markdown editor with preview",
    ];

    let currentPromptIdx = 0;
    let currentCharIdx = 0;
    let isDeleting = false;
    let typingSpeed = 60; // typing speed in ms
    let timer;

    const handleTyping = () => {
      if (!isMounted) return;
      const fullText = prompts[currentPromptIdx];

      if (!isDeleting) {
        setPlaceholderText(fullText.substring(0, currentCharIdx + 1) + "|");
        currentCharIdx++;

        if (currentCharIdx === fullText.length) {
          isDeleting = true;
          typingSpeed = 2500; // pause duration when word is fully typed
        } else {
          typingSpeed = 60;
        }
      } else {
        setPlaceholderText(fullText.substring(0, currentCharIdx - 1) + "|");
        currentCharIdx--;

        if (currentCharIdx === 0) {
          isDeleting = false;
          currentPromptIdx = (currentPromptIdx + 1) % prompts.length;
          typingSpeed = 600; // delay before starting to type next word
        } else {
          typingSpeed = 25; // faster deletion
        }
      }

      timer = setTimeout(handleTyping, typingSpeed);
    };

    timer = setTimeout(handleTyping, typingSpeed);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const handlePromptSubmit = () => {
    const prompt = inputValue.trim();
    if (!prompt) return;

    // Save prompt to localStorage to consume after login
    localStorage.setItem("pending_prompt", prompt);

    // Redirect to login (Google OAuth)
    if (onLogin) {
      onLogin();
    } else {
      window.location.href = "/api/auth/google";
    }
  };

  const suggestions = [
    {
      label: "SaaS Dashboard",
      prompt: "Build a SaaS dashboard with real-time analytics",
    },
    {
      label: "Kanban Board",
      prompt: "Create a kanban board with drag and drop card columns",
    },
    {
      label: "Developer Portfolio",
      prompt: "Design a personal developer portfolio with light/dark theme",
    },
    {
      label: "Recipe Finder",
      prompt: "Build a recipe finder app using Gemini API",
    },
  ];

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Animated sphere background */}
      <div className="absolute right-20 top-1/2 -translate-y-1/2 w-[600px] h-[600px] lg:w-[700px] lg:h-[700px] opacity-40 pointer-events-none">
        <AnimatedSphere />
      </div>

      {/* Subtle grid lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-foreground/10"
            style={{
              top: `${12.5 * (i + 1)}%`,
              left: 0,
              right: 0,
            }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-foreground/10"
            style={{
              left: `${8.33 * (i + 1)}%`,
              top: 0,
              bottom: 0,
            }}
          />
        ))}
      </div>
      <div className="relative z-10 max-w-[1400px] mx-auto px-2 lg:px-12 py-2 lg:py-1 flex flex-col items-start gap-6 lg:gap-2 w-full">
        {/* Eyebrow */}
        <div
          className={`mb-8 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground">
            <span className="w-8 h-px bg-foreground/30" />
            The AI-powered coding sandbox
          </span>
        </div>

        {/* Main headline */}
        <div className="mb-12">
          <h1
            className={`text-[clamp(2.5rem,9vw,8rem)] font-display leading-[0.9] tracking-tight transition-all duration-1000 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <span className="block">The platform</span>
            <span className="block">
              to{" "}
              <span className="relative inline-block">
                <span key={wordIndex} className="inline-flex">
                  {words[wordIndex].split("").map((char, i) => (
                    <span
                      key={`${wordIndex}-${i}`}
                      className="inline-block animate-char-in"
                      style={{
                        animationDelay: `${i * 50}ms`,
                      }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-foreground/10" />
              </span>
            </span>
          </h1>
        </div>

        {/* Lovable-style Premium Interactive Prompt Input */}
        <div
          className={`w-full max-w-2xl transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="relative flex items-center border-2 border-foreground bg-card p-1.5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-300">
            <Sparkles className="w-5 h-5 text-muted-foreground ml-3 shrink-0" />
            <input
              type="text"
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePromptSubmit()}
              placeholder={placeholderText}
              className="flex-1 bg-transparent px-3 py-3.5 text-base lg:text-lg font-mono outline-none border-none text-foreground placeholder-muted-foreground/60 min-w-0"
            />
            <button
              onClick={handlePromptSubmit}
              className="mr-1 bg-foreground text-background hover:bg-foreground/90 w-11 h-11 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
              title="Build sandbox"
            >
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Quick suggestions tags */}
          <div className="mt-4 flex flex-wrap gap-2 animate-fadeIn">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputValue(s.prompt);
                  inputRef.current?.focus();
                }}
                className="text-xs font-mono px-3.5 py-2 border border-foreground/10 bg-card hover:bg-foreground/5 hover:border-foreground/30 text-muted-foreground hover:text-foreground transition-all rounded-full cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-muted-foreground/60" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats marquee - full width outside container */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-all duration-700 delay-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex gap-16 marquee whitespace-nowrap">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-16">
              {[
                {
                  value: "Zero Config",
                  label: "isolated environment",
                  company: "RUNTIME",
                },
                {
                  value: "Instant",
                  label: "sandbox creation",
                  company: "KUBERNETES",
                },
                {
                  value: "AI Co-pilot",
                  label: "powered by Gemini",
                  company: "ORCHESTRATOR",
                },
                {
                  value: "Live Stream",
                  label: "real-time logs",
                  company: "WEB SOCKETS",
                },
              ].map((stat, idx) => (
                <div
                  key={`${stat.company}-${i}-${idx}`}
                  className="flex items-baseline gap-4"
                >
                  <span className="text-4xl lg:text-5xl font-display">
                    {stat.value}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {stat.label}
                    <span className="block font-mono text-xs mt-1">
                      {stat.company}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
