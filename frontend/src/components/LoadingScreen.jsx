import { useEffect, useRef, useState } from "react";
import { Loader2, Terminal, Layers, CheckCircle2, ChevronRight, Play } from "lucide-react";

export default function LoadingScreen({ messages, streaming, loadingStatus }) {
  const terminalEndRef = useRef(null);

  // Find the latest AI assistant message that contains activity logs
  const lastAiMessage = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  
  const activityLogs = lastAiMessage?.activity || [];
  const aiProgressText = lastAiMessage?.content || "";

  // Auto-scroll the terminal logs as they arrive
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activityLogs]);

  // Dots animation for the loading text
  const [dots, setDots] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Determine which boot step we are currently on
  const isContainerBooted = true; // Container must be booted for this screen to poll
  const isViteServerStarting = loadingStatus !== "Ready!";

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/10 via-background to-stone-100/10 flex flex-col items-center justify-center p-6 text-foreground relative overflow-hidden">
      {/* Ambient background animations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--foreground) 0.5px, transparent 0.5px)",
            backgroundSize: "24px 24px",
            opacity: 0.05,
          }}
        />
      </div>

      <div className="w-full max-w-2xl relative z-10 flex flex-col gap-8">
        {/* Header Title */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center border border-border shadow-md animate-pulse">
            <Layers className="w-6 h-6 text-foreground/80" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Preparing Workspace
          </h2>
          <p className="text-sm font-mono text-muted-foreground">
            Setting up files and starting preview server{dots}
          </p>
        </div>

        {/* Loading Steps & AI Progress Box */}
        <div className="glass-panel border border-border rounded-2xl p-6 bg-card/85 shadow-lg flex flex-col gap-6">
          {/* Step checklist */}
          <div className="flex flex-col gap-3.5 border-b border-border/40 pb-5">
            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
              <span>Environment Boot Progress</span>
              <span className="text-foreground font-semibold">
                {isViteServerStarting ? "Spinning Up" : "Ready"}
              </span>
            </div>

            {/* Step 1: Sandbox Pod */}
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-mono text-foreground/90">
                1. Created sandbox environment container
              </span>
            </div>

            {/* Step 2: Dev Server */}
            <div className="flex items-center gap-3 text-sm">
              {isViteServerStarting ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <span
                className={`font-mono transition-colors ${
                  isViteServerStarting
                    ? "text-foreground/95 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                2. Booting Vite development server (port 5173)
              </span>
            </div>

            {/* Step 3: Shell Shell */}
            <div className="flex items-center gap-3 text-sm">
              {isViteServerStarting ? (
                <div className="w-4 h-4 rounded-full border border-dashed border-muted-foreground/50 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <span
                className={`font-mono ${
                  isViteServerStarting
                    ? "text-muted-foreground/60"
                    : "text-muted-foreground"
                }`}
              >
                3. Connecting shell terminal socket
              </span>
            </div>
          </div>

          {/* AI agent terminal section (renders only if there is activity/logs or agent is streaming) */}
          {(streaming || activityLogs.length > 0) && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>AI Builder Log</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Active</span>
                </div>
              </div>

              {/* Scrolling Console */}
              <div
                className="bg-black/90 text-zinc-300 font-mono text-xs p-4 rounded-xl h-56 overflow-y-auto border border-zinc-800 flex flex-col gap-2.5 shadow-inner"
                style={{ scrollBehavior: "smooth" }}
              >
                <div className="text-zinc-500 border-b border-zinc-800/80 pb-1.5 flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>Initializing agent request...</span>
                </div>

                {activityLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="shrink-0 text-zinc-500">
                      {log.type === "reading"
                        ? "📖"
                        : log.type === "updating"
                          ? "✏️"
                          : log.type === "success"
                            ? "✅"
                            : "✦"}
                    </span>
                    <span
                      className={
                        log.type === "success"
                          ? "text-emerald-400 font-semibold"
                          : log.type === "updating"
                            ? "text-sky-400"
                            : "text-zinc-300"
                      }
                    >
                      {log.text}
                    </span>
                  </div>
                ))}

                {streaming && (
                  <div className="flex items-center gap-2 text-zinc-500 animate-pulse">
                    <span>█</span>
                    <span>AI Agent is coding...</span>
                  </div>
                )}
                
                <div ref={terminalEndRef} />
              </div>

              {/* AI current action text */}
              {aiProgressText && (
                <div className="text-xs font-mono text-muted-foreground bg-foreground/5 rounded-lg p-3 border border-border/40">
                  <span className="text-foreground font-semibold">Latest: </span>
                  {aiProgressText}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-muted-foreground font-mono">
          Optimus Environment Manager v1.0.0
        </p>
      </div>
    </div>
  );
}
