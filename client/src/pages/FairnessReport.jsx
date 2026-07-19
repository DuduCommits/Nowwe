import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Share2,
  Calendar,
  TrendingUp,
  AlertCircle,
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
} from "recharts";
import { useGroup } from "../App";
import { getReport } from "../api/client";
import { formatINR } from "../utils/formatCurrency";
//import { getCategoryColor } from "../utils/fairness.js";
// getCategoryColor not currently used in this component

const periodOptions = [
  { label: "All Time", value: "all" },
  { label: "This Month", value: "month" },
  { label: "Last 3 Months", value: "3months" },
  { label: "Last 6 Months", value: "6months" },
];

function getDateRange(filter) {
  const now = new Date();
  switch (filter) {
    case "month":
      return {
        start_date: new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0],
        end_date: now.toISOString().split("T")[0],
      };
    case "3months":
      return {
        start_date: new Date(now.getFullYear(), now.getMonth() - 3, 1)
          .toISOString()
          .split("T")[0],
        end_date: now.toISOString().split("T")[0],
      };
    case "6months":
      return {
        start_date: new Date(now.getFullYear(), now.getMonth() - 6, 1)
          .toISOString()
          .split("T")[0],
        end_date: now.toISOString().split("T")[0],
      };
    default:
      return {};
  }
}

export default function FairnessReport() {
  const { currentGroup } = useGroup();
  const [period, setPeriod] = useState("all");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef(null);

  useEffect(() => {
    if (!currentGroup) return;
    setLoading(true);
    getReport(currentGroup.id, getDateRange(period))
      .then((res) => setReport(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentGroup, period]);

  if (!currentGroup) return null;

  const handleExportCSV = () => {
    window.open(`/api/groups/${currentGroup.id}/report/csv`, "_blank");
  };

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;

    const element = reportRef.current;
    if (!element) return;

    const canvas = await html2canvas(element, {
      backgroundColor: "#F9F7F4",
      scale: 2,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [canvas.width / 2, canvas.height / 2],
    });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`BalanceBoard-${currentGroup.name}-Report.pdf`);
  };

  const handleShare = async () => {
    const shareData = {
      title: `BalanceBoard Report - ${currentGroup.name}`,
      text: `Check out the fairness report for ${currentGroup.name} on BalanceBoard!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const categories = report?.category_list || [];

  const gridColumns = ["Member", ...categories, "Total"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-xl md:text-2xl text-text-dark">
            Fairness Report
          </h1>
          <p className="text-sm text-text-muted">
            Auto-generated expense summary for {currentGroup.name}
          </p>
        </div>
        <div className="flex gap-1 bg-highlight/30 rounded-xl p-1">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === opt.value
                  ? "bg-surface text-primary shadow-sm"
                  : "text-text-muted hover:text-text-dark"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-24 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      ) : !report ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="font-heading font-semibold text-lg text-text-muted mb-2">
            No data to report
          </h3>
          <p className="text-text-muted text-sm">
            Start adding expenses to see your fairness report.
          </p>
        </div>
      ) : (
        <div className="space-y-6" ref={reportRef}>
          {/* Summary narrative */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-primary/5"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-text-dark mb-2">
                  Summary
                </h3>
                <p className="text-sm text-text-dark leading-relaxed">
                  {report.narrative}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Category × Member Grid */}
          {categories.length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="font-heading font-semibold text-text-dark mb-3">
                Expense Breakdown
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {gridColumns.map((col) => (
                      <th
                        key={col}
                        className={`text-left py-2 px-3 text-xs font-medium text-text-muted ${
                          col === "Total" ? "text-right" : ""
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.member_summary?.map((member) => (
                    <tr key={member.name} className="border-b border-border/50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span>{member.emoji}</span>
                          <span className="font-medium text-text-dark">
                            {member.name}
                          </span>
                        </div>
                      </td>
                      {categories.map((cat) => {
                        const amount = report.category_grid[cat]?.members?.[
                          report.members.find((m) => m.name === member.name)
                            ?.id
                        ] || 0;
                        return (
                          <td key={cat} className="py-2 px-3 font-mono text-xs">
                            {amount > 0 ? formatINR(amount) : "-"}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 font-mono font-semibold text-right">
                        {formatINR(member.total_paid)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-highlight/20 font-medium">
                    <td className="py-2 px-3 text-text-muted text-xs">Total</td>
                    {categories.map((cat) => (
                      <td key={cat} className="py-2 px-3 font-mono text-xs">
                        {formatINR(report.category_grid[cat]?.total || 0)}
                      </td>
                    ))}
                    <td className="py-2 px-3 font-mono text-right">
                      {formatINR(report.total_expenses)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Fairness Score Trend placeholder */}
          <div className="card">
            <h3 className="font-heading font-semibold text-text-dark mb-3 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              Fairness Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {report.member_summary?.map((member) => {
                const total = report.total_expenses || 1;
                const pct = Math.round((member.total_paid / total) * 100);
                const fairShare = 100 / (report.members?.length || 1);
                const diff = Math.abs(pct - fairShare);
                const isFair = diff < 10;

                return (
                  <div key={member.name} className="p-3 rounded-xl bg-highlight/20 text-center">
                    <div className="text-lg mb-1">{member.emoji}</div>
                    <p className="font-medium text-text-dark text-sm">
                      {member.name}
                    </p>
                    <p className="font-mono text-lg font-bold text-primary">
                      {pct}%
                    </p>
                    <p
                      className={`text-xs ${
                        isFair ? "text-success" : "text-accent"
                      }`}
                    >
                      {isFair ? "Fair" : `${diff > 20 ? "Off" : "Slightly off"}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Settlement plan */}
          {report.settlement_plan?.length > 0 && (
            <div className="card bg-success/10 border border-success/30">
              <h3 className="font-heading font-semibold text-text-dark mb-3">
                Settlement Plan
              </h3>
              <div className="space-y-2">
                {report.settlement_plan.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-white"
                  >
                    <span className="text-sm text-text-dark">
                      <strong>{s.from}</strong> pays <strong>{s.to}</strong>
                    </span>
                    <span className="font-mono font-bold text-success">
                      {formatINR(s.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export buttons */}
          <div className="flex flex-wrap gap-3">
            <button onClick={handleExportPDF} className="btn-primary">
              <Download size={16} />
              Download PDF
            </button>
            <button onClick={handleExportCSV} className="btn-secondary">
              <Download size={16} />
              Download CSV
            </button>
            <button onClick={handleShare} className="btn-ghost">
              <Share2 size={16} />
              Share Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
