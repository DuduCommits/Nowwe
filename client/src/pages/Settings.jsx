import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Edit3,
  Trash2,
  Save,
  AlertTriangle,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useGroup } from "../App";
import { updateGroup, removeMember } from "../api/client";

function getCategories(group) {
  return group?.categories?.length > 0
    ? group.categories
    : [
        { name: "Rent", emoji: "🏠" },
        { name: "Utilities", emoji: "⚡" },
        { name: "Groceries", emoji: "🛒" },
        { name: "Repairs", emoji: "🔧" },
        { name: "Outings", emoji: "🎉" },
        { name: "Other", emoji: "📦" },
      ];
}

const modelOptions = [
  { value: "equal", label: "Equal split" },
  { value: "room_size", label: "Room-size weighted" },
  { value: "income_weighted", label: "Income weighted" },
  { value: "shared_pot", label: "Shared pot" },
  { value: "pay_as_you_go", label: "Pay-as-you-go" },
];

export default function SettingsPage() {
  const { currentGroup, setCurrentGroup } = useGroup();
  const navigate = useNavigate();

  const [groupName, setGroupName] = useState(currentGroup?.name || "");
  const [currency, setCurrency] = useState(currentGroup?.currency || "₹");
  const [threshold, setThreshold] = useState(
    currentGroup?.settlement_threshold || 0
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    if (currentGroup) {
      setGroupName(currentGroup.name);
      setCurrency(currentGroup.currency || "₹");
      setThreshold(currentGroup.settlement_threshold || 0);
    }
  }, [currentGroup]);

  if (!currentGroup) return null;

  const members = currentGroup.members || [];
  const fairnessModels = currentGroup.fairness_models || [];

  const handleUpdateGroup = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateGroup(currentGroup.id, {
        name: groupName,
        currency,
        settlement_threshold: threshold,
      });
      setMessage("Group settings updated!");
      setCurrentGroup({ ...currentGroup, name: groupName, currency, settlement_threshold: threshold });
    } catch (err) {
      setMessage("Failed to update: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm("Remove this member? Their expenses will be reassigned."))
      return;
    try {
      await removeMember(currentGroup.id, memberId);
      const updatedMembers = members.filter((m) => m.id !== memberId);
      setCurrentGroup({ ...currentGroup, members: updatedMembers });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLeave = () => {
    if (confirm("Leave this group? You can rejoin with the group code.")) {
      setCurrentGroup(null);
      navigate("/");
    }
  };

  const handleReset = () => {
    if (
      !confirm(
        "Are you sure? This will delete all expenses, splits, and scenarios. This cannot be undone!"
      )
    )
      return;
    // Reset logic would go here — for now just show confirmation
    setShowReset(false);
    alert("Data reset is handled server-side. Contact your group admin.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-xl md:text-2xl text-text-dark">
          Settings
        </h1>
        <p className="text-sm text-text-muted">Manage your group</p>
      </div>

      {/* Group Info */}
      <div className="card">
        <h2 className="font-heading font-semibold text-text-dark mb-4 flex items-center gap-2">
          <SettingsIcon size={18} className="text-primary" />
          Group Settings
        </h2>

        <div className="space-y-4">
          <div>              <label className="block text-sm font-medium text-text-dark mb-1">
                Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                Currency Symbol
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-field"
              >
                <option value="₹">₹ (INR)</option>
                <option value="$">$ (USD)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                Settlement Threshold
              </label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                className="input-field"
                min={0}
                step={100}
              />
            </div>
          </div>

          <button
            onClick={handleUpdateGroup}
            disabled={saving}
            className="btn-primary"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>

          {message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-success"
            >
              {message}
            </motion.p>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="card">
        <h2 className="font-heading font-semibold text-text-dark mb-4 flex items-center gap-2">
          <Edit3 size={18} className="text-primary" />
          Members
        </h2>

        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 rounded-xl bg-highlight/20"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
                  style={{ backgroundColor: m.color + "20" }}
                >
                  {m.emoji}
                </div>
                <div>
                  <p className="font-medium text-text-dark text-sm">{m.name}</p>
                  <p className="text-xs text-text-muted">ID: {m.id}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveMember(m.id)}
                className="p-2 rounded-lg text-text-muted hover:bg-accent/10 hover:text-accent transition-colors"
                title="Remove member"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="card">
        <h2 className="font-heading font-semibold text-text-dark mb-4 flex items-center gap-2">
          <SettingsIcon size={18} className="text-primary" />
          Categories & Fairness
        </h2>

        <div className="space-y-3">
          {getCategories(currentGroup).map((cat) => {
            const model = fairnessModels.find((fm) => fm.category === cat.name);
            return (
              <div
                key={cat.name}
                className="flex items-center justify-between p-3 rounded-xl bg-highlight/20"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.emoji || "📦"}</span>
                  <span className="text-sm font-medium text-text-dark">{cat.name}</span>
                  {cat.is_default && <span className="text-[10px] text-text-muted">(Default)</span>}
                </div>
                <span className="text-xs text-text-muted">
                  {modelOptions.find((o) => o.value === model?.model_type)?.label ||
                    cat.split_model ? modelOptions.find((o) => o.value === cat.split_model)?.label || cat.split_model : "Equal split"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border border-accent/30">
        <h2 className="font-heading font-semibold text-text-dark mb-4 flex items-center gap-2 text-accent">
          <AlertTriangle size={18} />
          Danger Zone
        </h2>

        <div className="space-y-3">
          <button
            onClick={handleLeave}
            className="btn-secondary border-accent/30 text-accent hover:bg-accent/10 w-full"
          >
            <LogOut size={16} />
            Leave Group
          </button>

          {showReset ? (
            <div className="flex gap-3">
              <button
                onClick={() => setShowReset(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="btn-primary bg-accent hover:bg-accent/80 flex-1"
              >
                <RefreshCw size={16} />
                Confirm Reset
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowReset(true)}
              className="btn-secondary border-accent/30 text-accent hover:bg-accent/10 w-full"
            >
              <RefreshCw size={16} />
              Reset All Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
