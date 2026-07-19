import { motion } from "framer-motion";
import { formatCompact } from "../utils/formatCurrency";

export default function BalanceChip({ member, netBalance, currency = "₹", onClick }) {
  const isPositive = netBalance > 0;
  const isNegative = netBalance < 0;
  const isZero = netBalance === 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
        isPositive
          ? "bg-success text-surface"
          : isNegative
          ? "bg-border text-text-dark"
          : "bg-highlight text-text-dark"
      }`}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
        style={{ backgroundColor: member.color + "30" }}
      >
        {member.emoji}
      </div>
      <span className="whitespace-nowrap">{member.name}</span>
      <span className="font-mono font-semibold">
        {isPositive ? "+" : ""}
        {formatCompact(netBalance, currency)}
      </span>
    </motion.button>
  );
}
