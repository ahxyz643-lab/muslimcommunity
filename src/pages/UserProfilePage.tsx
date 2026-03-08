import { useParams } from "react-router-dom";
import UserProfile from "@/components/UserProfile";

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  if (!userId) return null;
  return <UserProfile userId={userId} />;
};

export default UserProfilePage;
