import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useGroup } from "../App";

// Categories from group data - defaults if not loaded yet
function getGroupCategories(group) {
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

export default function ExpenseForm({ isOpen, onClose, onSubmit, initialData }) {
  const { currentGroup } = useGroup();
  const [form, setForm] = useState({
    amount: "",
    paid_by: "",
    category: "Other",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
    split_type: "equal",
    split_members: [],
  });

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
      setForm({
        amount: String(initialData.amount),
        paid_by: String(initialData.paid_by),
        category: initialData.category,
        description: initialData.description || "",
        expense_date: initialData.expense_date,
        split_type: initialData.split_type || "equal",
        split_members: initialData.splits?.map((s) => s.member_id) || [],
      });
    } else {
      setForm({
        amount: "",
        paid_by: "",
        category: "Other",
        description: "",
        expense_date: new Date().toISOString().split("T")[0],
        split_type: "equal",
        split_members: [],
      });
    }
  }, [initialData, isOpen]);

  const members = currentGroup?.members || [];
  const isEditing = !!initialData;

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return;
    if (!form.paid_by) return;

    onSubmit({
      group_id: currentGroup.id,
      paid_by: parseInt(form.paid_by),
      amount,
      category: form.category,
      description: form.description,
      expense_date: form.expense_date,
      split_type: form.split_type,
      split_members:
        form.split_members.length > 0
          ? form.split_members.map(Number)
          : members.map((m) => m.id),
    });
  };

  const toggleMember = (id) => {
    setForm((f) => ({
      ...f,
      split_members: f.split_members.includes(id)
        ? f.split_members.filter((m) => m !== id)
        : [...f.split_members, id],
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-surface rounded-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-auto p-6 md:m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading font-bold text-xl text-text-dark">
                {isEditing ? "Edit Expense" : "Add Expense"}
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-background transition-colors"
              >
                <X size={20} className="text-text-muted" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-medium">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, amount: e.target.value }))
                    }
                    className="input-field pl-8"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              {/* Paid By */}
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">
                  Paid by
                </label>
                <select
                  value={form.paid_by}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paid_by: e.target.value }))
                  }
                  className="input-field"
                  required
                >
                  <option value="">Select a member...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.emoji} {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {getGroupCategories(currentGroup).map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: cat.name }))}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        form.category === cat.name
                          ? "bg-primary text-background"
                          : "bg-highlight/30 text-text-muted hover:bg-highlight"
                      }`}
                    >
                      {cat.emoji || "📦"} {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">
                  Description{" "}
                  <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="input-field"
                  placeholder="What was this for?"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={form.expense_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expense_date: e.target.value }))
                  }
                  className="input-field"
                />
              </div>

              {/* Split Type */}
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">
                  Split type
                </label>
                <select
                  value={form.split_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, split_type: e.target.value }))
                  }
                  className="input-field"
                >
                  <option value="equal">Equal split</option>
                  <option value="custom_amounts">Custom amounts</option>
                  <option value="custom_percentages">Custom percentages</option>
                </select>
              </div>

              {/* Split Members */}
              <div>
                <label className="block text-sm font-medium text-text-dark mb-1">
                  Split between{" "}
                  <span className="text-text-muted font-normal">
                    (all by default)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const isSelected =
                      form.split_members.length === 0 ||
                      form.split_members.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all ${
                          isSelected
                            ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                            : "bg-highlight/30 text-text-muted hover:bg-highlight"
                        }`}
                      >
                        <span>{m.emoji}</span>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={!form.amount || !form.paid_by}
                >
                  {isEditing ? "Update" : "Add Expense"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
