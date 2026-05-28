/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Tournament, Athlete, Team, TeamMember, Group, Match, UserRole, SegmentKey, MatchSegment, ScoreEvent } from '../types';
import { getInitialState, saveState, DatabaseState } from '../mockDb';
import { 
  generateRoundRobinMatches as logicGenerateRoundRobinMatches, 
  drawTeams, 
  validateTeamLineup, 
  applyScoreEvent, 
  undoLatestScorePoint as logicUndoLatestScorePoint,
  replayMatchEvents
} from '../utils/tournamentLogic';

interface AlertToast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface TournamentContextType {
  state: DatabaseState;
  toasts: AlertToast[];
  addToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
  // Auth mock actions
  setCurrentUserRole: (role: UserRole) => void;
  // Tournament actions
  updateTournament: (updates: Partial<Tournament>) => void;
  // Athlete actions
  addAthlete: (athlete: Omit<Athlete, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAthlete: (id: string, updates: Partial<Athlete>) => void;
  deleteAthlete: (id: string) => void;
  bulkImportAthletes: (athletes: Omit<Athlete, 'id' | 'createdAt' | 'updatedAt'>[]) => number;
  // Team actions
  addTeam: (team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>, athleteIds: string[]) => void;
  updateTeam: (id: string, updates: Partial<Team>, athleteIds?: string[]) => void;
  deleteTeam: (id: string) => void;
  removeAthleteFromTeam: (teamId: string, athleteId: string) => void;
  addAthleteToTeam: (teamId: string, athleteId: string, isCaptain?: boolean) => string | null;
  // Group actions
  addGroup: (name: string) => void;
  deleteGroup: (id: string) => void;
  // Match actions
  addMatch: (match: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMatch: (id: string, updates: Partial<Match>) => void;
  deleteMatch: (id: string) => void;
  generateMatchesForGroup: (groupId: string, config: { courts: string[]; startDateTime: string; intervalMinutes: number }) => void;
  resetAllGroupMatches: (groupId: string) => void;
  
  // Relay Tournament flexible actions
  performAutomaticTeamDraw: (seed: string) => void;
  drawMatchSegmentOrder: (matchId: string, order?: SegmentKey[]) => void;
  submitMatchLineups: (matchId: string, lineupsA: Record<SegmentKey, string[]>, lineupsB: Record<SegmentKey, string[]>) => { valid: boolean; errors: string[] };
  addScorePoint: (matchId: string, scoringTeamId: string) => void;
  undoLatestScorePoint: (matchId: string) => void;
  startNextSegment: (matchId: string) => void;
  resolveTieManually: (groupId: string, teamIdsInOrder: string[], reason: string) => void;
  
  // General resets
  resetToFactoryDefaults: () => void;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DatabaseState>(() => getInitialState());
  const [toasts, setToasts] = useState<AlertToast[]>([]);

  // Periodically save database state to local storage when changed
  useEffect(() => {
    saveState(db);
  }, [db]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    // Auto remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const setCurrentUserRole = (role: UserRole) => {
    const foundUser = db.users.find(u => u.role === role) || null;
    setDb(prev => ({
      ...prev,
      currentUser: foundUser
    }));
    let label = 'Người xem công cộng';
    if (role === 'super_admin') label = 'Super Admin';
    if (role === 'organizer') label = 'Ban Tổ Chức';
    if (role === 'operator') label = 'Trọng Tài';
    addToast(`Đã chuyển sang vai trò: ${label}`, 'info');
  };

  const updateTournament = (updates: Partial<Tournament>) => {
    setDb(prev => {
      const updatedTournaments = prev.tournaments.map(t => {
        if (t.id === prev.activeTournamentId) {
          return { ...t, ...updates, updatedAt: new Date().toISOString() };
        }
        return t;
      });
      return { ...prev, tournaments: updatedTournaments };
    });
    addToast('Cấu hình giải đấu đã được lưu thành công!', 'success');
  };

  // Athlete CRUD
  const addAthlete = (athleteData: Omit<Athlete, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAthlete: Athlete = {
      ...athleteData,
      id: `ath_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDb(prev => ({
      ...prev,
      athletes: [newAthlete, ...prev.athletes]
    }));
    addToast(`Đã thêm VĐV ${newAthlete.fullName}!`, 'success');
  };

  const updateAthlete = (id: string, updates: Partial<Athlete>) => {
    setDb(prev => ({
      ...prev,
      athletes: prev.athletes.map(a => (a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a))
    }));
    addToast('Cập nhật thông tin vận động viên thành công!', 'success');
  };

  const deleteAthlete = (id: string) => {
    const athlete = db.athletes.find(a => a.id === id);
    if (!athlete) return;

    // Remove from any teams
    setDb(prev => {
      const cleanMembers = prev.teamMembers.filter(m => m.athleteId !== id);
      const cleanAthletes = prev.athletes.filter(a => a.id !== id);
      
      // Update team captains if matching
      const cleanTeams = prev.teams.map(t => {
        if (t.captainAthleteId === id) {
          return { ...t, captainAthleteId: null };
        }
        return t;
      });

      return {
        ...prev,
        athletes: cleanAthletes,
        teamMembers: cleanMembers,
        teams: cleanTeams
      };
    });

    addToast(`Đã xóa vận động viên ${athlete.fullName}.`, 'info');
  };

  const bulkImportAthletes = (newList: Omit<Athlete, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const timestamp = new Date().toISOString();
    const preparedList: Athlete[] = newList.map((item, index) => ({
      ...item,
      id: `ath_bulk_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: timestamp,
      updatedAt: timestamp
    }));

    setDb(prev => ({
      ...prev,
      athletes: [...preparedList, ...prev.athletes]
    }));

    addToast(`Đã nhập thành công ${preparedList.length} vận động viên!`, 'success');
    return preparedList.length;
  };

