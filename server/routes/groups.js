import { Router } from "express";
import { z } from "zod";
import { getDB } from "../db.js";
import { seedDefaultCategories } from "./categories.js";

const router = Router();

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  currency: z.string().default("₹"),
  settlement_threshold: z.number().min(0).default(0),
  members: z
    .array(
      z.object({
        name: z.string().min(1).max(50),
        color: z.string(),
        emoji: z.string().default("😊"),
      })
    )
    .min(2)
    .max(8),
  fairness_models: z
    .array(
      z.object({
        category: z.enum([
          "Rent",
          "Utilities",
          "Groceries",
          "Repairs",
          "Outings",
          "Other",
        ]),
        model_type: z.enum([
          "equal",
          "room_size",
          "income_weighted",
          "shared_pot",
          "pay_as_you_go",
        ]),
        weights: z.any().optional(),
      })
    )
    .optional(),
});

// POST /api/groups — Create group
router.post("/", (req, res, next) => {
  try {
    const data = createGroupSchema.parse(req.body);
    const db = getDB();

    let code;
    let attempts = 0;
    while (attempts < 10) {
      code = generateCode();
      const existing = db
        .prepare("SELECT id FROM groups WHERE code = ?")
        .get(code);
      if (!existing) break;
      attempts++;
    }

    const insertGroup = db.prepare(
      "INSERT INTO groups (name, code, currency, settlement_threshold) VALUES (?, ?, ?, ?)"
    );
    const insertMember = db.prepare(
      "INSERT INTO members (group_id, name, color, emoji) VALUES (?, ?, ?, ?)"
    );
    const insertFairness = db.prepare(
      "INSERT INTO fairness_models (group_id, category, model_type, weights) VALUES (?, ?, ?, ?)"
    );

    const transaction = db.transaction(() => {
      const result = insertGroup.run(
        data.name,
        code,
        data.currency,
        data.settlement_threshold
      );
      const groupId = result.lastInsertRowid;

      const memberIds = [];
      for (const m of data.members) {
        const r = insertMember.run(groupId, m.name, m.color, m.emoji);
        memberIds.push(r.lastInsertRowid);
      }

      // Seed default categories
      seedDefaultCategories(groupId);

      // Default fairness models
      const defaultModels = data.fairness_models || [
        { category: "Rent", model_type: "equal" },
        { category: "Utilities", model_type: "equal" },
        { category: "Groceries", model_type: "equal" },
        { category: "Repairs", model_type: "equal" },
        { category: "Outings", model_type: "pay_as_you_go" },
        { category: "Other", model_type: "equal" },
      ];

      for (const fm of defaultModels) {
        insertFairness.run(
          groupId,
          fm.category,
          fm.model_type,
          fm.weights ? JSON.stringify(fm.weights) : null
        );
      }

      return { groupId, code, memberIds };
    });

    const result = transaction();

    res.status(201).json({
      success: true,
      data: {
        id: result.groupId,
        code: result.code,
        memberIds: result.memberIds,
      },
      message: "Group created successfully!",
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/groups/:code — Get group by code
router.get("/:code", (req, res, next) => {
  try {
    const db = getDB();
    const group = db
      .prepare("SELECT * FROM groups WHERE code = ?")
      .get(req.params.code);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found. Check your code and try again.",
      });
    }

    const members = db
      .prepare("SELECT * FROM members WHERE group_id = ? ORDER BY id")
      .all(group.id);

    const fairnessModels = db
      .prepare("SELECT * FROM fairness_models WHERE group_id = ?")
      .all(group.id);
    const categories = db
      .prepare("SELECT * FROM categories WHERE group_id = ? ORDER BY sort_order ASC, id ASC")
      .all(group.id);

    res.json({
      success: true,
      data: { ...group, members, fairness_models: fairnessModels, categories },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/groups/id/:id — Get group by ID
router.get("/id/:id", (req, res, next) => {
  try {
    const db = getDB();
    const group = db
      .prepare("SELECT * FROM groups WHERE id = ?")
      .get(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found.",
      });
    }

    const members = db
      .prepare("SELECT * FROM members WHERE group_id = ? ORDER BY id")
      .all(group.id);

    const fairnessModels = db
      .prepare("SELECT * FROM fairness_models WHERE group_id = ?")
      .all(group.id);
    const categories = db
      .prepare("SELECT * FROM categories WHERE group_id = ? ORDER BY sort_order ASC, id ASC")
      .all(group.id);

    res.json({
      success: true,
      data: { ...group, members, fairness_models: fairnessModels, categories },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/groups/:id — Update group settings
router.put("/:id", (req, res, next) => {
  try {
    const db = getDB();
    const { name, currency, settlement_threshold } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (currency !== undefined) {
      updates.push("currency = ?");
      values.push(currency);
    }
    if (settlement_threshold !== undefined) {
      updates.push("settlement_threshold = ?");
      values.push(settlement_threshold);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update.",
      });
    }

    values.push(req.params.id);
    db.prepare(
      `UPDATE groups SET ${updates.join(", ")} WHERE id = ?`
    ).run(...values);

    res.json({ success: true, message: "Group updated." });
  } catch (err) {
    next(err);
  }
});

export default router;
