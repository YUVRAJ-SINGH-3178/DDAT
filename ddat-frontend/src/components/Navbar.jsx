import { Link, useLocation } from "react-router-dom";

export default function Navbar({ wallet, setWallet }) {
  const location = useLocation();

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this app.");
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setWallet(accounts[0]);
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  const navLinks = [
    { to: "/", label: "Dashboard" },
    { to: "/create", label: "Create" },
    { to: "/submit", label: "Submit Proof" },
    { to: "/feed", label: "Proof Feed" },
  ];

  const shortAddr = wallet
    ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
    : null;

  return (
    <nav className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
            D
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            DDATracker
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === link.to
                  ? "bg-indigo-500/20 text-indigo-300 shadow-inner"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Wallet button */}
        {wallet ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-emerald-300 font-mono">
              {shortAddr}
            </span>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-sm font-semibold hover:from-indigo-400 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 cursor-pointer active:scale-95"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}
