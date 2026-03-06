import { Search, Edit } from "lucide-react";

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

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
          <Edit className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">No messages yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a conversation with someone from the community
        </p>
      </div>
    </div>
  );
};

export default Messages;
