import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import SkeletonLoader from './components/SkeletonLoader';

// Lazy load only the heavy components
const LandingPage = lazy(() => import('./components/LandingPage'));
const Recruiter = lazy(() => import('./components/Recruiter'));
const LostKid = lazy(() => import('./components/LostKid'));
const Stalker = lazy(() => import('./components/Stalker')); 
const Investor = lazy(() => import('./components/Investor'));
const TerminalFun = lazy(() => import('./components/cards/Terminal'));
const ShauryaExe = lazy(() => import('./components/cards/ShauryaExe'));

function App() {
  return (
    /*
     * basename, because vite's `base` only rewrites asset URLs. Without this the router would
     * still be matching "/netflix/recruiter" against "/recruiter" and rendering nothing.
     *
     * Read from BASE_URL rather than hardcoded, so the vite config stays the single source of truth.
     *
     * The trailing slash has to come off. BASE_URL is "/netflix/", and the router strips a basename
     * as a literal prefix: "/netflix" does not start with "/netflix/", so the bare route matched
     * nothing and rendered an empty page with no error at all. Deep links worked, which is what made
     * it look fine at first glance.
     */
    <Router basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        <Route 
          path="/" 
          element={
            <Suspense fallback={<SkeletonLoader type="landing" />}>
              <LandingPage />
            </Suspense>
          } 
        />
        <Route 
          path="/recruiter" 
          element={
            <Suspense fallback={<SkeletonLoader />}>
              <Recruiter />
            </Suspense>
          } 
        />
        <Route 
          path="/lost-kid" 
          element={
            <Suspense fallback={<SkeletonLoader />}>
              <LostKid />
            </Suspense>
          } 
        />
        <Route 
          path="/terminal-fun" 
          element={
            <Suspense fallback={<SkeletonLoader />}>
              <TerminalFun />
            </Suspense>
          } 
        />
        <Route 
          path="/shaurya-exe" 
          element={
            <Suspense fallback={<SkeletonLoader />}>
              <ShauryaExe />
            </Suspense>
          } 
        />
        <Route 
          path="/stalker" 
          element={
            <Suspense fallback={<SkeletonLoader />}>
              <Stalker />
            </Suspense>
          } 
        />
        <Route 
          path="/investor" 
          element={
            <Suspense fallback={<SkeletonLoader />}>
              <Investor />
            </Suspense>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;