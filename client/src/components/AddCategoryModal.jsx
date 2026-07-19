import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const EMOJI_GROUPS = [
  { label: "🏡 Home & Living", emojis: ["🏠", "🏢", "🛋️", "🛏️", "🧹", "🔑", "💡", "🔌"] },
  { label: "🚗 Transport", emojis: ["🚗", "🚌", "🚇", "⛽", "🅿️", "🚲", "🛵", "✈️"] },
  { label: "🍕 Food & Drinks", emojis: ["🍕", "🍔", "🥗", "🛒", "☕", "🍺", "🧃", "🥡"] },
  { label: "🎮 Entertainment", emojis: ["🎮", "🎬", "🎵", "📺", "🎯", "🎪", "🎨", "📚"] },
  { label: "💊 Health", emojis: ["💊", "🏥", "💉", "🩺", "🧘", "💪", "🧴", "🩹"] },
  { label: "📚 Education", emojis: ["📚", "✏️", "🎓", "📖", "💻", "📝", "🏫", "📐"] },
  { label: "✈️ Travel", emojis: ["✈️", "🏨", "🗺️", "🧳", "🏖️", "⛺", "🚢", "🏔️"] },
  { label: "🐾 Pets", emojis: ["🐾", "🐕", "🐈", "🦜", "🐰", "🦴", "🥩", "🏥"] },
  { label: "💡 Utilities", emojis: ["💡", "📱", "🌐", "📡", "🔋", "💻", "📺", "🎛️"] },
  { label: "💰 Finance", emojis: ["💰", "💳", "🏦", "📊", "🧾", "📈", "💸", "🔒"] },
  { label: "🎁 Gifts", emojis: ["🎁", "🎂", "🎉", "🎊", "💐", "🕯️", "🧧", "🏆"] },
];

const COLOR_OPTIONS = ["#105D5E", "#009A6E", "#B3EDA9", "#293E33", "#767F7D", "#C2CBC9", "#E8E300", "#FFFFFF"];

const SPLIT_OPTIONS = [
  { value: "equal", label: "Equal split" },
  { value: "pay_as_you_go", label: "Pay-as-you-go" },
  { value: "room_size", label: "Room-weighted" },
  { value: "income_weighted", label: "Income weighted" },
  { value: "custom", label: "Custom percentages" },
];

export default function AddCategoryModal({ isOpen, onClose, onSave, existingNames = [], initialData = null }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📦");
  const [color, setColor] = useState("#767F7D");
  const [splitModel, setSplitModel] = useState("equal");
  const [customEmoji, setCustomEmoji] = useState("");
  const [error, setError] = useState("");
  const isEditing = !!initialData;
  const isDefault = initialData?.is_default;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setEmoji(initialData.emoji || "📦");
      setColor(initialData.color || "#767F7D");
      setSplitModel(initialData.split_model || "equal");
      setCustomEmoji("");
      setError("");
    } else {
      setName("");
      setEmoji("📦");
      setColor("#767F7D");
      setSplitModel("equal");
      setCustomEmoji("");
      setError("");
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Category name cannot be empty.");
      return;
    }

    // Check for duplicates (case-insensitive, exclude current name if editing)
    const dup = existingNames.some(
      (n) => n.toLowerCase() === trimmedName.toLowerCase() && n !== (initialData?.name || "")
    );
    if (dup) {
      setError("This category already exists.");
      return;
    }

    const finalEmoji = customEmoji.trim() || emoji;
    onSave({
      name: trimmedName,
      emoji: finalEmoji,
      color,
      split_model: splitModel,
    });
  };

  const handleEmojiPick = (e) => {
    setEmoji(e);
    setCustomEmoji("");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-surface rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-auto p-6 md:m-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-bold text-xl text-text-dark">
              {isEditing ? (isDefault ? "Edit Default Category" : "Edit Category") : "Add a Category"}
            </h3>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-background transition-colors">
              <X size={20} className="text-text-muted" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                Category Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value.slice(0, 30));
                    setError("");
                  }}
                  placeholder="e.g. Fuel, Pet care, Streaming..."
                  className="input-field pr-14"
                  maxLength={30}
                  disabled={isDefault}
                  autoFocus={!isDefault}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                  {name.length}/30
                </span>
              </div>
              {isDefault && (
                <p className="text-xs text-text-muted mt-1 flex items-center gap-1">🔒 Default category — name is locked</p>
              )}
            </div>

            {/* Emoji Picker */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Pick an Emoji Icon
              </label>
              <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin">
                {EMOJI_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs text-text-muted font-medium mb-1">{group.label}</p>
                    <div className="flex flex-wrap gap-1">
                      {group.emojis.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => handleEmojiPick(e)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                            emoji === e && !customEmoji
                              ? "bg-primary/10 ring-2 ring-primary"
                              : "hover:bg-background"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <label className="text-xs text-text-muted font-medium">Or type any emoji</label>
                <input
                  type="text"
                  value={customEmoji}
                  onChange={(e) => {
                    setCustomEmoji(e.target.value);
                    if (e.target.value) setEmoji("");
                  }}
                  placeholder="e.g. 🌟"
                  className="input-field mt-1 text-lg text-center w-20"
                  maxLength={10}
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-text-muted">Selected:</span>
                <span className="text-2xl">{customEmoji || emoji}</span>
              </div>
            </div>

            {/* Color Tag */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Color Tag{" "}
                <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      color === c ? "ring-2 ring-primary ring-offset-2" : ""
                    }`}
                    style={{ backgroundColor: c, border: c === "#FFFFFF" ? "1px solid #C2CBC9" : "none" }}
                  />
                ))}
              </div>
            </div>

            {/* Split Model */}
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                Default Split Model
              </label>
              <select
                value={splitModel}
                onChange={(e) => setSplitModel(e.target.value)}
                className="input-field"
              >
                {SPLIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && <p className="text-accent text-sm">{error}</p>}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-ghost flex-1">
                Cancel
              </button>
              <button type="submit" className="btn-primary flex-1">
                {isEditing ? "Save Changes" : "Add Category"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
