import { useEffect, useMemo, useState } from "react";
import { redirectToLogin, redirectWithHeaders } from "~/lib/redirect.server";
import { AdminLayout } from "~/components/admin-layout/admin-layout";
import { Button } from "~/components/ui/button/button";
import { Input } from "~/components/ui/input/input";
import { Badge } from "~/components/ui/badge/badge";
import type { Route } from "./+types/refunds";
import { createSupabaseClient } from "~/lib/supabase.client";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { approveRefund, rejectRefund } from "~/services/order.service";
import styles from "./refunds.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Refunds - Manaf Zone Admin" },
    { name: "description", content: "Review and approve refund requests" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return redirectToLogin(request, headers);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return redirectWithHeaders(headers, '/');
  }

  return null;
}

type RefundStatus = "pending" | "approved" | "rejected" | "processed";

interface RefundRow {
  id: string;
  order_id: string;
  requested_amount: number;
  approved_amount?: number | null;
  status: RefundStatus;
  reason?: string | null;
  reviewer_notes?: string | null;
  requested_at?: string;
  reviewed_at?: string | null;
  order?: {
    id: string;
    order_number?: string | null;
    total_amount?: number | null;
    current_state?: string | null;
    status?: string | null;
    payment_status?: string | null;
  } | null;
  requester?: {
    id: string;
    email?: string | null;
    full_name?: string | null;
  } | null;
}

function statusBadgeVariant(status: RefundStatus): any {
  if (status === "pending") return "warning";
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  return "secondary";
}

export default function AdminRefunds() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<RefundStatus | "all">("pending");
  const [selected, setSelected] = useState<RefundRow | null>(null);
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [adminReason, setAdminReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const loadRefunds = async () => {
    try {
      setLoading(true);
      const query = supabase
        .from("refund_approvals")
        .select(
          `id,order_id,requested_amount,approved_amount,status,reason,reviewer_notes,requested_at,reviewed_at,
           order:orders(id,order_number,total_amount,current_state,status,payment_status),
           requester:profiles!refund_approvals_requested_by_fkey(id,email,full_name)`
        )
        .order("requested_at", { ascending: false });

      const { data, error } =
        activeFilter === "all" ? await query : await query.eq("status", activeFilter);
      if (error) throw error;

      setRefunds((data || []) as any);

      // Keep selection in sync
      if (selected) {
        const next = (data || []).find((r: any) => r.id === selected.id) || null;
        setSelected(next as any);
      }
    } catch (e) {
      console.error("Error loading refund requests:", e);
    } finally {
      setLoading(false);
    }
  };

  const onSelect = (row: RefundRow) => {
    setSelected(row);
    setApprovedAmount(Number(row.requested_amount) || 0);
    setAdminReason(row.reviewer_notes || "");
  };

  const getReviewerId = async (): Promise<string> => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data?.user?.id) throw new Error("Missing session");
    return data.user.id;
  };

  const handleApprove = async () => {
    if (!selected) return;
    if (!Number.isFinite(Number(approvedAmount)) || Number(approvedAmount) < 0) {
      alert("Please enter a valid refund amount.");
      return;
    }

    try {
      setSubmitting(true);
      const reviewerId = await getReviewerId();

      await approveRefund({
        refundId: selected.id,
        approvedAmount: Number(approvedAmount),
        reviewedBy: reviewerId,
        reviewerNotes: adminReason || undefined,
      });

      await loadRefunds();
      setSelected(null);
      setAdminReason("");
    } catch (e: any) {
      console.error("Approve refund failed:", e);
      alert(e?.message || "Failed to approve refund.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    try {
      setSubmitting(true);
      const reviewerId = await getReviewerId();

      await rejectRefund({
        refundId: selected.id,
        reviewedBy: reviewerId,
        reviewerNotes: adminReason || undefined,
      });

      await loadRefunds();
      setSelected(null);
      setAdminReason("");
    } catch (e: any) {
      console.error("Reject refund failed:", e);
      alert(e?.message || "Failed to reject refund.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Refunds" subtitle="Review and approve refund requests. Approval updates the order state logically.">
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {(["pending", "approved", "rejected", "processed"] as RefundStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.filterButton} ${activeFilter === s ? styles.filterButtonActive : ""}`}
              onClick={() => setActiveFilter(s)}
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            className={`${styles.filterButton} ${activeFilter === "all" ? styles.filterButtonActive : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            all
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading refund requests...</div>
      ) : refunds.length === 0 ? (
        <div className={styles.emptyState}>No refund requests found.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Requested</th>
                <th>Status</th>
                <th>Requested At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className={styles.rowTitle}>{r.order?.order_number || r.order_id}</div>
                    <div style={{ fontSize: "0.875rem", color: "var(--color-neutral-10)" }}>
                      Order state: {(r.order?.current_state || r.order?.status || "-") as any}
                    </div>
                  </td>
                  <td>
                    <div className={styles.rowTitle}>{r.requester?.full_name || "-"}</div>
                    <div style={{ fontSize: "0.875rem", color: "var(--color-neutral-10)" }}>{r.requester?.email || "-"}</div>
                  </td>
                  <td>{Number(r.requested_amount).toFixed(2)}</td>
                  <td>
                    <Badge variant={statusBadgeVariant(r.status)}>{r.status}</Badge>
                  </td>
                  <td>{r.requested_at ? new Date(r.requested_at).toLocaleString() : "-"}</td>
                  <td>
                    <div className={styles.actionArea}>
                      <Button variant="secondary" onClick={() => onSelect(r)}>
                        Review
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Review refund request</h3>

          <div className={styles.panelGrid}>
            <div className={styles.field}>
              <label>Order</label>
              <div>{selected.order?.order_number || selected.order_id}</div>
            </div>
            <div className={styles.field}>
              <label>Requested amount</label>
              <div>{Number(selected.requested_amount).toFixed(2)}</div>
            </div>
            <div className={styles.field}>
              <label htmlFor="approved-amount">Approved amount</label>
              <Input
                id="approved-amount"
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(Number(e.target.value))}
              />
            </div>
            <div className={styles.field}>
              <label>Customer reason</label>
              <div>{selected.reason || "-"}</div>
            </div>
            <div className={styles.field} style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="admin-reason">Admin reason / notes</label>
              <Input
                id="admin-reason"
                type="text"
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
                placeholder="Reason / notes for approval or rejection"
              />
            </div>
          </div>

          <div className={styles.actions}>
            <Button onClick={handleApprove} disabled={submitting || selected.status !== "pending"}>
              Approve
            </Button>
            <Button variant="secondary" onClick={handleReject} disabled={submitting || selected.status !== "pending"}>
              Reject
            </Button>
            <Button variant="secondary" onClick={() => setSelected(null)} disabled={submitting}>
              Close
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
