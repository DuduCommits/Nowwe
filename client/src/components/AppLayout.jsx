import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  PlusCircle,
  LayoutDashboard,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGroup } from "../App";

const navItems = [
  { path: "", icon: PlusCircle, label: "Expenses" },
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/scenarios", icon: TrendingUp, label: "Scenarios" },
  { path: "/report", icon: FileText, label: "Report" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function AppLayout({ children }) {
  const { code } = useParams();
  const location = useLocation();
  const { currentGroup, setCurrentGroup } = useGroup();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLeave = () => {
    setCurrentGroup(null);
  };

  if (!currentGroup) return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-surface border-r border-border min-h-screen p-4 sticky top-0">
        <div className="flex items-center gap-3 px-3 py-4 mb-6">
          <span className="text-2xl">⚖️</span>
          <div>
            <h2 className="font-heading font-bold text-lg text-text-dark leading-tight">
              {currentGroup.name}
            </h2>
            <p className="text-xs text-text-muted font-mono">#{currentGroup.code}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item, idx) => {
            const basePath = `/group/${code}`;
            const itemPath = `${basePath}${item.path}`;
            const isActive = location.pathname === itemPath;
            return (
              <Link
                key={item.label}
                to={itemPath}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:bg-background hover:text-text-dark"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLeave}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-accent/10 hover:text-accent transition-all duration-200"
        >
          <LogOut size={20} />
          Leave Group
        </button>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚖️</span>
          <div>
            <h2 className="font-heading font-bold text-sm text-text-dark leading-tight">
              {currentGroup.name}
            </h2>
            <p className="text-[10px] text-text-muted font-mono">#{currentGroup.code}</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-background transition-colors"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden fixed top-[57px] left-0 right-0 z-30 bg-surface border-b border-border shadow-lg"
          >
            <div className="p-3 space-y-1">
              {navItems.map((item, idx) => {
                const basePath = `/group/${code}`;
                const itemPath = `${basePath}${item.path}`;
                const isActive = location.pathname === itemPath;
                return (
                  <Link
                    key={item.label}
                    to={itemPath}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:bg-background"
                    }`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLeave();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:bg-accent/10 hover:text-accent transition-all"
              >
                <LogOut size={20} />
                Leave Group
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:pt-0 pt-[60px] pb-[72px] md:pb-0 min-h-screen overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/90 backdrop-blur-md border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 5).map((item, idx) => {
            const basePath = `/group/${code}`;
            const itemPath = `${basePath}${item.path}`;
            const isActive = location.pathname === itemPath;
            return (
              <Link
                key={item.label}
                to={itemPath}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
                  isActive ? "text-primary" : "text-text-muted"
                }`}
              >
                <item.icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
