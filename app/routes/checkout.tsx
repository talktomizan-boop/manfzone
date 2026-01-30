import { useMemo, useState } from 'react';
import { Form, Link, useActionData, useLoaderData, useNavigation } from 'react-router';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { Button } from '~/components/ui/button/button';
import { Input } from '~/components/ui/input/input';
import { Label } from '~/components/ui/label/label';
import type { Route } from './+types/checkout';
import { createSupabaseServerClient } from '~/lib/supabase';
import { redirectWithHeaders } from '~/lib/redirect';
import { getSupabaseServiceClient } from '~/lib/supabase.service';
import {
  CART_SESSION_COOKIE,
  CART_SESSION_MAX_AGE,
  buildCookie,
  getCookie,
  getExistingCart,
  getCartItemsForCheckout,
} from '~/lib/cart';
import { renderInvoiceEmail, renderOrderConfirmationEmail, sendEmail } from '~/lib/email';
import { env } from '~/config/environment';
import styles from './checkout.module.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Checkout - Manaf Zone' },
    { name: 'description', content: 'Complete your purchase' },
  ];
}

function formatAddress(a: any) {
  const parts = [a.address_line_1, a.address_line_2, a.city, a.state_province, a.postal_code, a.country].filter(Boolean);
  return parts.join(', ');
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const step = (url.searchParams.get('step') || 'shipping').toString();
  const orderId = url.searchParams.get('orderId');

  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id || null;
  const sessionId = getCookie(request, CART_SESSION_COOKIE);

  let cartId: string | null = null;
  const cart = await getExistingCart(supabase, { userId, sessionId });
  if (cart) cartId = cart.id;

  const cartSummary = cartId ? await getCartItemsForCheckout(supabase, cartId) : { items: [], subtotal: 0 };

  const { data: addresses } = userId
    ? await supabase
        .from('addresses')
        .select(
          'id,label,full_name,phone,address_line_1,address_line_2,city,state_province,postal_code,country,is_default'
        )
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
    : { data: [] as any[] };

  let confirmationOrder: any = null;
  if (step === 'confirmation' && orderId) {
    const { data } = await supabase
      .from('orders')
      .select(
        `
        id,
        order_number,
        status,
        current_state,
        total,
        created_at,
        email,
        shipping_full_name,
        shipping_phone,
        shipping_address_line_1,
        shipping_address_line_2,
        shipping_city,
        shipping_state_province,
        shipping_postal_code,
        shipping_country
      `
      )
      .eq('id', orderId)
      .maybeSingle();
    confirmationOrder = data || null;
  }

  return {
    step,
    cart: {
      id: cartId,
      items: cartSummary.items,
      subtotal: cartSummary.subtotal,
      total: cartSummary.subtotal,
    },
    session: session ? { user: { id: session.user.id, email: session.user.email || '' } } : null,
    addresses: addresses || [],
    confirmationOrder,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = (formData.get('intent') || '').toString();

  if (intent !== 'place_order') {
    return { error: 'Invalid request' };
  }

  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id || null;
  let sessionId = getCookie(request, CART_SESSION_COOKIE);
  let setSessionCookie = false;
  if (!userId && !sessionId) {
    sessionId = crypto.randomUUID();
    setSessionCookie = true;
  }

  const cart = await getExistingCart(supabase, { userId, sessionId });
  if (!cart) {
    return { error: 'Your cart is empty.' };
  }

  const cartSummary = await getCartItemsForCheckout(supabase, cart.id);
  if (!cartSummary.items.length) {
    return { error: 'Your cart is empty.' };
  }

  const email = (formData.get('email') || session?.user?.email || '').toString().trim();
  if (!email) {
    return { error: 'Email is required.' };
  }

  // Shipping fields
  const shipping_full_name = (formData.get('shipping_full_name') || '').toString().trim();
  const shipping_phone = (formData.get('shipping_phone') || '').toString().trim();
  const shipping_address_line_1 = (formData.get('shipping_address_line_1') || '').toString().trim();
  const shipping_address_line_2 = (formData.get('shipping_address_line_2') || '').toString().trim();
  const shipping_city = (formData.get('shipping_city') || '').toString().trim();
  const shipping_state_province = (formData.get('shipping_state_province') || '').toString().trim();
  const shipping_postal_code = (formData.get('shipping_postal_code') || '').toString().trim();
  const shipping_country = (formData.get('shipping_country') || 'Bangladesh').toString().trim();

  const payment_method = (formData.get('payment_method') || 'cod').toString();

  if (!shipping_full_name || !shipping_phone || !shipping_address_line_1 || !shipping_city || !shipping_country) {
    return { error: 'Please complete your shipping address.' };
  }

  const subtotal = cartSummary.subtotal;

  // Coupons (server-side only, no UI changes required)
  let coupon_id: string | null = null;
  let coupon_code: string | null = null;
  let discount_amount = 0;

  if (env.features.enableCoupons) {
    try {
      const service = getSupabaseServiceClient();

      // Prefer explicit ?coupon=CODE, otherwise read from cart.coupon_code
      const reqUrl = new URL(request.url);
      const couponFromUrl = (reqUrl.searchParams.get('coupon') || '').trim();

      const { data: cartRow } = await supabase
        .from('carts')
        .select('coupon_code, coupon_id')
        .eq('id', cart.id)
        .maybeSingle();

      const desiredCode = (couponFromUrl || cartRow?.coupon_code || '').trim();

      if (desiredCode) {
        const { data: coupon } = await service
          .from('coupons')
          .select('id, code, discount_type, discount_value, min_subtotal, max_discount, starts_at, ends_at, max_uses, used_count, is_active')
          .ilike('code', desiredCode)
          .maybeSingle();

        const now = Date.now();
        const startsOk = !coupon?.starts_at || now >= new Date(coupon.starts_at as any).getTime();
        const endsOk = !coupon?.ends_at || now <= new Date(coupon.ends_at as any).getTime();
        const activeOk = Boolean(coupon?.is_active);
        const minOk = Number(subtotal) >= Number(coupon?.min_subtotal || 0);
        const usesOk =
          coupon?.max_uses == null ? true : Number(coupon.used_count || 0) < Number(coupon.max_uses);

        if (coupon && activeOk && startsOk && endsOk && minOk && usesOk) {
          coupon_id = coupon.id;
          coupon_code = coupon.code;

          if (coupon.discount_type === 'percent') {
            discount_amount = (Number(subtotal) * Number(coupon.discount_value || 0)) / 100;
            if (coupon.max_discount != null) {
              discount_amount = Math.min(discount_amount, Number(coupon.max_discount));
            }
          } else {
            discount_amount = Number(coupon.discount_value || 0);
          }

          discount_amount = Math.max(0, Math.min(Number(subtotal), discount_amount));

          // Persist onto cart (best-effort; does not change UI)
          await supabase
            .from('carts')
            .update({ coupon_code, coupon_id })
            .eq('id', cart.id)
            .then(() => null)
            .catch(() => null);
        }
      }
    } catch (e) {
      // Coupon errors should never block checkout
      discount_amount = 0;
      coupon_id = null;
      coupon_code = null;
    }
  }

  const shipping_cost = 0;
  const tax_amount = 0;
  const total = subtotal - discount_amount + shipping_cost + tax_amount;

  // Create order + items
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      email,
      status: 'pending',
      subtotal,
      discount_amount,
      coupon_code,
      coupon_id,
      shipping_cost,
      tax_amount,
      total,
      shipping_full_name,
      shipping_phone,
      shipping_address_line_1,
      shipping_address_line_2: shipping_address_line_2 || null,
      shipping_city,
      shipping_state_province: shipping_state_province || null,
      shipping_postal_code: shipping_postal_code || null,
      shipping_country,
      billing_full_name: shipping_full_name,
      billing_phone: shipping_phone,
      billing_address_line_1: shipping_address_line_1,
      billing_address_line_2: shipping_address_line_2 || null,
      billing_city: shipping_city,
      billing_state_province: shipping_state_province || null,
      billing_postal_code: shipping_postal_code || null,
      billing_country: shipping_country,
      source: 'web',
      current_state: 'pending',
    })
    .select('id, order_number, created_at, total')
    .single();

  if (orderError) {
    console.error('Checkout order create error:', orderError);
    return { error: 'Unable to place order. Please try again.' };
  }

  const orderItemsPayload = cartSummary.items.map((i) => ({
    order_id: order.id,
    product_id: i.product_id,
    variant_id: i.variant_id,
    product_name: i.product_name,
    variant_name: i.variant_name,
    sku: i.sku,
    quantity: i.quantity,
    unit_price: i.unit_price,
    total_price: i.line_total,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
  if (itemsError) {
    console.error('Checkout order_items error:', itemsError);
    return { error: 'Order was created, but items failed to save. Please contact support.' };
  }

  

  // Coupon redemption tracking (best-effort, service role only)
  if (coupon_id && coupon_code) {
    try {
      const service = getSupabaseServiceClient();
      await service.from('coupon_redemptions').insert({
        coupon_id,
        code: coupon_code,
        order_id: order.id,
        user_id: userId,
        email,
      });
      await service.rpc('increment_coupon_use', { coupon_id_input: coupon_id }).catch(() => null);
    } catch {
      // no-op
    }
  }
// Create payment record (placeholder for real gateway integration)
  await supabase.from('payments').insert({
    order_id: order.id,
    amount: total,
    payment_method,
    status: 'pending',
    currency: 'BDT',
  });

  // Track state history
  await supabase.from('order_state_history').insert({
    order_id: order.id,
    from_state: null,
    to_state: 'pending',
    changed_by: userId,
    reason: 'Order placed',
    metadata: { channel: 'web' },
  });

  // Clear cart
  await supabase.from('cart_items').delete().eq('cart_id', cart.id);

  // Guest cart cookie safety
  if (setSessionCookie && sessionId) {
    headers.append('Set-Cookie', buildCookie(CART_SESSION_COOKIE, sessionId, CART_SESSION_MAX_AGE));
  }

  // Email flows (production-safe: failures are logged but won't block order completion)
  try {
    const appUrl = env.app.url || process.env.APP_URL || '';
    const orderDate = new Date(order.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });

    await sendEmail({
      to: email,
      subject: `Order Confirmation - ${order.order_number}`,
      html: renderOrderConfirmationEmail({
        orderNumber: order.order_number,
        orderId: order.id,
        orderDate,
        customerName: shipping_full_name,
        total,
        appUrl,
      }),
    });

    const invoiceNumber = `INV-${order.order_number}`;
    const shippingAddress = `${shipping_full_name}\n${shipping_phone}\n${[shipping_address_line_1, shipping_address_line_2, shipping_city, shipping_state_province, shipping_postal_code, shipping_country]
      .filter(Boolean)
      .join(', ')}`;

    const billingAddress = `${shipping_full_name}\n${shipping_phone}\n${[shipping_address_line_1, shipping_address_line_2, shipping_city, shipping_state_province, shipping_postal_code, shipping_country]
      .filter(Boolean)
      .join(', ')}`;

    await sendEmail({
      to: email,
      subject: `Invoice - ${invoiceNumber}`,
      html: renderInvoiceEmail({
        invoiceNumber,
        orderNumber: order.order_number,
        orderId: order.id,
        orderDate,
        customerName: shipping_full_name,
        customerEmail: email,
        shippingAddress,
        billingAddress,
        items: cartSummary.items.map((i) => ({ name: i.variant_name ? `${i.product_name} (${i.variant_name})` : i.product_name, quantity: i.quantity, unitPrice: i.unit_price })),
        subtotal,
        tax: tax_amount,
        discount: discount_amount,
        total,
        paymentStatus: 'pending',
      }),
    });
  } catch (e) {
    console.error('[email] failed to send order emails', e);
  }

  return redirectWithHeaders(headers, `/checkout?step=confirmation&orderId=${encodeURIComponent(order.id)}`);
}

export default function Checkout() {
  const { step, cart, session, addresses, confirmationOrder } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const [uiStep, setUiStep] = useState<'shipping' | 'payment'>(() => (step === 'payment' ? 'payment' : 'shipping'));
  const isSubmitting = navigation.state === 'submitting';

  const defaultAddress = useMemo(() => (addresses || []).find((a: any) => a.is_default) || (addresses || [])[0], [addresses]);

  const canCheckout = (cart?.items || []).length > 0;

  if (step === 'confirmation') {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.container}>
          <h1 className={styles.title}>Order Confirmation</h1>

          {!confirmationOrder ? (
            <div className={styles.card}>We couldn't find that order.</div>
          ) : (
            <div className={styles.card}>
              <p className={styles.lead}>
                Thanks! Your order <strong>{confirmationOrder.order_number}</strong> has been placed.
              </p>
              <p className={styles.muted}>Status: {confirmationOrder.current_state || confirmationOrder.status}</p>
              <div className={styles.actions}>
                <Link to={`/orders/${confirmationOrder.id}`} className={styles.linkButton}>
                  View Order Details
                </Link>
                <Link to="/products" className={styles.linkButtonSecondary}>
                  Continue Shopping
                </Link>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.container}>
        <h1 className={styles.title}>Checkout</h1>
        <p className={styles.subtitle}>Complete your purchase in a few steps</p>

        {!canCheckout ? (
          <div className={styles.card}>
            <p>Your cart is empty.</p>
            <Link to="/products" className={styles.linkButtonSecondary}>
              Browse products
            </Link>
          </div>
        ) : (
          <div className={styles.layout}>
            <div className={styles.main}>
              <div className={styles.stepper} aria-label="Checkout steps">
                <button
                  type="button"
                  className={uiStep === 'shipping' ? styles.stepActive : styles.step}
                  onClick={() => setUiStep('shipping')}
                >
                  1. Shipping
                </button>
                <button
                  type="button"
                  className={uiStep === 'payment' ? styles.stepActive : styles.step}
                  onClick={() => setUiStep('payment')}
                >
                  2. Payment
                </button>
              </div>

              {actionData?.error && <div className={styles.error}>{actionData.error}</div>}

              <Form method="post" className={styles.form}>
                <input type="hidden" name="intent" value="place_order" />

                {uiStep === 'shipping' ? (
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Shipping address</h2>

                    {!session && (
                      <div className={styles.notice}>
                        Already have an account? <Link to="/login">Log in</Link> to see saved addresses.
                      </div>
                    )}

                    <div className={styles.grid}>
                      <div className={styles.field}>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" defaultValue={session?.user.email || ''} required />
                      </div>
                      <div className={styles.field}>
                        <Label htmlFor="shipping_full_name">Full name</Label>
                        <Input
                          id="shipping_full_name"
                          name="shipping_full_name"
                          defaultValue={defaultAddress?.full_name || ''}
                          required
                        />
                      </div>
                      <div className={styles.field}>
                        <Label htmlFor="shipping_phone">Phone</Label>
                        <Input id="shipping_phone" name="shipping_phone" defaultValue={defaultAddress?.phone || ''} required />
                      </div>
                      <div className={styles.fieldWide}>
                        <Label htmlFor="shipping_address_line_1">Address line 1</Label>
                        <Input
                          id="shipping_address_line_1"
                          name="shipping_address_line_1"
                          defaultValue={defaultAddress?.address_line_1 || ''}
                          required
                        />
                      </div>
                      <div className={styles.fieldWide}>
                        <Label htmlFor="shipping_address_line_2">Address line 2 (optional)</Label>
                        <Input
                          id="shipping_address_line_2"
                          name="shipping_address_line_2"
                          defaultValue={defaultAddress?.address_line_2 || ''}
                        />
                      </div>
                      <div className={styles.field}>
                        <Label htmlFor="shipping_city">City</Label>
                        <Input id="shipping_city" name="shipping_city" defaultValue={defaultAddress?.city || ''} required />
                      </div>
                      <div className={styles.field}>
                        <Label htmlFor="shipping_state_province">State/Province (optional)</Label>
                        <Input
                          id="shipping_state_province"
                          name="shipping_state_province"
                          defaultValue={defaultAddress?.state_province || ''}
                        />
                      </div>
                      <div className={styles.field}>
                        <Label htmlFor="shipping_postal_code">Postal code (optional)</Label>
                        <Input
                          id="shipping_postal_code"
                          name="shipping_postal_code"
                          defaultValue={defaultAddress?.postal_code || ''}
                        />
                      </div>
                      <div className={styles.field}>
                        <Label htmlFor="shipping_country">Country</Label>
                        <Input id="shipping_country" name="shipping_country" defaultValue={defaultAddress?.country || 'Bangladesh'} required />
                      </div>
                    </div>

                    <div className={styles.sectionActions}>
                      <Button type="button" onClick={() => setUiStep('payment')}>
                        Continue to payment
                      </Button>
                    </div>
                  </section>
                ) : (
                  <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Payment</h2>
                    <p className={styles.muted}>Choose a payment method to place your order.</p>

                    <div className={styles.radioGroup} role="radiogroup" aria-label="Payment method">
                      <label className={styles.radioItem}>
                        <input type="radio" name="payment_method" value="cod" defaultChecked />
                        <span>Cash on delivery</span>
                      </label>
                      <label className={styles.radioItem}>
                        <input type="radio" name="payment_method" value="card" />
                        <span>Card (placeholder)</span>
                      </label>
                    </div>

                    <div className={styles.sectionActions}>
                      <Button type="button" variant="ghost" onClick={() => setUiStep('shipping')}>
                        Back
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Placing order...' : 'Place order'}
                      </Button>
                    </div>
                  </section>
                )}
              </Form>
            </div>

            <aside className={styles.summary}>
              <div className={styles.summaryCard}>
                <h3 className={styles.summaryTitle}>Order summary</h3>
                <ul className={styles.summaryList}>
                  {(cart.items || []).map((i: any) => (
                    <li key={i.id} className={styles.summaryItem}>
                      <div className={styles.summaryLeft}>
                        <img src={i.image_url || '/placeholder.jpg'} alt="" className={styles.summaryImage} />
                        <div>
                          <div className={styles.summaryName}>{i.product_name}</div>
                          {i.variant_name && <div className={styles.muted}>{i.variant_name}</div>}
                          <div className={styles.muted}>Qty: {i.quantity}</div>
                        </div>
                      </div>
                      <div className={styles.summaryPrice}>৳{Number(i.line_total).toFixed(2)}</div>
                    </li>
                  ))}
                </ul>

                <div className={styles.summaryTotals}>
                  <div className={styles.totalRow}>
                    <span>Subtotal</span>
                    <span>৳{Number(cart.subtotal).toFixed(2)}</span>
                  </div>
                  <div className={styles.totalRowStrong}>
                    <span>Total</span>
                    <span>৳{Number(cart.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.summaryCard}>
                <Link to="/cart" className={styles.linkButtonSecondary}>
                  Back to cart
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
