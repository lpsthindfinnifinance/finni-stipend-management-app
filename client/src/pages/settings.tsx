import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Portfolio, Practice, User } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();

  // State for dialogs
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [practiceDialogOpen, setPracticeDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // State for editing
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [editingPractice, setEditingPractice] = useState<Practice | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: string; id: string; name: string } | null>(null);

  // Fetch data - must be at top level (Rules of Hooks)
  const { data: portfolios = [], isLoading: loadingPortfolios } = useQuery<Portfolio[]>({
    queryKey: ["/api/settings/portfolios"],
    enabled: isAuthenticated && role === "Finance",
  });

  const { data: practices = [], isLoading: loadingPractices } = useQuery<Practice[]>({
    queryKey: ["/api/settings/practices"],
    enabled: isAuthenticated && role === "Finance",
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/settings/users"],
    enabled: isAuthenticated && role === "Finance",
  });

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  // Don't render anything while checking auth
  if (authLoading || !isAuthenticated) {
    return null;
  }

  // Show access denied for non-Finance users
  if (role !== "Finance") {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  Access restricted to Finance team
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Portfolio mutations
  const createPortfolioMutation = useMutation({
    mutationFn: (data: { id: string; name: string }) => 
      apiRequest("POST", "/api/settings/portfolios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/portfolios"] });
      setPortfolioDialogOpen(false);
      setEditingPortfolio(null);
      toast({ title: "Success", description: "Portfolio created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create portfolio",
        variant: "destructive" 
      });
    },
  });

  const updatePortfolioMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string }) =>
      apiRequest("PATCH", `/api/settings/portfolios/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/portfolios"] });
      setPortfolioDialogOpen(false);
      setEditingPortfolio(null);
      toast({ title: "Success", description: "Portfolio updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update portfolio",
        variant: "destructive" 
      });
    },
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/settings/portfolios/${id}`),
    onSuccess: (response: any) => {
      if (!response.success) {
        toast({ 
          title: "Cannot Delete", 
          description: response.message,
          variant: "destructive" 
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/settings/portfolios"] });
        toast({ title: "Success", description: "Portfolio deleted successfully" });
      }
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete portfolio",
        variant: "destructive" 
      });
    },
  });

  // Practice mutations
  const createPracticeMutation = useMutation({
    mutationFn: (data: { id: string; name: string; portfolioId: string }) =>
      apiRequest("POST", "/api/settings/practices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/practices"] });
      setPracticeDialogOpen(false);
      setEditingPractice(null);
      toast({ title: "Success", description: "Practice created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create practice",
        variant: "destructive" 
      });
    },
  });

  const updatePracticeMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; portfolioId?: string }) =>
      apiRequest("PATCH", `/api/settings/practices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/practices"] });
      setPracticeDialogOpen(false);
      setEditingPractice(null);
      toast({ title: "Success", description: "Practice updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update practice",
        variant: "destructive" 
      });
    },
  });

  const deletePracticeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/settings/practices/${id}`),
    onSuccess: (response: any) => {
      if (!response.success) {
        toast({ 
          title: "Cannot Delete", 
          description: response.message,
          variant: "destructive" 
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/settings/practices"] });
        toast({ title: "Success", description: "Practice deleted successfully" });
      }
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete practice",
        variant: "destructive" 
      });
    },
  });

  // User mutations
  const createUserMutation = useMutation({
    mutationFn: (data: { email: string; firstName?: string; lastName?: string; role: string; portfolioId?: string }) =>
      apiRequest("POST", "/api/settings/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/users"] });
      setUserDialogOpen(false);
      setEditingUser(null);
      toast({ title: "Success", description: "User created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create user",
        variant: "destructive" 
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; email?: string; firstName?: string; lastName?: string; role?: string; portfolioId?: string }) =>
      apiRequest("PATCH", `/api/settings/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/users"] });
      setUserDialogOpen(false);
      setEditingUser(null);
      toast({ title: "Success", description: "User updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update user",
        variant: "destructive" 
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/settings/users/${id}`),
    onSuccess: (response: any) => {
      if (!response.success) {
        toast({ 
          title: "Cannot Delete", 
          description: response.message,
          variant: "destructive" 
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/settings/users"] });
        toast({ title: "Success", description: "User deleted successfully" });
      }
      setDeleteDialogOpen(false);
      setDeletingItem(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete user",
        variant: "destructive" 
      });
    },
  });

  // Handle functions
  const handlePortfolioSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      id: formData.get("id") as string,
      name: formData.get("name") as string,
    };

    if (editingPortfolio) {
      updatePortfolioMutation.mutate({ ...data, id: editingPortfolio.id });
    } else {
      createPortfolioMutation.mutate(data);
    }
  };

  const handlePracticeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      id: formData.get("id") as string,
      name: formData.get("name") as string,
      portfolioId: formData.get("portfolioId") as string,
    };

    if (editingPractice) {
      updatePracticeMutation.mutate({ ...data, id: editingPractice.id });
    } else {
      createPracticeMutation.mutate(data);
    }
  };

  const handleUserSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      role: formData.get("role") as string,
      portfolioId: (formData.get("portfolioId") as string) || undefined,
    };

    if (editingUser) {
      updateUserMutation.mutate({ ...data, id: editingUser.id });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (!deletingItem) return;
    
    switch (deletingItem.type) {
      case "portfolio":
        deletePortfolioMutation.mutate(deletingItem.id);
        break;
      case "practice":
        deletePracticeMutation.mutate(deletingItem.id);
        break;
      case "user":
        deleteUserMutation.mutate(deletingItem.id);
        break;
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage portfolios, practices, and users
          </p>
        </div>

        <Tabs defaultValue="portfolios" className="space-y-4">
          <TabsList>
            <TabsTrigger value="portfolios" data-testid="tab-portfolios">Portfolios</TabsTrigger>
            <TabsTrigger value="practices" data-testid="tab-practices">Practices</TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolios" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Portfolios</CardTitle>
                  <CardDescription>Manage portfolio groups (G1-G5)</CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    setEditingPortfolio(null);
                    setPortfolioDialogOpen(true);
                  }}
                  data-testid="button-create-portfolio"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Portfolio
                </Button>
              </CardHeader>
              <CardContent>
                {loadingPortfolios ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {portfolios.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No portfolios found
                          </TableCell>
                        </TableRow>
                      ) : (
                        portfolios.map((portfolio) => (
                          <TableRow key={portfolio.id} data-testid={`row-portfolio-${portfolio.id}`}>
                            <TableCell className="font-mono">{portfolio.id}</TableCell>
                            <TableCell>{portfolio.name}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingPortfolio(portfolio);
                                  setPortfolioDialogOpen(true);
                                }}
                                data-testid={`button-edit-portfolio-${portfolio.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeletingItem({ type: "portfolio", id: portfolio.id, name: portfolio.name });
                                  setDeleteDialogOpen(true);
                                }}
                                data-testid={`button-delete-portfolio-${portfolio.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="practices" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Practices</CardTitle>
                  <CardDescription>Manage ABA practices and their group assignments</CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    setEditingPractice(null);
                    setPracticeDialogOpen(true);
                  }}
                  data-testid="button-create-practice"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Practice
                </Button>
              </CardHeader>
              <CardContent>
                {loadingPractices ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : (
                  <div className="overflow-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Clinic ID</TableHead>
                          <TableHead>Display Name</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {practices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No practices found
                            </TableCell>
                          </TableRow>
                        ) : (
                          practices.map((practice) => (
                            <TableRow key={practice.id} data-testid={`row-practice-${practice.id}`}>
                              <TableCell className="font-mono">{practice.id}</TableCell>
                              <TableCell>{practice.name}</TableCell>
                              <TableCell><span className="font-semibold">{practice.portfolioId}</span></TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingPractice(practice);
                                    setPracticeDialogOpen(true);
                                  }}
                                  data-testid={`button-edit-practice-${practice.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setDeletingItem({ type: "practice", id: practice.id, name: practice.name });
                                    setDeleteDialogOpen(true);
                                  }}
                                  data-testid={`button-delete-practice-${practice.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>Manage user accounts and role assignments</CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    setEditingUser(null);
                    setUserDialogOpen(true);
                  }}
                  data-testid="button-create-user"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Portfolio</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                            <TableCell>
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}` 
                                : user.email}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.role}</TableCell>
                            <TableCell>{user.portfolioId || "-"}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setUserDialogOpen(true);
                                }}
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeletingItem({ 
                                    type: "user", 
                                    id: user.id, 
                                    name: user.email || "Unknown" 
                                  });
                                  setDeleteDialogOpen(true);
                                }}
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Portfolio Dialog */}
        <Dialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen}>
          <DialogContent data-testid="dialog-portfolio">
            <form onSubmit={handlePortfolioSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingPortfolio ? "Edit Portfolio" : "Create Portfolio"}
                </DialogTitle>
                <DialogDescription>
                  {editingPortfolio 
                    ? "Update portfolio information" 
                    : "Add a new portfolio (G1-G5)"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="id">Portfolio ID</Label>
                  <Input
                    id="id"
                    name="id"
                    defaultValue={editingPortfolio?.id}
                    placeholder="G1"
                    disabled={!!editingPortfolio}
                    required
                    data-testid="input-portfolio-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingPortfolio?.name}
                    placeholder="Portfolio G1"
                    required
                    data-testid="input-portfolio-name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setPortfolioDialogOpen(false);
                    setEditingPortfolio(null);
                  }}
                  data-testid="button-cancel-portfolio"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPortfolioMutation.isPending || updatePortfolioMutation.isPending}
                  data-testid="button-save-portfolio"
                >
                  {editingPortfolio ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Practice Dialog */}
        <Dialog open={practiceDialogOpen} onOpenChange={setPracticeDialogOpen}>
          <DialogContent data-testid="dialog-practice">
            <form onSubmit={handlePracticeSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingPractice ? "Edit Practice" : "Create Practice"}
                </DialogTitle>
                <DialogDescription>
                  {editingPractice 
                    ? "Update practice information" 
                    : "Add a new ABA practice"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="practice-id">Clinic ID</Label>
                  <Input
                    id="practice-id"
                    name="id"
                    defaultValue={editingPractice?.id}
                    placeholder="abaco"
                    disabled={!!editingPractice}
                    required
                    data-testid="input-practice-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="practice-name">Display Name</Label>
                  <Input
                    id="practice-name"
                    name="name"
                    defaultValue={editingPractice?.name}
                    placeholder="ABA.CO"
                    required
                    data-testid="input-practice-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="practice-portfolio">Group</Label>
                  <Select 
                    name="portfolioId" 
                    defaultValue={editingPractice?.portfolioId}
                    required
                  >
                    <SelectTrigger id="practice-portfolio" data-testid="select-practice-portfolio">
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios.map((portfolio) => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.id} - {portfolio.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setPracticeDialogOpen(false);
                    setEditingPractice(null);
                  }}
                  data-testid="button-cancel-practice"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPracticeMutation.isPending || updatePracticeMutation.isPending}
                  data-testid="button-save-practice"
                >
                  {editingPractice ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* User Dialog */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
          <DialogContent data-testid="dialog-user">
            <form onSubmit={handleUserSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Edit User" : "Create User"}
                </DialogTitle>
                <DialogDescription>
                  {editingUser 
                    ? "Update user information" 
                    : "Add a new user account"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    name="email"
                    type="email"
                    defaultValue={editingUser?.email || ""}
                    placeholder="user@example.com"
                    required
                    data-testid="input-user-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-firstName">First Name</Label>
                  <Input
                    id="user-firstName"
                    name="firstName"
                    defaultValue={editingUser?.firstName || ""}
                    placeholder="John"
                    data-testid="input-user-firstName"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-lastName">Last Name</Label>
                  <Input
                    id="user-lastName"
                    name="lastName"
                    defaultValue={editingUser?.lastName || ""}
                    placeholder="Doe"
                    data-testid="input-user-lastName"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-role">Role</Label>
                  <Select 
                    name="role" 
                    defaultValue={editingUser?.role || "PSM"}
                    required
                  >
                    <SelectTrigger id="user-role" data-testid="select-user-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PSM">PSM</SelectItem>
                      <SelectItem value="Lead PSM">Lead PSM</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-portfolio">Portfolio (PSM only)</Label>
                  <Select 
                    name="portfolioId" 
                    defaultValue={editingUser?.portfolioId || ""}
                  >
                    <SelectTrigger id="user-portfolio" data-testid="select-user-portfolio">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {portfolios.map((portfolio) => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.id} - {portfolio.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setUserDialogOpen(false);
                    setEditingUser(null);
                  }}
                  data-testid="button-cancel-user"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                  data-testid="button-save-user"
                >
                  {editingUser ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent data-testid="dialog-delete-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete {deletingItem?.type} "{deletingItem?.name}".
                {deletingItem?.type === "portfolio" && " This action cannot be undone if the portfolio has no associated practices or users."}
                {deletingItem?.type === "practice" && " This action cannot be undone if the practice has no metrics or transaction history."}
                {deletingItem?.type === "user" && " This action cannot be undone if the user has no associated requests."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                disabled={
                  deletePortfolioMutation.isPending || 
                  deletePracticeMutation.isPending || 
                  deleteUserMutation.isPending
                }
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
