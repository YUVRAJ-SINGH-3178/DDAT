import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export default function AppLayout({ children, wallet, setWallet }) {
  const location = useLocation();
  const [isDark, setIsDark] = useState(true); // Default to dark mode for luxury aesthetic

  // Sync dark mode class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("MetaMask not detected.");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWallet(accounts[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const navLinks = [
    { to: "/", label: "Portfolio" },
    { to: "/feed", label: "Consensus" },
    { to: "/create", label: "Execute" },
    { to: "/submit", label: "Evidence" },
  ];

  return (
    <div className="min-h-screen relative flex justify-center pb-24 md:pb-0 md:pt-24 selection:bg-indigo-500/30">
      
      {/* FLOATING PILL NAVBAR */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 md:bottom-auto md:top-6 z-50 w-auto px-2 py-2 glass-pill rounded-full flex items-center justify-between gap-4 md:gap-8 min-w-[320px] md:min-w-[600px] shadow-2xl transition-all">
        
        {/* LOGO */}
        <Link to="/" className="font-display font-bold text-xl tracking-tighter pl-4 hidden md:block">
          DDAT
        </Link>
        <Link to="/" className="font-display font-bold text-xl tracking-tighter pl-4 md:hidden">
          D
        </Link>

        {/* LINKS */}
        <div className="flex items-center gap-1 md:gap-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-full font-sans text-sm font-medium transition-all ${
                  isActive 
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-md"
                  : "text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* WALLET / THEME CONTROLS */}
        <div className="flex items-center gap-2 pr-2">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="size-10 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors"
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          
          {wallet ? (
            <div className="h-10 px-4 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-mono text-sm flex items-center justify-center">
              {wallet.slice(0, 4)}...{wallet.slice(-4)}
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="h-10 px-5 rounded-full btn-primary font-sans text-sm shadow-lg whitespace-nowrap"
            >
              Connect
            </button>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT LAYER */}
      <main className="w-full max-w-5xl px-4 md:px-8 pt-8 md:pt-12 min-h-[calc(100vh-8rem)]">
        {children}
      </main>

    </div>
  );
}
