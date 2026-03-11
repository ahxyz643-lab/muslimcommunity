
-- PROFILES
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Profiles viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POSTS
DROP POLICY IF EXISTS "Posts viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Users can create own posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Posts viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create own posts" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- COMMENTS
DROP POLICY IF EXISTS "Comments viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Comments viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- LIKES
DROP POLICY IF EXISTS "Likes viewable by everyone" ON likes;
DROP POLICY IF EXISTS "Users can like" ON likes;
DROP POLICY IF EXISTS "Users can unlike" ON likes;
CREATE POLICY "Likes viewable by everyone" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SAVES
DROP POLICY IF EXISTS "Saves viewable by owner" ON saves;
DROP POLICY IF EXISTS "Users can save" ON saves;
DROP POLICY IF EXISTS "Users can unsave" ON saves;
CREATE POLICY "Saves viewable by owner" ON saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can save" ON saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave" ON saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REPOSTS
DROP POLICY IF EXISTS "Reposts viewable by everyone" ON reposts;
DROP POLICY IF EXISTS "Users can repost" ON reposts;
DROP POLICY IF EXISTS "Users can unrepost" ON reposts;
CREATE POLICY "Reposts viewable by everyone" ON reposts FOR SELECT USING (true);
CREATE POLICY "Users can repost" ON reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unrepost" ON reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- FOLLOWS
DROP POLICY IF EXISTS "Follows viewable by everyone" ON follows;
DROP POLICY IF EXISTS "Users can follow" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Follows viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- CONVERSATIONS
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = conversations.id AND user_id = auth.uid()));
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own conversations" ON conversations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = conversations.id AND user_id = auth.uid()));

-- CONVERSATION_PARTICIPANTS
DROP POLICY IF EXISTS "Users can view participants of own conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON conversation_participants;
CREATE POLICY "Users can view participants" ON conversation_participants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()));
CREATE POLICY "Users can add participants" ON conversation_participants FOR INSERT TO authenticated WITH CHECK (true);

-- MESSAGES
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can view messages" ON messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()));
CREATE POLICY "Users can send messages" ON messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own role" ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Re-create missing handle_new_user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
