// /functions/admin-disable-trigger.js
import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const router = express.Router();

// Initialize Supabase client with Service Role Key (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.use(express.json());

router.post("/", async (req, res) => {
  const { table, trigger, action } = req.body;

  if (!table || !trigger) {
    return res.status(400).json({ error: "Missing table or trigger name" });
  }

  // Default to 'disable' if action is not provided
  const sqlAction = action === "drop" ? "DROP" : "DISABLE";

  const sql = sqlAction === "DROP"
    ? `DROP TRIGGER IF EXISTS ${trigger} ON ${table};`
    : `ALTER TABLE ${table} DISABLE TRIGGER ${trigger};`;

  try {
    const { data, error } = await supabase.rpc("execute_sql", { sql_query: sql });

    if (error) {
      console.error("SQL execution error:", error);
      return res.status(500).json({ error: error.message, details: error });
    }

    res.json({ success: true, action: sqlAction, table, trigger });
  } catch (err) {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: err.message, details: err });
  }
});

export default router;
