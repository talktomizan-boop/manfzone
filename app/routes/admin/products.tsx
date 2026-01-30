import { useMemo, useState, useEffect } from "react";
import { redirectToLogin, redirectWithHeaders } from "~/lib/redirect.server";
import { AdminLayout } from "~/components/admin-layout/admin-layout";
import { Button } from "~/components/ui/button/button";
import { Input } from "~/components/ui/input/input";
import { Badge } from "~/components/ui/badge/badge";
import { Plus, Search, Edit, Trash2, Eye, Star } from "lucide-react";
import type { Route } from "./+types/products";
import { createSupabaseClient } from "~/lib/supabase.client";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import styles from "./products.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Products Management - Manaf Zone Admin" },
    { name: "description", content: "Manage your product catalog" },
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

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  base_price: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  available_quantity?: number;
  category_id?: string | null;
  category?: { name?: string | null }[] | { name?: string | null } | null;
}

export default function AdminProducts() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    sku: "",
    category_id: "",
    base_price: 0,
    description: "",
    is_active: true,
    is_featured: false,
    available_quantity: 0,
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id,name')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('display_order', { ascending: true });
      if (error) throw error;
      setCategories((data || []) as any);
    } catch (e) {
      console.error('Error loading categories:', e);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id,name,slug,sku,category_id,base_price,is_active,is_featured,created_at,inventory(available_quantity),category:categories(name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(
        (data || []).map((p: any) => ({
          ...p,
          available_quantity: p.inventory?.[0]?.available_quantity ?? 0,
        }))
      );
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    try {
      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            slug: formData.slug,
            sku: formData.sku,
            category_id: formData.category_id || null,
            base_price: formData.base_price,
            description: formData.description,
            is_active: formData.is_active,
            is_featured: formData.is_featured,
          })
          .eq('id', editingProduct.id);
        if (error) throw error;

        // Inventory adjustment (upsert)
        if (Number.isFinite(Number(formData.available_quantity))) {
          const { error: invError } = await supabase
            .from('inventory')
            .upsert({ product_id: editingProduct.id, available_quantity: Number(formData.available_quantity) }, { onConflict: 'product_id' });
          if (invError) throw invError;
        }
      } else {
        // Create new product
        const { data: created, error } = await supabase
          .from('products')
          .insert({
            name: formData.name,
            slug: formData.slug,
            sku: formData.sku,
            category_id: formData.category_id || null,
            base_price: formData.base_price,
            description: formData.description,
            is_active: formData.is_active,
            is_featured: formData.is_featured,
          })
          .select('id')
          .single();
        if (error) throw error;

        if (created?.id && Number.isFinite(Number(formData.available_quantity))) {
          await supabase
            .from('inventory')
            .upsert({ product_id: created.id, available_quantity: Number(formData.available_quantity) }, { onConflict: 'product_id' });
        }
      }

      await loadProducts();
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product. Please try again.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase.from('products').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      await loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product. Please try again.");
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    try {
      const { error } = await supabase.from('products').update({ is_featured: !product.is_featured }).eq('id', product.id);
      if (error) throw error;
      await loadProducts();
    } catch (error) {
      console.error("Error toggling featured status:", error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      category_id: product.category_id || "",
      base_price: product.base_price,
      description: "",
      is_active: product.is_active,
      is_featured: product.is_featured,
      available_quantity: product.available_quantity ?? 0,
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      sku: "",
      category_id: "",
      base_price: 0,
      description: "",
      is_active: true,
      is_featured: false,
      available_quantity: 0,
    });
    setEditingProduct(null);
    setShowAddForm(false);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout
      title="Products Management"
      subtitle="Manage your product catalog, pricing, and inventory"
    >
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={20} />
          <Input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus size={18} />
          Add Product
        </Button>
      </div>

      {showAddForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>
            {editingProduct ? "Edit Product" : "Add New Product"}
          </h3>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>Product Name</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({ 
                    ...formData, 
                    name,
                    slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                  });
                }}
                placeholder="Enter product name"
              />
            </div>
            <div className={styles.formField}>
              <label>SKU</label>
              <Input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Enter SKU"
              />
            </div>
            <div className={styles.formField}>
              <label>Category</label>
              <select
                className={styles.select}
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formField}>
              <label>Price (৳)</label>
              <Input
                type="number"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div className={styles.formField}>
              <label>Stock (available)</label>
              <Input
                type="number"
                value={formData.available_quantity}
                onChange={(e) => setFormData({ ...formData, available_quantity: parseInt(e.target.value || '0', 10) })}
                placeholder="0"
              />
            </div>
            <div className={styles.formField}>
              <label>Slug</label>
              <Input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="product-slug"
              />
            </div>
          </div>
          
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              Active
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
              />
              Featured
            </label>
          </div>

          <div className={styles.formActions}>
            <Button onClick={handleSaveProduct}>
              {editingProduct ? "Update Product" : "Create Product"}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className={styles.loading}>Loading products...</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Status</th>
                <th>Featured</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className={styles.productName}>{product.name}</div>
                  </td>
                  <td>{product.sku}</td>
                  <td>৳{product.base_price.toFixed(2)}</td>
                  <td>
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleFeatured(product)}
                      className={styles.starButton}
                    >
                      <Star
                        size={18}
                        fill={product.is_featured ? "currentColor" : "none"}
                        className={product.is_featured ? styles.starred : ""}
                      />
                    </button>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleEdit(product)}
                        className={styles.actionButton}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <p className={styles.emptyState}>No products found</p>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
