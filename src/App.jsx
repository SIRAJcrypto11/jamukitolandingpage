import './App.css'
import { Suspense, lazy } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'

const Katalog = lazy(() => import('./pages/Katalog'))

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const LoadingFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Loading">
    <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      {/* Lazy-loaded Katalog — both /Katalog (legacy) and /katalog (QR) */}
      <Route path="/Katalog" element={
        <Suspense fallback={<LoadingFallback />}>
          <LayoutWrapper currentPageName="Katalog">
            <Katalog />
          </LayoutWrapper>
        </Suspense>
      } />
      <Route path="/katalog" element={
        <Suspense fallback={<LoadingFallback />}>
          <LayoutWrapper currentPageName="Katalog">
            <Katalog />
          </LayoutWrapper>
        </Suspense>
      } />
      {/* Redirect all other routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthenticatedApp />
      </Router>
    </QueryClientProvider>
  )
}

export default App
