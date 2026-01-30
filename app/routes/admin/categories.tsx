import { useMemo, useState, useEffect } from "react";
import { redirectToLogin, redirectWithHeaders } from "~/lib/redirect.server";
import { AdminLayout } from "~/components/admin-layout/admin-layout";
import { Button } from "~/components/ui/button/button";
import { Input } from "~/components/ui/input/input";
import { Badge } from "~/components/ui/badge/badge";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import type { Route } from "./+types/categories";
import { createSupabaseClient } from "~/lib/supabase.client";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import styles from "./categories.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Categories Management - Manaf Zone Admin" },
    { name: "description", content: "Manage product categories" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirectToLogin(request, headers);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return redirectWithHeaders(headers, "/");
  }

  return null;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
  image_url?: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  deleted_at?: string | null;
}

export default function AdminCategories() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    parent_id: "",
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,description,parent_id,image_url,display_order,is_active,created_at,deleted_at")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCategories((data || []) as any);
    } catch (e) {
      console.error("Error loading categories:", e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      image_url: "",
      parent_id: "",
      display_order: 0,
      is_active: true,
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category: CategoryRow) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image_url: category.image_url || "",
      parent_id: category.parent_id || "",
      display_order: Number(category.display_order) || 0,
      is_active: category.is_active,
    });
    setShowForm(true);
  };

  const handleSaveCategory = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      alert("Name and slug are required.");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        image_url: formData.image_url.trim() || null,
        parent_id: formData.parent_id || null,
        display_order: Number.isFinite(Number(formData.display_order)) ? Number(formData.display_order) : 0,
        is_active: !!formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("categories")
          .insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
      }

      await loadCategories();
      resetForm();
    } catch (e: any) {
      console.error("Error saving category:", e);
      alert(e?.message || "Failed to save category.");
    }
  };

  const handleDeleteCategory = async (category: CategoryRow) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      // Prefer soft-delete (schema supports deleted_at)
      const { error } = await supabase
        .from("categories")
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq("id", category.id);
      if (error) throw error;
      await loadCategories();
    } catch (e) {
      console.error("Error deleting category:", e);
      alert("Failed to delete category.");
    }
  };

  const activeCategories = categories.filter((c) => !c.deleted_at);
  const filtered = activeCategories.filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
  });

  return (
    <AdminLayout title="Categories Management" subtitle="Create, update, and organize your product categories">
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={20} />
          <Input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <Button onClick={() => setShowForm(true)}>
          <Plus size={18} />
          Add Category
        </Button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>{editingCategory ? "Edit Category" : "Add New Category"}</h3>

          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="cat-name">Name</label>
              <Input
                id="cat-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Electronics"
              />
            </div>
            <div className={styles.formField}>
              <label htmlFor="cat-slug">Slug</label>
              <Input
                id="cat-slug"
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                placeholder="e.g. electronics"
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="cat-parent">Parent Category (optional)</label>
              <select
                id="cat-parent"
                className={styles.select}
                value={formData.parent_id}
                onChange={(e) => setFormData((p) => ({ ...p, parent_id: e.target.value }))}
              >
                <option value="">None</option>
                {activeCategories
                  .filter((c) => c.id !== editingCategory?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label htmlFor="cat-order">Display Order</label>
              <Input
                id="cat-order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData((p) => ({ ...p, display_order: Number(e.target.value) }))}
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="cat-image">Image URL (optional)</label>
              <Input
                id="cat-image"
                type="text"
                value={formData.image_url}
                onChange={(e) => setFormData((p) => ({ ...p, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="cat-desc">Description (optional)</label>
              <Input
                id="cat-desc"
                type="text"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Short description"
              />
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
              />
              Active
            </label>
          </div>

          <div className={styles.formActions}>
            <Button onClick={handleSaveCategory}>{editingCategory ? "Update Category" : "Create Category"}</Button>
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading categories...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>No categories found.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((category) => (
                <tr key={category.id}>
                  <td className={styles.categoryName}>{category.name}</td>
                  <td>{category.slug}</td>
                  <td>
                    <Badge variant={category.is_active ? "success" : "secondary"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td>{category.display_order}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.actionButton} onClick={() => handleEdit(category)} aria-label="Edit">
                        <Edit size={16} />
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleDeleteCategory(category)}
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
