import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Get auth token
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Missing auth token" });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: "Invalid user session" });
    }

    // 2. Parse plan from body
    const { plan } = req.body;
    if (!plan) {
      return res.status(400).json({ error: "Plan is required" });
    }

    // 3. Check if Stripe customer exists
    let { data: userRecord } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customer;
    if (userRecord?.stripe_customer_id) {
      customer = await stripe.customers.update(userRecord.stripe_customer_id, {
        metadata: { supabase_user_id: user.id, plan },
      });
    } else {
      // Create Stripe customer
      customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        metadata: { supabase_user_id: user.id, plan },
      });

      // Save in DB
      await supabase.from("user_subscriptions").insert([
        {
          user_id: user.id,
          stripe_customer_id: customer.id,
          plan,
        },
      ]);
    }

    // 4. Update DB plan if already existed
    await supabase
      .from("user_subscriptions")
      .update({ plan })
      .eq("user_id", user.id);

    // 5. Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: "https://accounts.rekietalabs.com/mylabs/dashboard",
    });

    return res.status(200).json({ url: portalSession.url });

  } catch (err) {
    console.error("Pick plan API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
