import { messages } from "@/data/mockData";
import { Search, Edit, Phone, Video } from "lucide-react";

const Messages = () => {
  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="font-display text-xl font-bold text-foreground">Messages</h1>
        <button className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
          <Edit className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search messages..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Message List */}
      <div>
        {messages.map((msg) => (
          <button
            key={msg.id}
            className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
          >
            <div className="relative">
              <img
                src={msg.user.avatar}
                alt={msg.user.displayName}
                className="h-12 w-12 rounded-full object-cover"
              />
              {msg.unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {msg.unread}
                </span>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${msg.unread > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                  {msg.user.displayName}
                </span>
                <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
              </div>
              <p className={`mt-0.5 truncate text-xs ${msg.unread > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                {msg.lastMessage}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button className="rounded-full p-1.5 text-muted-foreground hover:text-primary">
                <Phone className="h-4 w-4" />
              </button>
              <button className="rounded-full p-1.5 text-muted-foreground hover:text-primary">
                <Video className="h-4 w-4" />
              </button>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Messages;
