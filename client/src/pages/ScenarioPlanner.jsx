import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Plus,
  Save,
  Lightbulb,
  Trash2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useGroup } from "../App";
import { simulateScenario, saveScenario, getScenarios } from "../api/client";
import { formatINR } from "../utils/formatCurrency";
import { getFairnessColor } from "../utils/fairness";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function getGroupCategories(group) {
  return group?.categories?.length > 0
    ? group.categories.map((c) => c.name)
    : ["Rent", "Utilities", "Groceries", "Repairs", "Outings", "Other"];
}

const prebuiltExamples = [
  {
    name: "What if Alex pays next 2 grocery runs?",
    actions: [
      { paid_by_index: 0, category: "Groceries", amount: 1500, count: 2 },
    ],
  },
  {
    name: "What if Jamie covers internet for 3 months?",
    actions: [
      { paid_by_index: 1, category: "Utilities", amount: 800, count: 3 },
    ],
  },
  {
    name: "What if Sam pays this month's rent?",
    actions: [
      { paid_by_index: 2, category: "Rent", amount: 12000, count: 1 },
    ],
  },
];

export default function ScenarioPlanner() {
  const { currentGroup } = useGroup();
  const members = currentGroup?.members || [];

  const [actions, setActions] = useState([
    { paid_by: "", category: "Other", amount: "", count: 1 },
  ]);
  const [simulation, setSimulation] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (currentGroup) {
      getScenarios(currentGroup.id)
        .then((res) => setSavedScenarios(res.data))
        .catch(console.error);
    }
  }, [currentGroup]);

  const addAction = () => {
    setActions([...actions, { paid_by: "", category: "Other", amount: "", count: 1 }]);
  };

  const updateAction = (idx, field, value) => {
    setActions(actions.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  };

  const removeAction = (idx) => {
    if (actions.length <= 1) return;
    setActions(actions.filter((_, i) => i !== idx));
  };

  const handleSimulate = async () => {
    const validActions = actions.filter((a) => a.paid_by && a.amount);
    if (validActions.length === 0) return;

    setSimulating(true);
    try {
      const data = {
        actions: validActions.map((a) => ({
          paid_by: parseInt(a.paid_by),
          category: a.category,
          amount: parseFloat(a.amount),
          count: parseInt(a.count) || 1,
        })),
      };
      const res = await simulateScenario(currentGroup.id, data);
      setSimulation(res.data);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setSimulating(false);
    }
  };

  const handleSave = async () => {
    if (!scenarioName.trim() || !simulation) return;
    setSaving(true);
    try {
      await saveScenario(currentGroup.id, {
        name: scenarioName,
        actions: actions,
        projected_balances: simulation.projectedBalances,
      });
      setScenarioName("");
      getScenarios(currentGroup.id).then((res) =>
        setSavedScenarios(res.data)
      );
    } catch (err) {
      console.error("Failed to save scenario:", err);
    } finally {
      setSaving(false);
    }
  };

  const applyPrebuilt = (example) => {
    const mappedActions = example.actions.map((a) => ({
      paid_by: members[a.paid_by_index]?.id?.toString() || "",
      category: a.category,
      amount: a.amount.toString(),
      count: a.count,
    }));
    setActions(mappedActions);
  };

  if (!currentGroup) return null;

  const chartData =
    simulation?.projectedBalances.map((b) => ({
      name: b.name,
      balance: b.net_balance,
      score: b.fairness_score,
    })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl md:text-2xl text-text-dark">
            Scenario Planner
          </h1>
          <p className="text-sm text-text-muted">
            Simulate future expenses before they happen.
          </p>
        </div>
        <button
          onClick={() => setShowSaved(!showSaved)}
          className="btn-ghost"
        >
          <Lightbulb size={16} />
          Saved ({savedScenarios.length})
        </button>
      </div>

      {/* Pre-built examples */}
      <div className="flex flex-wrap gap-2">
        {prebuiltExamples.map((ex, i) => (
          <button
            key={i}
            onClick={() => applyPrebuilt(ex)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-highlight/30 text-text-dark text-xs font-medium hover:bg-highlight transition-colors"
          >
            <Sparkles size={12} />
            {ex.name}
          </button>
        ))}
      </div>

      {/* Action builder */}
      <div className="card">
        <h2 className="font-heading font-semibold text-text-dark mb-4">
          What if...
        </h2>

        <div className="space-y-3">
          <AnimatePresence>
            {actions.map((action, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-end gap-2 p-3 rounded-xl bg-highlight/20"
              >
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1 block">
                    Who pays
                  </label>
                  <select
                    value={action.paid_by}
                    onChange={(e) => updateAction(idx, "paid_by", e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="">Select...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.emoji} {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-24">
                  <label className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1 block">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={action.amount}
                      onChange={(e) =>
                        updateAction(idx, "amount", e.target.value)
                      }
                      className="input-field pl-6 text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="w-24">
                  <label className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1 block">
                    Category
                  </label>
                  <select
                    value={action.category}
                    onChange={(e) =>
                      updateAction(idx, "category", e.target.value)
                    }
                    className="input-field text-sm"
                  >
                    {getGroupCategories(currentGroup).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-16">
                  <label className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1 block">
                    Times
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={action.count}
                    onChange={(e) =>
                      updateAction(idx, "count", parseInt(e.target.value) || 1)
                    }
                    className="input-field text-sm text-center"
                  />
                </div>

                {actions.length > 1 && (
                  <button
                    onClick={() => removeAction(idx)}
                    className="p-2 text-text-muted hover:text-accent transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <button onClick={addAction} className="btn-ghost text-sm">
            <Plus size={16} />
            Add another action
          </button>
        </div>

        <button
          onClick={handleSimulate}
          disabled={simulating}
          className="btn-primary mt-4 w-full"
        >
          {simulating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <TrendingUp size={18} />
              Run Simulation
            </>
          )}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {simulation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Verdict */}
            <div
              className={`card p-4 ${
                simulation.average_fairness_score >= 90
                  ? "bg-success/10 border border-success/30"
                  : simulation.average_fairness_score >= 70
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-accent/10 border border-accent/30"
              }`}
            >
              <p className="text-sm text-text-dark">{simulation.verdict}</p>
              <p className="text-xs text-text-muted mt-1">
                Fairness score: {simulation.average_fairness_score}/100 · Total:{` `}
                {formatINR(simulation.total_expenses)}
              </p>
            </div>

            {/* Projected balances chart */}
            {chartData.length > 0 && (
              <div className="card">
                <h3 className="font-heading font-semibold text-text-dark mb-3">
                  Projected Balances
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#C2CBC9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "none",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                        formatter={(value) => formatINR(value)}
                      />
                      <Bar dataKey="balance" name="Net Balance" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, idx) => (
                          <Cell
                            key={idx}
                            fill={entry.balance >= 0 ? "#009A6E" : "#767F7D"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Save */}
            <div className="card">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="Name this scenario..."
                  className="input-field flex-1"
                />
                <button
                  onClick={handleSave}
                  disabled={saving || !scenarioName.trim()}
                  className="btn-primary"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Scenarios */}
      <AnimatePresence>
        {showSaved && savedScenarios.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <h3 className="font-heading font-semibold text-text-dark">
              Saved Scenarios
            </h3>
            {savedScenarios.map((sc) => (
              <div key={sc.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium text-text-dark text-sm">{sc.name}</p>
                  <p className="text-xs text-text-muted">
                    {new Date(sc.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActions(sc.actions || actions);
                    setShowSaved(false);
                  }}
                  className="btn-ghost text-xs"
                >
                  Load
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
