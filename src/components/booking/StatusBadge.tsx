import { cn } from "@/lib/utils";

type BookingStatus = "searching" | "offered" | "assigned" | "en_route" | "started" | "completed" | "cancelled" | "no_helper";
type HelperStatus = "available" | "busy" | "offline";

interface StatusBadgeProps {
  status: BookingStatus | HelperStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<string, { label: string; className: string }> = {
  searching: { label: "Searching", className: "bg-status-searching/15 text-status-searching border-status-searching/30" },
  offered: { label: "Offered", className: "bg-status-offered/15 text-status-offered border-status-offered/30" },
  assigned: { label: "Assigned", className: "bg-status-assigned/15 text-status-assigned border-status-assigned/30" },
  en_route: { label: "En Route", className: "bg-status-en-route/15 text-status-en-route border-status-en-route/30" },
  started: { label: "In Progress", className: "bg-status-started/15 text-status-started border-status-started/30" },
  completed: { label: "Completed", className: "bg-status-completed/15 text-status-completed border-status-completed/30" },
  cancelled: { label: "Cancelled", className: "bg-status-cancelled/15 text-status-cancelled border-status-cancelled/30" },
  no_helper: { label: "No Helper", className: "bg-status-no-helper/15 text-status-no-helper border-status-no-helper/30" },
  available: { label: "Available", className: "bg-status-available/15 text-status-available border-status-available/30" },
  busy: { label: "Busy", className: "bg-status-busy/15 text-status-busy border-status-busy/30" },
  offline: { label: "Offline", className: "bg-status-offline/15 text-status-offline border-status-offline/30" },
};

const StatusBadge = ({ status, size = "sm" }: StatusBadgeProps) => {
  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        config.className
      )}
    >
      <span className={cn(
        "inline-block rounded-full",
        size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
        status === "searching" && "animate-pulse",
        "bg-current"
      )} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
