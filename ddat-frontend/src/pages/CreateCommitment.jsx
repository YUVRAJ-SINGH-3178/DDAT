import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, DDA_TRACKER_ABI, API_BASE } from "../config";
import TransactionStatus from "../components/TransactionStatus";

export default function CreateCommitment({ wallet }) {
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [days, setDays] = useState("");
  const [stake, setStake] = useState("");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState("");
  const [txMessage, setTxMessage] = useState("");
  const [txHash, setTxHash] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet) return;
    if (!goal || !days || !stake) {
      setTxStatus("error");
      setTxMessage("All fields required.");
      return;
    }
    setLoading(true);
    setTxStatus("");
    setTxMessage("");
    setTxHash("");

    try {
      setTxStatus("waiting");
      setTxMessage("Waiting for wallet approval...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DDA_TRACKER_ABI, signer);

      const tx = await contract.createCommitment(goal, parseInt(days) * 86400, {
        value: ethers.parseEther(stake),
      });

      setTxStatus("mining");
      setTxMessage("Transaction Mining On-Chain...");
      setTxHash(tx.hash);
      const receipt = await tx.wait();

      let cid = null;
      for (const log of receipt.logs) {
        try {
          const p = contract.interface.parseLog(log);
          if (p?.name === "CommitmentCreated") { cid = Number(p.args.commitmentId); break; }
        } catch {}
      }

      setTxMessage("Syncing database...");
      const res = await fetch(`${API_BASE}/commitment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, goalText: goal, durationDays: parseInt(days), stakeAmount: stake, contractCommitmentId: cid }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setTxStatus("success");
      setTxMessage("Contract deployed.");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setTxStatus("error");
      setTxMessage(err.shortMessage || err.message || "Transaction failed.");
      setLoading(false);
    }
  };

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="neo-card p-12 max-w-md w-full">
          <h1 className="text-4xl font-black tracking-tight mb-4 uppercase">Connect Wallet</h1>
          <p className="text-black/70 font-medium mb-8">Connect your wallet to draft a new contract.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto anim-in pt-8 px-4">
      {/* Header Container */}
      <div className="bg-[var(--color-yellow)] border-2 border-black rounded-t-2xl p-8 shadow-hard relative z-10">
        <div className="absolute top-0 right-8 -translate-y-1/2 bg-white border-2 border-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0_0_#000]">
          Draft Mode
        </div>
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tighter mb-4 text-black uppercase leading-[0.9]">
          New<br />Contract
        </h1>
        <p className="font-bold text-black/70">
          Lock ETH against a personal goal. Complete it to get your stake back.
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-white border-x-2 border-b-2 border-black rounded-b-2xl p-8 shadow-hard relative z-0 -mt-2">
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          
          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Goal</label>
            <input
              type="text" placeholder="What are you committing to?"
              value={goal} onChange={e => setGoal(e.target.value)} disabled={loading}
              className="neo-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Duration (days)</label>
              <input
                type="number" min="1" placeholder="7"
                value={days} onChange={e => setDays(e.target.value)} disabled={loading}
                className="neo-input"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Stake (ETH)</label>
              <input
                type="number" min="0.001" step="0.001" placeholder="0.01"
                value={stake} onChange={e => setStake(e.target.value)} disabled={loading}
                className="neo-input"
              />
            </div>
          </div>

          {/* Status */}
          <TransactionStatus status={txStatus} message={txMessage} txHash={txHash} />

          <button type="submit" disabled={loading} className="neo-btn w-full justify-center py-4 text-lg translate-push mt-4">
            {loading ? "Processing..." : "Lock Stake"}
            {!loading && <span>↗</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
