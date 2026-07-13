import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Component, ReactNode } from 'react';
import { AppProvider } from './context/AppContext';
import BottomNav from './components/BottomNav';
import RecordPage from './pages/RecordPage';
import NodeConfirmPage from './pages/NodeConfirmPage';
import AIAnalyzingPage from './pages/AIAnalyzingPage';
import EchoRecommendPage from './pages/EchoRecommendPage';
import NewNodeConfirmPage from './pages/NewNodeConfirmPage';
import LifelineReviewPage from './pages/LifelineReviewPage';
import LifelineOverviewPage from './pages/LifelineOverviewPage';
import BookDetailPage from './pages/BookDetailPage';
import SourcesPage from './pages/SourcesPage';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            页面出了点问题
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              borderRadius: '20px',
              backgroundColor: 'var(--blue)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        页面不存在
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '10px 24px',
          borderRadius: '20px',
          backgroundColor: 'var(--blue)',
          color: 'white',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        回到首页
      </button>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const hideBottomNav = location.pathname === '/ai-analyzing' || location.pathname.startsWith('/book-detail');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--fill-primary)' }}>
      <Routes>
        <Route path="/" element={<RecordPage />} />
        <Route path="/confirm-node" element={<NodeConfirmPage />} />
        <Route path="/ai-analyzing" element={<AIAnalyzingPage />} />
        <Route path="/echo-recommend" element={<EchoRecommendPage />} />
        <Route path="/new-node-confirm" element={<NewNodeConfirmPage />} />
        <Route path="/lifeline-review" element={<LifelineReviewPage />} />
        <Route path="/lifeline" element={<LifelineOverviewPage />} />
        <Route path="/book-detail/:bookTitle" element={<BookDetailPage />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </BrowserRouter>
    </AppProvider>
  );
}
