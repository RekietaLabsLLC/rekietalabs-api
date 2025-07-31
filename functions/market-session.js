// functions/market-session.js
import express from 'express';
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// GET /market-session → Health check
router.get('/', (req, res) => {
  res.send('Market Session API is live.');
});

// POST /market-session → Create checkout session
router.post('/', async (req, res) => {
  try {
    const { cartItems } = req.body;

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty or invalid", ref: "340156" });
    }

    const lineItems = [];

    for (const item of cartItems) {
      if (!item.priceId || !item.quantity) {
        return res.status(400).json({ error: "Invalid cart item", ref: "340256" });
      }

      const productData = {
        price: item.priceId,
        quantity: item.quantity
      };

      if (item.customizations) {
        productData.adjustable_quantity = { enabled: false };
        productData.description = `Custom: Side 1 - ${item.customizations.side1}, Side 2 - ${item.customizations.side2}`;
      }

      lineItems.push(productData);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: "https://market.rekietalabs.com/orders/success.html",
      cancel_url: "https://market.rekietalabs.com/orders/canceled.html"
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe Checkout Error:", err);
    return res.status(500).json({ error: "Internal Server Error", ref: "340356" });
  }
});

export default router;
