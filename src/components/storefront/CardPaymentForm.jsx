import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#1a1a1a',
      fontFamily: 'Inter, sans-serif',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#ef4444' },
  },
};

function CheckoutForm({ amount, currency, stripeSecretKey, description, onSuccess, isRTL }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);

  useEffect(() => {
    if (!amount || !stripeSecretKey) return;
    setError(isRTL ? 'الدفع بالبطاقة غير متاح' : 'Online card processing is disabled.');
  }, [amount, currency, stripeSecretKey]);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setProcessing(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
    } else if (paymentIntent.status === 'succeeded') {
      onSuccess({ providerReference: paymentIntent.id });
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-3">
      <div className="border rounded-lg p-3 bg-background">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={processing || !clientSecret || !stripe}>
        {processing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Lock className="h-3.5 w-3.5" />
            {isRTL
              ? `ادفع ${amount.toFixed(2)} ${currency}`
              : `Pay ${amount.toFixed(2)} ${currency}`}
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        {isRTL ? 'مدفوعات آمنة بواسطة Stripe' : 'Secured by Stripe'}
      </p>
    </form>
  );
}

let stripePromiseCache = {};

export default function CardPaymentForm({ stripePublishableKey, stripeSecretKey, amount, currency, description, onSuccess, isRTL }) {
  if (!stripePromiseCache[stripePublishableKey]) {
    stripePromiseCache[stripePublishableKey] = loadStripe(stripePublishableKey);
  }
  const stripePromise = stripePromiseCache[stripePublishableKey];

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        amount={amount}
        currency={currency}
        stripeSecretKey={stripeSecretKey}
        description={description}
        onSuccess={onSuccess}
        isRTL={isRTL}
      />
    </Elements>
  );
}