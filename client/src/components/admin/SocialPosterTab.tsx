import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Sparkles,
  Check,
  X,
  Send,
  Trash2,
  Edit,
  Filter,
  RefreshCw,
  Linkedin,
  Instagram,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Wand2,
  BarChart3,
  Plus,
} from "lucide-react";
import {
  SOCIAL_POST_STATUS_LABELS,
  type SocialPost,
  type SocialPostStatus,
  type SocialPlatform,
} from "@shared/schema";

const STATUS_COLORS: Record<SocialPostStatus, string> = {
  draft: "bg-slate-500/20 text-slate-300",
  pending_approval: "bg-amber-500/20 text-amber-300",
  approved: "bg-green-500/20 text-green-300",
  rejected: "bg-red-500/20 text-red-300",
  posted: "bg-cyan-500/20 text-cyan-300",
  failed: "bg-orange-500/20 text-orange-300",
};

const PLATFORM_ICONS: Record<SocialPlatform, typeof Linkedin> = {
  linkedin: Linkedin,
  instagram: Instagram,
};

const TOPIC_CATEGORIES = [
  "AI in Hiring",
  "Behavioral Assessment",
  "AI Literacy",
  "Future of Work",
  "HR Tech Trends",
  "Candidate Experience",
  "Skills-Based Hiring",
  "Team Diagnostics",
  "Ethical AI",
  "Recruitment Innovation",
];

function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return then.toLocaleDateString();
}

