import { Layout } from './components/Layout/Layout';
import { CreateTournamentPage } from './pages/CreateTournamentPage';
import { DashboardPage } from './pages/DashboardPage';
import { GameTablePage } from './pages/GameTablePage';
import { LandingPage } from './pages/LandingPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { LearnPage } from './pages/LearnPage';
import { LobbyPage } from './pages/LobbyPage';
import { OpenTablesPage } from './pages/OpenTablesPage';
import { LoginPage } from './pages/LoginPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { useApp } from './state/AppContext';

function CurrentView() {
  const { view } = useApp();

  switch (view) {
    case 'login':
      return <LoginPage />;
    case 'verify':
      return <VerifyEmailPage />;
    case 'dashboard':
      return <DashboardPage />;
    case 'create':
      return <CreateTournamentPage />;
    case 'open-tables':
      return <OpenTablesPage />;
    case 'lobby':
      return <LobbyPage />;
    case 'game':
      return <GameTablePage />;
    case 'leaderboard':
      return <LeaderboardPage />;
    case 'learn':
      return <LearnPage />;
    case 'landing':
    default:
      return <LandingPage />;
  }
}

export default function App() {
  return (
    <Layout>
      <CurrentView />
    </Layout>
  );
}
