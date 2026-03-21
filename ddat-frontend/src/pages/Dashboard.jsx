import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { API_BASE } from "../config";
import { createPortal } from "react-dom";

const STATUS = {
  created:        { label: "Created",   cls: "tag-pending" },
  proving:        { label: "Voting",    cls: "tag-active" },
  settled_success:{ label: "Settled",   cls: "tag-settled" },
  settled_failed: { label: "Forfeited", cls: "tag-failed" },
  pending:        { label: "Pending",   cls: "tag-pending" },
  active:         { label: "Voting",    cls: "tag-active" },
  completed:      { label: "Settled",   cls: "tag-settled" },
  failed:         { label: "Forfeited", cls: "tag-failed" },
};

export default function Dashboard({ wallet, setWallet }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [heroMessage, setHeroMessage] = useState(null);

  const handleConnect = async () => {
    if (!window.ethereum) {
      setHeroMessage("Install MetaMask to continue.");
      return;
    }

    try {
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      localStorage.removeItem("walletDisconnected");
      setWallet?.(accs[0]);
      setHeroMessage(null);
    } catch (err) {
      console.error(err);
      setHeroMessage("Wallet connection failed. Please try again.");
    }
  };

  useEffect(() => {
    if (!wallet) return;

    let isMounted = true;

    const loadDashboard = async () => {
      setLoading(true);

      try {
        const response = await fetch(`${API_BASE}/commitments/${wallet}`);
        const payload = await response.json();
        if (isMounted && payload.success) {
          setData(payload.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }

      // Fetch real wallet balance
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        provider
          .getBalance(wallet)
          .then((bal) => {
            if (isMounted) {
              setBalance(ethers.formatEther(bal));
            }
          })
          .catch(console.error);
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [wallet]);

  // ─── Hero (not connected) ──────────────────────────────
  if (!wallet) {
    return (
      <div className="w-full flex-1 -mt-20">
        {/* High-energy yellow hero */}
        <div className="w-full min-h-[90vh] bg-yellow-dots border-b-4 border-black pt-32 pb-20 px-6 flex items-center">
          <div className="max-w-6xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
            
            {/* Left Column */}
            <div className="space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2 bg-white px-4 py-2 border-2 border-black rounded-full shadow-hard text-sm font-bold text-black uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#ff5f57] animate-pulse"></span>
                NEW: Decentralized Accountability
              </div>
              
              <h1 className="text-6xl sm:text-7xl lg:text-[5.5rem] font-black leading-[1.05] tracking-tighter text-black uppercase">
                Stake Your<br />
                <span className="text-white relative inline-block border-text px-2" style={{ WebkitTextStroke: "2px black" }}>Honesty</span>
              </h1>
              
              <p className="text-xl font-medium text-black/80 max-w-md leading-relaxed">
                Lock real ETH against personal goals. Complete them to get it back. Fail, and it's gone forever.
              </p>
              
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button 
                  onClick={handleConnect}
                  className="neo-btn text-lg py-4 px-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] translate-push-lg"
                >
                  Connect Wallet ↗
                </button>
                <div 
                  onClick={() => setShowLearnMore(true)}
                  className="neo-btn neo-btn-white text-lg py-4 px-8 translate-push cursor-pointer"
                >
                  Learn More
                </div>
              </div>

              {heroMessage && (
                <div className="mt-3 bg-[#ff5f57] border-2 border-black rounded-lg px-4 py-3 shadow-hard flex items-center justify-between max-w-md">
                  <p className="text-white font-bold uppercase text-xs tracking-wide">{heroMessage}</p>
                  <button
                    onClick={() => setHeroMessage(null)}
                    className="ml-3 w-7 h-7 border-2 border-black rounded-md bg-white text-black font-black text-xs"
                  >
                    X
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Browser Mockup */}
            <div className="bg-white border-2 border-black rounded-2xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden hidden md:block rotate-2 hover:rotate-0 transition-transform duration-300">
              <div className="bg-black px-4 py-3 flex items-center gap-2 border-b-2 border-black">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57] border-2 border-black"></div>
                <div className="w-3 h-3 rounded-full bg-[#febc2e] border-2 border-black"></div>
                <div className="w-3 h-3 rounded-full bg-[#28c840] border-2 border-black"></div>
              </div>
              <div className="p-6 bg-[#f4f4f5]">
                <div className="bg-[var(--color-sage)] h-32 border-2 border-black rounded-lg shadow-hard mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--color-charcoal)] h-24 border-2 border-black rounded-lg shadow-hard"></div>
                  <div className="bg-[var(--color-yellow)] h-24 border-2 border-black rounded-lg shadow-hard"></div>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Social Proof Marquee */}
        <div className="w-full bg-[var(--color-charcoal)] border-b-2 border-black overflow-hidden py-6">
          <div className="flex items-center whitespace-nowrap opacity-60">
            <h2 className="text-[var(--color-sage)] font-heading text-4xl uppercase font-black mx-8 tracking-wider">TRUSTED BY ZERO INSTITUTIONS</h2>
            <h2 className="text-[var(--color-sage)] font-heading text-4xl uppercase font-black mx-8 tracking-wider">VERIFIED BY THE CHAIN</h2>
            <h2 className="text-[var(--color-sage)] font-heading text-4xl uppercase font-black mx-8 tracking-wider">NO MERCY</h2>
          </div>
        </div>

        {/* Learn More Modal */}
        {showLearnMore && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm anim-in m-0 top-0 left-0 w-full h-screen">
            <div className="neo-card-lg p-8 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setShowLearnMore(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white border-2 border-black rounded-full flex items-center justify-center font-black text-xl hover:bg-[#ff5f57] hover:text-white transition-colors shadow-hard"
              >
                ✕
              </button>
              
              <h2 className="text-3xl sm:text-4xl font-black uppercase mb-6 tracking-tight pr-12">How DDAT Works</h2>
              
              <div className="space-y-6 text-lg font-medium">
                <div className="bg-[#f4f4f5] border-2 border-black p-4 rounded-xl shadow-[2px_2px_0_0_#000]">
                  <h3 className="font-black uppercase text-xl mb-2 text-black">1. Stake & Commit</h3>
                  <p className="text-black/70">Lock your ETH into our smart contract along with a personal goal and a deadline. If you succeed, you get it all back.</p>
                </div>
                
                <div className="bg-[#f4f4f5] border-2 border-black p-4 rounded-xl shadow-[2px_2px_0_0_#000]">
                  <h3 className="font-black uppercase text-xl mb-2 text-black">2. Submit Evidence</h3>
                  <p className="text-black/70">Upload a photo and a brief log describing your progress. This evidence is logged and tied to your on-chain commitment permanently.</p>
                </div>
                
                <div className="bg-[#f4f4f5] border-2 border-black p-4 rounded-xl shadow-[2px_2px_0_0_#000]">
                  <h3 className="font-black uppercase text-xl mb-2 text-black">3. Community Consensus</h3>
                  <p className="text-black/70">The community reviews your evidence in the Consensus Feed. If the vote passes (≥60% Accept), your stake is refunded. If it fails, your ETH is forfeited forever.</p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowLearnMore(false)}
                className="neo-btn neo-btn-yellow w-full justify-center mt-8 py-4 text-lg translate-push"
              >
                GOT IT
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  const total = data.reduce((a, c) => a + Number(c.stakeAmount || 0), 0);
  const active = data.filter(c => ["created", "proving", "pending", "active"].includes(c.status)).length;
  const completed = data.filter(c => ["settled_success", "completed"].includes(c.status)).length;

  return (
    <div className="anim-in mx-auto w-full pt-8 px-4">
      
      {/* ─── Stats Bento Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Card 1: Sage */}
        <div className="bg-[var(--color-sage)] border-2 border-black rounded-2xl p-6 shadow-hard flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <span className="bg-white border-2 border-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-black">Balance</span>
          </div>
          <div>
            <p className="text-4xl font-heading font-black text-black tracking-tighter">
              {balance ? `${Number(balance).toFixed(4)}` : "..."}
              <span className="text-xl ml-2">ETH</span>
            </p>
          </div>
        </div>

        {/* Card 2: Yellow (Main) */}
        <div className="bg-[var(--color-yellow)] border-2 border-black rounded-2xl p-6 shadow-hard-lg flex flex-col justify-between md:scale-105 z-10 transition-transform hover:scale-110 duration-300">
          <div className="flex items-center justify-between mb-8">
            <span className="bg-black border-2 border-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[var(--color-yellow)]">Total Staked</span>
            <div className="w-8 h-8 rounded-full bg-white border-2 border-black flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
          <div>
            <p className="text-5xl font-heading font-black text-black tracking-tighter">
              {total.toFixed(4)}
              <span className="text-xl ml-2">ETH</span>
            </p>
          </div>
        </div>

        {/* Card 3: Dark Gray */}
        <div className="bg-[var(--color-gray-dark)] border-2 border-black rounded-2xl p-6 shadow-hard flex flex-col justify-between">
          <div className="flex items-center justify-between mb-8">
            <span className="bg-white border-2 border-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-black">Activity</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-bold text-white/60 uppercase">Active</p>
              <p className="text-3xl font-heading font-black text-white">{active}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-white/60 uppercase">Settled</p>
              <p className="text-3xl font-heading font-black text-white">{completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 p-4 bg-white border-2 border-black rounded-xl shadow-hard">
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black">
          {showHistory ? "Complete History" : "Recent Positions"}
        </h2>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {!showHistory && data.length > 4 && (
            <button 
              onClick={() => setShowHistory(true)}
              className="neo-btn neo-btn-white py-2.5 px-4 sm:px-6 translate-push text-xs sm:text-sm"
            >
              View History ↗
            </button>
          )}
          {showHistory && (
            <button 
              onClick={() => setShowHistory(false)}
              className="neo-btn neo-btn-white py-2.5 px-4 sm:px-6 translate-push text-xs sm:text-sm"
            >
              Back to Recent ←
            </button>
          )}
          <Link to="/create" className="neo-btn py-2.5 px-4 sm:px-6 translate-push text-xs sm:text-sm">
            New Contract ↗
          </Link>
        </div>
      </div>

      {/* ─── Loading ────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center gap-3 justify-center py-16 bg-white border-2 border-black rounded-2xl shadow-hard">
          <div className="spinner border-black border-t-black" />
          <span className="text-black font-bold uppercase text-sm">Loading Data...</span>
        </div>
      )}

      {/* ─── Empty ──────────────────────────────────────── */}
      {!loading && data.length === 0 && (
        <div className="bg-[#f4f4f5] border-2 border-dashed border-black/30 rounded-2xl p-16 text-center">
          <p className="text-black/60 font-bold uppercase mb-6 text-xl">No active commitments</p>
          <Link to="/create" className="neo-btn translate-push">Draft First Contract</Link>
        </div>
      )}

      {/* ─── Position cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
        {(showHistory ? data : data.slice(-4)).map(c => {
          const s = STATUS[c.status] || STATUS.created;
          return (
            <div key={c._id} className="neo-card p-6 flex flex-col justify-between anim-in hover:-translate-y-1 transition-transform">
              {/* Top */}
              <div className="flex items-center justify-between mb-6">
                <span className={`tag ${s.cls}`}>{s.label}</span>
                <span className="text-sm font-bold bg-[#f4f4f5] border-2 border-black px-3 py-1 rounded-md">
                  {c.contractCommitmentId != null ? `CID:#${c.contractCommitmentId}` : "CID: PENDING"}
                </span>
              </div>

              {/* Goal */}
              <h3 className="text-2xl font-black leading-tight mb-8 line-clamp-2 uppercase tracking-tighter">
                "{c.goalText}"
              </h3>

              {/* Bottom */}
              <div className="flex items-start sm:items-end justify-between pt-4 border-t-2 border-black/10 gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-black/50 mb-1 tracking-wider">Duration</p>
                  <p className="text-lg font-bold">{c.durationDays} DAYS</p>
                </div>
                <div className="text-right break-all">
                  <p className="text-xs font-bold uppercase text-black/50 mb-1 tracking-wider">Stake</p>
                  <p className="text-xl sm:text-2xl font-heading font-black">{c.stakeAmount} ETH</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
