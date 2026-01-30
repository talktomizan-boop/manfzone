import { useMemo, useState, useEffect } from "react";
import { redirectToLogin, redirectWithHeaders } from "~/lib/redirect.server";
import { AdminLayout } from "~/components/admin-layout/admin-layout";
import { Button } from "~/components/ui/button/button";
import { Input } from "~/components/ui/input/input";
import { Badge } from "~/components/ui/badge/badge";
import { Search, Eye, Package, X, Check } from "lucide-react";
import type { Route } from "./+types/orders";
import { createSupabaseClient } from "~/lib/supabase.client";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import type { Order } from "~/types/database.types";
import styles from "./orders.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Orders Management - Manaf Zone Admin" },
    { name: "description", content: "Manage customer orders" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return redirectToLogin(request, headers);
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();
  
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return redirectWithHeaders(headers, '/');
  }
  
  // Don't return Headers objects (not serializable). We only need the loader to
  // guard access; the component doesn't depend on loader data.
  return null;
}

interface OrderWithItems extends Order {
  items?: any[];
}

export default function AdminOrders() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,status,current_state,payment_status,total,email,created_at,shipped_at,delivered_at,cancelled_at,order_items(quantity,unit_price,product_name_snapshot)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data || []) as any);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const current = orders.find((o) => o.id === orderId);
      const fromState = (current as any)?.current_state || (current as any)?.status || null;
      const updateData: any = {
        current_state: newStatus,
        status: newStatus, // keep legacy field in sync
      };

      if (newStatus === 'paid') {
        updateData.payment_status = 'paid';
        updateData.status = 'processing';
      }

      if (newStatus === "shipped" && !orders.find(o => o.id === orderId)?.shipped_at) {
        updateData.shipped_at = new Date().toISOString();
      }
      if (newStatus === "delivered" && !orders.find(o => o.id === orderId)?.delivered_at) {
        updateData.delivered_at = new Date().toISOString();
      }
      if (newStatus === "cancelled" && !orders.find(o => o.id === orderId)?.cancelled_at) {
        updateData.cancelled_at = new Date().toISOString();
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
      if (error) throw error;

      // State transition history (best-effort)
      await supabase.from('order_state_history').insert({
        order_id: orderId,
        from_state: fromState,
        to_state: newStatus,
        changed_by: user?.id || null,
      });
      await loadOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Failed to update order status. Please try again.");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "delivered":
      case "shipped":
      case "processing":
        return "default";
      case "cancelled":
      case "refunded":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout
      title="Orders Management"
      subtitle="View and manage customer orders"
    >
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={20} />
          <Input
            type="text"
            placeholder="Search by order number or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>Loading orders...</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <div className={styles.orderNumber}>{order.order_number}</div>
                  </td>
                  <td>
                    <div className={styles.customerInfo}>
                      <div className={styles.customerName}>{order.shipping_full_name}</div>
                      <div className={styles.customerEmail}>{order.email}</div>
                    </div>
                  </td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className={styles.totalAmount}>৳{order.total.toFixed(2)}</td>
                  <td>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className={styles.actionButton}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {order.status === "pending" && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, "processing")}
                          className={`${styles.actionButton} ${styles.processButton}`}
                          title="Mark as Processing"
                        >
                          <Package size={16} />
                        </button>
                      )}
                      {order.status === "processing" && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, "shipped")}
                          className={`${styles.actionButton} ${styles.shipButton}`}
                          title="Mark as Shipped"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      {(order.status === "pending" || order.status === "processing") && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, "cancelled")}
                          className={`${styles.actionButton} ${styles.cancelButton}`}
                          title="Cancel Order"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <p className={styles.emptyState}>No orders found</p>
          )}
        </div>
      )}

      {selectedOrder && (
        <div className={styles.modal} onClick={() => setSelectedOrder(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Order Details - {selectedOrder.order_number}</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className={styles.closeButton}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailSection}>
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> {selectedOrder.shipping_full_name}</p>
                <p><strong>Email:</strong> {selectedOrder.email}</p>
                <p><strong>Phone:</strong> {selectedOrder.shipping_phone}</p>
              </div>
              
              <div className={styles.detailSection}>
                <h4>Shipping Address</h4>
                <p>{selectedOrder.shipping_address_line_1}</p>
                {selectedOrder.shipping_address_line_2 && <p>{selectedOrder.shipping_address_line_2}</p>}
                <p>{selectedOrder.shipping_city}, {selectedOrder.shipping_postal_code}</p>
                <p>{selectedOrder.shipping_country}</p>
              </div>

              <div className={styles.detailSection}>
                <h4>Order Items</h4>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <table className={styles.itemsTable}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item: any) => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td>৳{item.unit_price.toFixed(2)}</td>
                          <td>৳{item.total_price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No items found</p>
                )}
              </div>

              <div className={styles.detailSection}>
                <h4>Order Summary</h4>
                <div className={styles.summaryRow}>
                  <span>Subtotal:</span>
                  <span>৳{selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Shipping:</span>
                  <span>৳{selectedOrder.shipping_cost.toFixed(2)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Tax:</span>
                  <span>৳{selectedOrder.tax_amount.toFixed(2)}</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                  <span>Total:</span>
                  <span>৳{selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              <div className={styles.statusActions}>
                <h4>Update Order Status</h4>
                <div className={styles.statusButtons}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, "processing");
                      setSelectedOrder(null);
                    }}
                    disabled={selectedOrder.status !== "pending"}
                  >
                    Mark as Processing
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, "shipped");
                      setSelectedOrder(null);
                    }}
                    disabled={selectedOrder.status !== "processing"}
                  >
                    Mark as Shipped
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, "delivered");
                      setSelectedOrder(null);
                    }}
                    disabled={selectedOrder.status !== "shipped"}
                  >
                    Mark as Delivered
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, "cancelled");
                      setSelectedOrder(null);
                    }}
                    disabled={!["pending", "processing"].includes(selectedOrder.status)}
                  >
                    Cancel Order
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
