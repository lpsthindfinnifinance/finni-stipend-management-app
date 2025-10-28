import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserCog } from "lucide-react";

const ROLES = [
  { value: "Admin", label: "Admin", color: "bg-purple-500" },
  { value: "Finance", label: "Finance", color: "bg-blue-500" },
  { value: "Lead PSM", label: "Lead PSM", color: "bg-green-500" },
  { value: "PSM", label: "PSM", color: "bg-yellow-500" },
] as const;

export function RoleSwitcher() {
  const { toast } = useToast();
  
  const { data: user } = useQuery<{ id: string; role: string; email: string }>({
    queryKey: ["/api/auth/user"],
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      await apiRequest("PATCH", "/api/auth/switch-role", { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Role Switched",
        description: "Your role has been updated. The page will refresh.",
      });
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const currentRole = ROLES.find(r => r.value === user.role);

  return (
    <div className="flex items-center gap-2">
      <UserCog className="w-4 h-4 text-muted-foreground" />
      <Select
        value={user.role}
        onValueChange={(value) => switchRoleMutation.mutate(value)}
        disabled={switchRoleMutation.isPending}
      >
        <SelectTrigger 
          className="w-[140px] h-8"
          data-testid="select-role-switcher"
        >
          <SelectValue>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${currentRole?.color || 'bg-gray-500'}`} />
              <span className="text-sm">{user.role}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((role) => (
            <SelectItem 
              key={role.value} 
              value={role.value}
              data-testid={`option-role-${role.value.toLowerCase().replace(' ', '-')}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${role.color}`} />
                <span>{role.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
