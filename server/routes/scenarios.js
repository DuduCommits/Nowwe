import { Router } from "express";
import { z } from "zod";
import { getDB } from "../db.js";

const router = Router();

const simulateSchema = z.object({
  actions: z.array(
    z.object({
      paid_by: z.number().int().positive(),
      category: z.string().min(1).max(30),
      amount: z.number().positive(),
      count: z.number().int().min(1).max(10).default(1),
    })
  ),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

// POST /api/groups/:id/simulate — Run what-if simulation
router.post("/:id/simulate", (req, res, next) => {
  try {
    const data = simulateSchema.parse(req.body);
    const db = getDB();

    const members = db
      .prepare("SELECT * FROM members WHERE group_id = ? ORDER BY id")
      .all(req.params.id);

    // Get current balances
    let dateFilter = "";
    const dateParams = [req.params.id];
    if (data.start_date) {
      dateFilter += " AND e.expense_date >= ?";
      dateParams.push(data.start_date);
    }
    if (data.end_date) {
      dateFilter += " AND e.expense_date <= ?";
      dateParams.push(data.end_date);
    }

    const expenseTotals = db
      .prepare(
        `SELECT e.paid_by as member_id, SUM(e.amount) as total_paid
         FROM expenses e WHERE e.group_id = ?${dateFilter}
         GROUP BY e.paid_by`
      )
      .all(...dateParams);

    const splitTotals = db
      .prepare(
        `SELECT es.member_id, SUM(es.share_amount) as total_share
         FROM expense_splits es
         JOIN expenses e ON es.expense_id = e.id
         WHERE e.group_id = ?${dateFilter}
         GROUP BY es.member_id`
      )
      .all(...dateParams);

    const paidMap = {};
    for (const r of expenseTotals) paidMap[r.member_id] = r.total_paid;

    const shareMap = {};
    for (const r of splitTotals) shareMap[r.member_id] = r.total_share;

    // Apply simulated actions
    for (const action of data.actions) {
      for (let i = 0; i < action.count; i++) {
        paidMap[action.paid_by] = (paidMap[action.paid_by] || 0) + action.amount;
        const equalSplit = action.amount / members.length;
        for (const m of members) {
          shareMap[m.id] = (shareMap[m.id] || 0) + equalSplit;
        }
      }
    }

    const totalExpenses = Object.values(paidMap).reduce((s, v) => s + v, 0);
    const equalShare = totalExpenses / members.length;

    const projectedBalances = members.map((m) => {
      const paid = paidMap[m.id] || 0;
      const share = shareMap[m.id] || 0;
      const net = paid - share;
      const diff = Math.abs(paid - equalShare);
      const fairnessScore =
        equalShare > 0
          ? Math.max(0, Math.min(100, Math.round(100 - (diff / equalShare) * 50)))
          : 100;

      return {
        member_id: m.id,
        name: m.name,
        color: m.color,
        emoji: m.emoji,
        total_paid: Math.round(paid * 100) / 100,
        total_share: Math.round(share * 100) / 100,
        net_balance: Math.round(net * 100) / 100,
        fairness_score: fairnessScore,
      };
    });

    const avgScore = Math.round(
      projectedBalances.reduce((s, b) => s + b.fairness_score, 0) /
        projectedBalances.length
    );

    let verdict = "The group will still be unbalanced.";
    if (avgScore >= 90) {
      verdict = "The group will be well-balanced after these payments! 🎉";
    } else if (avgScore >= 70) {
      verdict = "These payments will improve balance, but some adjustment is still needed.";
    } else {
      verdict =
        "These payments will shift the balance, but larger adjustments may be needed.";
    }

    res.json({
      success: true,
      data: {
        projectedBalances,
        average_fairness_score: avgScore,
        total_expenses: Math.round(totalExpenses * 100) / 100,
        verdict,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/groups/:id/scenarios — Save scenario
router.post("/:id/scenarios", (req, res, next) => {
  try {
    const db = getDB();
    const { name, actions, projected_balances } = req.body;

    const result = db
      .prepare(
        "INSERT INTO scenarios (group_id, name, actions, projected_balances) VALUES (?, ?, ?, ?)"
      )
      .run(
        req.params.id,
        name,
        JSON.stringify(actions),
        JSON.stringify(projected_balances)
      );

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid },
      message: "Scenario saved!",
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/groups/:id/scenarios — List scenarios
router.get("/:id/scenarios", (req, res, next) => {
  try {
    const db = getDB();
    const scenarios = db
      .prepare("SELECT * FROM scenarios WHERE group_id = ? ORDER BY created_at DESC")
      .all(req.params.id);

    const parsed = scenarios.map((s) => ({
      ...s,
      actions: JSON.parse(s.actions || "[]"),
      projected_balances: JSON.parse(s.projected_balances || "{}"),
    }));

    res.json({ success: true, data: parsed });
  } catch (err) {
    next(err);
  }
});

export default router;
