import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

async function createPromoCode() {
  try {
    console.log('Creating FREE promotion code...\n');
    
    const promotionCode = await stripe.promotionCodes.create({
      code: 'FREE',
      coupon: 'FREE_RESULTS_ACCESS',
    });

    console.log('✅ Created promotion code:', promotionCode.code);
    console.log('🎉 Code "FREE" is now active in Stripe!\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

createPromoCode();
