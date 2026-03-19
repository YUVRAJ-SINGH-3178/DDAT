import { useEffect, useState } from "react";
import { API_BASE, CONTRACT_ADDRESS, DDA_TRACKER_ABI } from "../config";
import { ethers } from "ethers";

export default function SubmitProof({ wallet }) {
  const [commitments, setCommitments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    fetch(`${API_BASE}/commitments/${wallet}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const active = d.data.filter(c => c.status === "active" || c.status === "pending");
          setCommitments(active);
          if (active.length) setSelectedId(active[0]._id);
        }
      })
      .catch(console.error);
  }, [wallet]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet || !selectedId || !description.trim()) return;
    setLoading(true);
    setError(""); setSuccess(false); setStep("");

    try {
      setStep("Awaiting wallet signature...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, DDA_TRACKER_ABI, signer);
      const target = commitments.find(c => c._id === selectedId);
      if (!target) throw new Error("Invalid commitment");

      const tx = await contract.submitProof(target.contractCommitmentId);
      setStep("Mining on-chain...");
      await tx.wait();

      setStep("Uploading evidence...");
      let imageUrl = "";
      if (imageFile) {
        imageUrl = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(imageFile);
        });
      }

      const resp = await fetch(`${API_BASE}/proof/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, description: description.trim(), imageUrl }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error);

      setSuccess(true);
      setStep("");
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      setError(err.shortMessage || err.message);
      setStep("");
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-3">Connect Wallet</h1>
        <p className="text-[#6b6b78] text-sm">Connect your wallet to submit evidence.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto anim-in">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
          Submit <span className="text-[#b5e853]">Evidence</span>
        </h1>
        <p className="text-[#6b6b78] text-[15px]">
          Prove you completed your commitment with a log and optional image.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs text-[#6b6b78] font-medium mb-2 uppercase tracking-wider">Contract</label>
          <select
            value={selectedId} onChange={e => setSelectedId(e.target.value)}
            disabled={!commitments.length}
            className="input-field cursor-pointer bg-[rgba(255,255,255,0.03)]"
          >
            {!commitments.length ? (
              <option>No active contracts</option>
            ) : commitments.map(c => (
              <option key={c._id} value={c._id} style={{ background: "#131316" }}>
                {c.goalText} — {c.stakeAmount} ETH
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[#6b6b78] font-medium mb-2 uppercase tracking-wider">Daily Log</label>
          <textarea
            rows={3} placeholder="Describe what you accomplished..."
            value={description} onChange={e => setDescription(e.target.value)}
            className="input-field resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-[#6b6b78] font-medium mb-2 uppercase tracking-wider">Image (optional)</label>
          {!imagePreview ? (
            <label className="glass-card flex flex-col items-center justify-center p-10 cursor-pointer text-center">
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              <svg className="w-8 h-8 text-[#4a4a55] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm text-[#6b6b78]">Click to upload</p>
              <p className="text-xs text-[#4a4a55] mt-1">PNG, JPG, WebP</p>
            </label>
          ) : (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={imagePreview} alt="" className="w-full aspect-video object-cover" />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-3 right-3 btn-outline btn-sm text-xs bg-[#050507]/70 backdrop-blur-sm"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Status */}
        {step && (
          <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-[rgba(181,232,83,0.05)] border border-[rgba(181,232,83,0.1)]">
            <div className="spinner" />
            <span className="text-sm text-[#b5e853]">{step}</span>
          </div>
        )}
        {error && (
          <div className="py-3 px-4 rounded-xl bg-[rgba(248,113,113,0.05)] border border-[rgba(248,113,113,0.1)]">
            <span className="text-sm text-[#f87171]">{error}</span>
          </div>
        )}
        {success && (
          <div className="py-3 px-4 rounded-xl bg-[rgba(181,232,83,0.05)] border border-[rgba(181,232,83,0.1)]">
            <span className="text-sm text-[#b5e853]">Evidence submitted — awaiting consensus.</span>
          </div>
        )}

        <button type="submit" disabled={loading || !commitments.length} className="btn-lime w-full justify-center py-4 text-[15px]">
          {loading ? "Processing..." : "Submit Proof"}
          {!loading && <span>→</span>}
        </button>
      </form>
    </div>
  );
}
