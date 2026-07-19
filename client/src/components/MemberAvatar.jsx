import { motion } from "framer-motion";

export default function MemberAvatar({ member, size = "md", showName = false, className = "" }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-14 h-14 text-xl",
    xl: "w-16 h-16 text-2xl",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`flex flex-col items-center gap-1 ${className}`}
    >
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center shadow-sm ring-2 ring-white transition-transform`}
        style={{ backgroundColor: member.color || "#105D5E" }}
        title={member.name}
      >
        <span className="select-none">{member.emoji || "😊"}</span>
      </div>
      {showName && (
        <span className="text-xs font-medium text-text-muted truncate max-w-[80px] text-center">
          {member.name}
        </span>
      )}
    </motion.div>
  );
}
