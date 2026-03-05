import TopBar from "@/components/TopBar";
import StoriesBar from "@/components/StoriesBar";
import PostCard from "@/components/PostCard";
import { posts } from "@/data/mockData";

const Home = () => {
  return (
    <div className="pb-20 pt-14">
      <TopBar />
      <StoriesBar />
      <div className="divide-y divide-border">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
};

export default Home;
