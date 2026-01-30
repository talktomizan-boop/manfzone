import { useEffect, useMemo, useState } from 'react';
import { Link, useFetcher } from 'react-router';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { Button } from '~/components/ui/button/button';
import type { Route } from './+types/cart';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import styles from './cart.module.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Shopping Cart - Manaf Zone' },
    { name: 'description', content: 'Review your shopping cart' },
  ];
}

const CART_SESSION_COOKIE = 'cart_session_id';
const CART_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(';').map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.slice(name.length + 1));
    }
  }
  return null;
}

function buildCookie(name: string, value: string, maxAgeSeconds: number): string {
  const isProd = (process.env.NODE_ENV || 'development') === 'production';
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProd) attrs.push('Secure');
  return attrs.join('; ');
}

async function getExistingCart(
  supabase: any,
  params: { userId: string | null; sessionId: string | null }
): Promise<{ id: string } | null> {
  if (params.userId) {
    const { data } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', params.userId)
      .maybeSingle();
    return data || null;
  }

  if (params.sessionId) {
    const { data } = await supabase
      .from('carts')
      .select('id')
      .is('user_id', null)
      .eq('session_id', params.sessionId)
      .maybeSingle();
    return data || null;
  }

  return null;
}

async function getOrCreateCart(
  supabase: any,
  params: { userId: string | null; sessionId: string | null }
): Promise<{ id: string } | null> {
  const existing = await getExistingCart(supabase, params);
  if (existing) return existing;

  if (params.userId) {
    const { data, error } = await supabase
      .from('carts')
      .insert({ user_id: params.userId })
      .select('id')
      .single();
    if (error) throw error;
    return data;
  }

  if (params.sessionId) {
    const { data, error } = await supabase
      .from('carts')
      .insert({ session_id: params.sessionId })
      .select('id')
      .single();
    if (error) throw error;
    return data;
  }

  return null;
}

