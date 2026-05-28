/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TournamentProvider } from './context/TournamentContext';
import PageLayout from './components/PageLayout';
import DashboardScreen from './components/DashboardScreen';
import AthleteManagementScreen from './components/AthleteManagementScreen';
import TeamManagementScreen from './components/TeamManagementScreen';
import GroupManagementScreen from './components/GroupManagementScreen';
import MatchManagementScreen from './components/MatchManagementScreen';
import StandingsScreen from './components/StandingsScreen';
import KnockoutScreen from './components/KnockoutScreen';
import SettingsScreen from './components/SettingsScreen';
import PublicScreen from './components/PublicScreen';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Modal controls that can be triggered from dashboard quick actions
  const [athleteModalOpen, setAthleteModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  // Render active section based on tab ID
  const renderScreen = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardScreen
            setCurrentTab={setCurrentTab}
            openAddAthleteModal={() => {
              setCurrentTab('athletes');
              setAthleteModalOpen(true);
            }}
            openAddTeamModal={() => {
              setCurrentTab('teams');
              setTeamModalOpen(true);
            }}
          />
        );
      case 'athletes':
        return (
          <AthleteManagementScreen
            athleteModalOpen={athleteModalOpen}
            setAthleteModalOpen={setAthleteModalOpen}
          />
        );
      case 'teams':
        return (
          <TeamManagementScreen
            teamModalOpen={teamModalOpen}
            setTeamModalOpen={setTeamModalOpen}
          />
        );
      case 'groups':
        return <GroupManagementScreen />;
      case 'matches':
        return <MatchManagementScreen />;
      case 'standings':
        return <StandingsScreen />;
      case 'knockout':
        return <KnockoutScreen setCurrentTab={setCurrentTab} />;
      case 'settings':
        return <SettingsScreen />;
      case 'public':
        return <PublicScreen />;
      default:
        return (
          <DashboardScreen
            setCurrentTab={setCurrentTab}
            openAddAthleteModal={() => {
              setCurrentTab('athletes');
              setAthleteModalOpen(true);
            }}
            openAddTeamModal={() => {
              setCurrentTab('teams');
              setTeamModalOpen(true);
            }}
          />
        );
    }
  };

  return (
    <TournamentProvider>
      <PageLayout currentTab={currentTab} setCurrentTab={setCurrentTab}>
        <div id="active-screen-content" className="w-full">
          {renderScreen()}
        </div>
      </PageLayout>
    </TournamentProvider>
  );
}
