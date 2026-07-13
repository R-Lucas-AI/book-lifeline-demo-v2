import { useLocation, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

type TabType = 'record' | 'lifeline' | 'sources';

const allTabs: { id: TabType; label: string; path: string }[] = [
  { id: 'record', label: '记录', path: '/' },
  { id: 'lifeline', label: '书脉', path: '/lifeline' },
  { id: 'sources', label: '来源', path: '/sources' },
];

// SF Symbol 风格图标 — fill 变体，用于 Tab Bar
// 遵循 HIG: Tab Bar 优先使用 fill variant
function TabIcon({ id, isActive }: { id: TabType; isActive: boolean }) {
  const strokeWidth = 1.5;
  const color = isActive ? 'var(--blue)' : 'var(--text-quinary)';

  if (id === 'record') {
    // square.and.pencil — 准确表达"记录/书写"
    // SF Symbols 风格：fill 变体用于选中状态
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: color, transition: 'all 0.25s ease' }}>
        {isActive ? (
          <>
            {/* fill 变体：实心矩形 + 铅笔 */}
            <path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4z" fill={color} stroke="none" />
            <path d="M16 2H8a2 2 0 0 0-2 2v2h12V4a2 2 0 0 0-2-2z" fill={color} stroke="none" />
            <path d="M14.5 10.5l4-4 1.5 1.5-4 4z" fill="#fff" stroke="none" />
            <path d="M13 12l5-5" stroke="#fff" strokeWidth="1.5" />
          </>
        ) : (
          <>
            {/* outline 变体：线框矩形 + 铅笔 */}
            <path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4z" />
            <path d="M16 2H8a2 2 0 0 0-2 2v2h12V4a2 2 0 0 0-2-2z" />
            <line x1="8" y1="10" x2="14" y2="10" />
            <line x1="8" y1="14" x2="12" y2="14" />
          </>
        )}
      </svg>
    );
  }

  if (id === 'lifeline') {
    // point.trianglepathconnected — 准确表达"连接/网络/关系"
    // 三个点 + 连接线 = 书脉的核心隐喻
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: color, transition: 'all 0.25s ease' }}>
        {isActive ? (
          <>
            {/* fill 变体：实心圆点 + 连接线 */}
            <circle cx="6" cy="6" r="3" fill={color} stroke="none" />
            <circle cx="6" cy="18" r="3" fill={color} stroke="none" />
            <circle cx="18" cy="12" r="3" fill={color} stroke="none" />
            <path d="M6 9v9" strokeWidth="2" />
            <path d="M8.5 7.5c4 1 7.5 2 9.5 3" strokeWidth="2" />
            <path d="M8.5 16.5c4-1 7.5-2 9.5-3" strokeWidth="2" />
          </>
        ) : (
          <>
            {/* outline 变体：空心圆点 + 连接线 */}
            <circle cx="6" cy="6" r="2" />
            <circle cx="6" cy="18" r="2" />
            <circle cx="18" cy="12" r="2" />
            <path d="M6 8v8" />
            <path d="M8 7c4 1 7.5 2 10 3" />
            <path d="M8 17c4-1 7.5-2 10-3" />
          </>
        )}
      </svg>
    );
  }

  if (id === 'sources') {
    // book.closed — 准确表达"书籍/来源/资源"
    // 比 archive.box 更贴切，因为来源页主要是书
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: color, transition: 'all 0.25s ease' }}>
        {isActive ? (
          <>
            {/* fill 变体：合上的书，实心 */}
            <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5z" fill={color} stroke="none" />
            <path d="M8 3v18" stroke="#fff" strokeWidth="0.5" strokeOpacity="0.3" />
            <circle cx="10" cy="13" r="1" fill="#fff" stroke="none" />
            <circle cx="15" cy="13" r="1" fill="#fff" stroke="none" />
          </>
        ) : (
          <>
            {/* outline 变体：合上的书，线框 */}
            <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5z" />
            <path d="M8 3v18" />
            <circle cx="10" cy="13" r="1" />
            <circle cx="15" cy="13" r="1" />
          </>
        )}
      </svg>
    );
  }

  return null;
}

export default function BottomNav() {
  const location = useLocation();
  const { booklifelineInputs, confirmedRelations } = useApp();

  const hasAnyInput = booklifelineInputs.length > 0;
  const hasAnyRelation = confirmedRelations.length > 0;

  const getVisibleTabs = (): TabType[] => {
    const tabs: TabType[] = ['record'];
    if (hasAnyInput) {
      tabs.push('sources');
    }
    if (hasAnyRelation) {
      tabs.push('lifeline');
    }
    return tabs;
  };

  const visibleTabs = getVisibleTabs();
  const tabs = allTabs.filter(t => visibleTabs.includes(t.id));

  const getActiveTab = (): TabType | null => {
    if (location.pathname === '/' || location.pathname.startsWith('/analyze') ||
        location.pathname.startsWith('/confirm') || location.pathname.startsWith('/echo') ||
        location.pathname.startsWith('/new-node') || location.pathname.startsWith('/lifeline-review')) {
      return 'record';
    }
    if (location.pathname.startsWith('/lifeline') || location.pathname.startsWith('/book-detail')) {
      return 'lifeline';
    }
    if (location.pathname.startsWith('/sources')) {
      return 'sources';
    }
    return null;
  };

  const activeTab = getActiveTab();

  const navWidth = visibleTabs.length === 1
    ? '120px'
    : visibleTabs.length === 2
      ? '220px'
      : 'min(100% - 32px, 340px)';

  return (
    <nav
      aria-label="主导航"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: navWidth,
        padding: '6px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '0.5px solid rgba(255, 255, 255, 0.6)',
        borderRadius: '28px',
        boxShadow:
          '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06), inset 0 0.5px 0 rgba(255, 255, 255, 0.7)',
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
        transition: 'width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          gap: '8px',
          padding: '0 8px',
        }}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.path}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                gap: '3px',
                minWidth: '64px',
                padding: '6px 10px 4px',
                borderRadius: '18px',
                transition: 'all 0.25s ease',
                backgroundColor: isActive ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
              }}
            >
              <div style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TabIcon id={tab.id} isActive={isActive} />
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--blue)' : 'var(--text-quinary)',
                  transition: 'color 0.25s ease',
                  lineHeight: '1',
                  letterSpacing: '-0.05px',
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
