import { useMemo, useState, useEffect } from "react";
import { redirectToLogin, redirectWithHeaders } from "~/lib/redirect.server";
import { AdminLayout } from "~/components/admin-layout/admin-layout";
import { Button } from "~/components/ui/button/button";
import { Input } from "~/components/ui/input/input";
import { Badge } from "~/components/ui/badge/badge";
import { Search, Edit, Eye, UserCheck, UserX } from "lucide-react";
import type { Route } from "./+types/customers";
import { createSupabaseClient } from "~/lib/supabase.client";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import type { Profile } from "~/types/database.types";
import styles from "./customers.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Customers Management - Manaf Zone Admin" },
    { name: "description", content: "Manage customer accounts" },
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

export default function AdminCustomers() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Profile | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "customer" as "customer" | "admin" | "super_admin",
    is_active: true,
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id,full_name,email,phone,role,is_active,created_at,deleted_at')
        .eq('role', 'customer')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCustomers((data || []) as any);
    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!editingCustomer) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          role: formData.role,
          is_active: formData.is_active,
        })
        .eq('id', editingCustomer.id);
      if (error) throw error;
      await loadCustomers();
      resetForm();
    } catch (error) {
      console.error("Error saving customer:", error);
      alert("Failed to save customer. Please try again.");
    }
  };

  const handleToggleActive = async (customer: Profile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !customer.is_active })
        .eq('id', customer.id);
      if (error) throw error;
      await loadCustomers();
    } catch (error) {
      console.error("Error toggling customer status:", error);
      alert("Failed to update customer status. Please try again.");
    }
  };

  const handleEdit = (customer: Profile) => {
    setEditingCustomer(customer);
    setFormData({
      full_name: customer.full_name || "",
      email: customer.email,
      phone: customer.phone || "",
      role: customer.role,
      is_active: customer.is_active,
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      role: "customer",
      is_active: true,
    });
    setEditingCustomer(null);
    setShowEditForm(false);
  };

  const filteredCustomers = customers.filter((customer) =>
    (customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "destructive";
      case "admin":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <AdminLayout
      title="Customers Management"
      subtitle="View and manage customer accounts"
    >
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={20} />
          <Input
            type="text"
            placeholder="Search customers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {showEditForm && editingCustomer && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>Edit Customer</h3>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>Full Name</label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div className={styles.formField}>
              <label>Email (Read-only)</label>
              <Input
                type="email"
                value={formData.email}
                disabled
                readOnly
              />
            </div>
            <div className={styles.formField}>
              <label>Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div className={styles.formField}>
              <label>Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className={styles.select}
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              Active Account
            </label>
          </div>

          <div className={styles.formActions}>
            <Button onClick={handleSaveCustomer}>
              Update Customer
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className={styles.loading}>Loading customers...</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className={styles.customerName}>
                      {customer.full_name || "N/A"}
                    </div>
                  </td>
                  <td>{customer.email}</td>
                  <td>{customer.phone || "N/A"}</td>
                  <td>
                    <Badge variant={getRoleBadgeVariant(customer.role)}>
                      {customer.role.replace("_", " ")}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={customer.is_active ? "default" : "secondary"}>
                      {customer.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td>{new Date(customer.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleEdit(customer)}
                        className={styles.actionButton}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(customer)}
                        className={`${styles.actionButton} ${
                          customer.is_active ? styles.deactivateButton : styles.activateButton
                        }`}
                        title={customer.is_active ? "Deactivate" : "Activate"}
                      >
                        {customer.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && (
            <p className={styles.emptyState}>No customers found</p>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