  // Team CRUD
  const addTeam = (teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>, athleteIds: string[]) => {
    const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newTeam: Team = {
      ...teamData,
      id: teamId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newMembers: TeamMember[] = athleteIds.map((athId, idx) => ({
      id: `tm_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      teamId,
      athleteId: athId,
      role: teamData.captainAthleteId === athId ? 'captain' : 'member',
      createdAt: new Date().toISOString()
    }));

    setDb(prev => {
      // Mark these athletes as assigned
      const updatedAthletes = prev.athletes.map(a => {
        if (athleteIds.includes(a.id)) {
          return { ...a, status: 'assigned' as const };
        }
        return a;
      });

      return {
        ...prev,
        teams: [...prev.teams, newTeam],
        teamMembers: [...prev.teamMembers, ...newMembers],
        athletes: updatedAthletes
      };
    });

    addToast(`Đã tạo đội mới: Sân đấu ${newTeam.name}!`, 'success');
  };

  const updateTeam = (id: string, updates: Partial<Team>, athleteIds?: string[]) => {
    setDb(prev => {
      // Find current athletes for this team
      const existingMembers = prev.teamMembers.filter(m => m.teamId === id);
      const existingAthleteIds = existingMembers.map(m => m.athleteId);

      // Setup clean teams
      const updatedTeams = prev.teams.map(t => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));

      let nextMembers = prev.teamMembers;
      let nextAthletes = prev.athletes;

      if (athleteIds !== undefined) {
        // Find which athletes were removed from this team
        const removedAthleteIds = existingAthleteIds.filter(aid => !athleteIds.includes(aid));
        
        // Remove old team assignments for this team
        nextMembers = prev.teamMembers.filter(m => m.teamId !== id);

        // Build new ones
        const freshMembers: TeamMember[] = athleteIds.map((athId, idx) => ({
          id: `tm_upd_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
          teamId: id,
          athleteId: athId,
          role: updates.captainAthleteId === athId ? 'captain' : 'member',
          createdAt: new Date().toISOString()
        }));

        nextMembers = [...nextMembers, ...freshMembers];

        // Update athletes status
        nextAthletes = prev.athletes.map(a => {
          // If athlete is newly assigned
          if (athleteIds.includes(a.id)) {
            return { ...a, status: 'assigned' as const };
          }
          // If athlete was removed, check if they are in some other team member list (unlikely, but safe)
          if (removedAthleteIds.includes(a.id)) {
            // Check if still assigned to another team
            const stillAssigned = nextMembers.some(nm => nm.athleteId === a.id);
            return { ...a, status: stillAssigned ? ('assigned' as const) : ('registered' as const) };
          }
          return a;
        });
      } else {
        // Just updates on team fields
        // Ensure captain status is updated in team members
        if (updates.captainAthleteId) {
          nextMembers = prev.teamMembers.map(m => {
            if (m.teamId === id) {
              return {
                ...m,
                role: m.athleteId === updates.captainAthleteId ? ('captain' as const) : ('member' as const)
              };
            }
            return m;
          });
        }
      }

      return {
        ...prev,
        teams: updatedTeams,
        teamMembers: nextMembers,
        athletes: nextAthletes
      };
    });

    addToast('Đã lưu chỉnh sửa thông tin đội thành công!', 'success');
  };

  const deleteTeam = (id: string) => {
    const team = db.teams.find(t => t.id === id);
    if (!team) return;

    setDb(prev => {
      const teamAthletes = prev.teamMembers.filter(m => m.teamId === id).map(m => m.athleteId);
      const remainingMembers = prev.teamMembers.filter(m => m.teamId !== id);

      // Adjust athletes assignment flags
      const updatedAthletes = prev.athletes.map(a => {
        if (teamAthletes.includes(a.id)) {
          // If they aren't assigned to any other team (safety)
          const doubleAssigned = remainingMembers.some(rm => rm.athleteId === a.id);
          return { ...a, status: doubleAssigned ? ('assigned' as const) : ('registered' as const) };
        }
        return a;
      });

      // Also clean up any matches involving this team
      const remainingMatches = prev.matches.filter(m => m.teamAId !== id && m.teamBId !== id);

      return {
        ...prev,
        teams: prev.teams.filter(t => t.id !== id),
        teamMembers: remainingMembers,
        athletes: updatedAthletes,
        matches: remainingMatches
      };
    });

    addToast(`Đã giải tán đội ${team.name}. Lịch thi đấu liên quan đã được gỡ bỏ.`, 'info');
  };

  const removeAthleteFromTeam = (teamId: string, athleteId: string) => {
    setDb(prev => {
      const remainingMembers = prev.teamMembers.filter(m => !(m.teamId === teamId && m.athleteId === athleteId));
      
      // If team captain was this athlete
      const updatedTeams = prev.teams.map(t => {
        if (t.id === teamId && t.captainAthleteId === athleteId) {
          return { ...t, captainAthleteId: null };
        }
        return t;
      });

      const doubleAssigned = remainingMembers.some(rm => rm.athleteId === athleteId);
      const updatedAthletes = prev.athletes.map(a => {
        if (a.id === athleteId) {
          return { ...a, status: doubleAssigned ? ('assigned' as const) : ('registered' as const) };
        }
        return a;
      });

      return {
        ...prev,
        teamMembers: remainingMembers,
        teams: updatedTeams,
        athletes: updatedAthletes
      };
    });

    addToast('Đã gỡ vận động viên khỏi đội!', 'info');
  };

  const addAthleteToTeam = (teamId: string, athleteId: string, isCaptain: boolean = false): string | null => {
    // Check if duplicate assignment
    const alreadyRegistered = db.teamMembers.find(m => m.athleteId === athleteId);
    if (alreadyRegistered) {
      const alreadyTeam = db.teams.find(t => t.id === alreadyRegistered.teamId);
      return `VĐV này đã thuộc Đội "${alreadyTeam?.name || 'Đội khác'}"!`;
    }

    const newMemberId = `tm_add_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setDb(prev => {
      const newMember: TeamMember = {
        id: newMemberId,
        teamId,
        athleteId,
        role: isCaptain ? 'captain' : 'member',
        createdAt: new Date().toISOString()
      };

      const updatedTeams = prev.teams.map(t => {
        if (t.id === teamId && isCaptain) {
          return { ...t, captainAthleteId: athleteId };
        }
        return t;
      });

      const updatedAthletes = prev.athletes.map(a => {
        if (a.id === athleteId) {
          return { ...a, status: 'assigned' as const };
        }
        return a;
      });

      return {
        ...prev,
        teamMembers: [...prev.teamMembers, newMember],
        teams: updatedTeams,
        athletes: updatedAthletes
      };
    });

    addToast('Đã thêm vận động viên vào danh sách đội!', 'success');
    return null;
  };

  // Group CRUD
  const addGroup = (name: string) => {
    const id = `g_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const sortOrder = db.groups.length + 1;
    const newGroup: Group = {
      id,
      tournamentId: db.activeTournamentId,
      name,
      sortOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDb(prev => ({
      ...prev,
      groups: [...prev.groups, newGroup]
    }));

    addToast(`Đã thêm bảng đấu mới: ${name}!`, 'success');
  };

  const deleteGroup = (id: string) => {
    const groupName = db.groups.find(g => g.id === id)?.name || '';
    setDb(prev => {
      // Remove team links to this group
      const resetTeams = prev.teams.map(t => (t.groupId === id ? { ...t, groupId: null } : t));
      // Remove matches linked to this group
      const remainingMatches = prev.matches.filter(m => m.groupId !== id);

      return {
        ...prev,
        groups: prev.groups.filter(g => g.id !== id),
        teams: resetTeams,
        matches: remainingMatches
      };
    });

    addToast(`Đã xóa bảng đấu ${groupName}. Liên kết đội đấu và các trận đã bị gỡ.`, 'info');
  };

  // Matches CRUD
  const addMatch = (matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newMatch: Match = {
      ...matchData,
      id: `match_m_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDb(prev => ({
      ...prev,
      matches: [...prev.matches, newMatch]
    }));

    addToast('Đã tạo trận đấu mới một cách thủ công!', 'success');
  };

  const updateMatch = (id: string, updates: Partial<Match>) => {
    setDb(prev => {
      const targetMatch = prev.matches.find(m => m.id === id);
      if (!targetMatch) return prev;

      // Construct update
      const updatedMatch = { ...targetMatch, ...updates, updatedAt: new Date().toISOString() };

      // Automatically determine winner if score updates
      if (updates.scoreA !== undefined || updates.scoreB !== undefined || updates.status === 'completed') {
        const scoreA = updates.scoreA !== undefined ? updates.scoreA : targetMatch.scoreA;
        const scoreB = updates.scoreB !== undefined ? updates.scoreB : targetMatch.scoreB;
        
        if (scoreA !== null && scoreA !== undefined && scoreB !== null && scoreB !== undefined) {
          if (scoreA > scoreB) {
            updatedMatch.winnerTeamId = updatedMatch.teamAId;
          } else if (scoreB > scoreA) {
            updatedMatch.winnerTeamId = updatedMatch.teamBId;
          } else {
            updatedMatch.winnerTeamId = null; // Draw
          }
          
          if (updates.status === undefined) {
            updatedMatch.status = 'completed';
          }
        }
      }

      return {
        ...prev,
        matches: prev.matches.map(m => (m.id === id ? updatedMatch : m))
      };
    });

    addToast('Lưu tỉ số trận đấu thành công!', 'success');
  };

  const deleteMatch = (id: string) => {
    setDb(prev => ({
      ...prev,
      matches: prev.matches.filter(m => m.id !== id)
    }));
    addToast('Đã hủy bỏ trận đấu.', 'info');
  };

  const generateMatchesForGroup = (
    groupId: string,
    config: { courts: string[]; startDateTime: string; intervalMinutes: number }
  ) => {
    const groupTeams = db.teams.filter(t => t.groupId === groupId);
    const groupName = db.groups.find(g => g.id === groupId)?.name || '';

    if (groupTeams.length < 2) {
      addToast(`Bảng đấu cần tối thiểu 2 đội để tự động ghép lịch! Hiện tại chỉ có ${groupTeams.length} đội.`, 'error');
      return;
    }

    const activeTour = db.tournaments.find(t => t.id === db.activeTournamentId);
    if (!activeTour) {
      addToast('Không tìm thấy cấu hình giải đấu hoạt động!', 'error');
      return;
    }

    // Eliminate duplicate group round robin matches if they already exist
    const hasExisting = db.matches.some(m => m.groupId === groupId && m.stage === 'group');
    if (hasExisting) {
      // Just clean them first
      resetAllGroupMatches(groupId);
    }

    const newMatches = logicGenerateRoundRobinMatches(db.activeTournamentId, groupId, groupTeams, activeTour.rulesetConfig, config);

    setDb(prev => ({
      ...prev,
      // Make sure we purge other matches from this group to avoid duplicate pairings
      matches: [...prev.matches.filter(m => m.groupId !== groupId), ...newMatches]
    }));

    addToast(`Đã tự động tạo ${newMatches.length} trận đấu vòng tròn cho ${groupName}!`, 'success');
  };

  const resetAllGroupMatches = (groupId: string) => {
    setDb(prev => ({
      ...prev,
      matches: prev.matches.filter(m => m.groupId !== groupId)
    }));
  };

  const performAutomaticTeamDraw = (seed: string) => {
    const tournament = db.tournaments.find(t => t.id === db.activeTournamentId);
    if (!tournament) {
      addToast('Không tìm thấy giải đấu đang hoạt động!', 'error');
      return;
    }

    const { teamAssignments, unassignedIds } = drawTeams(db.athletes, seed, tournament.rulesetConfig);

    setDb(prev => {
      // Reset all athlete statuses
      const resetAthletes = prev.athletes.map(a => ({
        ...a,
        status: (unassignedIds.includes(a.id) ? 'registered' : 'assigned') as Athlete['status'],
        updatedAt: new Date().toISOString()
      }));

      // Populate new team members
      const newTeamMembers: TeamMember[] = [];
      let memberCounter = 1;

      // Assign members to current teams
      const updatedTeams = prev.teams.map(team => {
        const pids = teamAssignments[team.id] || [];
        const teamMList: TeamMember[] = pids.map((pid, index) => ({
          id: `tm_auto_${Date.now()}_${memberCounter++}`,
          teamId: team.id,
          athleteId: pid,
          role: index === 0 ? 'captain' : 'member',
          createdAt: new Date().toISOString()
        }));
        
        newTeamMembers.push(...teamMList);

        // Find captain athlete id (first male in roster)
        const captainMale = pids.find(pid => {
          const ath = prev.athletes.find(a => a.id === pid);
          return ath?.gender === 'Nam';
        }) || pids[0] || null;

        return {
          ...team,
          captainAthleteId: captainMale,
          updatedAt: new Date().toISOString()
        };
      });

      return {
        ...prev,
        athletes: resetAthletes,
        teamMembers: newTeamMembers,
        teams: updatedTeams
      };
    });

    addToast(`Đã bốc thăm và phân bổ thành công 40 vận động viên vào 8 đội bóng!`, 'success');
  };

  const drawMatchSegmentOrder = (matchId: string, order?: SegmentKey[]) => {
    setDb(prev => {
      const match = prev.matches.find(m => m.id === matchId);
      if (!match) return prev;

      let finalOrder = order;
      if (!finalOrder) {
        const keys: SegmentKey[] = ['mixed_doubles', 'mens_doubles', 'womens_doubles'];
        // Shuffle
        for (let i = keys.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [keys[i], keys[j]] = [keys[j], keys[i]];
        }
        finalOrder = keys;
      }

      // Re-create segments with correct order
      const segments: MatchSegment[] = finalOrder.map((key, index) => {
        const name = key === 'mens_doubles' ? 'Đôi Nam' : key === 'womens_doubles' ? 'Đôi Nữ' : 'Đôi Nam Nữ';
        const targetScore = (index + 1) * 8; // 8, 16, 24
        return {
          id: `seg_${match.id}_${index + 1}`,
          segmentKey: key,
          name,
          segmentOrder: index + 1,
          targetScore,
          status: 'pending' as const,
          playerIdsA: [],
          playerIdsB: []
        };
      });

      const updatedMatches = prev.matches.map(m => {
        if (m.id === matchId) {
          return {
            ...m,
            segmentsOrder: finalOrder,
            segments,
            activeSegmentIndex: 0,
            lineupLocked: false,
            scoreA: null,
            scoreB: null,
            winnerTeamId: null,
            status: 'lineup_pending' as const,
            scoreEvents: [],
            updatedAt: new Date().toISOString()
          };
        }
        return m;
      });

      return {
        ...prev,
        matches: updatedMatches
      };
    });

    addToast('Đã bốc thăm và áp dụng thứ tự chặng đấu mới!', 'success');
  };

  const submitMatchLineups = (
    matchId: string,
    lineupsA: Record<SegmentKey, string[]>,
    lineupsB: Record<SegmentKey, string[]>
  ): { valid: boolean; errors: string[] } => {
    const match = db.matches.find(m => m.id === matchId);
    if (!match) return { valid: false, errors: ['Không tìm thấy trận đấu!'] };

    const tournament = db.tournaments.find(t => t.id === match.tournamentId);
    if (!tournament) return { valid: false, errors: ['Không tìm thấy cấu hình giải đấu!'] };

    // Get team members athletes for validation
    const athletesA = db.teamMembers
      .filter(tm => tm.teamId === match.teamAId)
      .map(tm => db.athletes.find(a => a.id === tm.athleteId))
      .filter(Boolean) as Athlete[];

    const athletesB = db.teamMembers
      .filter(tm => tm.teamId === match.teamBId)
      .map(tm => db.athletes.find(a => a.id === tm.athleteId))
      .filter(Boolean) as Athlete[];

    const teamA = db.teams.find(t => t.id === match.teamAId);
    const teamB = db.teams.find(t => t.id === match.teamBId);

    const segListA = Object.entries(lineupsA).map(([key, pids]) => ({
      segmentKey: key as SegmentKey,
      playerIds: pids
    }));

    const segListB = Object.entries(lineupsB).map(([key, pids]) => ({
      segmentKey: key as SegmentKey,
      playerIds: pids
    }));

    const valA = validateTeamLineup(segListA, athletesA, teamA?.name || 'A', tournament.rulesetConfig);
    const valB = validateTeamLineup(segListB, athletesB, teamB?.name || 'B', tournament.rulesetConfig);

    const allErrors = [...valA.errors, ...valB.errors];
    if (allErrors.length > 0) {
      return { valid: false, errors: allErrors };
    }

    // Lineups are valid, save them
    setDb(prev => {
      const updatedMatches = prev.matches.map(m => {
        if (m.id === matchId) {
          const updatedSegments = (m.segments || []).map(seg => {
            const pidsA = lineupsA[seg.segmentKey] || [];
            const pidsB = lineupsB[seg.segmentKey] || [];
            return {
              ...seg,
              playerIdsA: pidsA,
              playerIdsB: pidsB,
              status: 'pending' as const
            };
          });

          return {
            ...m,
            segments: updatedSegments,
            lineupLocked: true,
            status: 'ready' as const,
            scoreA: 0,
            scoreB: 0,
            activeSegmentIndex: 0,
            updatedAt: new Date().toISOString()
          };
        }
        return m;
      });

      return {
        ...prev,
        matches: updatedMatches
      };
    });

    addToast('Đội hình của 2 đội đã hợp lệ và được khóa thi đấu!', 'success');
    return { valid: true, errors: [] };
  };

  const addScorePoint = (matchId: string, scoringTeamId: string) => {
    setDb(prev => {
      const match = prev.matches.find(m => m.id === matchId);
      if (!match) return prev;

      const teamA = prev.teams.find(t => t.id === match.teamAId);
      const teamB = prev.teams.find(t => t.id === match.teamBId);
      const scoringTeam = teamA?.id === scoringTeamId ? teamA : teamB;

      const updated = applyScoreEvent(match, scoringTeamId);

      if (updated.status === 'completed') {
        const winnerName = updated.winnerTeamId === teamA?.id ? teamA?.name : teamB?.name;
        addToast(`Trận đấu kết thúc! ${winnerName} giành chiến thắng với tỉ số ${updated.scoreA}-${updated.scoreB}!`, 'success');
      } else if (updated.status === 'segment_break') {
        const nextSegIdx = updated.activeSegmentIndex || 0;
        const currentSeg = updated.segments?.[nextSegIdx - 1];
        addToast(`Chặng ${currentSeg?.name} Hoàn Thành! Đạt mốc chạm ${currentSeg?.targetScore} điểm. Vui lòng ĐỔI SÂN!`, 'warning');
      } else {
        addToast(`+1 điểm cho ${scoringTeam?.name}! Tỉ số hiện tại: ${updated.scoreA} - ${updated.scoreB}`, 'info');
      }

      return {
        ...prev,
        matches: prev.matches.map(m => (m.id === matchId ? updated : m))
      };
    });
  };

  const undoLatestScorePoint = (matchId: string) => {
    setDb(prev => {
      const match = prev.matches.find(m => m.id === matchId);
      if (!match) return prev;

      const updated = logicUndoLatestScorePoint(match);
      addToast(`Đã Undo điểm số gần nhất! Tỉ số trả về: ${updated.scoreA} - ${updated.scoreB}`, 'info');

      return {
        ...prev,
        matches: prev.matches.map(m => (m.id === matchId ? updated : m))
      };
    });
  };

  const startNextSegment = (matchId: string) => {
    setDb(prev => {
      const match = prev.matches.find(m => m.id === matchId);
      if (!match) return prev;

      const updated = { ...match };
      const activeIdx = updated.activeSegmentIndex || 0;
      if (updated.segments && updated.segments[activeIdx]) {
        updated.segments[activeIdx].status = 'running' as const;
        updated.status = 'ongoing' as const;
      }

      addToast(`Đã bắt đầu Chặng ${updated.segments?.[activeIdx]?.name}! Đang thi đấu...`, 'success');

      return {
        ...prev,
        matches: prev.matches.map(m => (m.id === matchId ? updated : m))
      };
    });
  };

  const resolveTieManually = (groupId: string, teamIdsInOrder: string[], reason: string) => {
    setDb(prev => {
      const updatedGroups = prev.groups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            manualRanking: teamIdsInOrder,
            manualRankingReason: reason,
            updatedAt: new Date().toISOString()
          };
        }
        return g;
      });

      return {
        ...prev,
        groups: updatedGroups
      };
    });

    addToast('Hệ thống đã cập nhật phân định thứ tự xếp hạng thủ công từ Ban Tổ Chức!', 'success');
  };

  const resetToFactoryDefaults = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('golab_pickleball_db_v1');
    }
    setDb(getInitialState());
    setToasts([]);
    addToast('Hệ thống đã được thiết lập lại về dữ liệu mẫu mặc định!', 'info');
  };

  return (
    <TournamentContext.Provider
      value={{
        state: db,
        toasts,
        addToast,
        removeToast,
        setCurrentUserRole,
        updateTournament,
        addAthlete,
        updateAthlete,
        deleteAthlete,
        bulkImportAthletes,
        addTeam,
        updateTeam,
        deleteTeam,
        removeAthleteFromTeam,
        addAthleteToTeam,
        addGroup,
        deleteGroup,
        addMatch,
        updateMatch,
        deleteMatch,
        generateMatchesForGroup,
        resetAllGroupMatches,
        performAutomaticTeamDraw,
        drawMatchSegmentOrder,
        submitMatchLineups,
        addScorePoint,
        undoLatestScorePoint,
        startNextSegment,
        resolveTieManually,
        resetToFactoryDefaults
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
