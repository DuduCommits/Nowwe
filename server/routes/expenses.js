import { Router } from "express";
import { z } from "zod";
import { getDB } from "../db.js";

const router = Router();

const createExpenseSchema = z.object({
  group_id: z.number().int().positive(),
  paid_by: z.number().int().positive(),
  amount: z.number().positive(),
  category: z.string().min(1).max(30),
  description: z.string().default(""),
  expense_date: z.string(),
  split_type: z.enum(["equal", "custom_amounts", "custom_percentages"]).default("equal"),
  splits: z
    .array(
      z.object({
        member_id: z.number().int().positive(),
        share_amount: z.number().min(0),
        share_percent: z.number().min(0).max(100).optional(),
      })
    )
    .optional(),
  split_members: z.array(z.number().int().positive()).optional(),
});

// POST /api/expenses — Create expense
router.post("/", (req, res, next) => {
  try {
    const data = createExpenseSchema.parse(req.body);
    const db = getDB();

    const group = db.prepare("SELECT id FROM groups WHERE id = ?").get(data.group_id);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    const members = db
      .prepare("SELECT id FROM members WHERE group_id = ?")
      .all(data.group_id);
    const memberIds = members.map((m) => m.id);

    // Validate category exists in group
    const categoryExists = db
      .prepare("SELECT id FROM categories WHERE group_id = ? AND name = ? COLLATE NOCASE")
      .get(data.group_id, data.category);
    if (!categoryExists) {
      return res.status(400).json({ success: false, message: `Category "${data.category}" not found in this group.` });
    }

    // Validate payer belongs to group
    const payerValid = db
      .prepare("SELECT id FROM members WHERE id = ? AND group_id = ?")
      .get(data.paid_by, data.group_id);
    if (!payerValid) {
      return res.status(400).json({ success: false, message: "Payer not found in this group." });
    }

    let splitMembers = data.split_members || memberIds;
    let splits = data.splits || [];

    const transaction = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO expenses (group_id, paid_by, amount, category, description, expense_date, split_type)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.group_id,
          data.paid_by,
          data.amount,
          data.category,
          data.description,
          data.expense_date,
          data.split_type
        );
      const expenseId = result.lastInsertRowid;

      let finalSplits = [];

      if (splits.length > 0) {
        finalSplits = splits;
      } else {
        const shareAmount = data.amount / splitMembers.length;
        for (const mid of splitMembers) {
          finalSplits.push({ member_id: mid, share_amount: shareAmount, share_percent: 100 / splitMembers.length });
        }
      }

      const insertSplit = db.prepare(
        "INSERT INTO expense_splits (expense_id, member_id, share_amount, share_percent) VALUES (?, ?, ?, ?)"
      );

      for (const s of finalSplits) {
        insertSplit.run(expenseId, s.member_id, s.share_amount, s.share_percent || null);
      }

      return expenseId;
    });

    const expenseId = transaction();

    const expense = db
      .prepare("SELECT * FROM expenses WHERE id = ?")
      .get(expenseId);
    const expenseSplits = db
      .prepare("SELECT * FROM expense_splits WHERE expense_id = ?")
      .all(expenseId);
    const payer = db
      .prepare("SELECT id, name, color, emoji FROM members WHERE id = ?")
      .get(data.paid_by);

    res.status(201).json({
      success: true,
      data: { ...expense, splits: expenseSplits, paid_by_details: payer },
      message: "Expense added!",
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/groups/:id/expenses — List expenses with filters
router.get("/groups/:id/expenses", (req, res, next) => {
  try {
    const db = getDB();
    const { category, member_id, start_date, end_date, limit, offset } = req.query;

    let sql = `
      SELECT e.*, m.name as payer_name, m.color as payer_color, m.emoji as payer_emoji
      FROM expenses e
      JOIN members m ON e.paid_by = m.id
      WHERE e.group_id = ?
    `;
    const params = [req.params.id];

    if (category) {
      sql += " AND e.category = ?";
      params.push(category);
    }
    if (member_id) {
      sql += " AND e.paid_by = ?";
      params.push(member_id);
    }
    if (start_date) {
      sql += " AND e.expense_date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      sql += " AND e.expense_date <= ?";
      params.push(end_date);
    }

    sql += " ORDER BY e.expense_date DESC, e.created_at DESC";

    if (limit) {
      sql += " LIMIT ?";
      params.push(parseInt(limit));
    } else {
      sql += " LIMIT 100";
    }
    if (offset) {
      sql += " OFFSET ?";
      params.push(parseInt(offset));
    }

    const expenses = db.prepare(sql).all(...params);

    // Attach splits to each expense
    const getSplits = db.prepare(`
      SELECT es.*, m.name, m.color, m.emoji
      FROM expense_splits es
      JOIN members m ON es.member_id = m.id
      WHERE es.expense_id = ?
    `);

    const expensesWithSplits = expenses.map((e) => ({
      ...e,
      splits: getSplits.all(e.id),
    }));

    res.json({ success: true, data: expensesWithSplits });
  } catch (err) {
    next(err);
  }
});

// PUT /api/expenses/:id — Edit expense
router.put("/:id", (req, res, next) => {
  try {
    const db = getDB();
    const { amount, category, description, expense_date, paid_by, split_type, splits } = req.body;

    const existing = db.prepare("SELECT id FROM expenses WHERE id = ?").get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }

    const transaction = db.transaction(() => {
      db.prepare(
        `UPDATE expenses SET amount = COALESCE(?, amount), category = COALESCE(?, category),
         description = COALESCE(?, description), expense_date = COALESCE(?, expense_date),
         paid_by = COALESCE(?, paid_by), split_type = COALESCE(?, split_type)
         WHERE id = ?`
      ).run(
        amount || null,
        category || null,
        description !== undefined ? description : null,
        expense_date || null,
        paid_by || null,
        split_type || null,
        req.params.id
      );

      if (splits) {
        db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").run(req.params.id);
        const insertSplit = db.prepare(
          "INSERT INTO expense_splits (expense_id, member_id, share_amount, share_percent) VALUES (?, ?, ?, ?)"
        );
        for (const s of splits) {
          insertSplit.run(req.params.id, s.member_id, s.share_amount, s.share_percent || null);
        }
      }
    });

    transaction();

    res.json({ success: true, message: "Expense updated." });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/expenses/:id — Delete expense
router.delete("/:id", (req, res, next) => {
  try {
    const db = getDB();
    const result = db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }

    res.json({ success: true, message: "Expense deleted." });
  } catch (err) {
    next(err);
  }
});

export default router;
