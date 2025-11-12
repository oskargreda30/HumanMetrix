import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

async function checkPromo() {
  console.log('Checking for FREE promotion code...\n');
  
  try {
    const promoCodes = await stripe.promotionCodes.list({ limit: 10 });
    console.log('Found', promoCodes.data.length, 'promotion codes:');
    promoCodes.data.forEach(p => {
      console.log(`  - Code: "${p.code}", Active: ${p.active}, Coupon: ${p.coupon.id}`);
    });

    const coupons = await stripe.coupons.list({ limit: 10 });
    console.log('\nFound', coupons.data.length, 'coupons:');
    coupons.data.forEach(c => {
      console.log(`  - ID: ${c.id}, Percent Off: ${c.percent_off}%, Valid: ${c.valid}`);
    });
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkPromo();
