import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, X, Check, Users, Shuffle, Loader2, GripVertical, Edit3, Trash2, Lock
} from "lucide-react";
import { createGroup } from "../api/client";
import { useGroup } from "../App";
import AddCategoryModal from "../components/AddCategoryModal";

const EMOJIS = ["😊", "🦊", "🐱", "🐼", "🐸", "🐙", "🦄", "🌈"];
const COLORS = ["#105D5E", "#009A6E", "#B3EDA9", "#E8E300", "#767F7D", "#C2CBC9", "#293E33", "#FFFFFF"];

const DEFAULT_CATEGORIES = [
  { name: "Rent", emoji: "🏠", color: "#105D5E", split_model: "equal", is_default: true },
  { name: "Utilities", emoji: "⚡", color: "#E8E300", split_model: "equal", is_default: true },
  { name: "Groceries", emoji: "🛒", color: "#009A6E", split_model: "equal", is_default: true },
  { name: "Repairs", emoji: "🔧", color: "#767F7D", split_model: "equal", is_default: true },
  { name: "Outings", emoji: "🎉", color: "#B3EDA9", split_model: "pay_as_you_go", is_default: true },
  { name: "Other", emoji: "📦", color: "#C2CBC9", split_model: "equal", is_default: true },
];

const modelOptions = [
  { value: "equal", label: "Equal split" },
  { value: "room_size", label: "Room-size weighted" },
  { value: "income_weighted", label: "Income weighted" },
  { value: "shared_pot", label: "Shared pot" },
  { value: "pay_as_you_go", label: "Pay-as-you-go" },
  { value: "custom", label: "Custom percentages" },
];

