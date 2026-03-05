import { stories } from "@/data/mockData";
import { Plus } from "lucide-react";

const StoriesBar = () => {
  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
      {stories.map((story, i) => (
        <button key={story.id} className="flex flex-col items-center gap-1">
          <div
            className={`relative h-16 w-16 flex-shrink-0 rounded-full p-[2px] ${
              story.seen
                ? "bg-muted"
                : "bg-gradient-to-tr from-primary to-accent"
            }`}
          >
            <img
              src={story.user.avatar}
              alt={story.user.displayName}
              className="h-full w-full rounded-full border-2 border-card object-cover"
            />
            {i === 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Plus className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </div>
          <span className="w-16 truncate text-center text-[11px] text-muted-foreground">
            {i === 0 ? "Your Story" : story.user.username.split("_")[0]}
          </span>
        </button>
      ))}
    </div>
  );
};

export default StoriesBar;
