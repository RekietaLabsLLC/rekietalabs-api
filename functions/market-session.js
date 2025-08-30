// market-session.js
import express from 'express';
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Product catalog
const products = [
  {
    id: "wizard-dino",
    name: "Wizard Dino",
    price: 3.00,
    stripePriceId: "price_1RZdFXD69KEDp05GomdRWxNj"
  },
  {
    id: "flower-fidget-a",
    name: "Flower Fidget (GITD)",
    price: 8.00,
    stripePriceId: "price_1RZcp5D69KEDp05GEnpthdIB"
  },
  {
    id: "fidget-tree",
    name: "Fidget Tree (Custom)",
    price: 8.00,
    stripePriceId: "price_1RcWqMD69KEDp05GtJnngu4v"
  },
  {
      id: "flower-fidget-b",
    name: "Fidget Tree (Rainbow)",
    price: 8.00,
    stripePriceId: "price_1Rz3DCD69KEDp05GaRCWZuiL"
  },
  {
      id: "sting-ray",
    name: "Sting Ray (Customizable) 2 for 3$",
    price: 3.00,
    stripePriceId: "price_1S1f0pD69KEDp05GspfjKg1K"
  },
  {
      id: "flower-fidget-c",
    name: "Flower Fidget (Customizable)",
    price: 5.00,
    stripePriceId: "price_1S1ovpD69KEDp05GphHmUypx"
  }
];

// ✅ POST /market-session
router.post('/', async (req, res) => {
  try {
    const { cart } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart must be a non-empty array.", refId: "3410016" });
    }

    const lineItems = [];

    for (const item of cart) {
      if (!item.id || typeof item.qty !== 'number' || item.qty < 1 || item.qty > 30) {
        return res.status(400).json({ error: "Invalid or missing itemId or qty out of range (1–30).", refId: "3410026" });
      }

      const product = products.find(p => p.id === item.id);
      if (!product) {
        return res.status(400).json({ error: `Product ID not found: ${item.id}`, refId: "3410036" });
      }

      lineItems.push({
        price: product.stripePriceId,
        quantity: item.qty
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://market.rekietalabs.com/orders/success',
      cancel_url: 'https://market.rekietalabs.com/orders/canceled',
    });

    return res.json({ url: session.url });

  } catch (error) {
    console.error("Stripe session error:", error);
    return res.status(500).json({ error: "Internal server error.", refId: "3410046" });
  }
});

export default router;
