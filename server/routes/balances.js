import { Router } from "express";
import { getDB } from "../db.js";

const router = Router();

// GET /api/groups/:id/balances — Net balances per member
router.get("/:id/balances", (req, res, next) => {
  try {
    const db = getDB();
    const { start_date, end_date } = req.query;

    const members = db
      .prepare("SELECT * FROM members WHERE group_id = ? ORDER BY id")
      .all(req.params.id);

    let expenseFilter = "WHERE e.group_id = ?";
    const params = [req.params.id];

    if (start_date) {
      expenseFilter += " AND e.expense_date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      expenseFilter += " AND e.expense_date <= ?";
      params.push(end_date);
    }

    const expenseTotals = db
      .prepare(
        `SELECT e.paid_by as member_id, SUM(e.amount) as total_paid
         FROM expenses e ${expenseFilter}
         GROUP BY e.paid_by`
      )
      .all(...params);

    const splitTotals = db
      .prepare(
        `SELECT es.member_id, SUM(es.share_amount) as total_share
         FROM expense_splits es
         JOIN expenses e ON es.expense_id = e.id ${expenseFilter}
         GROUP BY es.member_id`
      )
      .all(...params);

    const paidMap = {};
    for (const row of expenseTotals) {
      paidMap[row.member_id] = row.total_paid;
    }

    const shareMap = {};
    for (const row of splitTotals) {
      shareMap[row.member_id] = row.total_share;
    }

    const totalExpenses = Object.values(paidMap).reduce((s, v) => s + v, 0);

    const balances = members.map((m) => {
      const paid = paidMap[m.id] || 0;
      const share = shareMap[m.id] || 0;
      const net = paid - share;
      return {
        member_id: m.id,
        name: m.name,
        color: m.color,
        emoji: m.emoji,
        total_paid: Math.round(paid * 100) / 100,
        total_share: Math.round(share * 100) / 100,
        net_balance: Math.round(net * 100) / 100,
      };
    });

    // Settlement suggestions (minimum transactions to settle debts)
    const debtors = balances.filter((b) => b.net_balance < 0).sort((a, b) => a.net_balance - b.net_balance);
    const creditors = balances.filter((b) => b.net_balance > 0).sort((a, b) => b.net_balance - a.net_balance);

    const suggestions = [];
    let di = 0,
      ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const dBal = debtors[di].net_balance;
      const cBal = creditors[ci].net_balance;
      const amount = Math.min(Math.abs(dBal), cBal);

      if (amount > 1) {
        suggestions.push({
          from: debtors[di].name,
          to: creditors[ci].name,
          from_id: debtors[di].member_id,
          to_id: creditors[ci].member_id,
          amount: Math.round(amount * 100) / 100,
        });
      }

      debtors[di].net_balance += amount;
      creditors[ci].net_balance -= amount;

      if (Math.abs(debtors[di].net_balance) < 0.01) di++;
      if (Math.abs(creditors[ci].net_balance) < 0.01) ci++;
    }

    res.json({
      success: true,
      data: {
        balances,
        total_expenses: totalExpenses,
        settlement_suggestions: suggestions,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/groups/:id/breakdown — Category breakdown
router.get("/:id/breakdown", (req, res, next) => {
  try {
    const db = getDB();
    const { start_date, end_date } = req.query;

    const members = db
      .prepare("SELECT * FROM members WHERE group_id = ? ORDER BY id")
      .all(req.params.id);

    let dateFilter = "";
    const params = [req.params.id];
    if (start_date) {
      dateFilter += " AND e.expense_date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += " AND e.expense_date <= ?";
      params.push(end_date);
    }

    const categoryTotals = db
      .prepare(
        `SELECT e.category, e.paid_by as member_id, SUM(e.amount) as total
         FROM expenses e WHERE e.group_id = ?${dateFilter}
         GROUP BY e.category, e.paid_by`
      )
      .all(...params);

    const totalPerCategory = db
      .prepare(
        `SELECT e.category, SUM(e.amount) as total
         FROM expenses e WHERE e.group_id = ?${dateFilter}
         GROUP BY e.category`
      )
      .all(...params);

    const breakdown = {};
    for (const row of totalPerCategory) {
      breakdown[row.category] = { total: row.total, members: {} };
      for (const m of members) {
        breakdown[row.category].members[m.id] = {
          name: m.name,
          color: m.color,
          amount: 0,
          percentage: 0,
        };
      }
    }

    for (const row of categoryTotals) {
      if (breakdown[row.category]) {
        breakdown[row.category].members[row.member_id].amount += row.total;
      }
    }

    // Calculate percentages
    for (const cat of Object.keys(breakdown)) {
      for (const mid of Object.keys(breakdown[cat].members)) {
        const memberData = breakdown[cat].members[mid];
        memberData.amount = Math.round(memberData.amount * 100) / 100;
        memberData.percentage =
          breakdown[cat].total > 0
            ? Math.round((memberData.amount / breakdown[cat].total) * 100)
            : 0;
      }
    }

    // Insight cards
    const insights = [];
    for (const [category, data] of Object.entries(breakdown)) {
      const topMember = Object.values(data.members).sort(
        (a, b) => b.percentage - a.percentage
      )[0];
      if (topMember && topMember.percentage > 50) {
        insights.push({
          text: `${topMember.name} covers ${topMember.percentage}% of ${category}`,
          type: "dominant",
          category,
        });
      } else if (topMember && topMember.percentage > 30) {
        insights.push({
          text: `${category} is fairly distributed`,
          type: "balanced",
          category,
        });
      }
    }

    res.json({
      success: true,
      data: { breakdown, insights, members },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/groups/:id/fairness-score — Fairness scores
router.get("/:id/fairness-score", (req, res, next) => {
  try {
    const db = getDB();
    const { start_date, end_date } = req.query;

    const members = db
      .prepare("SELECT * FROM members WHERE group_id = ? ORDER BY id")
      .all(req.params.id);

    const fairnessModels = db
      .prepare("SELECT * FROM fairness_models WHERE group_id = ?")
      .all(req.params.id);

    let dateFilter = "";
    const params = [req.params.id];
    if (start_date) {
      dateFilter += " AND e.expense_date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += " AND e.expense_date <= ?";
      params.push(end_date);
    }

    const expenses = db
      .prepare(
        `SELECT * FROM expenses e WHERE e.group_id = ?${dateFilter}`
      )
      .all(...params);

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const equalShare = members.length > 0 ? totalExpenses / members.length : 0;

    // For each member, calculate what they've paid vs their fair share
    const memberPaid = {};
    for (const e of expenses) {
      memberPaid[e.paid_by] = (memberPaid[e.paid_by] || 0) + e.amount;
    }

    const scores = members.map((m) => {
      const paid = memberPaid[m.id] || 0;
      const diff = Math.abs(paid - equalShare);
      // Score: 100 - (diff / equalShare * 100), clamped to 0-100
      let score = 100;
      if (equalShare > 0) {
        const ratio = diff / equalShare;
        score = Math.max(0, Math.min(100, Math.round(100 - ratio * 50)));
      }

      let status = "fair";
      let explanation = `${m.name} has contributed ${paid >= equalShare ? "more than" : paid === 0 ? "nothing compared to" : "less than"} their fair share.`;

      if (score >= 80) {
        status = "fair";
        explanation = `${m.name} is contributing close to their fair share. Great balance!`;
      } else if (score >= 50) {
        status = "slightly_off";
        explanation = `${m.name} is ${paid > equalShare ? "ahead by ₹" + Math.round((paid - equalShare) * 100) / 100 : "behind by ₹" + Math.round((equalShare - paid) * 100) / 100}. A small adjustment would balance things.`;
      } else {
        status = "significantly_off";
        explanation = `${m.name} is ${paid > equalShare ? "significantly ahead by ₹" + Math.round((paid - equalShare) * 100) / 100 : "significantly behind by ₹" + Math.round((equalShare - paid) * 100) / 100}. Consider settling some expenses.`;
      }

      return {
        member_id: m.id,
        name: m.name,
        color: m.color,
        emoji: m.emoji,
        score,
        paid: Math.round(paid * 100) / 100,
        fair_share: Math.round(equalShare * 100) / 100,
        difference: Math.round((paid - equalShare) * 100) / 100,
        status,
        explanation,
      };
    });

    const groupScore = Math.round(
      scores.reduce((s, sc) => s + sc.score, 0) / scores.length
    );

    res.json({
      success: true,
      data: {
        scores,
        group_score: groupScore,
        total_expenses: totalExpenses,
        equal_share: Math.round(equalShare * 100) / 100,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
