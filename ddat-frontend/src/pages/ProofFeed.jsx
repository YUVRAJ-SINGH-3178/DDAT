import { useEffect, useState } from "react";
import { API_BASE } from "../config";

export default function ProofFeed({ wallet }) {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVoteId, setActiveVoteId] = useState(null);
  const [statusLogs, setStatusLogs] = useState({});

  const fetchNetworkFeed = () => {
    setLoading(true);
    fetch(`${API_BASE}/proofs/feed`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProofs(data.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNetworkFeed();
  }, []);

  const executeConsensus = async (proofId, voteType) => {
    if (!wallet) return; // Silent return if not connected to avoid spam
    setActiveVoteId(proofId);
    
    try {
      const res = await fetch(`${API_BASE}/vote/${proofId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, vote: voteType }),
      });
      const data = await res.json();

      if (!data.success) {
        setStatusLogs(prev => ({ ...prev, [proofId]: { text: data.error, type: 'error' }}));
      } else {
        const info = data.data;
        let logMsg = `Consensus recorded. (${info.voteYes}Y / ${info.voteNo}N)`;
        if (info.thresholdReached) {
          logMsg += ` Contract ${info.commitmentStatus}.`;
        }
        setStatusLogs(prev => ({ ...prev, [proofId]: { text: logMsg, type: 'success' }}));
        setTimeout(fetchNetworkFeed, 2000);
      }
    } catch (err) {
      setStatusLogs(prev => ({ ...prev, [proofId]: { text: err.message, type: 'error' }}));
    } finally {
      setActiveVoteId(null);
    }
  };

  if (!wallet) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center">
        <h1 className="font-display text-5xl font-bold tracking-tighter mb-4 text-gray-300">
          Not Connected.
        </h1>
        <p className="text-gray-500">Connect a wallet to participate in network consensus.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto pb-48 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* HEADER */}
      <div className="mb-12 pt-8 text-center sticky top-0 z-40 bg-white/50 dark:bg-[#030303]/50 backdrop-blur-xl py-6 rounded-3xl mt-4">
        <h1 className="font-display text-4xl font-bold tracking-tighter text-black dark:text-white mb-2">
          Global Consensus
        </h1>
        <p className="font-sans text-sm text-gray-500 font-medium">
          Verify and validate proof submitted by the network.
        </p>
      </div>

      {loading && proofs.length === 0 && (
        <div className="flex justify-center p-20">
          <div className="size-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && proofs.length === 0 && (
        <div className="p-20 text-center glass-panel rounded-[2rem]">
          <p className="font-display text-2xl text-gray-400">Zero pending verifications.</p>
        </div>
      )}

      {/* IMMERSIVE VERTICAL FEED */}
      <div className="space-y-12 md:space-y-24">
        {proofs.map((proof) => {
          const c = proof.commitmentId;
          const voteTotal = proof.voteYes + proof.voteNo;
          const yesRatio = voteTotal === 0 ? 0 : (proof.voteYes / voteTotal) * 100;
          
          return (
            <div key={proof._id} className="relative w-full aspect-[4/5] md:aspect-square bg-gray-100 dark:bg-[#111] rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl group">
              
              {/* Image Background */}
              {proof.imageUrl ? (
                <img 
                  src={proof.imageUrl} 
                  alt="Proof" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-pink-500/20 flex items-center justify-center p-12 text-center text-xl font-display text-gray-600 dark:text-gray-400">
                  {proof.description}
                </div>
              )}

              {/* Gradient Overlay for Text Readability */}
              <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black/80 to-transparent z-10" />
              <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 to-transparent z-10" />

              {/* Top Context (Commitment Info) */}
              <div className="absolute top-0 left-0 w-full p-6 md:p-8 z-20 flex justify-between items-start text-white">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-[10px] tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                      {proof.walletAddress.slice(0,6)}...
                    </span>
                    <span className="font-mono text-[10px] tracking-widest text-gray-300">
                      ID: {proof._id.slice(-6)}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-bold leading-tight drop-shadow-md max-w-sm">
                    {c ? c.goalText : "Unknown Target"}
                  </h3>
                </div>
                {c && (
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold">{c.stakeAmount}</p>
                    <p className="font-mono text-[10px] uppercase text-gray-300">MATIC</p>
                  </div>
                )}
              </div>

              {/* Bottom Context (Payload & Actions) */}
              <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 z-20">
                
                {/* Visual Ratio Bar */}
                <div className="w-full h-1 bg-white/20 rounded-full mb-6 overflow-hidden backdrop-blur-md">
                   <div 
                     className="h-full bg-emerald-400 transition-all duration-1000 ease-out" 
                     style={{ width: `${voteTotal === 0 ? 50 : yesRatio}%` }} 
                   />
                </div>

                {proof.imageUrl && (
                  <p className="font-sans text-sm md:text-base text-gray-200 mb-6 max-w-md drop-shadow-md">
                    {proof.description}
                  </p>
                )}

                {/* Status Logs / Feedback */}
                {statusLogs[proof._id] && (
                  <div className={`mb-6 p-4 rounded-2xl glass-panel text-sm font-medium
                    ${statusLogs[proof._id].type === 'error' ? 'text-rose-400' : 'text-emerald-400'}
                  `}>
                    {statusLogs[proof._id].text}
                  </div>
                )}

                {/* Voting Actions */}
                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => executeConsensus(proof._id, "yes")}
                    disabled={activeVoteId === proof._id}
                    className="flex-1 py-4 md:py-5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 text-emerald-100 font-display text-lg uppercase tracking-widest backdrop-blur-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 group/btn"
                  >
                    <span className="group-hover/btn:-translate-y-1 transition-transform">✅</span> Accept
                  </button>
                  <button
                    onClick={() => executeConsensus(proof._id, "no")}
                    disabled={activeVoteId === proof._id}
                    className="flex-1 py-4 md:py-5 rounded-full bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 text-rose-100 font-display text-lg uppercase tracking-widest backdrop-blur-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 group/btn"
                  >
                    <span className="group-hover/btn:translate-y-1 transition-transform">❌</span> Reject
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
