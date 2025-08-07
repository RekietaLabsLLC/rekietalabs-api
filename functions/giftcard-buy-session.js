// functions/giftcard-buy-session.js
import express from 'express';
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /giftcard-buy-session
router.post('/', async (req, res) => {
  const { buyerFirstName, buyerEmail, amount, toName } = req.body;

  // Validate input
  if (!buyerFirstName || typeof buyerFirstName !== 'string' || buyerFirstName.trim().length === 0 || buyerFirstName.trim().length > 30) {
    return res.status(400).json({ error: 'Invalid buyer first name', errorCode: '390007' });
  }

  if (!buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    return res.status(400).json({ error: 'Invalid buyer email', errorCode: '390017' });
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount < 1 || numericAmount > 1000) {
    return res.status(400).json({ error: 'Amount must be between $1 and $1000', errorCode: '390027' });
  }

  const toNameSafe = (typeof toName === 'string' && toName.trim().length > 0 && toName.trim().length <= 30) ? toName.trim() : 'You!';

  try {
    // Create a coupon with amount_off (in cents)
    const coupon = await stripe.coupons.create({
      amount_off: Math.round(numericAmount * 100),
      currency: 'usd',
      duration: 'repeating',
      duration_in_months: 12,
      name: `RekietaLabs Gift Card for ${toNameSafe}`,
      metadata: {
        buyerFirstName: buyerFirstName.trim(),
        toName: toNameSafe,
        amount: numericAmount,
      },
    });

    // Create a promotion code with the coupon
    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: `RLGC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      active: true,
    });

    // Create Checkout Session with dynamic pricing and your product name
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: buyerEmail,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'RekietaLabs Gift Card',
          },
          unit_amount: Math.round(numericAmount * 100),
        },
        quantity: 1,
      }],
      success_url: `https://giftcard.hub.rekietalabs.com?payment=${numericAmount}&code=${promoCode.code}&buyer=TRUE`,
      cancel_url: `https://giftcard.hub.rekietalabs.com/payment/cancled`,
      metadata: {
        buyerFirstName: buyerFirstName.trim(),
        toName: toNameSafe,
        promoCode: promoCode.code,
        amount: numericAmount,
      },
    });

    return res.json({ checkoutUrl: session.url });

  } catch (err) {
    console.error('Stripe API error:', err);
    return res.status(500).json({ error: 'Internal server error', errorCode: '390037' });
  }
});

export default router;
