import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { API_BASE } from "../config";

const STATUS = {
  pending:   { label: "Pending",   cls: "tag-pending" },
  active:    { label: "Active",    cls: "tag-active" },
  completed: { label: "Settled",   cls: "tag-settled" },
  failed:    { label: "Forfeited", cls: "tag-failed" },
};

export default function Dashboard({ wallet }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (!wallet) return;
    setLoading(true);
    fetch(`${API_BASE}/commitments/${wallet}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch real wallet balance
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      provider.getBalance(wallet).then(bal => {
        setBalance(ethers.formatEther(bal));
      }).catch(console.error);
    }
  }, [wallet]);

  // ─── Hero (not connected) ──────────────────────────────
  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-4">
        {/* Ambient glow behind heading */}
        <div className="relative mb-8">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#b5e853] opacity-[0.04] blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[#a855f7] opacity-[0.06] blur-[80px] translate-x-[100px] -translate-y-[80px]" />
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] relative z-10">
            Stake Your<br />
            <span className="text-[#b5e853]">Accountability</span>
          </h1>
        </div>
        
        <p className="text-[#6b6b78] text-base md:text-lg max-w-md mb-10 leading-relaxed">
          Lock real ETH against personal goals. Complete them to 
          get it back. Fail, and it's gone forever.
        </p>
        
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-[#4a4a55]">Connect wallet to begin</span>
          <span className="text-[#4a4a55]">→</span>
        </div>
      </div>
    );
  }

  const total = data.reduce((a, c) => a + Number(c.stakeAmount || 0), 0);
  const active = data.filter(c => c.status === "active" || c.status === "pending").length;

  return (
    <div className="anim-in">
      
      {/* ─── Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          { label: "Wallet Balance", value: balance ? `${Number(balance).toFixed(4)} ETH` : "Loading...", highlight: true },
          { label: "Total Staked", value: `${total.toFixed(4)} ETH` },
          { label: "Active", value: active },
          { label: "Completed", value: data.filter(c => c.status === "completed").length },
        ].map(s => (
          <div key={s.label} className="glass-card p-5">
            <p className="text-xs text-[#6b6b78] mb-2 font-medium">{s.label}</p>
            <p className={`text-xl font-bold ${s.highlight ? "text-[#b5e853]" : ""}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Your Positions</h2>
        <Link to="/create" className="btn-lime btn-sm">
          New Contract
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </Link>
      </div>

      {/* ─── Loading ────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center gap-3 justify-center py-16">
          <div className="spinner" />
          <span className="text-[#6b6b78] text-sm">Loading positions...</span>
        </div>
      )}

      {/* ─── Empty ──────────────────────────────────────── */}
      {!loading && data.length === 0 && (
        <div className="glass-card p-16 text-center">
          <p className="text-[#6b6b78] mb-5">No positions yet</p>
          <Link to="/create" className="btn-outline btn-sm">Create your first contract</Link>
        </div>
      )}

      {/* ─── Position cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
        {data.map(c => {
          const s = STATUS[c.status] || STATUS.pending;
          return (
            <div key={c._id} className="glass-card p-6 anim-in group">
              {/* Top */}
              <div className="flex items-center justify-between mb-5">
                <span className={`tag ${s.cls}`}>{s.label}</span>
                <span className="text-xs text-[#4a4a55] font-medium">
                  {c.contractCommitmentId != null ? `#${c.contractCommitmentId}` : "Pending"}
                </span>
              </div>

              {/* Goal */}
              <h3 className="text-[16px] font-semibold leading-snug mb-6 line-clamp-2 group-hover:text-[#b5e853] transition-colors duration-400">{c.goalText}</h3>

              {/* Bottom */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-[#4a4a55] mb-0.5">Duration</p>
                  <p className="text-sm font-semibold">{c.durationDays} days</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#4a4a55] mb-0.5">Stake</p>
                  <p className="text-lg font-bold">{c.stakeAmount} <span className="text-[#6b6b78] text-sm">ETH</span></p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
