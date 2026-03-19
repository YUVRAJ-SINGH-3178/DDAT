import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const LINKS = [
  { to: "/", label: "Portfolio" },
  { to: "/feed", label: "Consensus" },
  { to: "/create", label: "Execute" },
  { to: "/submit", label: "Evidence" },
];

export default function AppLayout({ children, wallet, setWallet }) {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // Auto-reconnect wallet on page load
  useEffect(() => {
    if (window.ethereum && !wallet) {
      window.ethereum.request({ method: "eth_accounts" }).then(accs => {
        if (accs.length > 0) setWallet(accs[0]);
      });
    }
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask to continue.");
    const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
    setWallet(accs[0]);
  };

  const disconnectWallet = () => {
    setWallet(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── NAV ──────────────────────────────────────────── */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl">
        <nav className={`nav-glass rounded-full px-3 py-2 flex items-center justify-between transition-all duration-500 ${scrolled ? "bg-[#050507]/80 shadow-2xl shadow-black/40" : ""}`}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 pl-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-[#b5e853] flex items-center justify-center">
              <span className="text-[#050507] text-xs font-black">D</span>
            </div>
            <span className="text-[15px] font-bold tracking-tight hidden sm:block">DDAT</span>
          </Link>

          {/* Center nav */}
          <div className="hidden md:flex items-center bg-[rgba(255,255,255,0.04)] rounded-full p-1">
            {LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300 ${pathname === link.to
                  ? "bg-[rgba(255,255,255,0.08)] text-white"
                  : "text-[#6b6b78] hover:text-[#a0a0ab]"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 pr-1">
            {wallet ? (
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(181,232,83,0.06)] border border-[rgba(181,232,83,0.12)]">
                  <div className="w-2 h-2 rounded-full bg-[#b5e853]" />
                  <span className="text-xs font-medium text-[#b5e853]">{wallet.slice(0, 5)}...{wallet.slice(-4)}</span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#6b6b78] hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.08)] transition-all"
                  title="Disconnect wallet"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button onClick={connectWallet} className="btn-lime btn-sm">
                Get Started
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* ─── MOBILE NAV ──────────────────────────────────── */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <div className="nav-glass rounded-full px-2 py-1.5 flex items-center gap-1">
          {LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3.5 py-2 rounded-full text-[11px] font-semibold transition-all ${pathname === link.to
                ? "bg-[rgba(255,255,255,0.08)] text-white"
                : "text-[#6b6b78]"
                }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ─── CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-5 pt-28 pb-24 md:pb-12">
        <div key={pathname} className="anim-in">
          {children}
        </div>
      </main>
    </div>
  );
}
