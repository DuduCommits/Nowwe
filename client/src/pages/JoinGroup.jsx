import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useGroup } from "../App";
import { getGroupByCode } from "../api/client";

export default function JoinGroup() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { setCurrentGroup } = useGroup();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) {
      navigate("/", { replace: true });
      return;
    }

    async function fetchGroup() {
      try {
        const res = await getGroupByCode(code.toUpperCase());
        setCurrentGroup(res.data);
        navigate(`/group/${code.toUpperCase()}`, { replace: true });
      } catch (err) {
        setError("Group not found. Check your code and try again.");
        setTimeout(() => navigate("/", { replace: true }), 2500);
      }
    }

    fetchGroup();
  }, [code, navigate, setCurrentGroup]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        {error ? (
          <div>
            <div className="text-4xl mb-3">😕</div>
            <p className="text-accent font-medium">{error}</p>
          </div>
        ) : (
          <div>
            <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
            <p className="text-text-muted">Joining group <span className="font-mono font-bold text-primary">{code}</span>...</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
