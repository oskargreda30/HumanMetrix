import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

const TEST_CODES = [
  'TESTHM01',
  'TESTHM02', 
  'TESTHM03',
  'TESTHM04',
  'TESTHM05',
  'BETAHM06',
  'BETAHM07',
  'BETAHM08',
  'DEMOHM09',
  'DEMOHM10',
];

async function createTestPromoCodes() {
  try {
    console.log('Creating 10 test promotion codes for B2C testing...\n');
    
    let couponId = 'FREE_RESULTS_ACCESS';
    
    try {
      await stripe.coupons.retrieve(couponId);
      console.log('✅ Found existing coupon:', couponId);
    } catch (e: any) {
      if (e.code === 'resource_missing') {
        console.log('Creating new coupon...');
        const coupon = await stripe.coupons.create({
          percent_off: 100,
          duration: 'forever',
          name: 'Free Assessment Results Access',
          id: couponId,
        });
        console.log('✅ Created coupon:', coupon.id);
      } else {
        throw e;
      }
    }

    console.log('\nCreating promotion codes...\n');
    
    const results: { code: string; status: string }[] = [];
    
    for (const code of TEST_CODES) {
      try {
        const promotionCode = await stripe.promotionCodes.create({
          code: code,
          promotion: {
            type: 'coupon',
            coupon: couponId,
          },
        } as any);
        results.push({ code, status: '✅ Created' });
        console.log(`✅ Created: ${promotionCode.code}`);
      } catch (error: any) {
        if (error.code === 'resource_already_exists') {
          results.push({ code, status: '⚠️  Already exists' });
          console.log(`⚠️  Already exists: ${code}`);
        } else {
          results.push({ code, status: `❌ Error: ${error.message}` });
          console.log(`❌ Error creating ${code}: ${error.message}`);
        }
      }
    }

    console.log('\n========================================');
    console.log('TEST PROMO CODES FOR B2C TESTING');
    console.log('========================================\n');
    console.log('All codes give 100% discount (price drops to 0):\n');
    
    TEST_CODES.forEach((code, i) => {
      console.log(`${i + 1}. ${code}`);
    });
    
    console.log('\n----------------------------------------');
    console.log('How to use:');
    console.log('1. Complete all 4 assessments');
    console.log('2. Click "Unlock Results"');
    console.log('3. At checkout, enter one of the codes above');
    console.log('4. Total becomes £0.00 - no card needed');
    console.log('5. Results are unlocked immediately!');
    console.log('----------------------------------------\n');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

createTestPromoCodes();
