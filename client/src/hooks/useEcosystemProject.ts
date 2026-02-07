import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { 
  EcosystemProject, 
  EcosystemTeamMember,
  EcosystemMissionAnalysis,
  EcosystemTeamAnalysis 
} from "@shared/schema";

export function useEcosystemProjects(partnerId?: string) {
  const endpoint = partnerId 
    ? `/api/ecosystem/partner/projects?partnerId=${partnerId}`
    : "/api/ecosystem/projects";
  
  return useQuery<EcosystemProject[]>({
    queryKey: [endpoint],
  });
}

export function useEcosystemProject(projectId: string | null) {
  return useQuery<EcosystemProject>({
    queryKey: [`/api/ecosystem/projects/${projectId}`],
    enabled: !!projectId,
  });
}

export function useEcosystemTeamMembers(projectId: string | null) {
  return useQuery<EcosystemTeamMember[]>({
    queryKey: [`/api/ecosystem/projects/${projectId}/team-members`],
    enabled: !!projectId,
  });
}

export function useCreateEcosystemProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name?: string; partnerId?: string }) => {
      const response = await apiRequest("POST", "/api/ecosystem/projects", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/ecosystem');
        }
      });
    },
  });
}

export function useUpdateEcosystemProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const response = await apiRequest("PATCH", `/api/ecosystem/projects/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/ecosystem');
        }
      });
    },
  });
}

export function useDeleteEcosystemProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ecosystem/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/ecosystem');
        }
      });
    },
  });
}

export function useAnalyzeMission() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { project: EcosystemProject; missionAnalysis: EcosystemMissionAnalysis },
    Error,
    { projectId: string; missionStatement: string; companyEthos?: string }
  >({
    mutationFn: async ({ projectId, missionStatement, companyEthos }) => {
      const response = await apiRequest("POST", `/api/ecosystem/projects/${projectId}/analyze-mission`, {
        missionStatement,
        companyEthos,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/ecosystem');
        }
      });
    },
  });
}

// Save mission without AI analysis (analysis happens during team generation)
export function useSaveMission() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { project: EcosystemProject },
    Error,
    { projectId: string; missionStatement: string; companyEthos?: string }
  >({
    mutationFn: async ({ projectId, missionStatement, companyEthos }) => {
      const response = await apiRequest("POST", `/api/ecosystem/projects/${projectId}/save-mission`, {
        missionStatement,
        companyEthos,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/ecosystem');
        }
      });
    },
  });
}

export function useUpdateOrganizationContext() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      ...data 
    }: { 
      projectId: string; 
      // Basic context - all optional
      industry?: string;
      teamFunction?: string;
      teamSize?: number;
      workMode?: string;
      teamStage?: string;
      hiringPlans?: string;
      currentChallenges?: string;
      // Deep dive - Team Dynamics
      delayedTasks?: string;
      conflictTopics?: string;
      avoidedWork?: string;
      // Deep dive - Workload & Capacity
      overloadedMember?: string;
      wishedSkills?: string;
      // Deep dive - Culture & Collaboration
      idealInteractionStyle?: string;
      personalityGap?: string;
      // Deep dive - Strategic Context
      upcomingInitiative?: string;
      cloneableSkills?: string;
      transformativeFix?: string;
    }) => {
      const response = await apiRequest("POST", `/api/ecosystem/projects/${projectId}/organization-context`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/ecosystem');
        }
      });
    },
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      ...data 
    }: { 
      projectId: string; 
      name?: string;
      role?: string;
      sourceType: string;
      sourceId?: string;
      fitScores?: Record<string, number>;
    }) => {
      const response = await apiRequest("POST", `/api/ecosystem/projects/${projectId}/team-members`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/ecosystem');
        }
      });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      memberId,
      ...data 
    }: { 
      projectId: string; 
      memberId: string;
      [key: string]: any;
    }) => {
      const response = await apiRequest("PATCH", `/api/ecosystem/projects/${projectId}/team-members/${memberId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/ecosystem');
        }
      });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, memberId }: { projectId: string; memberId: string }) => {
      await apiRequest("DELETE", `/api/ecosystem/projects/${projectId}/team-members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/ecosystem');
        }
      });
    },
  });
}

export function useGenerateTeamAnalysis() {
  const queryClient = useQueryClient();
  
  return useMutation<
    { project: EcosystemProject; teamAnalysis: EcosystemTeamAnalysis; creditsConsumed?: number },
    Error,
    { projectId: string; isRegeneration?: boolean }
  >({
    mutationFn: async ({ projectId, isRegeneration }) => {
      const response = await apiRequest(
        "POST", 
        `/api/ecosystem/projects/${projectId}/generate-analysis`,
        isRegeneration ? { isRegeneration: true } : undefined,
        { timeoutMs: 120000 }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/ecosystem');
        }
      });
    },
  });
}

// Type for searchable candidates
export interface SearchableCandidate {
  id: string;
  email: string;
  name: string;
  fitScores: Record<string, number>;
  completedAt: string | null;
}

export function useSearchableCandidates(projectId: string | null) {
  return useQuery<SearchableCandidate[]>({
    queryKey: [`/api/ecosystem/projects/${projectId}/searchable-candidates`],
    enabled: !!projectId,
  });
}