export default function SocialPosterTab() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [viewingPost, setViewingPost] = useState<SocialPost | null>(null);
  const [rejectingPost, setRejectingPost] = useState<SocialPost | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [generatePlatform, setGeneratePlatform] = useState<string>("linkedin");
  const [generateTopic, setGenerateTopic] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ platform: "linkedin", content: "", hashtags: "", topicCategory: "" });

  const { data: posts = [], isLoading } = useQuery<SocialPost[]>({
    queryKey: ["/api/admin/social-posts"],
  });

  const { data: stats } = useQuery<{
    total: number;
    draft: number;
    pending_approval: number;
    approved: number;
    rejected: number;
    posted: number;
    failed: number;
    byPlatform: { linkedin: number; instagram: number };
  }>({
    queryKey: ["/api/admin/social-posts/stats"],
  });

  const generateMutation = useMutation({
    mutationFn: async ({ platform, topic }: { platform: string; topic?: string }) => {
      const res = await apiRequest("POST", "/api/admin/social-posts/generate", { platform, topic });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts/stats"] });
      toast({ title: "Content Generated", description: "AI has created a new post draft for review." });
    },
    onError: (err: any) => {
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    },
  });

  const generateBatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/social-posts/generate-batch", {
        platforms: ["linkedin", "instagram"],
        count: 1,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts/stats"] });
      toast({ title: "Batch Generated", description: `Created ${data.generated} posts for review.` });
    },
    onError: (err: any) => {
      toast({ title: "Batch Generation Failed", description: err.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/social-posts/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts/stats"] });
      toast({ title: "Post Approved", description: "Post is ready for publishing." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/social-posts/${id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts/stats"] });
      setRejectingPost(null);
      setRejectReason("");
      toast({ title: "Post Rejected" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/admin/social-posts/${id}/publish`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts/stats"] });
      if (data.publishError) {
        toast({ title: "Publishing Failed", description: data.publishError, variant: "destructive" });
      } else {
        toast({ title: "Post Published", description: "Successfully published to social media." });
      }
    },
    onError: (err: any) => {
      toast({ title: "Publish Failed", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number; content?: string; hashtags?: string; platform?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/social-posts/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts"] });
      setEditingPost(null);
      toast({ title: "Post Updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/social-posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts/stats"] });
      toast({ title: "Post Deleted" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { platform: string; content: string; hashtags: string; topicCategory: string }) => {
      const res = await apiRequest("POST", "/api/admin/social-posts", { ...data, status: "pending_approval" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/social-posts/stats"] });
      setShowCreateDialog(false);
      setCreateForm({ platform: "linkedin", content: "", hashtags: "", topicCategory: "" });
      toast({ title: "Post Created", description: "Manual post added for review." });
    },
  });

  const filteredPosts = posts.filter((post) => {
    if (filterStatus !== "all" && post.status !== filterStatus) return false;
    if (filterPlatform !== "all" && post.platform !== filterPlatform) return false;
    return true;
  });

  const pendingCount = posts.filter(p => p.status === "pending_approval").length;
  const approvedCount = posts.filter(p => p.status === "approved").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-cyan-500/30 bg-slate-900/50">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-slate-400">Total Posts</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-white mt-1">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-slate-900/50">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-slate-400">Pending Review</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-amber-300 mt-1">{stats?.pending_approval || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-slate-900/50">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-xs text-slate-400">Published</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-green-300 mt-1">{stats?.posted || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30 bg-slate-900/50">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2">
              <Linkedin className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-slate-400">LinkedIn</span>
            </div>
            <p className="text-lg font-bold text-white mt-1">{stats?.byPlatform?.linkedin || 0}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Instagram className="h-3 w-3 text-pink-400" />
              <span className="text-xs text-slate-400">IG: {stats?.byPlatform?.instagram || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            className="text-white border-white/20"
            onClick={() => generateMutation.mutate({ platform: generatePlatform, topic: generateTopic || undefined })}
            disabled={generateMutation.isPending}
            data-testid="button-generate-single"
          >
            {generateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
            Generate Post
          </Button>
          <Select value={generatePlatform} onValueChange={setGeneratePlatform}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-800 border-white/20 text-white" data-testid="select-generate-platform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
            </SelectContent>
          </Select>
          <Select value={generateTopic} onValueChange={setGenerateTopic}>
            <SelectTrigger className="w-[160px] h-8 text-xs bg-slate-800 border-white/20 text-white" data-testid="select-generate-topic">
              <SelectValue placeholder="Random Topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="random">Random Topic</SelectItem>
              {TOPIC_CATEGORIES.map((topic) => (
                <SelectItem key={topic} value={topic}>{topic}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-white border-white/20"
            onClick={() => generateBatchMutation.mutate()}
            disabled={generateBatchMutation.isPending}
            data-testid="button-generate-batch"
          >
            {generateBatchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
            Generate Daily Batch
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-white border-white/20"
            onClick={() => setShowCreateDialog(true)}
            data-testid="button-create-manual"
          >
            <Plus className="h-3 w-3 mr-1" />
            Manual Post
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-slate-400" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-8 text-xs bg-slate-800 border-white/20 text-white" data-testid="select-filter-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="posted">Posted</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-800 border-white/20 text-white" data-testid="select-filter-platform">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-slate-400 ml-2">{filteredPosts.length} posts</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <Card className="border-cyan-500/30 bg-slate-900/50">
          <CardContent className="p-8 text-center">
            <Sparkles className="h-12 w-12 text-cyan-400/30 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No posts yet. Click "Generate Post" or "Generate Daily Batch" to create AI-powered content.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const PlatformIcon = PLATFORM_ICONS[post.platform as SocialPlatform] || Linkedin;
            return (
              <Card key={post.id} className="border-cyan-500/30 bg-slate-900/50" data-testid={`card-social-post-${post.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <PlatformIcon className={`h-4 w-4 ${post.platform === "linkedin" ? "text-blue-400" : "text-pink-400"}`} />
                        <Badge className={STATUS_COLORS[post.status as SocialPostStatus] || "bg-slate-500/20 text-slate-300"}>
                          {SOCIAL_POST_STATUS_LABELS[post.status as SocialPostStatus] || post.status}
                        </Badge>
                        {post.aiGenerated && (
                          <Badge className="bg-purple-500/20 text-purple-300">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                        {post.topicCategory && (
                          <Badge className="bg-cyan-500/20 text-cyan-300">{post.topicCategory}</Badge>
                        )}
                        <span className="text-xs text-slate-500 ml-auto">{timeAgo(post.createdAt)}</span>
                      </div>

                      <p className="text-sm text-slate-300 whitespace-pre-wrap line-clamp-4">{post.content}</p>

                      {post.hashtags && (
                        <p className="text-xs text-cyan-400/70 mt-2">{post.hashtags}</p>
                      )}

                      {post.rejectedReason && (
                        <p className="text-xs text-red-400 mt-2 italic">Rejection reason: {post.rejectedReason}</p>
                      )}

                      {post.postedAt && (
                        <p className="text-xs text-green-400 mt-1">Posted: {new Date(post.postedAt).toLocaleString()}</p>
                      )}
                    </div>

                    <div className="flex md:flex-col gap-1.5 flex-wrap md:flex-nowrap shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-white border-white/20"
                        onClick={() => setViewingPost(post)}
                        data-testid={`button-view-post-${post.id}`}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>

                      {(post.status === "draft" || post.status === "pending_approval" || post.status === "rejected") && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-white border-white/20"
                            onClick={() => setEditingPost(post)}
                            data-testid={`button-edit-post-${post.id}`}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => approveMutation.mutate(post.id)}
                            disabled={approveMutation.isPending}
                            data-testid={`button-approve-post-${post.id}`}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          {post.status !== "rejected" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-400 border-red-400/30"
                              onClick={() => { setRejectingPost(post); setRejectReason(""); }}
                              data-testid={`button-reject-post-${post.id}`}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          )}
                        </>
                      )}

                      {post.status === "approved" && (
                        <Button
                          size="sm"
                          className="bg-cyan-600 hover:bg-cyan-700 text-white"
                          onClick={() => publishMutation.mutate(post.id)}
                          disabled={publishMutation.isPending}
                          data-testid={`button-publish-post-${post.id}`}
                        >
                          {publishMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                          Publish
                        </Button>
                      )}

                      {post.status !== "posted" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-400 border-red-400/30"
                          onClick={() => {
                            if (confirm("Delete this post?")) deleteMutation.mutate(post.id);
                          }}
                          data-testid={`button-delete-post-${post.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewingPost} onOpenChange={(open) => !open && setViewingPost(null)}>
        <DialogContent className="max-w-2xl bg-slate-900 border-cyan-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 flex items-center gap-2">
              {viewingPost?.platform === "linkedin" ? <Linkedin className="h-5 w-5 text-blue-400" /> : <Instagram className="h-5 w-5 text-pink-400" />}
              {viewingPost?.platform === "linkedin" ? "LinkedIn" : "Instagram"} Post Preview
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Preview how this post will appear on {viewingPost?.platform}.
            </DialogDescription>
          </DialogHeader>
          {viewingPost && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={STATUS_COLORS[viewingPost.status as SocialPostStatus]}>
                  {SOCIAL_POST_STATUS_LABELS[viewingPost.status as SocialPostStatus]}
                </Badge>
                {viewingPost.topicCategory && (
                  <Badge className="bg-cyan-500/20 text-cyan-300">{viewingPost.topicCategory}</Badge>
                )}
              </div>
              <div className="bg-slate-800 rounded-md p-4 border border-white/10">
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{viewingPost.content}</p>
                {viewingPost.hashtags && (
                  <p className="text-xs text-cyan-400/70 mt-3">{viewingPost.hashtags}</p>
                )}
              </div>
              {viewingPost.imagePrompt && (
                <div>
                  <Label className="text-xs text-slate-400">Suggested Image</Label>
                  <p className="text-xs text-slate-500 mt-1 italic">{viewingPost.imagePrompt}</p>
                </div>
              )}
              <div className="text-xs text-slate-500">
                Created: {new Date(viewingPost.createdAt).toLocaleString()}
                {viewingPost.approvedBy && <span className="ml-3">Approved by: {viewingPost.approvedBy}</span>}
                {viewingPost.postedAt && <span className="ml-3">Posted: {new Date(viewingPost.postedAt).toLocaleString()}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent className="max-w-2xl bg-slate-900 border-cyan-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Edit Post</DialogTitle>
            <DialogDescription className="text-slate-400">
              Edit the content before approving.
            </DialogDescription>
          </DialogHeader>
          {editingPost && (
            <EditPostForm
              post={editingPost}
              onSave={(updates) => updateMutation.mutate({ id: editingPost.id, ...updates })}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectingPost} onOpenChange={(open) => !open && setRejectingPost(null)}>
        <DialogContent className="max-w-md bg-slate-900 border-cyan-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Reject Post</DialogTitle>
            <DialogDescription className="text-slate-400">
              Provide a reason for rejecting this post (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="bg-slate-800 border-white/20 text-white"
              data-testid="input-reject-reason"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                className="text-white border-white/20"
                onClick={() => setRejectingPost(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => rejectingPost && rejectMutation.mutate({ id: rejectingPost.id, reason: rejectReason })}
                disabled={rejectMutation.isPending}
                data-testid="button-confirm-reject"
              >
                {rejectMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                Reject Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl bg-slate-900 border-cyan-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Create Manual Post</DialogTitle>
            <DialogDescription className="text-slate-400">
              Write your own social media post content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-400">Platform</Label>
              <Select value={createForm.platform} onValueChange={(v) => setCreateForm({ ...createForm, platform: v })}>
                <SelectTrigger className="bg-slate-800 border-white/20 text-white mt-1" data-testid="select-create-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400">Content</Label>
              <Textarea
                value={createForm.content}
                onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                placeholder="Write your post content..."
                className="bg-slate-800 border-white/20 text-white mt-1 min-h-[150px]"
                data-testid="input-create-content"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Hashtags</Label>
              <Input
                value={createForm.hashtags}
                onChange={(e) => setCreateForm({ ...createForm, hashtags: e.target.value })}
                placeholder="#AIHiring #FutureOfWork"
                className="bg-slate-800 border-white/20 text-white mt-1"
                data-testid="input-create-hashtags"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Topic Category</Label>
              <Select value={createForm.topicCategory} onValueChange={(v) => setCreateForm({ ...createForm, topicCategory: v })}>
                <SelectTrigger className="bg-slate-800 border-white/20 text-white mt-1" data-testid="select-create-topic">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {TOPIC_CATEGORIES.map((topic) => (
                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="text-white border-white/20" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                onClick={() => createMutation.mutate(createForm)}
                disabled={createMutation.isPending || !createForm.content.trim()}
                data-testid="button-confirm-create"
              >
                {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                Create Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditPostForm({
  post,
  onSave,
  isPending,
}: {
  post: SocialPost;
  onSave: (updates: { content: string; hashtags: string; platform: string }) => void;
  isPending: boolean;
}) {
  const [content, setContent] = useState(post.content);
  const [hashtags, setHashtags] = useState(post.hashtags || "");
  const [platform, setPlatform] = useState(post.platform);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-slate-400">Platform</Label>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="bg-slate-800 border-white/20 text-white mt-1" data-testid="select-edit-platform">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs text-slate-400">Content</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="bg-slate-800 border-white/20 text-white mt-1 min-h-[200px]"
          data-testid="input-edit-content"
        />
        <p className="text-xs text-slate-500 mt-1">{content.length} characters</p>
      </div>
      <div>
        <Label className="text-xs text-slate-400">Hashtags</Label>
        <Input
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          className="bg-slate-800 border-white/20 text-white mt-1"
          data-testid="input-edit-hashtags"
        />
      </div>
      {post.imagePrompt && (
        <div>
          <Label className="text-xs text-slate-400">Suggested Image</Label>
          <p className="text-xs text-slate-500 mt-1 italic">{post.imagePrompt}</p>
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <Button
          className="bg-cyan-600 hover:bg-cyan-700 text-white"
          onClick={() => onSave({ content, hashtags, platform })}
          disabled={isPending || !content.trim()}
          data-testid="button-save-edit"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
