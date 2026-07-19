import { motion } from "framer-motion";

export default function EmptyState({ emoji, title, subtitle, action }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-16"
    >
      <div className="text-5xl mb-4">{emoji}</div>
      <h3 className="font-heading font-semibold text-lg text-text-muted mb-2">
        {title}
      </h3>
      {subtitle && (
        <p className="text-text-muted text-sm mb-6 max-w-xs mx-auto">{subtitle}</p>
      )}
      {action}
    </motion.div>
  );
}