export default function GroupSetup() {
  const navigate = useNavigate();
  const { setCurrentGroup } = useGroup();

  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState([
    { name: "", color: COLORS[0], emoji: EMOJIS[0] },
    { name: "", color: COLORS[1], emoji: EMOJIS[1] },
  ]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, sort_order: i })));
  const [settlementThreshold, setSettlementThreshold] = useState(500);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdGroup, setCreatedGroup] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);

  const addMember = () => {
    if (members.length >= 8) return;
    const idx = members.length;
    setMembers([...members, { name: "", color: COLORS[idx % COLORS.length], emoji: EMOJIS[idx % EMOJIS.length] }]);
  };

  const removeMember = (idx) => {
    if (members.length <= 2) return;
    setMembers(members.filter((_, i) => i !== idx));
  };

  const updateMember = (idx, field, value) => {
    setMembers(members.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) { setError("Please enter a group name."); return; }
    const validMembers = members.filter((m) => m.name.trim());
    if (validMembers.length < 2) { setError("Please add at least 2 members."); return; }

    setCreating(true); setError("");
    try {
      const res = await createGroup({
        name: groupName.trim(),
        members: validMembers,
        settlement_threshold: settlementThreshold,
        fairness_models: categories.map((c) => ({ category: c.name, model_type: c.split_model })),
      });
      const groupRes = await fetch(`/api/groups/id/${res.data.id}`);
      const groupData = await groupRes.json();
      setCreatedGroup({ ...groupData.data, code: res.data.code });
      setCurrentGroup(groupData.data);
    } catch (err) {
      setError(err.message || "Failed to create group.");
    } finally { setCreating(false); }
  };

  const copyCode = () => {
    if (createdGroup) {
      navigator.clipboard.writeText(createdGroup.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goToGroup = () => {
    if (createdGroup) navigate(`/group/${createdGroup.code}`);
  };

  // Category management
  const handleAddCategory = (catData) => {
    if (editingCategory) {
      setCategories(categories.map((c) =>
        c.sort_order === editingCategory.sort_order && c.name === editingCategory.name
          ? { ...c, ...catData, is_default: c.is_default }
          : c
      ));
    } else {
      const maxOrder = Math.max(...categories.map((c) => c.sort_order), 0);
      setCategories([...categories, { ...catData, is_default: false, sort_order: maxOrder + 1 }]);
    }
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = (cat) => {
    if (cat.is_default) return;
    setDeleteConfirm(cat);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      setCategories(categories.filter((c) => c.name !== deleteConfirm.name));
      setDeleteConfirm(null);
    }
  };

  const handleDragStart = (idx) => setDragIndex(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    const newCats = [...categories];
    const [moved] = newCats.splice(dragIndex, 1);
    newCats.splice(idx, 0, moved);
    setCategories(newCats.map((c, i) => ({ ...c, sort_order: i })));
    setDragIndex(idx);
  };
  const handleDragEnd = () => setDragIndex(null);

  const updateSplitModel = (idx, value) => {
    setCategories(categories.map((c, i) => (i === idx ? { ...c, split_model: value } : c)));
  };

  const existingNames = categories.map((c) => c.name);

  if (createdGroup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card max-w-md w-full text-center p-8">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="font-heading font-bold text-2xl text-text-dark mb-2">Group Created!</h2>
          <p className="text-text-muted mb-6">Share this code with your group members so they can join.</p>
          <div onClick={copyCode} className="cursor-pointer inline-flex items-center gap-3 bg-highlight/30 border-2 border-dashed border-primary/30 rounded-xl px-6 py-4 mb-6 hover:border-primary/60 transition-all">
            <span className="font-mono font-bold text-3xl tracking-[0.3em] text-primary">{createdGroup.code}</span>
            {copied ? <Check size={20} className="text-success" /> : <span className="text-xs text-text-muted">Tap to copy</span>}
          </div>
          <p className="text-xs text-text-muted mb-6">
            Or share this link:<br />
            <span className="text-primary font-mono text-sm">{window.location.origin}/group/{createdGroup.code}</span>
          </p>
          <button onClick={goToGroup} className="btn-primary w-full">Go to Group →</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 max-w-2xl mx-auto flex items-center gap-3">
        <Link to="/" className="p-2 rounded-lg hover:bg-background transition-colors">
          <ArrowLeft size={20} className="text-text-muted" />
        </Link>
        <div>
          <h1 className="font-heading font-bold text-lg text-text-dark">Create a Group</h1>
          <p className="text-xs text-text-muted">Step {step} of 3</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pb-20">
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Group Name & Members */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading font-bold text-xl text-text-dark mb-1">Name your group</h2>
              <p className="text-text-muted text-sm mb-6">Something like "Flat 4B", "The Squad", or "Us"</p>

              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Flat 4B" className="input-field mb-8 text-lg" autoFocus />

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-text-dark">Members</h3>
                <button onClick={addMember} disabled={members.length >= 8} className="btn-ghost text-sm"><Plus size={16} /> Add</button>
              </div>

              <div className="space-y-3 mb-8">
                {members.map((member, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3">
                    <button onClick={() => { const ne = EMOJIS[(EMOJIS.indexOf(member.emoji) + 1) % EMOJIS.length]; updateMember(idx, "emoji", ne); }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg hover:ring-2 ring-primary/30 transition-all"
                      style={{ backgroundColor: member.color + "20" }}>
                      {member.emoji}
                    </button>
                    <input type="text" value={member.name} onChange={(e) => updateMember(idx, "name", e.target.value)} placeholder={`Member ${idx + 1}`} className="input-field flex-1" />
                    <div className="flex gap-1">
                      {COLORS.slice(0, 4).map((c) => (
                        <button key={c} onClick={() => updateMember(idx, "color", c)}
                          className={`w-6 h-6 rounded-full transition-all ${member.color === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    {members.length > 2 && (
                      <button onClick={() => removeMember(idx)} className="p-1.5 rounded-lg hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"><X size={16} /></button>
                    )}
                  </motion.div>
                ))}
              </div>

              <button onClick={() => setStep(2)} className="btn-primary w-full"
                disabled={!groupName.trim() || members.filter((m) => m.name.trim()).length < 2}>
                Continue →
              </button>
            </motion.div>
          )}

          {/* Step 2: Custom Categories */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading font-bold text-xl text-text-dark mb-1">Fairness per category</h2>
              <p className="text-text-muted text-sm mb-6">Choose how each type of expense should be split. Add your own categories too.</p>

              {/* Category list */}
              <div className="space-y-2 mb-6">
                {categories.length === 0 && (
                  <div className="text-center py-8 card">
                    <p className="text-text-muted text-sm">These are your starter categories. Add your own to make it feel like home 🏡</p>
                  </div>
                )}

                <AnimatePresence>
                  {categories.map((cat, idx) => (
                    <motion.div
                      key={cat.name}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0, backgroundColor: dragIndex === idx ? "rgba(179,237,169,0.3)" : undefined }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.2 }}
                      className="card flex items-center gap-2 py-3 px-4"
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                    >
                      {/* Drag handle */}
                      <button className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-dark transition-colors touch-none">
                        <GripVertical size={16} />
                      </button>

                      {/* Emoji */}
                      <span className="text-lg w-8 text-center">{cat.emoji}</span>

                      {/* Name + badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-dark truncate">{cat.name}</span>
                          {cat.is_default ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-highlight/30 text-text-dark" title="Default category — name is locked">
                              <Lock size={10} /> Default
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-highlight text-text-dark font-medium">Custom</span>
                          )}
                        </div>
                      </div>

                      {/* Split Model */}
                      <select
                        value={cat.split_model}
                        onChange={(e) => updateSplitModel(idx, e.target.value)}
                        className="text-xs border border-border rounded-lg px-2 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {modelOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>

                      {/* Edit */}
                      <button onClick={() => handleEditCategory(cat)} className="p-1.5 rounded-lg hover:bg-background text-text-muted hover:text-primary transition-colors">
                        <Edit3 size={14} />
                      </button>

                      {/* Delete (only for custom) */}
                      {!cat.is_default && (
                        <button onClick={() => handleDeleteCategory(cat)} className="p-1.5 rounded-lg hover:bg-accent/10 text-text-muted hover:text-accent transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add Category Button */}
                {categories.length < 15 && (
                  <button
                    onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
                    className="w-full py-3 rounded-xl border-1.5 border-dashed border-success text-success text-sm font-medium hover:bg-highlight transition-all flex items-center justify-center gap-2"
                    style={{ borderStyle: "dashed", borderWidth: "1.5px" }}
                  >
                    <Plus size={16} />
                    Add a Category
                  </button>
                )}

                {categories.length >= 15 && (
                  <p className="text-xs text-text-muted text-center mt-2">
                    Maximum 15 categories reached. Delete one to add more.
                  </p>
                )}
              </div>

              {/* Settlement threshold */}
              <div className="card mb-8">
                <label className="block text-sm font-medium text-text-dark mb-2">Settlement threshold</label>
                <p className="text-xs text-text-muted mb-3">Alert when someone is ahead by more than this amount.</p>
                <div className="flex items-center gap-3">
                  <span className="text-text-muted">₹</span>
                  <input type="number" value={settlementThreshold}
                    onChange={(e) => setSettlementThreshold(parseInt(e.target.value) || 0)}
                    className="input-field flex-1" min={0} step={100} />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1">Review & Create →</button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review & Create */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-heading font-bold text-xl text-text-dark mb-1">Review & Create</h2>
              <p className="text-text-muted text-sm mb-6">Looks good? Let's go!</p>

              <div className="card mb-4">
                <h3 className="font-semibold text-text-dark mb-3">{groupName}</h3>
                <div className="flex flex-wrap gap-2">
                  {members.filter((m) => m.name.trim()).map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
                      style={{ backgroundColor: m.color + "15", color: m.color }}>
                      <span>{m.emoji}</span>{m.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card mb-8">
                <h3 className="font-semibold text-text-dark mb-3">Categories & Fairness</h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-sm py-1">
                      <span className="flex items-center gap-2">
                        <span>{cat.emoji}</span>
                        <span className="text-text-dark">{cat.name}</span>
                        {cat.is_default && <span className="text-[10px] text-text-muted">(Default)</span>}
                      </span>
                      <span className="text-text-muted text-xs">{modelOptions.find((o) => o.value === cat.split_model)?.label || cat.split_model}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <span className="text-sm text-text-muted">Settlement alert: ₹{settlementThreshold}</span>
                </div>
              </div>

              {error && <p className="text-accent text-sm mb-4">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1">
                  {creating ? <><Loader2 size={18} className="animate-spin" /> Creating...</> : <><Shuffle size={18} /> Create Group</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add/Edit Category Modal */}
      <AddCategoryModal
        isOpen={showCategoryModal}
        onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
        onSave={handleAddCategory}
        existingNames={existingNames}
        initialData={editingCategory}
      />

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-surface rounded-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-heading font-bold text-lg text-text-dark mb-2">Delete '{deleteConfirm.name}'?</h3>
              <p className="text-sm text-text-muted mb-6">Existing expenses in this category will be moved to 'Other'.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={confirmDelete} className="btn-primary bg-accent hover:bg-accent/80 flex-1">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
