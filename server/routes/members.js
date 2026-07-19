import { Router } from "express";
import { getDB } from "../db.js";

const router = Router();

// POST /api/groups/:id/members — Add member
router.post("/:id/members", (req, res, next) => {
  try {
    const db = getDB();
    const { name, color, emoji } = req.body;

    const members = db
      .prepare("SELECT COUNT(*) as count FROM members WHERE group_id = ?")
      .get(req.params.id);

    if (members.count >= 8) {
      return res.status(400).json({
        success: false,
        message: "Maximum 8 members per group.",
      });
    }

    const result = db
      .prepare(
        "INSERT INTO members (group_id, name, color, emoji) VALUES (?, ?, ?, ?)"
      )
      .run(req.params.id, name, color || "#5B6AF0", emoji || "😊");

    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid },
      message: "Member added!",
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:id/members/:mid — Remove member
router.delete("/:id/members/:mid", (req, res, next) => {
  try {
    const db = getDB();

    const expenseCount = db
      .prepare(
        "SELECT COUNT(*) as count FROM expenses WHERE group_id = ? AND paid_by = ?"
      )
      .get(req.params.id, req.params.mid);

    if (expenseCount.count > 0) {
      return res.status(400).json({
        success: false,
        message:
          "This member has expenses and cannot be removed. Reassign or delete their expenses first.",
      });
    }

    db.prepare(
      "DELETE FROM expense_splits WHERE member_id = ? AND expense_id IN (SELECT id FROM expenses WHERE group_id = ?)"
    ).run(req.params.mid, req.params.id);

    db.prepare(
      "UPDATE expenses SET paid_by = (SELECT id FROM members WHERE group_id = ? AND id != ? LIMIT 1) WHERE paid_by = ?"
    ).run(req.params.id, req.params.mid, req.params.mid);

    db.prepare("DELETE FROM members WHERE id = ? AND group_id = ?").run(
      req.params.mid,
      req.params.id
    );

    res.json({ success: true, message: "Member removed." });
  } catch (err) {
    next(err);
  }
});

export default router;
