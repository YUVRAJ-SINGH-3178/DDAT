import { useEffect, useState, useRef } from "react";
import { API_BASE } from "../config";
import { useNavigate } from "react-router-dom";
import TransactionStatus from "../components/TransactionStatus";

export default function SubmitProof({ wallet }) {
  const navigate = useNavigate();
  const [commitments, setCommitments] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState("");
  const [txMessage, setTxMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  
  const fileRef = useRef(null);

  useEffect(() => {
    if (!wallet) return;
    fetch(`${API_BASE}/commitments/${wallet}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
            setCommitments(
              d.data.filter((c) => ["created", "proving", "active", "pending"].includes(c.status))
          );
        }
      });
  }, [wallet]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setTxStatus("error");
      setTxMessage("Image must be < 2MB for prototype");
      return;
    }
    setTxStatus("");
    setTxMessage("");
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMatch) {
      setTxStatus("error");
      setTxMessage("Select an active contract.");
      return;
    }
    if (!desc) {
      setTxStatus("error");
      setTxMessage("A log description is required.");
      return;
    }
    
    setLoading(true);
    setTxStatus("");
    setTxMessage("");
    setTxHash("");

    try {
      const dbCom = commitments.find(c => c._id === selectedMatch);
      if (!dbCom) throw new Error("Invalid selection.");

      setTxStatus("waiting");
      setTxMessage("Submitting evidence for community review...");
      const res = await fetch(`${API_BASE}/proof/${selectedMatch}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, description: desc, imageUrl: imagePreview }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setTxStatus("success");
      setTxMessage("Evidence submitted. Waiting for votes.");
      setTimeout(() => navigate("/feed"), 1500);
    } catch (err) {
      setTxStatus("error");
      setTxMessage(err.shortMessage || err.message || "Failed to submit.");
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="neo-card p-12 max-w-md w-full">
          <h1 className="text-4xl font-black tracking-tight mb-4 uppercase">Connect Wallet</h1>
          <p className="text-black/70 font-medium mb-8">Connect your wallet to upload evidence.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto anim-in pt-8 px-4">
      {/* Header Container */}
      <div className="bg-[var(--color-sage)] border-2 border-black rounded-t-2xl p-8 shadow-hard relative z-10">
        <div className="absolute top-0 right-8 -translate-y-1/2 bg-white border-2 border-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-[2px_2px_0_0_#000]">
          Evidence Mode
        </div>
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tighter mb-4 text-black uppercase leading-[0.9]">
          Submit<br />Proof
        </h1>
        <p className="font-bold text-black/70">
          Upload undeniable visual and written evidence of your progress.
        </p>
      </div>

      {/* Form Container */}
      <div className="bg-white border-x-2 border-b-2 border-black rounded-b-2xl p-8 shadow-hard relative z-0 -mt-2">
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          
          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Target Contract</label>
            <div className="relative">
              <select
                value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)} disabled={loading}
                className="neo-input appearance-none bg-white cursor-pointer"
              >
                <option value="">-- Select Active Position --</option>
                {commitments.map(c => (
                  <option key={c._id} value={c._id}>
                    CID:#{c.contractCommitmentId} - {c.goalText}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            {commitments.length === 0 && (
               <p className="text-sm font-bold text-[#ff5f57] mt-3 bg-[#f4f4f5] border-2 border-dashed border-[#ff5f57] p-2 rounded-md">
                 No active contracts found.
               </p>
            )}
          </div>

          <div>
             <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Evidence Upload (Max 2MB)</label>
             <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={handleImage} disabled={loading} />
             
             <div 
               onClick={() => !loading && fileRef.current?.click()}
               className={`border-2 border-dashed border-black rounded-xl p-8 text-center cursor-pointer transition-colors ${
                 imagePreview ? 'bg-black/5' : 'bg-[#f4f4f5] hover:bg-[var(--color-yellow)]'
               }`}
             >
               {imagePreview ? (
                 <div className="relative">
                    <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg border-2 border-black rotate-1 shadow-hard" />
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); setImagePreview(null); }}
                      className="absolute -top-4 -right-4 bg-black text-white w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-black hover:bg-[#ff5f57]"
                    >
                      X
                    </button>
                 </div>
               ) : (
                 <div className="flex flex-col items-center text-black/60 pt-4 pb-4">
                   <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-4">
                     <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                     <polyline points="17 8 12 3 7 8"></polyline>
                     <line x1="12" y1="3" x2="12" y2="15"></line>
                   </svg>
                   <span className="font-bold uppercase tracking-wider">Tap to upload proof image</span>
                 </div>
               )}
             </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Log / Notes</label>
            <textarea
              placeholder="Detail your progress for the community..." rows={4}
              value={desc} onChange={e => setDesc(e.target.value)} disabled={loading}
              className="neo-input resize-y"
            />
          </div>

          {/* Status */}
          <TransactionStatus status={txStatus} message={txMessage} txHash={txHash} />

          <button type="submit" disabled={loading} className="neo-btn neo-btn-sage w-full justify-center py-4 text-lg translate-push mt-4">
            {loading ? "PROCESSING..." : "REGISTER EVIDENCE"}
            {!loading && <span>↗</span>}
          </button>
        </form>
      </div>
    </div>
  );
}
