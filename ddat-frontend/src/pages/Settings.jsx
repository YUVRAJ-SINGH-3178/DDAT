import { useEffect, useState } from "react";
import { apiRequest } from "../lib/apiClient";

const FALLBACK_LABS = [
  { key: "bhaskarcharya", name: "Bhaskarcharya Lab", focus: "Web3 and Blockchain" },
  { key: "prajna-kritrima", name: "Prajna Kritrima Lab", focus: "AI/ML, Deep Learning and Generative AI" },
  { key: "aanu-tattva", name: "Aanu Tattva Lab", focus: "Quantum Computing and Quantum Machine Learning" },
  { key: "chitra-darshan", name: "Chitra Darshan Lab", focus: "Game Development, AR, VR and Mixed Reality" },
  { key: "varahamihira", name: "Varahamihira Lab", focus: "Cloud Computing and Cybersecurity" },
  { key: "agastya", name: "Agastya Lab", focus: "Robotics, IoT and Embedded Systems" },
  { key: "navya-vigyan", name: "Navya Vigyan Lab", focus: "Interdisciplinary and Experimental Technology" },
];

function normalizeRole(role) {
  const value = String(role || "").toLowerCase();
  if (value === "employee") return "member";
  if (value === "enterprise_admin") return "executive";
  if (["member", "affiliate", "executive"].includes(value)) return value;
  return "member";
}

function hasMeaningfulProfile(profile) {
  if (!profile) return false;
  return Boolean(
    String(profile.displayName || "").trim() ||
      String(profile.organization || "").trim() ||
      String(profile.labKey || "").trim() ||
      String(profile.email || "").trim()
  );
}

