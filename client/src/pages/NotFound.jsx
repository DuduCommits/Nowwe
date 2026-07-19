import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-sm"
      >
        <div className="text-7xl mb-4">🌿</div>
        <h1 className="font-heading font-bold text-2xl text-text-dark mb-2">
          Lost in the forest
        </h1>
        <p className="text-text-muted mb-6">
          This page doesn't exist. The path you're looking for is somewhere else in the woods.
        </p>
        <Link to="/" className="btn-primary inline-flex">
          Go Home
        </Link>
      </motion.div>
    </div>
  );
}
