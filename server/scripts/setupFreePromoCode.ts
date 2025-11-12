import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

async function setupFreePromoCode() {
  try {
    console.log('Setting up FREE promotion code in Stripe...\n');

    // Create a coupon for 100% off
    const coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: 'forever',
      name: 'Free Assessment Results Access',
      id: 'FREE_RESULTS_ACCESS',
    });

    console.log('✅ Created coupon:', coupon.id);

    // Create a promotion code with code "FREE"
    const promotionCode = await stripe.promotionCodes.create({
      code: 'FREE',
      coupon: coupon.id,
    });

    console.log('✅ Created promotion code:', promotionCode.code);
    console.log('\n🎉 SUCCESS! Candidates can now use code "FREE" at checkout to unlock results for free!\n');
    console.log('How it works:');
    console.log('1. Candidate completes all 4 assessments');
    console.log('2. Clicks "Unlock Results"');
    console.log('3. At Stripe checkout, enters promo code "FREE"');
    console.log('4. Total becomes £0.00 and no card details are required');
    console.log('5. Results are unlocked immediately!\n');

  } catch (error: any) {
    if (error.code === 'resource_already_exists') {
      console.log('⚠️  FREE promotion code already exists in Stripe!');
      console.log('Candidates can already use code "FREE" at checkout.\n');
    } else {
      console.error('❌ Error setting up promotion code:', error.message);
      process.exit(1);
    }
  }
}

setupFreePromoCode();
