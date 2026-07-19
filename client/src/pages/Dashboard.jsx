import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  PieChart,
  Users,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { useGroup } from "../App";
import {
  getBalances,
  getBreakdown,
  getFairnessScore,
} from "../api/client";
import { formatINR } from "../utils/formatCurrency";
import { getFairnessColor, getCategoryColor } from "../utils/fairness";

const timeFilters = [
  { label: "All Time", value: "all" },
  { label: "This Month", value: "month" },
  { label: "3 Months", value: "3months" },
  { label: "6 Months", value: "6months" },
];

function getDateRange(filter) {
  const now = new Date();
  switch (filter) {
    case "month":
      return {
        start_date: new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0],
      };
    case "3months":
      return {
        start_date: new Date(now.getFullYear(), now.getMonth() - 3, 1)
          .toISOString()
          .split("T")[0],
      };
    case "6months":
      return {
        start_date: new Date(now.getFullYear(), now.getMonth() - 6, 1)
          .toISOString()
          .split("T")[0],
      };
    default:
      return {};
  }
}

export default function Dashboard() {
  const { currentGroup } = useGroup();
  const [timeFilter, setTimeFilter] = useState("all");

  const [balances, setBalances] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [fairness, setFairness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentGroup) return;
    const period = getDateRange(timeFilter);

    setLoading(true);
    Promise.all([
      getBalances(currentGroup.id, period),
      getBreakdown(currentGroup.id, period),
      getFairnessScore(currentGroup.id, period),
    ])
      .then(([balRes, breakRes, fairRes]) => {
        setBalances(balRes.data);
        setBreakdown(breakRes.data);
        setFairness(fairRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentGroup, timeFilter]);

  if (!currentGroup) return null;

  const members = currentGroup.members || [];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  const chartData =
    balances?.balances.map((b) => ({
      name: b.name,
      paid: b.total_paid,
      share: b.total_share,
      net: b.net_balance,
    })) || [];

  const categoryChartData = breakdown
    ? Object.entries(breakdown.breakdown).map(([cat, data]) => ({
        category: cat,
        total: data.total,
        ...data.members,
      }))
    : [];

  // Build category breakdown chart data
  const catStackData = breakdown
    ? Object.entries(breakdown.breakdown)
        .filter(([, data]) => data.total > 0)
        .map(([cat, data]) => {
          const row = { category: cat };
          for (const m of members) {
            row[m.name] = data.members[m.id]?.amount || 0;
          }
          return row;
        })
    : [];

  const memberColors = {};
  for (const m of members) {
    memberColors[m.name] = m.color;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-xl md:text-2xl text-text-dark">
          Dashboard
        </h1>
        <div className="flex gap-1 bg-highlight/30 rounded-xl p-1">
          {timeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTimeFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeFilter === f.value
                  ? "bg-surface text-primary shadow-sm"
                  : "text-text-muted hover:text-text-dark"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section A: Net Balance Summary */}
      <div className="card">          <h2 className="font-heading font-semibold text-lg text-text-dark mb-4 flex items-center gap-2">
          <Users size={18} className="text-primary" />
          Net Balances
        </h2>

        <div className="grid gap-3 md:grid-cols-2">
          {balances?.balances.map((b) => {
            const maxAbs = Math.max(
              ...balances.balances.map((x) => Math.abs(x.net_balance)),
              1
            );
            const pct = Math.abs(b.net_balance) / maxAbs;
            const isPos = b.net_balance > 0;

            return (
              <motion.div
                key={b.member_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-xl bg-highlight/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ backgroundColor: b.color + "20" }}
                    >
                      {b.emoji}
                    </div>
                    <span className="font-medium text-text-dark">{b.name}</span>
                  </div>
                  <span
                    className={`font-mono font-bold text-lg ${
                      isPos ? "text-success" : b.net_balance < 0 ? "text-text-muted" : "text-text-dark"
                    }`}
                  >
                    {isPos ? "+" : ""}
                    {formatINR(b.net_balance)}
                  </span>
                </div>

                {/* Visual bar */}
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct * 100, 100)}%` }}
                    className={`h-full rounded-full ${
                      isPos ? "bg-success" : "bg-border"
                    }`}
                    style={{
                      marginLeft: isPos ? "0" : "auto",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>Paid: {formatINR(b.total_paid)}</span>
                  <span>Share: {formatINR(b.total_share)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Settlement suggestion */}
        {balances?.settlement_suggestions?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 rounded-xl bg-success/10 border border-success/30"
          >
            <p className="text-sm text-text-dark">
              <span className="font-semibold">To settle up: </span>
              {balances.settlement_suggestions.map((s, i) => (
                <span key={i}>
                  <strong>{s.from}</strong> pays <strong>{s.to}</strong>{" "}
                  <span className="font-mono font-bold text-success">
                    {formatINR(s.amount)}
                  </span>
                  {i < balances.settlement_suggestions.length - 1 && " → "}
                </span>
              ))}
            </p>
          </motion.div>
        )}
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h2 className="font-heading font-semibold text-lg text-text-dark mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            Paid vs Share
          </h2>
          <div className="h-64">
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
                <Legend />
                <Bar
                  dataKey="paid"
                  name="Paid"
                  fill="#105D5E"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="share"
                  name="Fair Share"
                  fill="#009A6E"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Section B: Category Breakdown */}
      {catStackData.length > 0 && (
        <div className="card">
          <h2 className="font-heading font-semibold text-lg text-text-dark mb-4 flex items-center gap-2">
            <PieChart size={18} className="text-primary" />
            Category Breakdown
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catStackData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C2CBC9" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value) => formatINR(value)}
                />
                <Legend />
                {members.map((m) => (
                  <Bar
                    key={m.id}
                    dataKey={m.name}
                    name={m.name}
                    stackId="a"
                    fill={m.color}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Insight Cards */}
      {breakdown?.insights?.length > 0 && (
        <div className="card">
          <h2 className="font-heading font-semibold text-lg text-text-dark mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            Insights
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {breakdown.insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-highlight/20"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                  style={{ backgroundColor: getCategoryColor(insight.category) + "20" }}
                >
                  {insight.category === "Rent"
                    ? "🏠"
                    : insight.category === "Groceries"
                    ? "🛒"
                    : insight.category === "Utilities"
                    ? "⚡"
                    : insight.category === "Repairs"
                    ? "🔧"
                    : insight.category === "Outings"
                    ? "🎉"
                    : "📦"}
                </div>
                <p className="text-sm text-text-dark">{insight.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Section C: Fairness Score */}
      {fairness && (
        <div className="card">
          <h2 className="font-heading font-semibold text-lg text-text-dark mb-4 flex items-center gap-2">
            <Target size={18} className="text-primary" />
            Fairness Score
          </h2>

          {/* Group Score */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-highlight/20 mb-2">
              <span
                className="font-heading font-bold text-3xl"
                style={{ color: getFairnessColor(fairness.group_score) }}
              >
                {fairness.group_score}
              </span>
            </div>
            <p className="text-sm text-text-muted">Group Fairness Score</p>
          </div>

          {/* Per-member scores */}
          <div className="space-y-3">
            {fairness.scores.map((s) => (
              <motion.div
                key={s.member_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-highlight/20"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: s.color + "20" }}
                >
                  {s.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text-dark text-sm">
                      {s.name}
                    </span>
                    <span
                      className="font-heading font-bold text-lg"
                      style={{ color: getFairnessColor(s.score) }}
                    >
                      {s.score}
                    </span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full mt-1 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.score}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: getFairnessColor(s.score) }}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-1">{s.explanation}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
