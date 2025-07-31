// functions/market-session.js
import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ GET: Basic health check if you visit the URL directly
router.get('/', (req, res) => {
  res.send('🛒 Market Session API is live!');
});

// ✅ POST: Create Checkout Session
router.post('/', async (req, res) => {
  const { itemId, customData } = req.body;

  const priceIds = {
    'wizard-dino': 'price_1RZdFXD69KEDp05GomdRWxNj', // $3
    'flower-fidget-gitd': 'price_1RZcp5D69KEDp05GEnpthdIB', // $8
    'fidget-tree': 'price_1RaTREE89ABC1234567890abc', // Real separate ID
  };

  const itemNames = {
    'wizard-dino': 'Wizard Dino',
    'flower-fidget-gitd': 'Glow-in-the-Dark Flower Fidget',
    'fidget-tree': 'Custom Fidget Tree',
  };

  const refIdBase = '34' + Math.floor(10000 + Math.random() * 89999) + '6';

  try {
    if (!itemId || !priceIds[itemId]) {
      return res.status(400).json({
        error: 'Invalid or missing itemId.',
        refId: refIdBase,
      });
    }

    const metadata = {
      itemId,
      product: itemNames[itemId],
    };

    if (itemId === 'fidget-tree') {
      if (!customData || !customData.side1 || !customData.side2) {
        return res.status(400).json({
          error: 'Missing required color data for custom fidget tree.',
          refId: refIdBase,
        });
      }
      metadata.side1 = customData.side1;
      metadata.side2 = customData.side2;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceIds[itemId],
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata,
      success_url: 'https://market.rekietalabs.com/success',
      cancel_url: 'https://market.rekietalabs.com/cancel',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe session error:', err.message);
    return res.status(500).json({
      error: 'Failed to create checkout session.',
      refId: refIdBase,
    });
  }
});

export default router;
