import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CallLog {
  id: string;
  conversation_id: string;
  caller_id: string;
  receiver_id: string;
  call_type: "voice" | "video";
  status: "completed" | "missed" | "declined" | "cancelled";
  duration_seconds: number;
  started_at: string;
}

interface CallHistoryProps {
  onCallBack?: (conversationId: string, otherUserId: string, isVideo: boolean) => void;
}

const formatDuration = (s: number) => {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const CallHistory = ({ onCallBack }: CallHistoryProps) => {
  const { user } = useAuth();

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["call-logs", user?.id],
    queryFn: async () => {
      const { data: logs } = await supabase
        .from("call_logs")
        .select("*")
        .or(`caller_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("started_at", { ascending: false })
        .limit(100);

      if (!logs || logs.length === 0) return [];

      // Fetch profiles of the other parties
      const otherIds = [
        ...new Set(
          logs.map((l) => (l.caller_id === user!.id ? l.receiver_id : l.caller_id))
        ),
      ];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", otherIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return logs.map((l) => {
        const otherId = l.caller_id === user!.id ? l.receiver_id : l.caller_id;
        return {
          ...(l as CallLog),
          isOutgoing: l.caller_id === user!.id,
          otherUser: profileMap.get(otherId) || { user_id: otherId, display_name: null, username: null, avatar_url: null },
        };
      });
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
          <Phone className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">No call history</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your recent calls will appear here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {calls.map((call) => {
        const isMissed = !call.isOutgoing && (call.status === "missed" || call.status === "cancelled");
        const Icon = call.call_type === "video" ? Video : Phone;
        const DirIcon = isMissed ? PhoneMissed : call.isOutgoing ? PhoneOutgoing : PhoneIncoming;
        const dirColor = isMissed
          ? "text-destructive"
          : call.isOutgoing
          ? "text-muted-foreground"
          : "text-green-500";

        return (
          <div key={call.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
            <img
              src={call.otherUser.avatar_url || "https://i.pravatar.cc/150"}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isMissed ? "text-destructive" : "text-foreground"}`}>
                {call.otherUser.display_name || "User"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <DirIcon className={`h-3.5 w-3.5 ${dirColor}`} />
                <span className="text-xs text-muted-foreground">
                  {call.isOutgoing ? "Outgoing" : isMissed ? "Missed" : "Incoming"}
                  {call.duration_seconds > 0 && ` • ${formatDuration(call.duration_seconds)}`}
                  {" • "}
                  {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            <button
              onClick={() => onCallBack?.(call.conversation_id, call.otherUser.user_id, call.call_type === "video")}
              className="rounded-full p-2 text-primary hover:bg-primary/10 transition-colors"
              aria-label={`Call ${call.otherUser.display_name || "user"} back`}
            >
              <Icon className="h-5 w-5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default CallHistory;
