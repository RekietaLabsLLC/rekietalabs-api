// /functions/manage-trigger.js
import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const router = express.Router();

// Supabase client with service role key (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET / => list triggers on auth.users
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase.rpc("list_triggers_on_auth_users");
    if (error) throw error;
    res.json({ triggers: data });
  } catch (err) {
    console.error("Error listing triggers:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST / => disable or drop a trigger
router.post("/", async (req, res) => {
  const { triggerName, action } = req.body; // action: "disable" or "drop"
  if (!triggerName || !action) return res.status(400).json({ error: "triggerName and action required" });

  try {
    let sql;
    if (action === "disable") {
      sql = `ALTER TABLE auth.users DISABLE TRIGGER "${triggerName}"`;
    } else if (action === "drop") {
      sql = `DROP TRIGGER "${triggerName}" ON auth.users`;
    } else {
      return res.status(400).json({ error: "Invalid action, must be 'disable' or 'drop'" });
    }

    const { data, error } = await supabase.rpc("exec_sql", { query: sql });
    if (error) throw error;

    res.json({ success: true, action, trigger: triggerName });
  } catch (err) {
    console.error("Error managing trigger:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
