import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Home,
  Zap,
  ShoppingCart,
  Wrench,
  PartyPopper,
  Package,
} from "lucide-react";
import { useGroup } from "../App";
import { getExpenses, createExpense, deleteExpense } from "../api/client";
import { formatINR } from "../utils/formatCurrency";
import ExpenseForm from "../components/ExpenseForm";
import BalanceChip from "../components/BalanceChip";
import { getBalances } from "../api/client";

const categoryIcons = {
  Rent: Home,
  Utilities: Zap,
  Groceries: ShoppingCart,
  Repairs: Wrench,
  Outings: PartyPopper,
  Other: Package,
};

const categoryColors = {
  Rent: "#105D5E",
  Utilities: "#E8E300",
  Groceries: "#009A6E",
  Repairs: "#767F7D",
  Outings: "#B3EDA9",
  Other: "#C2CBC9",
};

export default function ExpenseLogger() {
  const { currentGroup, setCurrentGroup } = useGroup();
  const location = useLocation();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMember, setFilterMember] = useState("");

  // On mount, if we came from join link, set group from navigation state
  useEffect(() => {
    if (location.state?.groupData) {
      setCurrentGroup(location.state.groupData);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  // Redirect to landing if no group
  useEffect(() => {
    if (!currentGroup) {
      navigate("/", { replace: true });
    }
  }, [currentGroup]);

  const loadData = useCallback(async () => {
    if (!currentGroup) return;
    setLoading(true);
    try {
      const [expRes, balRes] = await Promise.all([
        getExpenses(currentGroup.id, {
          category: filterCategory || undefined,
          member_id: filterMember || undefined,
        }),
        getBalances(currentGroup.id),
      ]);
      setExpenses(expRes.data);
      setBalances(balRes.data);
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setLoading(false);
    }
  }, [currentGroup, filterCategory, filterMember]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddExpense = async (data) => {
    try {
      await createExpense(data);
      setShowForm(false);
      loadData();
    } catch (err) {
      console.error("Failed to add expense:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense(id);
      loadData();
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  if (!currentGroup) return null;

  const members = currentGroup.members || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-xl md:text-2xl text-text-dark">
            {currentGroup.name}
          </h1>
          <p className="text-xs text-text-muted font-mono">#{currentGroup.code}</p>
        </div>
        <button
          onClick={() => {
            setEditingExpense(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {/* Balance Chips */}
      {balances && (
        <div className="flex flex-wrap gap-2 mb-6">
          {balances.balances.map((b) => (
            <BalanceChip
              key={b.member_id}
              member={members.find((m) => m.id === b.member_id) || b}
              netBalance={b.net_balance}
              currency="₹"
            />
          ))}
        </div>
      )}

      {/* Settlement suggestion */}
      {balances?.settlement_suggestions?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card mb-6 bg-primary/5 border border-primary/20"
        >
          <p className="text-sm text-text-dark">
            <span className="font-semibold">Settlement suggestion: </span>
            {balances.settlement_suggestions.map((s, i) => (
              <span key={i}>
                {s.from} pays {s.to} {formatINR(s.amount)}
                {i < balances.settlement_suggestions.length - 1 && ", "}
              </span>
            ))}
          </p>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-field w-auto text-sm"
        >
          <option value="">All Categories</option>
          {(currentGroup.categories || []).length > 0
            ? currentGroup.categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.emoji || "📦"} {cat.name}
                </option>
              ))
            : ["Rent", "Utilities", "Groceries", "Repairs", "Outings", "Other"].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
        </select>
        <select
          value={filterMember}
          onChange={(e) => setFilterMember(e.target.value)}
          className="input-field w-auto text-sm"
        >
          <option value="">All Members</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.emoji} {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Expense List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4">
              <div className="skeleton h-4 w-32 mb-2" />
              <div className="skeleton h-3 w-48" />
            </div>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="text-5xl mb-4">🧾</div>
          <h3 className="font-heading font-semibold text-lg text-text-muted mb-2">
            No expenses yet
          </h3>
          <p className="text-text-muted text-sm mb-6">
            Start tracking by adding your first expense.
          </p>
          <button
            onClick={() => {
              setEditingExpense(null);
              setShowForm(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} />
            Add your first expense
          </button>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {expenses.map((expense) => {
              const getExpenseCatColor = (cat) => {
                const groupCat = currentGroup.categories?.find((c) => c.name === cat);
                if (groupCat?.color) return groupCat.color;
                return categoryColors[cat] || "#767F7D";
              };
              const getExpenseCatEmoji = (cat) => {
                const groupCat = currentGroup.categories?.find((c) => c.name === cat);
                if (groupCat?.emoji) return groupCat.emoji;
                const emojiMap = { Rent: "🏠", Utilities: "⚡", Groceries: "🛒", Repairs: "🔧", Outings: "🎉", Other: "📦" };
                return emojiMap[cat] || "📦";
              };
              const getCatIcon = (cat) => {
                const iconMap = { Rent: Home, Utilities: Zap, Groceries: ShoppingCart, Repairs: Wrench, Outings: PartyPopper, Other: Package };
                const Icon = iconMap[cat] || Package;
                return <Icon size={18} style={{ color: catColor }} />;
              };
              const catColor = getExpenseCatColor(expense.category);
              const payer = members.find((m) => m.id === expense.paid_by);

              return (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  layout
                  className="card-hover p-4 flex items-start gap-3 group"
                >
                  {/* Category icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: catColor + "15" }}
                  >
                    <span className="text-lg">{getExpenseCatEmoji(expense.category)}</span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-text-dark text-sm">
                          {expense.description || expense.category}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {expense.payer_emoji} {expense.payer_name} ·{" "}
                          {new Date(expense.expense_date).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short" }
                          )}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-base text-text-dark whitespace-nowrap">
                        {formatINR(expense.amount)}
                      </span>
                    </div>

                    {/* Split summary */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {expense.splits?.map((split) => (
                        <span
                          key={split.id || split.member_id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                          style={{
                            backgroundColor: (split.color || "#767F7D") + "15",
                            color: split.color || "#767F7D",
                          }}
                        >
                          {split.emoji || ""} {formatINR(split.share_amount)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-1.5 rounded-lg hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Expense Form Modal */}
      <ExpenseForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingExpense(null);
        }}
        onSubmit={handleAddExpense}
        initialData={editingExpense}
      />
    </div>
  );
}
