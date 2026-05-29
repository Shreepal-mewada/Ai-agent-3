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
                className="bg-foreground hover:bg-foreground/90 text-background rounded-full px-5 py-2 text-xs font-mono cursor-pointer transition-all"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
