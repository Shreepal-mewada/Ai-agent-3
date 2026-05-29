import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";

export function Navigation({ user, onLogin, onLogout }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed z-50 transition-all duration-500 ${
        isScrolled ? "top-4 left-4 right-4" : "top-0 left-0 right-0"
      }`}
    >
      <nav
        className={`mx-auto transition-all duration-500 ${
          isScrolled
            ? "bg-background/80 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-lg max-w-[1200px]"
            : "bg-transparent max-w-[1400px]"
        }`}
      >
        <div
          className={`flex items-center justify-between transition-all duration-500 px-6 lg:px-8 ${
            isScrolled ? "h-14" : "h-20"
          }`}
        >
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 group">
            <span
              className={`font-display tracking-tight transition-all duration-500 ${isScrolled ? "text-xl" : "text-2xl"}`}
            >
              Optimus
            </span>
            <span
              className={`text-muted-foreground font-mono transition-all duration-500 ${isScrolled ? "text-[10px] mt-0.5" : "text-xs mt-1"}`}
            >
              TM
            </span>
          </a>

          {/* Desktop CTA */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3.5">
                <div className="flex items-center gap-2">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-7 h-7 rounded-full border border-foreground/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-semibold font-mono">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-mono font-medium text-foreground/70">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="text-foreground/70 hover:text-destructive flex items-center gap-1 text-xs cursor-pointer transition-colors font-mono"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="group relative overflow-hidden flex items-center gap-2.5 bg-background border border-foreground/20 hover:border-foreground/50 text-foreground rounded-full px-5 py-2.5 text-xs font-mono cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,0,0,0.08)] active:scale-95 active:shadow-none"
              >
                {/* Shimmer sweep on hover */}
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-foreground/5 to-transparent pointer-events-none" />

                {/* Google G icon */}
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>

                <span className="relative font-semibold tracking-wide">Sign in with Google</span>

                {/* Tiny animated dot */}
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground/40 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-foreground/60" />
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
