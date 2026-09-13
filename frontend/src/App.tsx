import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme as antTheme } from 'antd';
import { ThemeProvider } from './theme/ThemeProvider';
import { useTheme } from './theme/useTheme';
import { I18nProvider } from './i18n/I18nProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lightTokens, darkTokens, radius } from './theme/tokens';

import { AppShell } from './components/layout/AppShell';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ComplaintsPage from './pages/ComplaintsPage';
import SubmitComplaintPage from './pages/SubmitComplaintPage';
import ComplaintDetailsPage from './pages/ComplaintDetailsPage';
import MapPage from './pages/MapPage';
import SettingsPage from './pages/SettingsPage';
import { PublicTrackPage } from './pages/PublicTrackPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
      refetchOnWindowFocus: false,
    },
  },
});


import { LoginPage } from './pages/LoginPage';
import { CitizenPortal } from './pages/CitizenPortal';
import { OfficerPortal } from './pages/OfficerPortal';
import { AdminPortal } from './pages/AdminPortal';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function AppContent() {
  const { isDark } = useTheme();
  const palette = isDark ? darkTokens : lightTokens;

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: palette.primary,
          colorBgBase: palette.background,
          colorBgContainer: palette.surface,
          colorBgElevated: palette.elevated,
          colorBorder: palette.border,
          colorBorderSecondary: palette.border,
          colorTextBase: palette.text,
          colorTextSecondary: palette.muted,
          fontFamily: "'IBM Plex Sans', sans-serif",
          borderRadius: radius,
          wireframe: false,
        },
        components: {
          Table: {
            colorBgContainer: palette.surface,
            headerBg: palette.elevated,
            headerColor: palette.muted,
            borderColor: palette.border,
            rowHoverBg: palette.background,
          },
          Select: {
            colorBgContainer: palette.surface,
            colorBorder: palette.border,
            optionSelectedBg: palette.background,
          },
          Card: {
            colorBgContainer: palette.surface,
            colorBorderSecondary: palette.border,
          },
          Modal: {
            contentBg: palette.elevated,
            headerBg: palette.elevated,
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/citizen" element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <CitizenPortal />
                </ProtectedRoute>
              } />
              <Route path="/officer" element={
                <ProtectedRoute allowedRoles={['officer']}>
                  <OfficerPortal />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPortal />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/complaints/:id" element={<ComplaintDetailsPage />} />
              <Route path="/submit" element={
                <ProtectedRoute allowedRoles={['citizen']}>
                  <SubmitComplaintPage />
                </ProtectedRoute>
              } />
              <Route path="/map" element={<MapPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/public-tracker" element={<PublicTrackPage />} />
              <Route path="/public-tracker/:token" element={<PublicTrackPage />} />
              <Route path="/track/:token" element={<PublicTrackPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

import { APIProvider } from '@vis.gl/react-google-maps';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

import { RoleProvider } from './context/RoleContext';

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <RoleProvider>
          <APIProvider apiKey={MAPS_API_KEY} libraries={['places']}>
            <AppContent />
          </APIProvider>
        </RoleProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
