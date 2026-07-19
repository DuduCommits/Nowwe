import { Router } from "express";
import { z } from "zod";
import { getDB } from "../db.js";

const router = Router();

const DEFAULT_CATEGORIES = [
  { name: "Rent", emoji: "🏠", color: "#105D5E", split_model: "equal" },
  { name: "Utilities", emoji: "⚡", color: "#E8E300", split_model: "equal" },
  { name: "Groceries", emoji: "🛒", color: "#009A6E", split_model: "equal" },
  { name: "Repairs", emoji: "🔧", color: "#767F7D", split_model: "equal" },
  { name: "Outings", emoji: "🎉", color: "#B3EDA9", split_model: "pay_as_you_go" },
  { name: "Other", emoji: "📦", color: "#C2CBC9", split_model: "equal" },
];

export function seedDefaultCategories(groupId) {
  const db = getDB();
  const insert = db.prepare(
    "INSERT INTO categories (group_id, name, emoji, color, split_model, is_default, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)"
  );
  DEFAULT_CATEGORIES.forEach((cat, idx) => {
    insert.run(groupId, cat.name, cat.emoji, cat.color, cat.split_model, idx);
  });
}

// GET /api/groups/:id/categories — List categories ordered by sort_order
router.get("/:id/categories", (req, res, next) => {
  try {
    const db = getDB();
    const categories = db
      .prepare("SELECT * FROM categories WHERE group_id = ? ORDER BY sort_order ASC, id ASC")
      .all(req.params.id);
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

const createCategorySchema = z.object({
  name: z.string().min(1).max(30),
  emoji: z.string().max(10).default("📦"),
  color: z.string().default("#767F7D"),
  split_model: z
    .enum(["equal", "room_size", "income_weighted", "shared_pot", "pay_as_you_go", "custom"])
    .default("equal"),
});

// POST /api/groups/:id/categories — Create custom category
router.post("/:id/categories", (req, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);
    const db = getDB();

    // Check group exists
    const group = db.prepare("SELECT id FROM groups WHERE id = ?").get(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    // Check duplicate name
    const existing = db
      .prepare("SELECT id FROM categories WHERE group_id = ? AND name = ? COLLATE NOCASE")
      .get(req.params.id, data.name.trim());
    if (existing) {
      return res.status(409).json({ success: false, message: "This category already exists." });
    }

    // Check max 15 categories
    const count = db
      .prepare("SELECT COUNT(*) as cnt FROM categories WHERE group_id = ?")
      .get(req.params.id);
    if (count.cnt >= 15) {
      return res.status(400).json({
        success: false,
        message: "Maximum 15 categories reached. Delete one to add more.",
      });
    }

    // Get max sort_order
    const maxOrder = db
      .prepare("SELECT COALESCE(MAX(sort_order), -1) as mx FROM categories WHERE group_id = ?")
      .get(req.params.id);

    const result = db
      .prepare(
        "INSERT INTO categories (group_id, name, emoji, color, split_model, is_default, sort_order) VALUES (?, ?, ?, ?, ?, 0, ?)"
      )
      .run(req.params.id, data.name.trim(), data.emoji, data.color, data.split_model, maxOrder.mx + 1);

    const category = db
      .prepare("SELECT * FROM categories WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: category, message: "Category added!" });
  } catch (err) {
    next(err);
  }
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(30).optional(),
  emoji: z.string().max(10).optional(),
  color: z.string().optional(),
  split_model: z
    .enum(["equal", "room_size", "income_weighted", "shared_pot", "pay_as_you_go", "custom"])
    .optional(),
});

// PUT /api/groups/:id/categories/:cid — Update category
router.put("/:id/categories/:cid", (req, res, next) => {
  try {
    const data = updateCategorySchema.parse(req.body);
    const db = getDB();

    const category = db
      .prepare("SELECT * FROM categories WHERE id = ? AND group_id = ?")
      .get(req.params.cid, req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    // Default categories: only emoji and split_model can be changed
    if (category.is_default) {
      const updates = [];
      const values = [];
      if (data.emoji !== undefined) { updates.push("emoji = ?"); values.push(data.emoji); }
      if (data.split_model !== undefined) { updates.push("split_model = ?"); values.push(data.split_model); }
      if (data.color !== undefined) { updates.push("color = ?"); values.push(data.color); }
      if (data.name !== undefined && data.name !== category.name) {
        return res.status(400).json({
          success: false,
          message: "Default category name is locked and cannot be changed.",
        });
      }
      if (updates.length === 0) {
        return res.json({ success: true, message: "No changes." });
      }
      values.push(req.params.cid);
      db.prepare(`UPDATE categories SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    } else {
      // Custom category: all fields editable
      const updates = [];
      const values = [];
      if (data.name !== undefined) {
        // Check duplicate name
        const dup = db
          .prepare("SELECT id FROM categories WHERE group_id = ? AND name = ? COLLATE NOCASE AND id != ?")
          .get(req.params.id, data.name.trim(), req.params.cid);
        if (dup) {
          return res.status(409).json({ success: false, message: "This category already exists." });
        }
        updates.push("name = ?");
        values.push(data.name.trim());
      }
      if (data.emoji !== undefined) { updates.push("emoji = ?"); values.push(data.emoji); }
      if (data.color !== undefined) { updates.push("color = ?"); values.push(data.color); }
      if (data.split_model !== undefined) { updates.push("split_model = ?"); values.push(data.split_model); }

      if (updates.length === 0) {
        return res.json({ success: true, message: "No changes." });
      }
      values.push(req.params.cid);
      db.prepare(`UPDATE categories SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }

    const updated = db
      .prepare("SELECT * FROM categories WHERE id = ?")
      .get(req.params.cid);

    res.json({ success: true, data: updated, message: "Category updated." });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:id/categories/:cid — Delete custom category
router.delete("/:id/categories/:cid", (req, res, next) => {
  try {
    const db = getDB();

    const category = db
      .prepare("SELECT * FROM categories WHERE id = ? AND group_id = ?")
      .get(req.params.cid, req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    if (category.is_default) {
      return res.status(400).json({
        success: false,
        message: "Default categories cannot be deleted.",
      });
    }

    // Migrate expenses to "Other"
    db.prepare("UPDATE expenses SET category = 'Other' WHERE category = ? AND group_id = ?")
      .run(category.name, req.params.id);

    db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.cid);

    res.json({ success: true, message: `"${category.name}" deleted. Expenses moved to Other.` });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/groups/:id/categories/reorder — Save new sort order
router.patch("/:id/categories/reorder", (req, res, next) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, message: "order must be an array of category IDs." });
    }

    const db = getDB();
    const update = db.prepare("UPDATE categories SET sort_order = ? WHERE id = ? AND group_id = ?");
    const transaction = db.transaction(() => {
      order.forEach((catId, idx) => {
        update.run(idx, catId, req.params.id);
      });
    });
    transaction();

    res.json({ success: true, message: "Categories reordered." });
  } catch (err) {
    next(err);
  }
});

export default router;
export { DEFAULT_CATEGORIES };
