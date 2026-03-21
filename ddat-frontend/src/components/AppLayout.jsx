import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const REQUIRED_CHAIN_ID = "0xaa36a7"; // Sepolia
const WALLET_DISCONNECTED_KEY = "walletDisconnected";
const WALLET_AUTO_CONNECT_BLOCKED_KEY = "walletAutoConnectBlocked";

const LINKS = [
  { to: "/", label: "Portfolio" },
  { to: "/feed", label: "Consensus" },
  { to: "/create", label: "Execute" },
  { to: "/submit", label: "Evidence" },
];

export default function AppLayout({ children, wallet, setWallet }) {
  const { pathname } = useLocation();
  const [notice, setNotice] = useState(null);

  const showNotice = (message, type = "error") => {
    setNotice({ message, type });
  };

  // Auto-reconnect wallet on page load
  useEffect(() => {
    if (!window.ethereum) return;

    const syncWalletState = async () => {
      if (
        localStorage.getItem(WALLET_DISCONNECTED_KEY) ||
        localStorage.getItem(WALLET_AUTO_CONNECT_BLOCKED_KEY)
      ) {
        return;
      }

      try {
        const [accs, chainId] = await Promise.all([
          window.ethereum.request({ method: "eth_accounts" }),
          window.ethereum.request({ method: "eth_chainId" }),
        ]);

        if (chainId !== REQUIRED_CHAIN_ID) {
          setWallet(null);
          return;
        }

        if (accs.length > 0) {
          setWallet(accs[0]);
        }
      } catch (err) {
        console.error("Wallet sync failed:", err);
      }
    };

    const handleAccountsChanged = (accounts) => {
      if (
        localStorage.getItem(WALLET_DISCONNECTED_KEY) ||
        localStorage.getItem(WALLET_AUTO_CONNECT_BLOCKED_KEY)
      ) {
        setWallet(null);
        return;
      }

      if (!accounts || accounts.length === 0) {
        setWallet(null);
        return;
      }
      localStorage.removeItem(WALLET_DISCONNECTED_KEY);
      setWallet(accounts[0]);
    };

    const handleChainChanged = (chainId) => {
      if (chainId !== REQUIRED_CHAIN_ID) {
        setNotice({ message: "Please switch MetaMask to Sepolia.", type: "error" });
        setWallet(null);
        return;
      }
      syncWalletState();
    };

    syncWalletState();
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [setWallet]);

  useEffect(() => {
    const handleAppNotice = (event) => {
      const message = event?.detail?.message;
      const type = event?.detail?.type || "error";
      if (!message) return;
      setNotice({ message, type });
    };

    window.addEventListener("app:notice", handleAppNotice);
    return () => {
      window.removeEventListener("app:notice", handleAppNotice);
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      showNotice("Install MetaMask to continue.");
      return;
    }

    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== REQUIRED_CHAIN_ID) {
        showNotice("Please switch MetaMask to Sepolia before connecting.");
        return;
      }

      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      localStorage.removeItem(WALLET_DISCONNECTED_KEY);
      localStorage.removeItem(WALLET_AUTO_CONNECT_BLOCKED_KEY);
      setWallet(accs[0]);
      setNotice(null);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      showNotice("Wallet connection failed. Please try again.");
    }
  };

  const disconnectWallet = () => {
    localStorage.setItem(WALLET_DISCONNECTED_KEY, "true");
    setWallet(null);
  };

  return (
    <div className="min-h-screen flex flex-col pt-20">
      {/* ─── NEO-BRUTALIST NAV ──────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 w-full h-20 z-50 bg-[var(--color-yellow)] border-b-2 border-black flex items-center justify-between px-3 sm:px-6">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-black flex items-center justify-center">
            {/* Using a lightning bolt icon as requested */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-yellow)" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="var(--color-yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-heading text-xl font-extrabold tracking-tight text-black hidden sm:block">DDAT</span>
        </Link>

        {/* Center: Links */}
        <div className="hidden md:flex items-center gap-8">
          {LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-[15px] font-bold transition-all border-b-2 ${
                pathname === link.to
                  ? "text-black border-black"
                  : "text-black/60 border-transparent hover:text-black"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Wallet CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {wallet ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md font-bold text-sm text-black">
                <div className="w-2.5 h-2.5 bg-[#28c840] border-2 border-black rounded-full" />
                <span>{wallet.slice(0, 5)}...{wallet.slice(-4)}</span>
              </div>
              <div className="sm:hidden flex items-center gap-2 px-2 py-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-md font-bold text-[11px] text-black">
                <div className="w-2 h-2 bg-[#28c840] border border-black rounded-full" />
                <span>{wallet.slice(0, 4)}...{wallet.slice(-2)}</span>
              </div>
              <Link
                to="/settings"
                className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center rounded-md hover:bg-[var(--color-sage)] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-push font-black text-lg text-black"
                title="Settings"
              >
                ⚙
              </Link>
              <button
                onClick={disconnectWallet}
                className="w-10 h-10 border-2 border-black bg-[--color-white] flex items-center justify-center rounded-md hover:bg-[#ff5f57] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-push"
                title="Disconnect wallet"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <button onClick={connectWallet} className="neo-btn translate-push">
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {notice && (
        <div className="fixed top-20 left-0 w-full z-40 px-4 py-3">
          <div
            className={`mx-auto max-w-3xl border-2 border-black rounded-lg px-4 py-3 shadow-hard flex items-center justify-between ${
              notice.type === "success" ? "bg-[var(--color-sage)] text-black" : "bg-[#ff5f57] text-white"
            }`}
          >
            <p className="font-bold uppercase text-sm tracking-wide">{notice.message}</p>
            <button
              onClick={() => setNotice(null)}
              className="ml-4 w-8 h-8 border-2 border-black rounded-md bg-white text-black font-black"
            >
              X
            </button>
          </div>
        </div>
      )}

      {/* ─── MOBILE NAV (Neo-Brutalist Bottom Bar) ───────────────────── */}
      <nav className="fixed bottom-0 left-0 w-full h-16 bg-[var(--color-yellow)] border-t-2 border-black z-50 md:hidden flex items-center justify-around px-2" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {LINKS.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-2 border-2 ${
              pathname === link.to
                ? "bg-black text-[var(--color-yellow)] border-black rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                : "text-black border-transparent"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* ─── CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 w-full mx-auto pb-28 md:pb-12 bg-[var(--color-charcoal)]">
        <div key={pathname} className="anim-in">
          {children}
        </div>
      </main>
    </div>
  );
}
