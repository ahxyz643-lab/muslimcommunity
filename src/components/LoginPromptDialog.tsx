import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  action?: string;
}

const LoginPromptDialog = ({ open, onOpenChange, action = "continue" }: Props) => {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl border border-white/10 bg-card/90 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">Sign in required</DialogTitle>
          <DialogDescription className="text-center">
            Create a free account to {action}. Join the ummah in seconds.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          <Button
            className="gradient-primary text-primary-foreground font-semibold"
            onClick={() => { onOpenChange(false); navigate("/auth"); }}
          >
            Sign in / Sign up
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep browsing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginPromptDialog;