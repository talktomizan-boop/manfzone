import type { Route } from "./+types/healthz";

export function loader() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export default function Healthz(_props: Route.ComponentProps) {
  // This route is meant for uptime/health checks.
  return null;
}
