// market-session.js

const express = require('express');
const app = express();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // Use env variable

app.use(express.json());

// Your product catalog (make sure prices are in cents)
const PRODUCTS = [
  { id: 1, name: "Flower Fidget", price: 800 },    // $8.00
  { id: 2, name: "Fidget Tree", price: 800 },      // $8.00
  { id: 3, name: "Wizard Dino", price: 300 },      // $3.00
];

// Error codes for support
const ERROR_CODES = {
  INVALID_REQUEST: "340146",
  ITEM_INVALID: "340026",
  SERVER_ERROR: "340166",
};

app.post('/functions/market-session', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        errorCode: ERROR_CODES.INVALID_REQUEST,
        message: 'Invalid items payload.'
      });
    }

    // Validate and prepare Stripe line items
    const line_items = [];

    for (const item of items) {
      const product = PRODUCTS.find(p => p.id === item.id);
      if (!product) {
        return res.status(400).json({
          success: false,
          errorCode: ERROR_CODES.ITEM_INVALID,
          message: 'Invalid product in cart.'
        });
      }

      const quantity = parseInt(item.quantity);
      if (!quantity || quantity < 1) {
        return res.status(400).json({
          success: false,
          errorCode: ERROR_CODES.INVALID_REQUEST,
          message: 'Invalid quantity.'
        });
      }

      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
          },
          unit_amount: product.price, // in cents
        },
        quantity,
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: 'https://rekietalabs.com/market-success',
      cancel_url: 'https://rekietalabs.com/market-cancel',
    });

    return res.json({ success: true, checkoutUrl: session.url });

  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      success: false,
      errorCode: ERROR_CODES.SERVER_ERROR,
      message: 'Internal server error.'
    });
  }
});

// If you want to run locally, uncomment the below:
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

module.exports = app; // Export for serverless function environment