export default function Settings({ wallet, setWallet, setProfile }) {
  const [labs, setLabs] = useState([]);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    role: "member",
    organization: "",
    labKey: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localProfile, setLocalProfile] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const profileCacheKey = wallet ? `profile:${wallet.toLowerCase()}` : "";
  const settingsCacheKey = wallet ? `settings-form:${wallet.toLowerCase()}` : "";
  const labsCacheKey = wallet ? `labs:${wallet.toLowerCase()}` : "";

  useEffect(() => {
    if (!wallet) return;

    let active = true;
    let cachedProfileObject = null;

    // Load cached settings first to prevent blank forms after refresh.
    if (settingsCacheKey) {
      const cachedForm = localStorage.getItem(settingsCacheKey);
      if (cachedForm) {
        try {
          const parsed = JSON.parse(cachedForm);
          setForm((prev) => ({ ...prev, ...parsed }));
        } catch {
          localStorage.removeItem(settingsCacheKey);
        }
      }
    }

    if (labsCacheKey) {
      const cachedLabs = localStorage.getItem(labsCacheKey);
      if (cachedLabs) {
        try {
          const parsed = JSON.parse(cachedLabs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLabs(parsed);
          }
        } catch {
          localStorage.removeItem(labsCacheKey);
        }
      }
    }

    if (profileCacheKey) {
      const cachedProfile = localStorage.getItem(profileCacheKey);
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          cachedProfileObject = parsed;
          setLocalProfile(parsed);
          setProfile?.(parsed);
        } catch {
          localStorage.removeItem(profileCacheKey);
        }
      }
    }

    const loadSettings = async () => {
      setLoading(true);
      try {
        const [labsPayload, profilePayload] = await Promise.all([
          apiRequest("/tasks/labs/list"),
          apiRequest(`/user/${wallet}/profile`),
        ]);

        if (!active) return;

        if (labsPayload?.success) {
          const nextLabs = labsPayload.data || [];
          setLabs(nextLabs);
          if (labsCacheKey) localStorage.setItem(labsCacheKey, JSON.stringify(nextLabs));
        } else {
          setLabs((prev) => (prev.length > 0 ? prev : FALLBACK_LABS));
        }

        if (profilePayload?.success) {
          const profileData = profilePayload.data || {};
          const shouldUseCached = !hasMeaningfulProfile(profileData) && hasMeaningfulProfile(cachedProfileObject);
          const effectiveProfile = shouldUseCached ? cachedProfileObject : profileData;

          setLocalProfile(effectiveProfile);
          if (setProfile) setProfile(effectiveProfile);
          const nextForm = {
            displayName: effectiveProfile.displayName || "",
            email: effectiveProfile.email || "",
            role: normalizeRole(effectiveProfile.role),
            organization: effectiveProfile.organization || "",
            labKey: effectiveProfile.labKey || labsPayload?.data?.[0]?.key || FALLBACK_LABS[0].key,
          };
          setForm(nextForm);
          if (settingsCacheKey) localStorage.setItem(settingsCacheKey, JSON.stringify(nextForm));
          if (profileCacheKey) localStorage.setItem(profileCacheKey, JSON.stringify(effectiveProfile));

          // Self-heal backend profile if API returned an empty profile but cache has valid data.
          if (shouldUseCached) {
            apiRequest(`/user/${wallet}/profile`, {
              method: "POST",
              body: JSON.stringify({
                displayName: effectiveProfile.displayName || "",
                email: effectiveProfile.email || "",
                role: normalizeRole(effectiveProfile.role),
                organization: effectiveProfile.organization || "",
                labKey: effectiveProfile.labKey || "",
              }),
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setFeedback({ type: "error", message: err.message || "Could not load settings." });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSettings();

    return () => {
      active = false;
    };
  }, [wallet, setProfile, profileCacheKey, settingsCacheKey, labsCacheKey]);

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (settingsCacheKey) {
        localStorage.setItem(settingsCacheKey, JSON.stringify(next));
      }
      return next;
    });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!wallet) return;

    if (!form.displayName.trim() || !form.organization.trim() || !form.labKey) {
      setFeedback({ type: "error", message: "Name, organization, and lab are required." });
      return;
    }

    if (form.email && !form.email.toLowerCase().endsWith("@srmap.edu.in")) {
      setFeedback({ type: "error", message: "Email must be from @srmap.edu.in domain." });
      return;
    }

    setSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const payload = await apiRequest(`/user/${wallet}/profile`, {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (payload.data) {
        if (profileCacheKey) localStorage.setItem(profileCacheKey, JSON.stringify(payload.data));
        if (settingsCacheKey) {
          localStorage.setItem(
            settingsCacheKey,
            JSON.stringify({
              displayName: payload.data.displayName || form.displayName || "",
              email: payload.data.email || form.email || "",
              role: normalizeRole(payload.data.role),
              organization: payload.data.organization || form.organization || "",
              labKey: payload.data.labKey || form.labKey || "",
            })
          );
        }
      }
      
      // Reload profile to get updated requestedRole info
      const profileData = await apiRequest(`/user/${wallet}/profile`);
      if (profileData?.success) {
        setLocalProfile(profileData.data);
        if (setProfile) setProfile(profileData.data);
        if (profileCacheKey) localStorage.setItem(profileCacheKey, JSON.stringify(profileData.data));
        if (settingsCacheKey) {
          localStorage.setItem(
            settingsCacheKey,
            JSON.stringify({
              displayName: profileData.data.displayName || "",
              email: profileData.data.email || "",
              role: normalizeRole(profileData.data.role),
              organization: profileData.data.organization || "",
              labKey: profileData.data.labKey || form.labKey || "",
            })
          );
        }
      }
      
      setFeedback({ type: "success", message: payload.message || "Profile updated." });
    } catch (err) {
      setFeedback({ type: "error", message: err.message || "Failed to save profile." });
    } finally {
      setSaving(false);
    }
  };

  const disconnectWallet = () => {
    localStorage.setItem("walletDisconnected", "true");
    setWallet?.(null);
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
    <div className="anim-in mx-auto w-full max-w-3xl pt-8 px-4 pb-20">
      <div className="mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tighter text-white mb-2">Enterprise Settings</h1>
        <p className="text-white/60 font-medium">Configure your role, organization and default lab.</p>
      </div>

      <div className="neo-card p-8">
        {loading ? (
          <div className="flex items-center gap-3 justify-center py-14">
            <div className="spinner border-black border-t-black" />
            <span className="text-black font-bold uppercase text-sm">Loading settings...</span>
          </div>
        ) : (
          <form onSubmit={saveProfile} className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Display Name</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => updateField("displayName", e.target.value)}
                className="neo-input"
                placeholder="Aarav Sharma"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="neo-input"
                placeholder="your.email@srmap.edu.in"
                disabled={saving}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Role</label>
                <select value={form.role} onChange={(e) => updateField("role", e.target.value)} className="neo-input" disabled={saving}>
                  <option value="member">Member</option>
                  <option value="affiliate">Affiliate</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Organization</label>
                <input
                  type="text"
                  value={form.organization}
                  onChange={(e) => updateField("organization", e.target.value)}
                  className="neo-input"
                  placeholder="Singularity Lab"
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-black">Primary Lab</label>
              <select value={form.labKey} onChange={(e) => updateField("labKey", e.target.value)} className="neo-input" disabled={saving}>
                {labs.map((lab) => (
                  <option key={lab.key} value={lab.key}>
                    {lab.name} • {lab.focus}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold uppercase text-black/60 bg-[#f4f4f5] border-2 border-black rounded-lg p-3 break-all">
              Wallet identity: {wallet}
            </div>

            {localProfile?.requestedRole && (
              <div className="border-2 border-black rounded-lg p-4 shadow-hard bg-[var(--color-yellow)]">
                <p className="font-bold uppercase text-sm text-black mb-2">⏳ Role Change Pending Approval</p>
                <p className="text-xs font-medium text-black/70">
                  You have requested to change your role from <span className="font-bold uppercase">{localProfile.role}</span> to <span className="font-bold uppercase">{localProfile.requestedRole}</span>
                </p>
                <p className="text-xs font-medium text-black/60 mt-2">
                  Awaiting approval from an executive. This change will be automatically applied once approved.
                </p>
              </div>
            )}

            {form.role !== normalizeRole(localProfile?.role) && !localProfile?.requestedRole && (
              <div className="border-2 border-black rounded-lg p-4 shadow-hard bg-[var(--color-cream)]">
                <p className="font-bold uppercase text-sm text-black mb-2">ℹ️ Role Change Request</p>
                <p className="text-xs font-medium text-black/70">
                  When you save, your role change to <span className="font-bold uppercase">{form.role}</span> will be submitted for executive approval.
                </p>
              </div>
            )}

            {feedback.message && (
              <div className={`border-2 border-black rounded-lg p-3 shadow-hard ${feedback.type === "error" ? "bg-[#ff5f57] text-white" : "bg-[var(--color-sage)] text-black"}`}>
                <p className="font-bold uppercase text-xs tracking-wide">{feedback.message}</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <button type="submit" disabled={saving} className="neo-btn neo-btn-sage justify-center translate-push">
                {saving ? "Saving..." : "Save Profile"}
              </button>
              <button type="button" onClick={disconnectWallet} className="neo-btn bg-[#ff5f57] text-white justify-center translate-push">
                Disconnect Wallet
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
