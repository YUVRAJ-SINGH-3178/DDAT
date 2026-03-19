import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, DDA_TRACKER_ABI, API_BASE } from "../config";

export default function CreateCommitment({ wallet }) {
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState("");
  const [stake, setStake] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet) return;
    if (!goal || !days || !stake) return setError("All fields required.");
    setLoading(true);
    setError("");

    try {
      setStep("Waiting for wallet confirmation...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DDA_TRACKER_ABI, signer);

      const tx = await contract.createCommitment(goal, parseInt(days) * 86400, {
        value: ethers.parseEther(stake),
      });

      setStep("Mining on-chain...");
      const receipt = await tx.wait();

      let cid = null;
      for (const log of receipt.logs) {
        try {
          const p = contract.interface.parseLog(log);
          if (p?.name === "CommitmentCreated") { cid = Number(p.args.commitmentId); break; }
        } catch {}
      }

      setStep("Syncing database...");
      const res = await fetch(`${API_BASE}/commitment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, goalText: goal, durationDays: parseInt(days), stakeAmount: stake, contractCommitmentId: cid }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setStep("Contract deployed.");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err.shortMessage || err.message || "Transaction failed.");
      setStep("");
      setLoading(false);
    }
  };

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-3">Connect Wallet</h1>
        <p className="text-[#6b6b78] text-sm">Connect your wallet to create a contract.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto anim-in">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
          New <span className="text-[#b5e853]">Contract</span>
        </h1>
        <p className="text-[#6b6b78] text-[15px]">
          Lock ETH against a personal commitment. Complete it to get your stake back.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs text-[#6b6b78] font-medium mb-2 uppercase tracking-wider">Goal</label>
          <input
            type="text" placeholder="What are you committing to?"
            value={goal} onChange={e => setGoal(e.target.value)} disabled={loading}
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#6b6b78] font-medium mb-2 uppercase tracking-wider">Duration (days)</label>
            <input
              type="number" min="1" placeholder="7"
              value={days} onChange={e => setDays(e.target.value)} disabled={loading}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs text-[#6b6b78] font-medium mb-2 uppercase tracking-wider">Stake (ETH)</label>
            <input
              type="number" min="0.001" step="0.001" placeholder="0.01"
              value={stake} onChange={e => setStake(e.target.value)} disabled={loading}
              className="input-field"
            />
          </div>
        </div>

        {/* Status */}
        {step && (
          <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-[rgba(181,232,83,0.05)] border border-[rgba(181,232,83,0.1)]">
            {loading && <div className="spinner" />}
            <span className="text-sm text-[#b5e853]">{step}</span>
          </div>
        )}
        {error && (
          <div className="py-3 px-4 rounded-xl bg-[rgba(248,113,113,0.05)] border border-[rgba(248,113,113,0.1)]">
            <span className="text-sm text-[#f87171]">{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-lime w-full justify-center py-4 text-[15px]">
          {loading ? "Processing..." : "Lock Stake"}
          {!loading && <span>→</span>}
        </button>
      </form>
    </div>
  );
}
