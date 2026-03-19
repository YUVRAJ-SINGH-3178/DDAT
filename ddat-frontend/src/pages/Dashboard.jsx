import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../config";

const STATUS_MAP = {
  pending: { label: "Pending", bg: "bg-amber-100/50 dark:bg-amber-500/10", text: "text-amber-800 dark:text-amber-400" },
  active: { label: "Active", bg: "bg-blue-100/50 dark:bg-blue-500/10", text: "text-blue-800 dark:text-blue-400" },
  completed: { label: "Completed", bg: "bg-emerald-100/50 dark:bg-emerald-500/10", text: "text-emerald-800 dark:text-emerald-400" },
  failed: { label: "Failed", bg: "bg-rose-100/50 dark:bg-rose-500/10", text: "text-rose-800 dark:text-rose-400" },
};

export default function Dashboard({ wallet }) {
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    setLoading(true);
    fetch(`${API_BASE}/commitments/${wallet}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCommitments(data.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [wallet]);

  if (!wallet) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center">
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tighter mb-4">
          Own Your<br/><span className="text-indigo-500">Execution.</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
          A decentralized protocol to stake capital against your personal goals. Connect your wallet to enter the arena.
        </p>
      </div>
    );
  }

  const totalStake = commitments.reduce((acc, c) => acc + Number(c.stakeAmount || 0), 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      
      {/* MASSIVE PORTFOLIO HEADER */}
      <div className="mb-16 pt-8">
        <p className="font-mono text-sm tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-2">Total Value Locked</p>
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-7xl md:text-9xl font-bold tracking-tighter leading-none">
            {totalStake.toFixed(2)}
          </h1>
          <span className="font-sans text-2xl md:text-4xl font-semibold text-gray-400">MATIC</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-white/10 pb-4">
        <h2 className="font-display text-2xl md:text-3xl">Positions ({commitments.length})</h2>
        <Link to="/create" className="btn-primary text-sm px-6 py-2">
          New Contract
        </Link>
      </div>

      {loading && (
        <div className="flex gap-2 items-center text-gray-400 font-mono py-12">
          <div className="size-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          SYNCING...
        </div>
      )}

      {!loading && commitments.length === 0 && (
        <div className="py-20 text-center glass-panel rounded-3xl border-dashed">
          <p className="font-display text-2xl text-gray-400">No active positions.</p>
        </div>
      )}

      {/* SLEEK TRADING CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {commitments.map((c) => {
          const status = STATUS_MAP[c.status] || STATUS_MAP.pending;
          return (
            <div key={c._id} className="glass-panel rounded-[2rem] p-6 md:p-8 hover:scale-[1.02] transition-transform duration-300 group relative overflow-hidden">
              
              <div className="flex justify-between items-start mb-12 relative z-10">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
                <span className="font-mono text-gray-400 text-sm">
                  {c.contractCommitmentId != null ? `#${c.contractCommitmentId}` : "PENDING"}
                </span>
              </div>

              <div className="relative z-10">
                <h3 className="font-display text-2xl md:text-3xl font-semibold leading-tight mb-8 group-hover:text-indigo-500 transition-colors">
                  {c.goalText}
                </h3>
              </div>

              <div className="flex items-end justify-between relative z-10">
                <div>
                  <p className="font-mono text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Duration</p>
                  <p className="font-sans font-medium text-lg">{c.durationDays} Days</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Stake</p>
                  <p className="font-sans font-semibold text-2xl">{c.stakeAmount}</p>
                </div>
              </div>

              {/* Decorative absolute element */}
              <div className="absolute -bottom-10 -right-10 size-40 bg-indigo-500/5 blur-3xl rounded-full group-hover:bg-indigo-500/10 transition-colors" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
