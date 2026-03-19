import { useEffect, useState } from "react";
import { API_BASE } from "../config";

export default function ProofFeed({ wallet }) {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(null);
  const [logs, setLogs] = useState({});

  const fetchFeed = () => {
    setLoading(true);
    fetch(`${API_BASE}/proofs/feed`)
      .then(r => r.json())
      .then(d => { if (d.success) setProofs(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(fetchFeed, []);

  const vote = async (proofId, type) => {
    if (!wallet) return;
    setVoting(proofId);
    try {
      const res = await fetch(`${API_BASE}/vote/${proofId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, vote: type }),
      });
      const data = await res.json();
      if (!data.success) {
        setLogs(p => ({ ...p, [proofId]: { msg: data.error, ok: false } }));
      } else {
        const i = data.data;
        let msg = `Vote recorded (${i.voteYes}Y / ${i.voteNo}N)`;
        if (i.thresholdReached) msg += ` — ${i.commitmentStatus}`;
        setLogs(p => ({ ...p, [proofId]: { msg, ok: true } }));
        setTimeout(fetchFeed, 2500);
      }
    } catch (err) {
      setLogs(p => ({ ...p, [proofId]: { msg: err.message, ok: false } }));
    } finally {
      setVoting(null);
    }
  };

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-3">Connect Wallet</h1>
        <p className="text-[#6b6b78] text-sm">Connect your wallet to participate in consensus.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto anim-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
            <span className="text-[#b5e853]">Consensus</span> Feed
          </h1>
          <p className="text-[#6b6b78] text-sm">{proofs.length} pending verification{proofs.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={fetchFeed} disabled={loading} className="btn-outline btn-sm">
          {loading ? <div className="spinner" /> : "Refresh"}
        </button>
      </div>

      {/* Loading */}
      {loading && proofs.length === 0 && (
        <div className="flex items-center gap-3 justify-center py-16">
          <div className="spinner" />
          <span className="text-[#6b6b78] text-sm">Loading feed...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && proofs.length === 0 && (
        <div className="glass-card p-16 text-center">
          <p className="text-[#6b6b78]">No pending verifications right now</p>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-5 stagger">
        {proofs.map(proof => {
          const c = proof.commitmentId;
          const total = proof.voteYes + proof.voteNo;
          const ratio = total === 0 ? 0 : Math.round((proof.voteYes / total) * 100);
          const isVoting = voting === proof._id;
          const fb = logs[proof._id];

          return (
            <div key={proof._id} className="glass-card overflow-hidden anim-in">
              {/* Image */}
              {proof.imageUrl && (
                <div className="relative w-full aspect-[2/1] overflow-hidden">
                  <img src={proof.imageUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-transparent" />
                </div>
              )}

              <div className="p-5 space-y-4">
                {/* Meta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[9px] font-semibold text-[#6b6b78]">
                      {proof.walletAddress.slice(2,4).toUpperCase()}
                    </div>
                    <span className="text-xs text-[#6b6b78]">{proof.walletAddress.slice(0,6)}...{proof.walletAddress.slice(-4)}</span>
                  </div>
                  {c && <span className="text-sm font-bold">{c.stakeAmount} <span className="text-[#4a4a55]">ETH</span></span>}
                </div>

                {/* Goal */}
                <h3 className="text-[15px] font-semibold leading-snug">{c ? c.goalText : "Unknown"}</h3>

                {/* Description */}
                <p className="text-[13px] text-[#a0a0ab] leading-relaxed line-clamp-3">{proof.description}</p>

                {/* Vote bar */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-medium text-[#b5e853]">{proof.voteYes}Y</span>
                  <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#b5e853] to-[#86d638] rounded-full transition-all duration-700"
                      style={{ width: `${total === 0 ? 0 : ratio}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-[#f87171]">{proof.voteNo}N</span>
                </div>

                {/* Feedback */}
                {fb && (
                  <div className={`text-xs py-2 px-3 rounded-lg ${
                    fb.ok
                      ? "bg-[rgba(181,232,83,0.05)] border border-[rgba(181,232,83,0.1)] text-[#b5e853]"
                      : "bg-[rgba(248,113,113,0.05)] border border-[rgba(248,113,113,0.1)] text-[#f87171]"
                  }`}>
                    {fb.msg}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => vote(proof._id, "yes")} disabled={isVoting}
                    className="flex-1 btn-outline btn-sm justify-center hover:border-[#b5e853] hover:text-[#b5e853] disabled:opacity-20 transition-colors"
                  >
                    {isVoting ? <div className="spinner" /> : "Accept"}
                  </button>
                  <button
                    onClick={() => vote(proof._id, "no")} disabled={isVoting}
                    className="flex-1 btn-outline btn-sm justify-center hover:border-[#f87171] hover:text-[#f87171] disabled:opacity-20 transition-colors"
                  >
                    {isVoting ? <div className="spinner" /> : "Reject"}
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
