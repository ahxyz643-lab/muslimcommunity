import { Settings, Grid3X3, Bookmark, Heart, BarChart3 } from "lucide-react";
import { useState } from "react";
import { currentUser, posts } from "@/data/mockData";
import heroPattern from "@/assets/hero-pattern.jpg";

const Profile = () => {
  const [activeTab, setActiveTab] = useState("posts");
  const userPosts = posts.slice(0, 3);

  const tabs = [
    { id: "posts", icon: Grid3X3, label: "Posts" },
    { id: "saved", icon: Bookmark, label: "Saved" },
    { id: "liked", icon: Heart, label: "Liked" },
    { id: "studio", icon: BarChart3, label: "Studio" },
  ];

  return (
    <div className="pb-20">
      {/* Cover */}
      <div className="relative h-36">
        <img src={heroPattern} alt="Cover" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        <button className="absolute right-3 top-3 rounded-full bg-card/80 p-2 backdrop-blur-sm text-muted-foreground hover:text-foreground">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Profile Info */}
      <div className="relative px-4">
        <img
          src={currentUser.avatar}
          alt={currentUser.displayName}
          className="-mt-12 h-24 w-24 rounded-full border-4 border-card object-cover ring-2 ring-primary"
        />
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-foreground">{currentUser.displayName}</h1>
            {currentUser.verified && (
              <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            )}
          </div>
          <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
          <p className="mt-2 text-sm text-foreground">{currentUser.bio}</p>
        </div>

        {/* Stats */}
        <div className="mt-4 flex gap-6">
          {[
            { label: "Posts", value: currentUser.posts },
            { label: "Followers", value: currentUser.followers },
            { label: "Following", value: currentUser.following },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <span className="block text-lg font-bold text-foreground">
                {value >= 1000 ? (value / 1000).toFixed(1) + "K" : value}
              </span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <button className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow">
            Edit Profile
          </button>
          <button className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-border">
            Share Profile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex border-b border-border">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
              activeTab === id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === "posts" && (
          <div className="grid grid-cols-3 gap-1">
            {userPosts.map((post) =>
              post.image ? (
                <div key={post.id} className="aspect-square overflow-hidden rounded-lg">
                  <img src={post.image} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div key={post.id} className="flex aspect-square items-center justify-center rounded-lg bg-card p-2">
                  <p className="line-clamp-4 text-[10px] text-muted-foreground">{post.content}</p>
                </div>
              )
            )}
          </div>
        )}
        {activeTab === "studio" && (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <BarChart3 className="mx-auto mb-3 h-10 w-10 text-gold" />
            <h3 className="font-display text-lg font-semibold text-foreground">Creator Studio</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your engagement, schedule posts, and grow your audience.
            </p>
            <button className="mt-4 rounded-xl gradient-gold px-6 py-2.5 text-sm font-semibold text-accent-foreground shadow-gold transition-all hover:opacity-90">
              Open Studio
            </button>
          </div>
        )}
        {(activeTab === "saved" || activeTab === "liked") && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {activeTab === "saved" ? "Your saved posts will appear here" : "Posts you've liked will appear here"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
