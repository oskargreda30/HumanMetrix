let openaiInstance: any = null;
let openaiLoading: Promise<any> | null = null;

export async function getOpenAI() {
  if (openaiInstance) {
    return openaiInstance;
  }
  
  if (openaiLoading) {
    return openaiLoading;
  }
  
  openaiLoading = (async () => {
    console.log('📦 Lazy loading OpenAI module...');
    const startTime = Date.now();
    
    const { default: OpenAI } = await import('openai');
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log(`✅ OpenAI loaded in ${Date.now() - startTime}ms`);
    openaiLoading = null;
    return openaiInstance;
  })();
  
  return openaiLoading;
}

let stripeInstance: any = null;
let stripeLoading: Promise<any> | null = null;

export async function getStripe() {
  if (stripeInstance) {
    return stripeInstance;
  }
  
  if (stripeLoading) {
    return stripeLoading;
  }
  
  stripeLoading = (async () => {
    console.log('📦 Lazy loading Stripe module...');
    const startTime = Date.now();
    
    const { default: Stripe } = await import('stripe');
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    
    console.log(`✅ Stripe loaded in ${Date.now() - startTime}ms`);
    stripeLoading = null;
    return stripeInstance;
  })();
  
  return stripeLoading;
}

let jspdfModule: any = null;
let jspdfLoading: Promise<any> | null = null;

export async function getJsPDF() {
  if (jspdfModule) {
    return jspdfModule;
  }
  
  if (jspdfLoading) {
    return jspdfLoading;
  }
  
  jspdfLoading = (async () => {
    console.log('📦 Lazy loading jsPDF module...');
    const startTime = Date.now();
    
    const { jsPDF } = await import('jspdf');
    jspdfModule = jsPDF;
    
    console.log(`✅ jsPDF loaded in ${Date.now() - startTime}ms`);
    jspdfLoading = null;
    return jspdfModule;
  })();
  
  return jspdfLoading;
}

export function preloadModules() {
  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 Preloading heavy modules for production...');
    
    setTimeout(() => {
      getOpenAI().catch(err => console.warn('OpenAI preload failed:', err.message));
    }, 1000);
    
    setTimeout(() => {
      getStripe().catch(err => console.warn('Stripe preload failed:', err.message));
    }, 2000);
  }
}

export function getModuleStats() {
  return {
    openai: {
      loaded: openaiInstance !== null,
      loading: openaiLoading !== null,
    },
    stripe: {
      loaded: stripeInstance !== null,
      loading: stripeLoading !== null,
    },
    jspdf: {
      loaded: jspdfModule !== null,
      loading: jspdfLoading !== null,
    },
  };
}
