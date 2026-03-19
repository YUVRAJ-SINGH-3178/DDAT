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
  const [status, setStatus] = useState(null); // { type: 'loading'|'success'|'error', message: '' }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet) return alert("Please connect your wallet first.");
    if (!goal || !days || !stake) return alert("All fields are required.");

    setLoading(true);
    setStatus({ type: "loading", message: "Awaiting signature..." });

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DDA_TRACKER_ABI, signer);

      const durationInSeconds = parseInt(days) * 86400;
      const stakeWei = ethers.parseEther(stake);

      setStatus({ type: "loading", message: "Confirm in MetaMask..." });
      const tx = await contract.createCommitment(goal, durationInSeconds, { value: stakeWei });
      
      setStatus({ type: "loading", message: "Minting contract on-chain..." });
      const receipt = await tx.wait();

      let contractCommitmentId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === "CommitmentCreated") {
            contractCommitmentId = Number(parsed.args.commitmentId);
            break;
          }
        } catch { } // ignore
      }

      setStatus({ type: "loading", message: "Syncing node data..." });

      const res = await fetch(`${API_BASE}/commitment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: wallet,
          goalText: goal,
          durationDays: parseInt(days),
          stakeAmount: stake,
          contractCommitmentId,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setStatus({ type: "success", message: "Contract Executed." });
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: err.message || "Execution cancelled." });
      setLoading(false);
    }
  };

  if (!wallet) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center">
        <h1 className="font-display text-5xl font-bold tracking-tighter mb-4 text-gray-300">
          Not Connected.
        </h1>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
      <div className="mb-16 pt-8">
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tighter leading-none mb-4">
          Execute<br/><span className="text-indigo-500">Contract.</span>
        </h1>
        <p className="font-sans text-xl text-gray-500 dark:text-gray-400 max-w-lg">
          Lock capital against your goals. Code is law.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Goal Input */}
        <div className="group">
          <label className="block font-mono text-sm tracking-widest uppercase text-gray-400 group-focus-within:text-indigo-500 transition-colors mb-2">
            Target Routine
          </label>
          <input
            type="text"
            placeholder="e.g. Build a Web3 App"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={loading}
            className="brutal-input w-full placeholder:text-gray-300 dark:placeholder:text-gray-700 bg-transparent text-black dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Duration Input */}
          <div className="group">
            <label className="block font-mono text-sm tracking-widest uppercase text-gray-400 group-focus-within:text-indigo-500 transition-colors mb-2">
              Duration (Days)
            </label>
            <input
              type="number"
              min="1"
              placeholder="30"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              disabled={loading}
              className="brutal-input w-full placeholder:text-gray-300 dark:placeholder:text-gray-700 bg-transparent text-black dark:text-white font-mono"
            />
          </div>

          {/* Stake Input */}
          <div className="group">
            <label className="block font-mono text-sm tracking-widest uppercase text-gray-400 group-focus-within:text-indigo-500 transition-colors mb-2">
              Stake (MATIC)
            </label>
            <input
              type="number"
              min="0.001"
              step="0.001"
              placeholder="0.1"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              disabled={loading}
              className="brutal-input w-full placeholder:text-gray-300 dark:placeholder:text-gray-700 bg-transparent text-black dark:text-white font-mono"
            />
          </div>
        </div>

        {/* Status indicator */}
        <div className="h-12 flex items-center">
          {status && (
            <div className={`font-mono text-sm uppercase tracking-widest flex items-center gap-3 animate-in fade-in
              ${status.type === 'error' ? 'text-rose-500' : ''}
              ${status.type === 'success' ? 'text-emerald-500' : ''}
              ${status.type === 'loading' ? 'text-indigo-500' : ''}
            `}>
              {status.type === 'loading' && <div className="size-3 bg-indigo-500 rounded-full animate-ping" />}
              {status.type === 'success' && <div className="size-3 bg-emerald-500 rounded-full" />}
              {status.type === 'error' && <div className="size-3 bg-rose-500 rounded-full" />}
              {status.message}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-pill btn-primary text-xl py-6 mt-8 disabled:opacity-50 flex items-center justify-between px-8 group overflow-hidden relative"
        >
          <span className="relative z-10">{loading ? "Processing..." : "Lock Stake"}</span>
          <span className="relative z-10 text-2xl group-hover:translate-x-2 transition-transform">&rarr;</span>
          <div className="absolute inset-0 bg-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
        </button>
      </form>
    </div>
  );
}
