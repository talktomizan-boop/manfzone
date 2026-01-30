/**
 * Cart helpers used by server loaders/actions.
 *
 * Kept separate from the existing /cart route module to avoid any breaking
 * changes and to enable reuse in /checkout.
 */

export const CART_SESSION_COOKIE = 'cart_session_id';
export const CART_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function getCookie(request: Request, name: string): string | null {
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

export function buildCookie(name: string, value: string, maxAgeSeconds: number): string {
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

export async function getExistingCart(
  supabase: any,
  params: { userId: string | null; sessionId: string | null }
): Promise<{ id: string } | null> {
  if (params.userId) {
    const { data } = await supabase.from('carts').select('id').eq('user_id', params.userId).maybeSingle();
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

export async function getOrCreateCart(
  supabase: any,
  params: { userId: string | null; sessionId: string | null }
): Promise<{ id: string } | null> {
  const existing = await getExistingCart(supabase, params);
  if (existing) return existing;

  if (params.userId) {
    const { data, error } = await supabase.from('carts').insert({ user_id: params.userId }).select('id').single();
    if (error) throw error;
    return data;
  }

  if (params.sessionId) {
    const { data, error } = await supabase.from('carts').insert({ session_id: params.sessionId }).select('id').single();
    if (error) throw error;
    return data;
  }

  return null;
}

export async function getCartItemsForCheckout(supabase: any, cartId: string) {
  const { data, error } = await supabase
    .from('cart_items')
    .select(
      `
      id,
      quantity,
      price,
      product_id,
      variant_id,
      product:products(
        id,
        name,
        slug,
        sku,
        base_price,
        compare_at_price,
        product_images(url, is_primary)
      ),
      variant:product_variants(
        id,
        name,
        sku,
        price
      )
    `
    )
    .eq('cart_id', cartId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const items = (data || []).map((row: any) => {
    const p = row.product;
    const v = row.variant;
    const image_url =
      p?.product_images?.find((img: any) => img.is_primary)?.url || p?.product_images?.[0]?.url || null;

    const unitPrice = Number(row.price) || 0;
    const qty = Number(row.quantity) || 0;

    return {
      id: row.id,
      quantity: qty,
      unit_price: unitPrice,
      line_total: unitPrice * qty,
      product_id: row.product_id,
      variant_id: row.variant_id,
      product_name: p?.name || 'Product',
      variant_name: v?.name || null,
      sku: v?.sku || p?.sku || 'SKU',
      image_url,
    };
  });

  const subtotal = items.reduce((sum: number, i: any) => sum + (Number(i.line_total) || 0), 0);

  return { items, subtotal };
}
