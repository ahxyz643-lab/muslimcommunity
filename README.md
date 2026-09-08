# Muslim Connect

Build a full social media platform called Muslim Community that combines the major features found in platforms such as Instagram and X (Twitter). The application must support user profiles, posts, likes, comments, reposts, saving posts, messaging, voice calls, and video calls. Users should be able to upload photos, videos, and text content and interact with other users in real time.

The platform must include an AI-based recommendation algorithm. This algorithm should analyze user behavior such as likes, watch time, comments, shares, and followed accounts. Based on this data, the system should automatically recommend relevant content to each user. For example, if a user frequently interacts with Islamic lectures, Arabic posts, or educational videos, the feed should prioritize similar content. The recommendation system should continuously learn from user activity and adjust the feed dynamically.

The application must also include a language detection and translation feature. When a user posts content in languages such as Arabic, Hindi, Urdu, or English, the system should automatically detect the language and show a “Translate Post” option. When users click this option, the post should be translated into the language selected in their profile settings. Translation should work for both text posts and captions of videos. For implementing translation, APIs such as Google Translate or DeepL Translator can be integrated.

The app must include a Creator Studio where users can manage their posts, upload media, schedule content, and track engagement statistics such as views, likes, and comments. Each user should have a personal studio dashboard connected to their profile.

There must also be a Main Admin Studio controlled by the main administrator. This central dashboard should monitor all user studios, moderate content, manage reports, control community guidelines, and manage system settings. All creator studios should be connected to this main studio.

The platform must support cloud media storage so users can upload videos and images without storage limitations. Free or scalable media hosting solutions such as Firebase or Cloudinary should be integrated for storing and delivering media content efficiently.

The interface should include the following main sections: Home Feed, Explore or Trending Videos, Create Post, Messages, Creator Studio, and Profile. The trending section should automatically show the newest and most popular videos across the platform.

Security and moderation tools must also be included to ensure safe community interaction. The system should allow reporting posts, blocking users, and filtering harmful content.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://muslimcommunity.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6a7e7954-d266-4a98-9317-cf4ab8efefbe).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
