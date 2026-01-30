/**
 * Inventory Service
 * 
 * Handles multi-warehouse inventory management including:
 * - Warehouse operations
 * - Stock tracking and reservations
 * - Inventory movements
 * - Supplier management
 * - Reorder point alerts
 */

import { supabase } from '~/lib/supabase.client';
import { handleServiceError } from '~/utils/error-handler';

// =====================================================
// TYPES
// =====================================================

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  is_active: boolean;
  priority: number;
}

export interface WarehouseInventory {
  id: string;
  warehouse_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  reorder_point: number;
  reorder_quantity: number;
  batch_number?: string;
  expiry_date?: string;
}

export interface StockReservation {
  id: string;
  warehouse_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  reserved_by_order_id?: string;
  reserved_by_cart_id?: string;
  reserved_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface InventoryMovement {
  id: string;
  warehouse_id: string;
  product_id: string;
  variant_id?: string;
  movement_type: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string;
  performed_by?: string;
  performed_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  rating?: number;
  lead_time_days?: number;
}

// =====================================================
// WAREHOUSE MANAGEMENT
// =====================================================

export async function getActiveWarehouses(): Promise<Warehouse[]> {
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getActiveWarehouses');
  }
}

export async function getWarehouseById(warehouseId: string): Promise<Warehouse | null> {
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleServiceError(error, 'getWarehouseById');
  }
}

// =====================================================
// INVENTORY TRACKING
// =====================================================

