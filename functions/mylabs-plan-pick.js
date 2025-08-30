import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // must be service role
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 1. Get the logged-in user from Supabase
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Missing auth token" });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: "Invalid user session" });
    }

    // 2. Check if user already has a Stripe customer
    let { data: userRecord, error: dbError } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customer;

    if (userRecord?.stripe_customer_id) {
      // already exists
      customer = await stripe.customers.retrieve(userRecord.stripe_customer_id);
    } else {
      // 3. Create new Stripe customer
      customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        metadata: {
          supabase_user_id: user.id,
          plan: "not-selected", // default until they pick in portal
        },
      });

      // 4. Save Stripe customer in Supabase
      await supabase.from("user_subscriptions").insert([
        {
          user_id: user.id,
          stripe_customer_id: customer.id,
          plan: "not-selected",
        },
      ]);
    }

    // 5. Create Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: "https://accounts.rekietalabs.com/mylabs/dashboard",
    });

    // 6. Return portal URL to frontend
    return res.status(200).json({ url: portalSession.url });

  } catch (err) {
    console.error("Pick plan API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