async function getCartSummary(supabase: any, cartId: string) {
  const { data, error } = await supabase
    .from('cart_items')
    .select(
      `
      id,
      quantity,
      price,
      product:products(
        id,
        name,
        slug,
        base_price,
        compare_at_price,
        product_images(url, is_primary)
      )
    `
    )
    .eq('cart_id', cartId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Cart summary error:', error);
  }

  const items = (data || []).map((row: any) => {
    const p = row.product;
    const image_url =
      p?.product_images?.find((img: any) => img.is_primary)?.url || p?.product_images?.[0]?.url || null;

    const unitPrice = Number(row.price) || 0;
    const qty = Number(row.quantity) || 0;

    return {
      id: row.id,
      quantity: qty,
      unit_price: unitPrice,
      line_total: unitPrice * qty,
      product: {
        id: p?.id,
        name: p?.name,
        slug: p?.slug,
        image_url,
        compare_at_price: p?.compare_at_price ?? null,
      },
    };
  });

  const subtotal = items.reduce((sum: number, i: any) => sum + (Number(i.line_total) || 0), 0);

  return {
    cartId,
    items,
    subtotal,
    total: subtotal,
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createSupabaseServerClient(request);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id || null;
  const sessionId = getCookie(request, CART_SESSION_COOKIE);

  const cart = await getExistingCart(supabase, { userId, sessionId });
  if (!cart) {
    return { cartId: null, items: [], subtotal: 0, total: 0 };
  }

  return await getCartSummary(supabase, cart.id);
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = (formData.get('intent') || '').toString();

  const { supabase, headers } = createSupabaseServerClient(request);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id || null;

  // Ensure we have a guest cart session id if user isn't logged in.
  let sessionId = getCookie(request, CART_SESSION_COOKIE);
  let setSessionCookie = false;

  if (!userId && !sessionId) {
    sessionId = crypto.randomUUID();
    setSessionCookie = true;
  }

  const cart = await getOrCreateCart(supabase, { userId, sessionId });
  if (!cart) {
    return new Response(JSON.stringify({ error: 'Unable to create cart' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (intent === 'add') {
      const productId = (formData.get('product_id') || '').toString();
      const quantity = Math.max(1, parseInt((formData.get('quantity') || '1').toString(), 10) || 1);

      if (!productId) {
        throw new Error('Missing product');
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, base_price')
        .eq('id', productId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (productError || !product) {
        throw new Error('Product not found');
      }

      // Try to find existing line for (product_id, variant_id=null)
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cart.id)
        .eq('product_id', productId)
        .is('variant_id', null)
        .maybeSingle();

      if (existing?.id) {
        const newQty = (existing.quantity || 0) + quantity;
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: newQty })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('cart_items').insert({
          cart_id: cart.id,
          product_id: productId,
          variant_id: null,
          quantity,
          price: product.base_price,
        });
        if (insertError) throw insertError;
      }
    }

    if (intent === 'update') {
      const itemId = (formData.get('item_id') || '').toString();
      const quantity = Math.max(1, parseInt((formData.get('quantity') || '1').toString(), 10) || 1);

      if (!itemId) throw new Error('Missing cart item');

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId)
        .eq('cart_id', cart.id);
      if (error) throw error;
    }

    if (intent === 'remove') {
      const itemId = (formData.get('item_id') || '').toString();
      if (!itemId) throw new Error('Missing cart item');

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('cart_id', cart.id);
      if (error) throw error;
    }

    if (intent === 'clear') {
      const { error } = await supabase.from('cart_items').delete().eq('cart_id', cart.id);
      if (error) throw error;
    }
  } catch (e: any) {
    // Preserve any Set-Cookie headers already present (e.g., Supabase refresh)
    headers.set('Content-Type', 'application/json');
    if (setSessionCookie && sessionId) {
      headers.append('Set-Cookie', buildCookie(CART_SESSION_COOKIE, sessionId, CART_SESSION_MAX_AGE));
    }
    return new Response(JSON.stringify({ error: e?.message || 'Cart update failed' }), {
      status: 400,
      headers,
    });
  }

  const summary = await getCartSummary(supabase, cart.id);

  headers.set('Content-Type', 'application/json');
  if (setSessionCookie && sessionId) {
    headers.append('Set-Cookie', buildCookie(CART_SESSION_COOKIE, sessionId, CART_SESSION_MAX_AGE));
  }

  return new Response(JSON.stringify({ success: true, cart: summary }), {
    status: 200,
    headers,
  });
}

export default function Cart({ loaderData }: Route.ComponentProps) {
  const cartFetcher = useFetcher<any>();
  const [items, setItems] = useState<any[]>(loaderData.items || []);

  useEffect(() => {
    setItems(loaderData.items || []);
  }, [loaderData.items]);

  useEffect(() => {
    if (cartFetcher.data?.cart?.items) {
      setItems(cartFetcher.data.cart.items);
    }
  }, [cartFetcher.data]);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + (Number(i.line_total) || 0), 0), [items]);

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Shopping Cart</h1>

          {items.length === 0 ? (
            <div className={styles.empty}>
              <ShoppingBag size={64} className={styles.emptyIcon} />
              <h2 className={styles.emptyTitle}>Your cart is empty</h2>
              <p className={styles.emptyText}>Add some products to get started!</p>
              <Link to="/products">
                <Button size="lg">Browse Products</Button>
              </Link>
            </div>
          ) : (
            <div className={styles.layout}>
              <div className={styles.items}>
                {items.map((item) => (
                  <div key={item.id} className={styles.cartItem}>
                    <div className={styles.itemImageWrap}>
                      <img
                        src={item.product?.image_url || '/placeholder.jpg'}
                        alt={item.product?.name || 'Product'}
                        className={styles.itemImage}
                      />
                    </div>

                    <div className={styles.itemDetails}>
                      <Link to={`/products/${item.product?.slug || ''}`} className={styles.itemName}>
                        {item.product?.name}
                      </Link>
                      <div className={styles.itemMeta}>
                        <span>৳{Number(item.unit_price).toFixed(2)}</span>
                      </div>

                      <div className={styles.qtyRow}>
                        <button
                          className={styles.qtyButton}
                          onClick={() => {
                            const fd = new FormData();
                            fd.set('intent', 'update');
                            fd.set('item_id', item.id);
                            fd.set('quantity', String(Math.max(1, item.quantity - 1)));
                            cartFetcher.submit(fd, { method: 'post' });
                          }}
                        >
                          -
                        </button>
                        <span className={styles.qtyValue}>{item.quantity}</span>
                        <button
                          className={styles.qtyButton}
                          onClick={() => {
                            const fd = new FormData();
                            fd.set('intent', 'update');
                            fd.set('item_id', item.id);
                            fd.set('quantity', String(item.quantity + 1));
                            cartFetcher.submit(fd, { method: 'post' });
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className={styles.itemTotals}>
                      <div className={styles.lineTotal}>৳{Number(item.line_total).toFixed(2)}</div>
                      <button
                        className={styles.removeIconButton}
                        aria-label="Remove item"
                        onClick={() => {
                          const fd = new FormData();
                          fd.set('intent', 'remove');
                          fd.set('item_id', item.id);
                          cartFetcher.submit(fd, { method: 'post' });
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className={styles.cartActionsRow}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const fd = new FormData();
                      fd.set('intent', 'clear');
                      cartFetcher.submit(fd, { method: 'post' });
                    }}
                    disabled={cartFetcher.state === 'submitting'}
                  >
                    Clear cart
                  </Button>
                </div>
              </div>

              <div className={styles.summary}>
                <h2 className={styles.summaryTitle}>Order Summary</h2>
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>৳{subtotal.toFixed(2)}</span>
                </div>
                <div className={styles.summaryRowTotal}>
                  <span>Total</span>
                  <span>৳{subtotal.toFixed(2)}</span>
                </div>

                <Link to="/products" className={styles.summaryCta}>
                  <Button size="lg">Continue Shopping</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
