import React from 'react';
import { HashRouter, Route, Routes } from 'https://esm.sh/react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import AppPage from './pages/AppPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import QuestionPaperPage from './pages/QuestionPaperPage';
import ProfilePage from './pages/ProfilePage';
import GroupQuizPage from './pages/GroupQuizPage';
import CareerGuidancePage from './pages/CareerGuidancePage';
import StudyPlannerPage from './pages/StudyPlannerPage';
import MindMapPage from './pages/MindMapPage';
import GeminiLivePage from './pages/GeminiLivePage';
import VivaPage from './pages/VivaPage';
import AboutPage from './pages/AboutPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import PremiumPage from './pages/PremiumPage';
import VisualExplanationPage from './pages/VisualExplanationPage';
import LiveDebatePage from './pages/LiveDebatePage';
import { ContentProvider } from './contexts/ContentContext';
import ChapterConquestPage from './pages/ChapterConquestPage';
import SearchStatusIndicator from './components/app/SearchStatusIndicator';

const AppContent: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/app" element={
            <ProtectedRoute>
              <AppPage />
            </ProtectedRoute>
          } />
          <Route path="/question-paper" element={
            <ProtectedRoute>
              <QuestionPaperPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/group-quiz" element={
            <ProtectedRoute>
              <GroupQuizPage />
            </ProtectedRoute>
          } />
          <Route path="/career-guidance" element={
            <ProtectedRoute>
              <CareerGuidancePage />
            </ProtectedRoute>
          } />
          <Route path="/study-planner" element={
            <ProtectedRoute>
              <StudyPlannerPage />
            </ProtectedRoute>
          } />
           <Route path="/mind-map" element={
            <ProtectedRoute>
              <MindMapPage />
            </ProtectedRoute>
          } />
           <Route path="/gemini-live" element={
            <ProtectedRoute>
              <GeminiLivePage />
            </ProtectedRoute>
          } />
           <Route path="/viva" element={
            <ProtectedRoute>
              <VivaPage />
            </ProtectedRoute>
          } />
           <Route path="/visual-explanation" element={
            <ProtectedRoute>
              <VisualExplanationPage />
            </ProtectedRoute>
          } />
          <Route path="/live-debate" element={
            <ProtectedRoute>
              <LiveDebatePage />
            </ProtectedRoute>
          } />
           <Route path="/chapter-conquest" element={
            <ProtectedRoute>
              <ChapterConquestPage />
            </ProtectedRoute>
          } />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/premium" element={<PremiumPage />} />
        </Routes>
      </main>
      <Footer />
      <SearchStatusIndicator />
    </div>
  );
};


const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
          <ContentProvider>
            <AppContent />
          </ContentProvider>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;