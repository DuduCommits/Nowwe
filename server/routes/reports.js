import { Router } from "express";
import { getDB } from "../db.js";

const router = Router();

// GET /api/groups/:id/report — Generate report data
router.get("/:id/report", (req, res, next) => {
  try {
    const db = getDB();
    const { start_date, end_date } = req.query;

    const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    const members = db
      .prepare("SELECT * FROM members WHERE group_id = ? ORDER BY id")
      .all(req.params.id);

    let dateFilter = "";
    const params = [req.params.id];
    if (start_date) {
      dateFilter += " AND expense_date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += " AND expense_date <= ?";
      params.push(end_date);
    }

    const expenses = db
      .prepare(
        `SELECT e.*, m.name as payer_name FROM expenses e
         JOIN members m ON e.paid_by = m.id
         WHERE e.group_id = ?${dateFilter}
         ORDER BY e.expense_date DESC`
      )
      .all(...params);

    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const equalShare = members.length > 0 ? totalSpent / members.length : 0;

    // Per-member totals
    const memberExpenses = {};
    for (const m of members) {
      memberExpenses[m.id] = {
        name: m.name,
        emoji: m.emoji,
        color: m.color,
        total_paid: 0,
        categories: {},
      };
    }

    for (const e of expenses) {
      if (memberExpenses[e.paid_by]) {
        memberExpenses[e.paid_by].total_paid += e.amount;
        memberExpenses[e.paid_by].categories[e.category] =
          (memberExpenses[e.paid_by].categories[e.category] || 0) + e.amount;
      }
    }

    for (const mid of Object.keys(memberExpenses)) {
      memberExpenses[mid].total_paid = Math.round(memberExpenses[mid].total_paid * 100) / 100;
      for (const cat of Object.keys(memberExpenses[mid].categories)) {
        memberExpenses[mid].categories[cat] = Math.round(memberExpenses[mid].categories[cat] * 100) / 100;
      }
    }

    // Category × Member grid — dynamically built from actual categories
    const dbCategories = db
      .prepare("SELECT name FROM categories WHERE group_id = ? ORDER BY sort_order ASC")
      .all(req.params.id);
    const categories = dbCategories.length > 0
      ? dbCategories.map(c => c.name)
      : ["Rent", "Utilities", "Groceries", "Repairs", "Outings", "Other"];
    const grid = {};
    for (const cat of categories) {
      grid[cat] = { total: 0, members: {} };
      for (const m of members) {
        grid[cat].members[m.id] = 0;
      }
    }

    for (const e of expenses) {
      if (grid[e.category]) {
        grid[e.category].total += e.amount;
        grid[e.category].members[e.paid_by] =
          (grid[e.category].members[e.paid_by] || 0) + e.amount;
      }
    }

    // Round everything in grid
    for (const cat of Object.keys(grid)) {
      grid[cat].total = Math.round(grid[cat].total * 100) / 100;
      for (const mid of Object.keys(grid[cat].members)) {
        grid[cat].members[mid] = Math.round(grid[cat].members[mid] * 100) / 100;
      }
    }

    // Settlement plan
    const balances = members.map((m) => {
      const paid = memberExpenses[m.id]?.total_paid || 0;
      return {
        member_id: m.id,
        name: m.name,
        paid,
        share: Math.round(equalShare * 100) / 100,
        net: Math.round((paid - equalShare) * 100) / 100,
      };
    });

    const debtors = balances.filter((b) => b.net < 0).sort((a, b) => a.net - b.net);
    const creditors = balances.filter((b) => b.net > 0).sort((a, b) => b.net - a.net);

    const settlementPlan = [];
    let di = 0,
      ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const debt = Math.abs(debtors[di].net);
      const credit = creditors[ci].net;
      const amount = Math.min(debt, credit);
      if (amount > 1) {
        settlementPlan.push({
          from: debtors[di].name,
          to: creditors[ci].name,
          amount: Math.round(amount * 100) / 100,
        });
      }
      if (debt <= credit) {
        creditors[ci].net -= debt;
        di++;
      }
      if (credit <= debt) {
        debtors[di].net += credit;
        ci++;
      }
    }

    // Summary narrative
    const dateRange = start_date && end_date
      ? `${start_date} to ${end_date}`
      : "the selected period";

    const dominantMember = Object.values(memberExpenses).sort(
      (a, b) => b.total_paid - a.total_paid
    )[0];

    let narrative = `In ${dateRange}, the group spent ₹${totalSpent.toLocaleString("en-IN")} total. `;
    if (dominantMember) {
      const pct = Math.round((dominantMember.total_paid / totalSpent) * 100);
      narrative += `${dominantMember.emoji} ${dominantMember.name} contributed ₹${dominantMember.total_paid.toLocaleString("en-IN")} (${pct}%). `;
    }
    narrative += `Based on your Equal Split model, `;

    if (settlementPlan.length > 0) {
      narrative += settlementPlan
        .map((s) => `${s.from} should pay ${s.to} ₹${s.amount.toLocaleString("en-IN")}`)
        .join(", ");
      narrative += " to balance.";
    } else {
      narrative += "the group is already balanced! 🎉";
    }

    res.json({
      success: true,
      data: {
        group: { name: group.name, code: group.code, currency: group.currency },
        members,
        total_expenses: totalSpent,
        member_summary: Object.values(memberExpenses),
        category_grid: grid,
        category_list: categories.filter((c) => grid[c].total > 0),
        settlement_plan: settlementPlan,
        narrative,
        period: { start_date, end_date },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/groups/:id/report/csv — Download CSV
router.get("/:id/report/csv", (req, res, next) => {
  try {
    const db = getDB();
    const { start_date, end_date } = req.query;

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
        `SELECT e.*, m.name as payer_name FROM expenses e
         JOIN members m ON e.paid_by = m.id
         WHERE e.group_id = ?${dateFilter}
         ORDER BY e.expense_date DESC`
      )
      .all(...params);

    let csv = "Date,Category,Description,Amount,Paid By\n";
    for (const e of expenses) {
      csv += `${e.expense_date},${e.category},"${e.description.replace(/"/g, '""')}",${e.amount},${e.payer_name}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=balanceboard-report.csv");
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
