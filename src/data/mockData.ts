export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  verified: boolean;
}

export interface Post {
  id: string;
  user: User;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  reposts: number;
  saves: number;
  liked: boolean;
  saved: boolean;
  reposted: boolean;
  timestamp: string;
  language?: string;
}

export interface Story {
  id: string;
  user: User;
  seen: boolean;
}

export interface Message {
  id: string;
  user: User;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

export const currentUser: User = {
  id: "1",
  username: "abdullah_dev",
  displayName: "Abdullah Ahmad",
  avatar: "https://i.pravatar.cc/150?img=11",
  bio: "Software developer | Seeking knowledge | 🕌",
  followers: 1240,
  following: 380,
  posts: 56,
  verified: true,
};

export const users: User[] = [
  { id: "2", username: "aisha_reads", displayName: "Aisha Khan", avatar: "https://i.pravatar.cc/150?img=5", bio: "Book lover & writer", followers: 5600, following: 290, posts: 134, verified: true },
  { id: "3", username: "yusuf_art", displayName: "Yusuf Ali", avatar: "https://i.pravatar.cc/150?img=12", bio: "Islamic calligraphy artist", followers: 12000, following: 150, posts: 89, verified: true },
  { id: "4", username: "fatima_cooks", displayName: "Fatima Zahra", avatar: "https://i.pravatar.cc/150?img=9", bio: "Halal recipes 🍽️", followers: 8900, following: 420, posts: 210, verified: false },
  { id: "5", username: "omar_travels", displayName: "Omar Farooq", avatar: "https://i.pravatar.cc/150?img=15", bio: "Exploring the Muslim world 🌍", followers: 23000, following: 180, posts: 320, verified: true },
  { id: "6", username: "maryam_tech", displayName: "Maryam Hassan", avatar: "https://i.pravatar.cc/150?img=20", bio: "Tech enthusiast | Muslimah in STEM", followers: 3400, following: 560, posts: 45, verified: false },
];

export const posts: Post[] = [
  {
    id: "p1", user: users[0], content: "Just finished reading 'Revive Your Heart' by Nouman Ali Khan. Absolutely transformative. Every Muslim should read this. 📖✨",
    likes: 342, comments: 28, reposts: 45, saves: 89, liked: false, saved: false, reposted: false, timestamp: "2h", language: "en",
  },
  {
    id: "p2", user: users[1], content: "بسم الله الرحمن الرحيم\nNew calligraphy piece completed today. The beauty of Arabic script never ceases to amaze me.",
    image: "https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=600&h=600&fit=crop",
    likes: 1205, comments: 67, reposts: 134, saves: 256, liked: true, saved: true, reposted: false, timestamp: "4h", language: "ar",
  },
  {
    id: "p3", user: users[2], content: "Ramadan prep starts now! Here's my go-to Iftar recipe for dates and milk smoothie. Simple, sunnah, and delicious. 🌙",
    image: "https://images.unsplash.com/photo-1567360425618-1594206637d2?w=600&h=600&fit=crop",
    likes: 876, comments: 92, reposts: 67, saves: 178, liked: false, saved: false, reposted: false, timestamp: "6h", language: "en",
  },
  {
    id: "p4", user: users[3], content: "Visited the Sultan Ahmed Mosque (Blue Mosque) in Istanbul today. SubhanAllah, the architecture is breathtaking! 🕌",
    image: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=600&h=600&fit=crop",
    likes: 3420, comments: 156, reposts: 289, saves: 567, liked: false, saved: false, reposted: false, timestamp: "8h", language: "en",
  },
  {
    id: "p5", user: users[4], content: "Alhamdulillah, launched my new app that helps Muslims find prayer times and Qibla direction accurately. Link in bio! 🚀",
    likes: 567, comments: 34, reposts: 78, saves: 123, liked: false, saved: false, reposted: false, timestamp: "12h", language: "en",
  },
  {
    id: "p6", user: users[0], content: "اللهم صل وسلم على نبينا محمد\nFriday reminder to send salawat upon the Prophet ﷺ",
    likes: 2100, comments: 45, reposts: 890, saves: 340, liked: true, saved: false, reposted: true, timestamp: "1d", language: "ar",
  },
];

export const stories: Story[] = [
  { id: "s1", user: currentUser, seen: false },
  { id: "s2", user: users[0], seen: false },
  { id: "s3", user: users[1], seen: false },
  { id: "s4", user: users[2], seen: true },
  { id: "s5", user: users[3], seen: true },
  { id: "s6", user: users[4], seen: false },
];

export const messages: Message[] = [
  { id: "m1", user: users[0], lastMessage: "JazakAllahu khairan for the book recommendation!", timestamp: "5m", unread: 2 },
  { id: "m2", user: users[1], lastMessage: "MashaAllah, your calligraphy is amazing!", timestamp: "1h", unread: 0 },
  { id: "m3", user: users[2], lastMessage: "Can you share the recipe?", timestamp: "3h", unread: 1 },
  { id: "m4", user: users[3], lastMessage: "Let's plan the trip InshaAllah", timestamp: "1d", unread: 0 },
  { id: "m5", user: users[4], lastMessage: "The app looks great! Barakallahu feek", timestamp: "2d", unread: 0 },
];

export const trendingTopics = [
  "#IslamicReminders", "#Quran", "#Hadith", "#MuslimCreators",
  "#HalalFood", "#IslamicArt", "#Ramadan2026", "#Dawah",
];
