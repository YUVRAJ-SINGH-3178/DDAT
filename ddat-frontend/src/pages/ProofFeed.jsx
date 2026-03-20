import { useEffect, useState } from "react";
import { API_BASE } from "../config";

export default function ProofFeed({ wallet }) {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/proofs/feed`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setProofs(d.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleVote = async (proofId, approve) => {
    if (!wallet) return alert("Connect wallet to vote.");
    try {
      const res = await fetch(`${API_BASE}/vote/${proofId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, vote: approve ? "yes" : "no" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Optimistic update
      setProofs(prev => prev.map(p => {
        if (p._id === proofId) {
          const v = data.vote; // return updated vote counts
          return { ...p, votesFor: v?.votesFor ?? p.votesFor + (approve ? 1 : 0), votesAgainst: v?.votesAgainst ?? p.votesAgainst + (!approve ? 1 : 0) };
        }
        return p;
      }));
    } catch (err) {
      alert(err.message || "Vote failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto anim-in pt-8 px-4 pb-20">
      
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="mb-12 border-l-8 border-[var(--color-yellow)] pl-6">
        <h1 className="text-5xl md:text-7xl font-heading font-black tracking-tighter text-white uppercase leading-[0.9]">
          Consensus<br />Feed
        </h1>
        <p className="mt-4 text-xl font-bold text-white/60">
          Review evidence. Cast your vote. Enforce accountability.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 justify-center py-20 bg-[var(--color-charcoal)] border-2 border-[var(--color-yellow)] rounded-2xl shadow-[8px_8px_0_0_var(--color-yellow)]">
          <div className="spinner border-[var(--color-yellow)] border-t-[var(--color-yellow)]" />
          <span className="text-[var(--color-yellow)] font-bold uppercase text-lg">Loading Feed...</span>
        </div>
      )}

      {!loading && proofs.length === 0 && (
        <div className="bg-[#f4f4f5] border-2 border-dashed border-black rounded-2xl p-16 text-center">
          <p className="text-black font-black uppercase text-2xl">No pending proofs</p>
          <p className="text-black/60 font-bold mt-2">The consensus queue is empty.</p>
        </div>
      )}

      {/* ─── Feed ─────────────────────────────────────────── */}
      <div className="space-y-12 stagger">
        {proofs.map(p => {
          const total = p.votesFor + p.votesAgainst;
          const ratio = total === 0 ? 0 : (p.votesFor / total) * 100;
          const userVoted = p.voters?.includes(wallet?.toLowerCase());
          const isOwner = p.commitmentId?.walletAddress?.toLowerCase() === wallet?.toLowerCase();

          return (
            <div key={p._id} className="bg-white border-2 border-black rounded-2xl shadow-hard-lg overflow-hidden anim-in">
              <div className="grid md:grid-cols-2">
                
                {/* Left: Evidence Image */}
                <div className="bg-[#f4f4f5] border-b-2 md:border-b-0 md:border-r-2 border-black p-6 flex flex-col justify-center relative">
                  <div className="absolute top-4 left-4 bg-[var(--color-sage)] border-2 border-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider z-10">
                    CID #{p.commitmentId?.contractCommitmentId || "?"}
                  </div>
                  {p.imageUrl ? (
                    <img 
                      src={p.imageUrl} 
                      alt="Proof" 
                      className="w-full h-auto max-h-[400px] object-cover border-2 border-black rounded-xl shadow-hard hover:rotate-1 transition-transform" 
                    />
                  ) : (
                    <div className="w-full h-64 border-2 border-dashed border-black rounded-xl flex items-center justify-center text-black/40 font-bold uppercase">
                      No Image Provided
                    </div>
                  )}
                </div>

                {/* Right: Details & Voting */}
                <div className="p-8 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-black mb-4">
                      "{p.commitmentId?.goalText || "Unknown Goal"}"
                    </h3>
                    <div className="bg-[#f4f4f5] border-2 border-black rounded-xl p-4 mb-6 shadow-[2px_2px_0_0_#000]">
                      <p className="text-sm font-bold text-black/50 uppercase tracking-wider mb-2">Log Entry</p>
                      <p className="text-black font-medium leading-relaxed">{p.description}</p>
                    </div>
                  </div>

                  <div>
                    {/* Voting Gauge */}
                    <div className="mb-6">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-black mb-2">
                        <span>Current Consensus</span>
                        <span>{total > 0 ? `${ratio.toFixed(0)}% Accept` : "No Votes"}</span>
                      </div>
                      <div className="h-4 w-full bg-[#f4f4f5] border-2 border-black rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-[var(--color-yellow)] transition-all duration-500 border-r-2 border-black"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>

                    {/* Voting Actions */}
                    {isOwner ? (
                       <div className="text-center p-4 bg-[var(--color-yellow)] border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000] font-bold text-black uppercase">
                         This is your proof
                       </div>
                    ) : userVoted ? (
                       <div className="text-center p-4 bg-[var(--color-sage)] border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000] font-bold text-black uppercase">
                         Vote Recorded
                       </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => handleVote(p._id, true)}
                          className="neo-btn justify-center bg-[var(--color-sage)] text-black py-4 translate-push"
                        >
                          ACCEPT
                        </button>
                        <button 
                          onClick={() => handleVote(p._id, false)}
                          className="neo-btn justify-center bg-[#ff5f57] text-white py-4 translate-push"
                        >
                          REJECT
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
