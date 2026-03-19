import { useEffect, useState } from "react";
import { API_BASE } from "../config";

export default function SubmitProof({ wallet }) {
  const [commitments, setCommitments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingCommitments, setFetchingCommitments] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!wallet) return;
    setFetchingCommitments(true);
    fetch(`${API_BASE}/commitments/${wallet}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const active = data.data.filter((c) => c.status === "active" || c.status === "pending");
          setCommitments(active);
          if (active.length > 0) setSelectedId(active[0]._id);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setFetchingCommitments(false));
  }, [wallet]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet) return;
    if (!selectedId || !description.trim()) return;

    setLoading(true);
    setStatus({ type: "info", text: "Processing..." });

    try {
      let imageUrl = "";
      if (imageFile) imageUrl = await fileToBase64(imageFile);

      const res = await fetch(`${API_BASE}/proof/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, description: description.trim(), imageUrl }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setStatus({ type: "success", text: "Proof attached to ledger." });
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
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
    <div className="max-w-2xl mx-auto pt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out mb-24">
      
      <div className="mb-12">
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tighter mb-4">
          Attach<br/><span className="text-pink-500">Evidence.</span>
        </h1>
        <p className="font-sans text-gray-500 max-w-sm">
          Submit verifiable proof to validate your daily progress.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* Transparent Commitment Selector */}
        <div className="group">
          <label className="block font-mono text-sm tracking-widest uppercase text-gray-400 group-focus-within:text-pink-500 mb-2 transition-colors">
            Target Contract
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={fetchingCommitments || commitments.length === 0}
            className="w-full brutal-input bg-transparent text-black dark:text-white appearance-none cursor-pointer disabled:opacity-50"
          >
            {commitments.length === 0 ? (
              <option>No active contracts</option>
            ) : (
              commitments.map((c) => (
                <option key={c._id} value={c._id} className="text-black text-sm font-sans">
                  {c.goalText} — {c.stakeAmount} MATIC
                </option>
              ))
            )}
          </select>
        </div>

        {/* The Textarea */}
        <div className="group">
          <label className="block font-mono text-sm tracking-widest uppercase text-gray-400 group-focus-within:text-pink-500 mb-2 transition-colors">
            Payload
          </label>
          <textarea
            rows={1}
            placeholder="Write a brief log..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full brutal-input bg-transparent text-black dark:text-white resize-none placeholder:text-gray-300 dark:placeholder:text-gray-700 overflow-hidden"
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
        </div>

        {/* The Giant Dropper Box */}
        <div className="group">
          <label className="block font-mono text-sm tracking-widest uppercase text-gray-400 group-focus-within:text-pink-500 mb-4 transition-colors">
            Visual Proof
          </label>
          
          {!imagePreview ? (
            <div className="relative overflow-hidden group/box cursor-pointer rounded-3xl">
              <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
              <div className="w-full aspect-video glass-panel border-dashed border-2 hover:border-pink-500/50 flex flex-col items-center justify-center transition-all duration-500">
                <div className="size-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4 group-hover/box:scale-110 transition-transform duration-500">
                  <svg className="size-6 text-gray-400 group-hover/box:text-pink-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="font-sans text-gray-500 font-medium">Click or grab a photo</p>
              </div>
            </div>
          ) : (
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl group/preview">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover/preview:scale-105" />
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="btn-pill bg-white text-black text-sm px-6 py-2 shadow-xl hover:scale-105 transition-transform"
                >
                  Remove Layer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        {status && (
          <div className={`font-mono text-sm uppercase tracking-widest flex items-center gap-3 animate-in fade-in
            ${status.type === 'error' ? 'text-rose-500' : ''}
            ${status.type === 'success' ? 'text-emerald-500' : ''}
            ${status.type === 'info' ? 'text-pink-500' : ''}
          `}>
            {status.type === 'info' && <div className="size-3 bg-pink-500 rounded-full animate-ping" />}
            {status.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || commitments.length === 0}
          className="w-full btn-pill btn-primary text-xl py-6 disabled:opacity-50 flex items-center justify-between px-8 group overflow-hidden relative"
        >
          <span className="relative z-10">{loading ? "Uploading..." : "Publish Proof"}</span>
          <span className="relative z-10 text-2xl group-hover:translate-x-2 transition-transform">&rarr;</span>
          <div className="absolute inset-0 bg-pink-500 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
        </button>
      </form>
    </div>
  );
}
