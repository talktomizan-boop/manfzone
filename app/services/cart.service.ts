/**
 * Cart Service
 * Handles shopping cart operations
 */

import { supabase } from '~/lib/supabase.client';
import type { Cart, CartItem } from '~/types/database.types';
import type { CartItemWithDetails, CartSummary } from '~/types/domain.types';
import { InsufficientStockError, ValidationError } from '~/types/domain.types';
import { AuthService } from './auth.service';

export class CartService {
  /**
   * Get or create cart for current user/session
   */
  static async getOrCreateCart(sessionId?: string): Promise<Cart> {
    const session = await AuthService.getSession();
    const userId = session?.user.id;

    // Try to find existing cart
    let fetchError: any = null;
    let existingCart: Cart | null = null;

    if (userId) {
      const result = await supabase.from('carts').select('*').eq('user_id', userId).single();
      fetchError = result.error;
      existingCart = result.data;
    } else if (sessionId) {
      const result = await supabase.from('carts').select('*').eq('session_id', sessionId).single();
      fetchError = result.error;
      existingCart = result.data;
    } else {
      throw new ValidationError('User must be logged in or have a session');
    }

    // If cart exists and not expired, return it
    if (!fetchError && existingCart && new Date(existingCart.expires_at) > new Date()) {
      return existingCart;
    }

    // Create new cart
    const { data: newCart, error: createError } = await supabase
      .from('carts')
      .insert({
        user_id: userId || null,
        session_id: sessionId || null,
      })
      .select()
      .single();

    if (createError || !newCart) {
      throw new Error('Failed to create cart');
    }

    return newCart;
  }

  /**
   * Add item to cart
   */
  static async addToCart(
    productId: string,
    variantId: string | null,
    quantity: number,
    sessionId?: string
  ): Promise<CartItem> {
    if (quantity <= 0) {
      throw new ValidationError('Quantity must be greater than 0');
    }

    // Get cart
    const cart = await this.getOrCreateCart(sessionId);

    // Check stock availability
    const { data: inventory } = await supabase
      .from('inventory')
      .select('available_quantity')
      .or(
        variantId ? `variant_id.eq.${variantId}` : `product_id.eq.${productId}`
      )
      .single();

    if (!inventory || inventory.available_quantity < quantity) {
      const { data: product } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();

      throw new InsufficientStockError(
        product?.name || 'Product',
        inventory?.available_quantity || 0
      );
    }

    // Get price
    let price = 0;
    if (variantId) {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('price')
        .eq('id', variantId)
        .single();
      price = variant?.price || 0;
    } else {
      const { data: product } = await supabase
        .from('products')
        .select('base_price')
        .eq('id', productId)
        .single();
      price = product?.base_price || 0;
    }

    // Check if item already in cart
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.id)
      .eq('product_id', productId)
      .eq('variant_id', variantId || null)
      .single();

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > inventory.available_quantity) {
        throw new InsufficientStockError(
          'Product',
          inventory.available_quantity
        );
      }

      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id)
        .select()
        .single();

      if (error || !data) {
        throw new Error('Failed to update cart item');
      }

      return data;
    }

    // Add new item
    const { data, error } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cart.id,
        product_id: productId,
        variant_id: variantId,
        quantity,
        price,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to add item to cart');
    }

    return data;
  }

  /**
   * Update cart item quantity
   */
  static async updateCartItemQuantity(itemId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      // Remove item if quantity is 0
      await this.removeFromCart(itemId);
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);

    if (error) {
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      throw error;
    }
  }

  /**
   * Get cart summary with items
   */
  static async getCartSummary(sessionId?: string): Promise<CartSummary> {
    const cart = await this.getOrCreateCart(sessionId);

    const { data: items, error } = await supabase
      .from('cart_items')
      .select(
        `
        *,
        product:products(name, product_images(url, is_primary)),
        variant:product_variants(name),
        inventory!left(available_quantity)
      `
      )
      .eq('cart_id', cart.id);

    if (error) {
      throw error;
    }

    const cartItems: CartItemWithDetails[] = (items || []).map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.product?.name || '',
      variant_name: item.variant?.name || null,
      sku: '', // TODO: Get from product/variant
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      image_url: item.product?.product_images?.find((img: any) => img.is_primary)?.url || null,
      in_stock: (item.inventory?.[0]?.available_quantity || 0) >= item.quantity,
      available_quantity: item.inventory?.[0]?.available_quantity || 0,
    }));

    const subtotal = cartItems.reduce((sum, item) => sum + item.total_price, 0);
    const discount_amount = 0; // TODO: Apply coupon
    const shipping_cost = subtotal >= 2000 ? 0 : 100; // Free shipping over 2000 BDT
    const tax_amount = 0; // TODO: Calculate tax
    const total = subtotal - discount_amount + shipping_cost + tax_amount;

    return {
      items: cartItems,
      subtotal,
      discount_amount,
      shipping_cost,
      tax_amount,
      total,
      item_count: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  /**
   * Clear cart
   */
  static async clearCart(sessionId?: string): Promise<void> {
    const cart = await this.getOrCreateCart(sessionId);

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cart.id);

    if (error) {
      throw error;
    }
  }
}