export async function getInventoryByProduct(
  productId: string,
  variantId?: string
): Promise<WarehouseInventory[]> {
  try {
    let query = supabase
      .from('warehouse_inventory')
      .select('*')
      .eq('product_id', productId);

    if (variantId) {
      query = query.eq('variant_id', variantId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getInventoryByProduct');
  }
}

export async function getTotalAvailableStock(
  productId: string,
  variantId?: string
): Promise<number> {
  try {
    const inventory = await getInventoryByProduct(productId, variantId);
    return inventory.reduce((total, item) => total + item.available_quantity, 0);
  } catch (error) {
    throw handleServiceError(error, 'getTotalAvailableStock');
  }
}

export async function getLowStockItems(warehouseId?: string): Promise<WarehouseInventory[]> {
  try {
    let query = supabase
      .from('warehouse_inventory')
      .select('*')
      .filter('available_quantity', 'lte', 'reorder_point');

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getLowStockItems');
  }
}

// =====================================================
// STOCK RESERVATIONS
// =====================================================

export async function reserveStock(params: {
  warehouseId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  cartId?: string;
  orderId?: string;
  expiresInMinutes?: number;
}): Promise<StockReservation> {
  try {
    // Calculate expiration time (default 15 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (params.expiresInMinutes || 15));

    // Check available stock first
    const { data: inventory, error: inventoryError } = await supabase
      .from('warehouse_inventory')
      .select('available_quantity')
      .eq('warehouse_id', params.warehouseId)
      .eq('product_id', params.productId)
      .eq('variant_id', params.variantId || null)
      .single();

    if (inventoryError) throw inventoryError;

    if (!inventory || inventory.available_quantity < params.quantity) {
      throw new Error('Insufficient stock available');
    }

    // Create reservation
    const { data, error } = await supabase
      .from('stock_reservations')
      .insert({
        warehouse_id: params.warehouseId,
        product_id: params.productId,
        variant_id: params.variantId,
        quantity: params.quantity,
        reserved_by_cart_id: params.cartId,
        reserved_by_order_id: params.orderId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Update inventory reserved quantity
    await supabase.rpc('increment_reserved_quantity', {
      p_warehouse_id: params.warehouseId,
      p_product_id: params.productId,
      p_variant_id: params.variantId,
      p_quantity: params.quantity,
    });

    return data;
  } catch (error) {
    throw handleServiceError(error, 'reserveStock');
  }
}

export async function releaseStockReservation(reservationId: string): Promise<void> {
  try {
    // Get reservation details
    const { data: reservation, error: getError } = await supabase
      .from('stock_reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (getError) throw getError;
    if (!reservation) throw new Error('Reservation not found');

    // Mark as released
    const { error: updateError } = await supabase
      .from('stock_reservations')
      .update({ released_at: new Date().toISOString() })
      .eq('id', reservationId);

    if (updateError) throw updateError;

    // Decrement reserved quantity
    await supabase.rpc('decrement_reserved_quantity', {
      p_warehouse_id: reservation.warehouse_id,
      p_product_id: reservation.product_id,
      p_variant_id: reservation.variant_id,
      p_quantity: reservation.quantity,
    });
  } catch (error) {
    throw handleServiceError(error, 'releaseStockReservation');
  }
}

export async function cleanupExpiredReservations(): Promise<number> {
  try {
    // Get expired reservations
    const { data: expired, error: getError } = await supabase
      .from('stock_reservations')
      .select('*')
      .eq('is_active', false)
      .lt('expires_at', new Date().toISOString());

    if (getError) throw getError;

    // Release each one
    for (const reservation of expired || []) {
      await releaseStockReservation(reservation.id);
    }

    return expired?.length || 0;
  } catch (error) {
    throw handleServiceError(error, 'cleanupExpiredReservations');
  }
}

// =====================================================
// INVENTORY MOVEMENTS
// =====================================================

export async function recordInventoryMovement(params: {
  warehouseId: string;
  productId: string;
  variantId?: string;
  movementType: string;
  quantityChange: number;
  reason?: string;
  performedBy?: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<InventoryMovement> {
  try {
    // Get current quantity
    const { data: current, error: currentError } = await supabase
      .from('warehouse_inventory')
      .select('quantity')
      .eq('warehouse_id', params.warehouseId)
      .eq('product_id', params.productId)
      .eq('variant_id', params.variantId || null)
      .single();

    if (currentError) throw currentError;

    const previousQuantity = current?.quantity || 0;
    const newQuantity = previousQuantity + params.quantityChange;

    // Record movement
    const { data, error } = await supabase
      .from('inventory_movements')
      .insert({
        warehouse_id: params.warehouseId,
        product_id: params.productId,
        variant_id: params.variantId,
        movement_type: params.movementType,
        quantity_change: params.quantityChange,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        reason: params.reason,
        performed_by: params.performedBy,
        reference_type: params.referenceType,
        reference_id: params.referenceId,
      })
      .select()
      .single();

    if (error) throw error;

    // Update inventory quantity
    await supabase
      .from('warehouse_inventory')
      .update({ quantity: newQuantity })
      .eq('warehouse_id', params.warehouseId)
      .eq('product_id', params.productId)
      .eq('variant_id', params.variantId || null);

    return data;
  } catch (error) {
    throw handleServiceError(error, 'recordInventoryMovement');
  }
}

export async function getInventoryMovementHistory(params: {
  warehouseId?: string;
  productId?: string;
  limit?: number;
}): Promise<InventoryMovement[]> {
  try {
    let query = supabase
      .from('inventory_movements')
      .select('*')
      .order('performed_at', { ascending: false });

    if (params.warehouseId) {
      query = query.eq('warehouse_id', params.warehouseId);
    }

    if (params.productId) {
      query = query.eq('product_id', params.productId);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getInventoryMovementHistory');
  }
}

// =====================================================
// SUPPLIER MANAGEMENT
// =====================================================

export async function getActiveSuppliers(): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getActiveSuppliers');
  }
}

export async function getSuppliersByProduct(productId: string): Promise<Supplier[]> {
  try {
    const { data, error } = await supabase
      .from('product_suppliers')
      .select(`
        supplier:suppliers (
          id,
          name,
          code,
          email,
          phone,
          is_active,
          rating,
          lead_time_days
        )
      `)
      .eq('product_id', productId);

    if (error) throw error;
    return (data || []).map((item: any) => item.supplier).filter(Boolean);
  } catch (error) {
    throw handleServiceError(error, 'getSuppliersByProduct');
  }
}

// =====================================================
// INVENTORY ALERTS
// =====================================================

export async function generateLowStockAlerts(): Promise<Array<{
  warehouse: string;
  product: string;
  current_stock: number;
  reorder_point: number;
  recommended_order_quantity: number;
}>> {
  try {
    const lowStock = await getLowStockItems();

    return lowStock.map((item) => ({
      warehouse: item.warehouse_id,
      product: item.product_id,
      current_stock: item.available_quantity,
      reorder_point: item.reorder_point,
      recommended_order_quantity: item.reorder_quantity,
    }));
  } catch (error) {
    throw handleServiceError(error, 'generateLowStockAlerts');
  }
}
