import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import MemberSelector from "../components/MemberSelector";

const FALLBACK_LABS = [
  { key: "bhaskarcharya", name: "Bhaskarcharya Lab", focus: "Web3 and Blockchain" },
  { key: "prajna-kritrima", name: "Prajna Kritrima Lab", focus: "AI/ML, Deep Learning and Generative AI" },
  { key: "aanu-tattva", name: "Aanu Tattva Lab", focus: "Quantum Computing and Quantum Machine Learning" },
  { key: "chitra-darshan", name: "Chitra Darshan Lab", focus: "Game Development, AR, VR and Mixed Reality" },
  { key: "varahamihira", name: "Varahamihira Lab", focus: "Cloud Computing and Cybersecurity" },
  { key: "agastya", name: "Agastya Lab", focus: "Robotics, IoT and Embedded Systems" },
  { key: "navya-vigyan", name: "Navya Vigyan Lab", focus: "Interdisciplinary and Experimental Technology" },
];

async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeRole(role) {
  const value = String(role || "").toLowerCase();
  if (value === "employee") return "member";
  if (value === "enterprise_admin") return "executive";
  if (["member", "affiliate", "executive"].includes(value)) return value;
  return "member";
}

export default function CreateCommitment({ wallet }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [labs, setLabs] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [labKey, setLabKey] = useState("");
  const [source, setSource] = useState("employee");
  const [assignedToWallet, setAssignedToWallet] = useState("");
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    const loadMeta = async () => {
      try {
        const [labsRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/tasks/labs/list`),
          fetch(`${API_BASE}/user/${wallet}/profile`),
        ]);
        const [labsPayload, profilePayload] = await Promise.all([
          safeJson(labsRes),
          safeJson(profileRes),
        ]);

        if (labsPayload?.success) {
          const nextLabs = labsPayload.data || [];
          setLabs(nextLabs);
          if (!labKey && nextLabs?.[0]?.key) {
            setLabKey(nextLabs[0].key);
          }
        } else {
          setLabs(FALLBACK_LABS);
          if (!labKey && FALLBACK_LABS[0]?.key) {
            setLabKey(FALLBACK_LABS[0].key);
          }
        }

        if (profilePayload?.success) {
          setProfile(profilePayload.data);
          if (profilePayload.data?.labKey && !labKey) {
            setLabKey(profilePayload.data.labKey);
          }
          if (["affiliate", "executive"].includes(normalizeRole(profilePayload.data?.role))) {
            setSource("enterprise");
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadMeta();
  }, [wallet, labKey]);

  const canCreateEnterpriseTask = useMemo(
    () => ["affiliate", "executive"].includes(normalizeRole(profile?.role)),
    [profile]
  );
  const isMember = useMemo(() => normalizeRole(profile?.role) === "member", [profile]);

  useEffect(() => {
    if (!wallet || !isMember) return;
    setAssignedToWallet(wallet.toLowerCase());
    setSource("employee");
  }, [wallet, isMember]);

  useEffect(() => {
    if (!workDate) return;
    if (!endDate || endDate < workDate) {
      setEndDate(workDate);
    }
  }, [workDate, endDate]);

  const submitTask = async (e) => {
    e.preventDefault();
    if (!wallet) return;

    if (!profile?.organization) {
      setStatus({ type: "error", message: "Set organization in Settings first." });
      return;
    }

    if (!title || !labKey || !workDate || !endDate) {
      setStatus({ type: "error", message: "Title, lab, start date and end date are required." });
      return;
    }

    if (endDate < workDate) {
      setStatus({ type: "error", message: "End date cannot be earlier than start date." });
      return;
    }

    if (source === "enterprise" && !canCreateEnterpriseTask) {
      setStatus({ type: "error", message: "Only affiliates and executives can create enterprise tasks." });
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          organization: profile.organization,
          labKey,
          source,
          createdByWallet: wallet,
          assignedToWallet: (isMember ? wallet : assignedToWallet).trim().toLowerCase(),
          workDate,
          endDate,
        }),
      });

      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error || "Could not create task");

      setStatus({ type: "success", message: "Task created successfully." });
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Task creation failed." });
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="neo-card p-12 max-w-md w-full">
          <h1 className="text-4xl font-black tracking-tight mb-4 uppercase">Connect Wallet</h1>
          <p className="text-black/70 font-medium mb-8">Connect your wallet to create a task.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto anim-in pt-8 px-4 pb-20">
      <div className="bg-[var(--color-yellow)] border-2 border-black rounded-t-2xl p-8 shadow-hard relative z-10">
        <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tighter mb-4 text-black uppercase leading-[0.9]">
          Create Daily
          <br />
          Task
        </h1>
        <p className="font-bold text-black/70">
          Assign work by lab and route it into enterprise voting.
        </p>
      </div>

      <div className="bg-white border-x-2 border-b-2 border-black rounded-b-2xl p-8 shadow-hard relative z-0 -mt-2">
        <form onSubmit={submitTask} className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Design token-gated dashboard for Bhaskarcharya Lab"
              className="neo-input"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Task Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Context, expected output, and acceptance criteria"
              className="neo-input resize-y"
              disabled={loading}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Lab</label>
              <select value={labKey} onChange={(e) => setLabKey(e.target.value)} className="neo-input" disabled={loading}>
                {labs.map((lab) => (
                  <option key={lab.key} value={lab.key}>{lab.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Start Date</label>
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="neo-input"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">End Date</label>
              <input
                type="date"
                value={endDate}
                min={workDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="neo-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Task Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="neo-input"
                disabled={loading || !canCreateEnterpriseTask}
              >
                {canCreateEnterpriseTask && <option value="enterprise">Enterprise Assigned</option>}
                <option value="employee">Employee Self Created</option>
              </select>
            </div>
          </div>

          <MemberSelector
            labKey={labKey}
            selectedWallet={assignedToWallet}
            onWalletChange={(wallet) => setAssignedToWallet(wallet)}
            requesterWallet={wallet}
            includeAllMembers={canCreateEnterpriseTask}
            disabled={loading || isMember}
          />

          {isMember && (
            <p className="text-xs font-bold uppercase text-black/60">
              Member accounts can only assign tasks to themselves.
            </p>
          )}

          {status.message && (
            <div className={`border-2 border-black rounded-lg p-3 shadow-hard ${status.type === "error" ? "bg-[#ff5f57] text-white" : "bg-[var(--color-sage)] text-black"}`}>
              <p className="font-bold uppercase text-xs tracking-wide">{status.message}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="neo-btn w-full justify-center py-4 text-lg translate-push mt-2">
            {loading ? "Creating Task..." : "Create Task"}
          </button>
        </form>
      </div>
    </div>
  );
}
