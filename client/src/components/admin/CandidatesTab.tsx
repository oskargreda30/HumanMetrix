import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, Plus, FileText, Tag, StickyNote, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SkillRadarChart } from "@/components/admin/SkillRadarChart";
import { isSkillBasedAssessment, transformToRadarData, getTopSkills, getGrowthAreas, formatAssessmentType, calculateAverageScore } from "@/lib/assessmentSkills";

export default function CandidatesTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [newTag, setNewTag] = useState("");
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();

  const { data: candidates, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/candidates'],
  });

  const addTagMutation = useMutation({
    mutationFn: async ({ userId, tag }: { userId: string; tag: string }) => {
      const res = await fetch('/api/admin/candidates/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tag }),
      });
      if (!res.ok) throw new Error('Failed to add tag');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/candidates'] });
      setNewTag("");
      toast({ title: "Tag added successfully" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ userId, note }: { userId: string; note: string }) => {
      const res = await fetch('/api/admin/candidates/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, note }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/candidates'] });
      setNewNote("");
      toast({ title: "Note added successfully" });
    },
  });

  const filteredCandidates = candidates?.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.user.email?.toLowerCase().includes(query) ||
      c.user.firstName?.toLowerCase().includes(query) ||
      c.user.lastName?.toLowerCase().includes(query) ||
      c.tags?.some((t: any) => t.tag.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, email, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-candidates"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredCandidates && filteredCandidates.length > 0 ? (
        <div className="grid gap-4">
          {filteredCandidates.map((candidate: any) => (
            <Card key={candidate.user.id} className="hover-elevate" data-testid={`card-candidate-${candidate.user.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {candidate.user.firstName || candidate.user.lastName
                        ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
                        : 'No Name'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{candidate.user.email}</p>
                    
                    {candidate.tags && candidate.tags.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {candidate.tags.map((tag: any) => (
                          <Badge key={tag.id} variant="secondary">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag.tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCandidate(candidate)}
                        data-testid={`button-view-details-${candidate.user.id}`}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {candidate.user.firstName || candidate.user.lastName
                            ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
                            : 'Candidate Details'}
                        </DialogTitle>
                        <DialogDescription>{candidate.user.email}</DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6">
                        {/* Assessment Results */}
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Assessment Results ({candidate.results?.length || 0})
                          </h3>
                          {candidate.results && candidate.results.length > 0 ? (
                            <div className="space-y-4">
                              {candidate.results.map((result: any) => (
                                <div key={result.id} className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{formatAssessmentType(result.assessmentType)}</span>
                                    <Badge variant={result.status === 'completed' ? 'default' : 'secondary'}>
                                      {result.status}
                                    </Badge>
                                  </div>
                                  
                                  {result.status === 'completed' && isSkillBasedAssessment(result.assessmentType) && result.scores ? (
                                    <div className="space-y-3">
                                      <SkillRadarChart 
                                        data={transformToRadarData(result.scores, result.assessmentType)}
                                        height={250}
                                        showCard={false}
                                      />
                                      
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-muted/50 rounded-lg">
                                          <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                            <p className="text-xs font-medium text-muted-foreground">Top Strengths</p>
                                          </div>
                                          {getTopSkills(result.scores, result.assessmentType, 2).map((skill) => (
                                            <div key={skill.name} className="flex items-center justify-between text-sm mt-1">
                                              <span>{skill.name}</span>
                                              <Badge variant="outline" className="font-mono text-xs">{skill.score}</Badge>
                                            </div>
                                          ))}
                                        </div>
                                        
                                        <div className="p-3 bg-muted/50 rounded-lg">
                                          <div className="flex items-center gap-2 mb-2">
                                            <TrendingDown className="h-4 w-4 text-amber-600" />
                                            <p className="text-xs font-medium text-muted-foreground">Growth Areas</p>
                                          </div>
                                          {getGrowthAreas(result.scores, result.assessmentType, 2).map((skill) => (
                                            <div key={skill.name} className="flex items-center justify-between text-sm mt-1">
                                              <span>{skill.name}</span>
                                              <Badge variant="outline" className="font-mono text-xs">{skill.score}</Badge>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      <div className="text-center p-2 bg-primary/5 rounded-lg">
                                        <p className="text-xs text-muted-foreground">Average Score</p>
                                        <p className="text-xl font-bold text-primary">{calculateAverageScore(result.scores)}/100</p>
                                      </div>
                                    </div>
                                  ) : result.totalScore !== null && (
                                    <div className="text-center p-3 bg-muted rounded-lg">
                                      <p className="text-lg font-bold text-primary">
                                        {result.totalScore}%
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No completed assessments</p>
                          )}
                        </div>

                        {/* Tags */}
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Tags
                          </h3>
                          <div className="flex gap-2 flex-wrap mb-3">
                            {candidate.tags?.map((tag: any) => (
                              <Badge key={tag.id} variant="secondary">{tag.tag}</Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a tag..."
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              data-testid="input-new-tag"
                            />
                            <Button
                              onClick={() => {
                                if (newTag.trim() && selectedCandidate) {
                                  addTagMutation.mutate({
                                    userId: selectedCandidate.user.id,
                                    tag: newTag.trim(),
                                  });
                                }
                              }}
                              disabled={!newTag.trim() || addTagMutation.isPending}
                              data-testid="button-add-tag"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <StickyNote className="h-4 w-4" />
                            Notes
                          </h3>
                          {candidate.notes && candidate.notes.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {candidate.notes.map((note: any) => (
                                <div key={note.id} className="p-3 bg-muted rounded-lg">
                                  <p className="text-sm">{note.note}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(note.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Add a note..."
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              rows={3}
                              data-testid="textarea-new-note"
                            />
                            <Button
                              onClick={() => {
                                if (newNote.trim() && selectedCandidate) {
                                  addNoteMutation.mutate({
                                    userId: selectedCandidate.user.id,
                                    note: newNote.trim(),
                                  });
                                }
                              }}
                              disabled={!newNote.trim() || addNoteMutation.isPending}
                              data-testid="button-add-note"
                            >
                              Add Note
                            </Button>
                          </div>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedCandidate(null)}>
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Assessments</p>
                    <p className="font-semibold">{candidate.results?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Completed</p>
                    <p className="font-semibold">
                      {candidate.results?.filter((r: any) => r.status === 'completed').length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Top Skill</p>
                    <p className="font-semibold">
                      {(() => {
                        const completedResults = candidate.results?.filter((r: any) => r.status === 'completed' && isSkillBasedAssessment(r.assessmentType) && r.scores);
                        if (!completedResults || completedResults.length === 0) return 'N/A';
                        
                        const allSkills: Array<{name: string, score: number}> = [];
                        completedResults.forEach((r: any) => {
                          const topSkills = getTopSkills(r.scores, r.assessmentType, 1);
                          if (topSkills.length > 0) {
                            allSkills.push({name: topSkills[0].name, score: topSkills[0].score});
                          }
                        });
                        
                        if (allSkills.length === 0) return 'N/A';
                        allSkills.sort((a, b) => b.score - a.score);
                        return `${allSkills[0].name} (${allSkills[0].score})`;
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tags</p>
                    <p className="font-semibold">{candidate.tags?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No candidates found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
