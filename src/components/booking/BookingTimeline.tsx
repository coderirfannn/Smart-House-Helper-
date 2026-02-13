import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock, Loader2 } from "lucide-react";

interface TimelineEvent {
  label: string;
  timestamp?: string;
  status: "done" | "active" | "pending";
}

interface BookingTimelineProps {
  events: TimelineEvent[];
}

const BookingTimeline = ({ events }: BookingTimelineProps) => {
  return (
    <div className="space-y-0">
      {events.map((event, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            {event.status === "done" ? (
              <CheckCircle2 className="h-5 w-5 text-status-completed shrink-0" />
            ) : event.status === "active" ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
            )}
            {i < events.length - 1 && (
              <div className={cn(
                "w-px flex-1 min-h-[24px]",
                event.status === "done" ? "bg-status-completed" : "bg-border"
              )} />
            )}
          </div>
          <div className="pb-4">
            <p className={cn(
              "text-sm font-medium",
              event.status === "pending" ? "text-muted-foreground" : "text-foreground"
            )}>
              {event.label}
            </p>
            {event.timestamp && (
              <p className="text-xs text-muted-foreground mt-0.5">
                <Clock className="inline h-3 w-3 mr-1" />
                {new Date(event.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BookingTimeline;
