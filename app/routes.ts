import { type RouteConfig, index, route, prefix } from "@react-router/dev/routes";

export default [
  // Home
  index("routes/_index.tsx"),

  // Health check
  route("healthz", "routes/healthz.tsx"),

  // Public pages
  route("about", "routes/about.tsx"),
  route("careers", "routes/careers.tsx"),
  route("contact", "routes/contact.tsx"),
  route("faq", "routes/faq.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("returns", "routes/returns.tsx"),
  route("shipping", "routes/shipping.tsx"),
  route("terms", "routes/terms.tsx"),
  route("track-order", "routes/track-order.tsx"),
  route("deals", "routes/deals.tsx"),
  route("new-arrivals", "routes/new-arrivals.tsx"),

  // Auth
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("forgot-password", "routes/forgot-password.tsx"),

  // Shop
  route("products", "routes/products.tsx"),
  // Product detail module expects params.slug
  route("products/:slug", "routes/product-detail.tsx"),
  route("categories", "routes/categories.tsx"),
  route("wishlist", "routes/wishlist.tsx"),
  route("cart", "routes/cart.tsx"),

  // Customer area
  route("checkout", "routes/checkout.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("account", "routes/account.tsx"),
  route("orders", "routes/orders.tsx"),
  route("orders/:id", "routes/order-detail.tsx"),
  route("coming-soon", "routes/coming-soon.tsx"),

  // API (NOTE: folder-based path, not dot path)
  ...prefix("api", [
    route("healthz", "routes/api/healthz.ts"),
    route("invoice-preview", "routes/api/invoice-preview.ts"),
    route("order-summary", "routes/api/order-summary.ts"),
    route("session", "routes/api/session.ts"),
  ]),

  // Admin (NOTE: folder-based paths, not dot paths)
  ...prefix("admin", [
    // Admin landing route (redirects to /admin/dashboard)
    route("", "routes/admin/_index.tsx"),

    route("dashboard", "routes/admin/dashboard.tsx"),
    route("products", "routes/admin/products.tsx"),
    route("categories", "routes/admin/categories.tsx"),
    route("customers", "routes/admin/customers.tsx"),
    route("orders", "routes/admin/orders.tsx"),
    route("refunds", "routes/admin/refunds.tsx"),
    route("settings", "routes/admin/settings.tsx"),
    route("insights", "routes/admin/insights.tsx"),
    route("notifications", "routes/admin/notifications.tsx"),
  ]),

  // Catch-all
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
