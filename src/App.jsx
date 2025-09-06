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
    <Router>
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