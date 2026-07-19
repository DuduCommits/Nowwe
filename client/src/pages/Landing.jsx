import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Shield,
  BarChart3,
  ArrowRight,
  Users,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

export default function Landing() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    navigate(`/join/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚖️</span>
          <span className="font-heading font-bold text-xl text-text-dark">
            BalanceBoard
          </span>
        </div>
        <Link
          to="/setup"
          className="btn-primary text-sm"
        >
          Create a Group
        </Link>
      </motion.nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
                <Shield size={14} />
                Fair sharing, clear minds.
              </span>
              <h1 className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl text-text-dark leading-tight mb-4">
                Stop arguing about
                <span className="text-primary"> who paid what</span>.
              </h1>
              <p className="text-lg text-text-muted leading-relaxed mb-8 max-w-lg">
                BalanceBoard tracks shared expenses over weeks and months,
                showing you who's contributing fairly — not just who owes what
                right now.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-3 mb-10"
            >
              <Link to="/setup" className="btn-primary text-base px-6 py-3">
                Create a Group
                <ArrowRight size={18} />
              </Link>
              <button
                onClick={() => document.getElementById("joinCode")?.focus()}
                className="btn-secondary text-base px-6 py-3"
              >
                <Users size={18} />
                Join a Group
              </button>
            </motion.div>

            {/* Join by Code */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              onSubmit={handleJoin}
              className="flex flex-col sm:flex-row gap-3 max-w-md"
            >
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setJoinError("");
                }}
                id="joinCode"
                placeholder="Enter group code (e.g. ABC123)"
                className="input-field flex-1 uppercase tracking-widest text-center font-mono text-lg"
                maxLength={6}
              />
              <button
                type="submit"
                disabled={joinCode.length < 4}
                className="btn-primary"
              >
                Join
              </button>
            </motion.form>
            {joinError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-accent text-sm mt-2"
              >
                {joinError}
              </motion.p>
            )}
          </div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative">
              <div className="w-72 h-72 rounded-3xl bg-primary/5 p-6 shadow-xl" style={{ boxShadow: '0 2px 12px rgba(41, 62, 51, 0.08)' }}>
                <div className="space-y-3">
                  {[
                    { name: "Alex", amount: "+₹3,400", color: "#009A6E" },
                    { name: "Jamie", amount: "-₹2,100", color: "#767F7D" },
                    { name: "Sam", amount: "+₹700", color: "#009A6E" },
                    { name: "Taylor", amount: "-₹2,000", color: "#767F7D" },
                  ].map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
                    >
                      <span className="text-sm font-medium text-text-dark">
                        {p.name}
                      </span>
                      <span
                        className={`font-mono text-sm font-bold ${
                          p.color === "#4CAF82"
                            ? "text-success"
                            : "text-text-muted"
                        }`}
                      >
                        {p.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-highlight rounded-2xl rotate-12 opacity-30" />
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-primary/20 rounded-xl -rotate-12" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Value Props */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="font-heading font-bold text-2xl md:text-3xl text-text-dark text-center mb-12"
        >
          Why BalanceBoard?
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: TrendingUp,
              title: "Long-term fairness",
              desc: "Track who pays what over months, not just per bill. See the big picture.",
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              icon: BarChart3,
              title: "Category insights",
              desc: "See fairness patterns by category. Who's covering groceries? Who pays rent?",
              color: "text-success",
              bg: "bg-success/10",
            },
            {
              icon: Shield,
              title: "Scenario planning",
              desc: "Simulate future expenses before they happen. Plan ahead with confidence.",
              color: "text-accent",
              bg: "bg-accent/10",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="card-hover p-6"
            >
              <div
                className={`w-12 h-12 ${item.bg} ${item.color} rounded-xl flex items-center justify-center mb-4`}
              >
                <item.icon size={24} />
              </div>
              <h3 className="font-heading font-bold text-lg text-text-dark mb-2">
                {item.title}
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 bg-surface">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-heading font-bold text-2xl md:text-3xl text-text-dark text-center mb-12"
          >
            How it works
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Create your group",
                desc: "Add roommates, friends, or partners. Pick colors and emojis so everyone's easy to spot.",
              },
              {
                step: "2",
                title: "Log expenses together",
                desc: "Add bills as they happen. Categorize them. BalanceBoard handles the math.",
              },
              {
                step: "3",
                title: "See who's being fair",
                desc: "Check fairness scores, category breakdowns, and settlement suggestions anytime.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 bg-primary text-background rounded-2xl flex items-center justify-center mx-auto mb-4 font-heading font-bold text-xl">
                  {item.step}
                </div>
                <h3 className="font-heading font-bold text-lg text-text-dark mb-2">
                  {item.title}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed max-w-xs mx-auto">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-primary rounded-3xl p-8 md:p-12 shadow-xl"
        >
          <h2 className="font-heading font-bold text-2xl md:text-3xl text-background mb-3">
            Ready for calm money conversations?
          </h2>
          <p className="text-background/80 mb-8 max-w-md mx-auto">
            No sign-up required. Create a group in seconds and start tracking
            fairly.
          </p>
          <Link to="/setup" className="inline-flex items-center gap-2 bg-surface text-primary font-semibold px-6 py-3 rounded-xl hover:bg-primary/10 transition-all">
            Get Started Free
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-text-muted text-sm">
            <span>⚖️</span>
            <span>BalanceBoard — Fair sharing, clear minds.</span>
          </div>
          <p className="text-text-muted text-xs">
            Made for roommates, couples, and close friends.
          </p>
        </div>
      </footer>
    </div>
  );
}
