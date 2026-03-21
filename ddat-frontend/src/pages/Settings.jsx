import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { createPortal } from "react-dom";

const ACTIVITY_TYPES = {
  commitment_created: { label: "ETH Staked", color: "bg-[var(--color-yellow)]", icon: "💰" },
  commitment_settled_success: { label: "ETH Returned", color: "bg-[#28c840]", icon: "✓" },
  commitment_settled_failed: { label: "ETH Forfeited", color: "bg-[#ff5f57]", icon: "✗" },
};

export default function Settings({ wallet, setWallet }) {
  const navigate = useNavigate();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [deleteFeedback, setDeleteFeedback] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!wallet) {
      navigate("/");
      return;
    }

    const fetchActivity = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/user/${wallet}/activity`);
        const payload = await response.json();
        if (payload.success) {
          setActivity(payload.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch activity:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [wallet, navigate]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE ACCOUNT") {
      setDeleteFeedback({ type: "error", message: "Confirmation text is incorrect." });
      return;
    }

    setIsDeleting(true);
    setDeleteFeedback(null);
    try {
      const response = await fetch(`${API_BASE}/user/${wallet}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (payload.success) {
        setDeleteFeedback({
          type: "success",
          message: "Account deleted. Redirecting to home...",
        });
        // Block silent auto-connect and clear local wallet state.
        localStorage.setItem("walletDisconnected", "true");
        localStorage.setItem("walletAutoConnectBlocked", "true");
        setWallet?.(null);
        setTimeout(() => {
          setShowDeleteModal(false);
          setDeleteConfirmText("");
          setDeleteFeedback(null);
          window.location.href = "/";
        }, 1200);
      } else {
        setDeleteFeedback({
          type: "error",
          message: "Error deleting account: " + (payload.message || "Unknown error"),
        });
      }
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleteFeedback({ type: "error", message: "Error deleting account. Please try again." });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!wallet) {
    return (
      <div className="anim-in mx-auto w-full pt-8 px-4">
        <div className="bg-[#f4f4f5] border-2 border-dashed border-black/30 rounded-2xl p-16 text-center">
          <p className="text-black/60 font-bold uppercase mb-6 text-xl">Connect wallet to access settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="anim-in mx-auto w-full max-w-4xl pt-8 px-4 pb-20">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <div className="mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tighter text-white mb-2">Settings</h1>
        <p className="text-white/60 font-medium">View your ETH transaction history and manage your account</p>
      </div>

      {feedback && (
        <div
          className={`mb-6 border-2 border-black rounded-xl px-4 py-3 shadow-hard flex items-center justify-between ${
            feedback.type === "success" ? "bg-[var(--color-sage)] text-black" : "bg-[#ff5f57] text-white"
          }`}
        >
          <p className="font-bold uppercase text-sm tracking-wide">{feedback.message}</p>
          <button
            onClick={() => setFeedback(null)}
            className="ml-4 w-8 h-8 border-2 border-black rounded-md bg-white text-black font-black"
          >
            X
          </button>
        </div>
      )}

      {/* ─── Transaction History ────────────────────────────────── */}
      <div className="bg-white border-2 border-black rounded-2xl p-4 sm:p-8 mb-8 shadow-hard">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black">ETH Transaction History</h2>
          {activity.length > 0 && (
            <span className="bg-[var(--color-yellow)] border-2 border-black px-4 py-2 rounded-full font-bold text-sm text-black">
              {activity.length} transactions
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-3 justify-center py-16">
            <div className="spinner border-black border-t-black" />
            <span className="text-black font-bold uppercase text-sm">Loading activity...</span>
          </div>
        )}

        {!loading && activity.length === 0 && (
          <div className="bg-[#f4f4f5] border-2 border-dashed border-black/30 rounded-xl p-12 text-center">
            <p className="text-black/60 font-bold uppercase">No ETH transactions yet</p>
          </div>
        )}

        {!loading && activity.length > 0 && (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {activity.map((event, idx) => {
              const type = ACTIVITY_TYPES[event.type] || {
                label: event.type,
                color: "bg-[var(--color-gray-dark)]",
                icon: "•",
              };
              const date = new Date(event.timestamp);
              const dateStr = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const timeStr = date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-4 bg-[#f4f4f5] border-2 border-black/10 rounded-lg hover:border-black/30 transition-colors"
                >
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-lg border-2 border-black flex items-center justify-center text-lg font-black flex-shrink-0 ${type.color}`}
                  >
                    {type.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-black uppercase text-sm tracking-tight">{type.label}</h3>
                    {event.details && (
                      <p className="text-sm text-black/70 font-medium mt-1 break-words line-clamp-2">{event.details}</p>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div className="sm:text-right flex-shrink-0">
                    <p className="text-xs font-bold text-black/60 uppercase tracking-wider">{dateStr}</p>
                    <p className="text-xs font-bold text-black/50 uppercase">{timeStr}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Account Actions ──────────────────────────────────────── */}
      <div className="border-t-4 border-black pt-8">
        <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-8">Account Actions</h2>

        <div className="bg-[#ff5f57] border-4 border-black rounded-2xl p-8 shadow-hard-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-lg border-2 border-black bg-white flex items-center justify-center text-2xl font-black text-black">
              ⚠
            </div>
            <div>
              <h3 className="font-black text-white text-lg uppercase tracking-tight">Delete Account</h3>
              <p className="text-white/80 font-medium text-sm mt-1">
                This action is permanent. All your data will be erased.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full bg-white text-black border-2 border-black font-bold uppercase tracking-wider py-4 px-6 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ff5f57] hover:text-white transition-colors translate-push"
          >
            Delete My Account & Data
          </button>
        </div>
      </div>

      {/* ─── Delete Confirmation Modal ────────────────────────── */}
      {showDeleteModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm anim-in m-0 top-0 left-0 w-full h-screen">
            <div className="neo-card-lg p-5 sm:p-8 max-w-2xl w-full relative">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setDeleteFeedback(null);
                }}
                className="absolute top-4 right-4 w-10 h-10 bg-white border-2 border-black rounded-full flex items-center justify-center font-black text-xl hover:bg-[#ff5f57] hover:text-white transition-colors shadow-hard"
              >
                ✕
              </button>

              <h2 className="text-3xl font-black uppercase mb-4 tracking-tight pr-12">Delete Account?</h2>

              <div className="bg-[#ff5f57] border-2 border-black p-4 rounded-lg mb-6">
                <p className="text-white font-bold text-sm uppercase">
                  ⚠ This action cannot be undone. All commitments, proofs, and account data will be permanently
                  deleted.
                </p>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-black font-bold uppercase text-sm block mb-2">Type to confirm:</span>
                  <input
                    type="text"
                    placeholder="DELETE ACCOUNT"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                    className="neo-input w-full border-2 border-black rounded-lg px-4 py-3 font-bold uppercase tracking-widest text-center"
                  />
                </label>

                {deleteFeedback && (
                  <div
                    className={`border-2 border-black rounded-lg px-4 py-3 shadow-hard ${
                      deleteFeedback.type === "success"
                        ? "bg-[var(--color-sage)] text-black"
                        : "bg-[#ff5f57] text-white"
                    }`}
                  >
                    <p className="font-bold uppercase text-xs tracking-wide">{deleteFeedback.message}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText("");
                    setDeleteFeedback(null);
                  }}
                  className="neo-btn neo-btn-white flex-1 py-3 translate-push"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE ACCOUNT" || isDeleting}
                  className="flex-1 bg-[#ff5f57] text-white border-2 border-black font-black uppercase py-3 px-4 rounded-lg shadow-hard disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-[#ff3a2f] transition-colors translate-push"
                >
                  {isDeleting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
