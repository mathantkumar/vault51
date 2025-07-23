import React, { useState, useEffect, useRef } from 'react';

// --- Google Fonts: Kumbh Sans ---
const KUMBH_FONT_URL = 'https://fonts.googleapis.com/css2?family=Kumbh+Sans:wght@400;600;700&display=swap';

// --- Types ---
type Page = {
  id: string;
  title: string;
  content: string;
};

type Theme = {
  name: string;
  accent: string;
  accentHex: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  paleBg: string;
};

const THEMES: Theme[] = [
  { name: 'Blue', accent: 'blue', accentHex: '#3B82F6', accentBg: 'bg-blue-600', accentBorder: 'border-blue-400', accentText: 'text-blue-700', paleBg: 'bg-blue-50' },
  { name: 'Green', accent: 'green', accentHex: '#10B981', accentBg: 'bg-green-600', accentBorder: 'border-green-400', accentText: 'text-green-700', paleBg: 'bg-green-50' },
  { name: 'Purple', accent: 'purple', accentHex: '#8B5CF6', accentBg: 'bg-purple-600', accentBorder: 'border-purple-400', accentText: 'text-purple-700', paleBg: 'bg-purple-50' },
  { name: 'Orange', accent: 'orange', accentHex: '#F59E42', accentBg: 'bg-orange-500', accentBorder: 'border-orange-400', accentText: 'text-orange-700', paleBg: 'bg-orange-50' },
];
const THEME_KEY = 'notionlite_theme';
const STORAGE_KEY = 'notionlite_pages';
function loadPages(): Page[] { try { const data = localStorage.getItem(STORAGE_KEY); return data ? JSON.parse(data) : []; } catch { return []; } }
function savePages(pages: Page[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(pages)); }
function loadTheme(): Theme { const name = localStorage.getItem(THEME_KEY); return THEMES.find(t => t.name === name) || THEMES[0]; }
function saveTheme(theme: Theme) { localStorage.setItem(THEME_KEY, theme.name); }
function renderMarkdown(md: string): string {
  let html = md
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\s*\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>[^<]*<\/li>(?:<br\/>)*?)+/g, match => `<ul class="list-disc pl-6 my-2">${match.replace(/<br\/>/g, '')}</ul>`);
  html = html.replace(/\n/g, '<br/>');
  return html;
}

// --- Modular Card for Page List ---
const PageCard: React.FC<{
  page: Page;
  selected: boolean;
  accentBorder: string;
  accentText: string;
  paleBg: string;
  onClick: () => void;
  onDelete: () => void;
}> = ({ page, selected, accentBorder, accentText, paleBg, onClick, onDelete }) => (
  <div
    className={`rounded-lg shadow-sm mb-2 transition cursor-pointer border bg-white flex items-center group ${selected ? `${accentBorder} ${paleBg}` : 'border-gray-200 hover:bg-gray-50'}`}
    style={{ fontFamily: 'Kumbh Sans, sans-serif' }}
    onClick={onClick}
  >
    <button
      className={`flex-1 text-left px-4 py-3 font-semibold truncate ${selected ? accentText : 'text-gray-800'}`}
      style={{ fontFamily: 'Kumbh Sans, sans-serif', background: 'none', border: 'none' }}
      tabIndex={-1}
    >
      {page.title || <span className="italic text-gray-400">Untitled</span>}
    </button>
    <button
      className="ml-2 text-xs text-red-500 hover:text-red-700 px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={e => { e.stopPropagation(); onDelete(); }}
      title="Delete page"
      style={{ fontFamily: 'Kumbh Sans, sans-serif' }}
    >
      &times;
    </button>
  </div>
);

// --- Main Component ---
const NotionLite: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [theme, setTheme] = useState<Theme>(THEMES[0]);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loaded = loadPages();
    setPages(loaded);
    if (loaded.length > 0) setActiveId(loaded[0].id);
    setTheme(loadTheme());
  }, []);
  useEffect(() => { savePages(pages); }, [pages]);
  useEffect(() => { saveTheme(theme); }, [theme]);
  useEffect(() => {
    const page = pages.find(p => p.id === activeId);
    setEditingTitle(page?.title || '');
    setEditingContent(page?.content || '');
    setIsEditing(false);
  }, [activeId, pages]);

  function handleNewPage() {
    const id = Date.now().toString();
    const newPage: Page = { id, title: 'Untitled', content: '' };
    setPages([newPage, ...pages]);
    setActiveId(id);
    setIsEditing(true);
    setEditingTitle('Untitled');
    setEditingContent('');
    setTimeout(() => contentRef.current?.focus(), 100);
  }
  function handleDeletePage(id: string) {
    const idx = pages.findIndex(p => p.id === id);
    const newPages = pages.filter(p => p.id !== id);
    setPages(newPages);
    if (activeId === id) {
      if (newPages.length > 0) setActiveId(newPages[Math.max(0, idx - 1)].id);
      else setActiveId(null);
    }
  }
  function handleSavePage() {
    setPages(pages.map(p => p.id === activeId ? { ...p, title: editingTitle, content: editingContent } : p));
    setIsEditing(false);
  }
  function handleEditPage() {
    setIsEditing(true);
    setTimeout(() => contentRef.current?.focus(), 100);
  }
  function insertAtCursor(before: string, after: string = '', field: 'title' | 'content' = 'content') {
    const ref = field === 'title' ? null : contentRef.current;
    let value = field === 'title' ? editingTitle : editingContent;
    let selectionStart = ref ? ref.selectionStart : value.length;
    let selectionEnd = ref ? ref.selectionEnd : value.length;
    const selected = value.substring(selectionStart, selectionEnd);
    const newValue = value.substring(0, selectionStart) + before + selected + after + value.substring(selectionEnd);
    if (field === 'title') setEditingTitle(newValue);
    else setEditingContent(newValue);
    if (ref) {
      setTimeout(() => {
        ref.selectionStart = ref.selectionEnd = selectionStart + before.length + selected.length + after.length;
        ref.focus();
      }, 0);
    }
  }
  function handleThemeChange(next: Theme) { setTheme(next); }
  function handleSignOut() { window.location.reload(); }
  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setEditingContent(e.target.value);
    setPages(pages => pages.map(p => p.id === activeId ? { ...p, content: e.target.value, title: editingTitle } : p));
  }

  return (
    <>
      <link href={KUMBH_FONT_URL} rel="stylesheet" />
      <div className={`min-h-screen flex flex-col md:flex-row font-sans ${theme.paleBg}`} style={{ fontFamily: 'Kumbh Sans, sans-serif' }}>
        {/* Sidebar */}
        <aside className={`w-full md:w-64 bg-white border-r ${theme.accentBorder} flex flex-col gap-2 md:min-h-screen px-0 py-0`}>
          <div className="flex flex-col items-center py-6 border-b border-gray-100 mb-2">
            <button className={`${theme.accentBg} text-white font-semibold hover:brightness-90 transition px-4 py-2 rounded-lg w-5/6`} onClick={handleNewPage} style={{ fontFamily: 'Kumbh Sans, sans-serif' }}>+ New Page</button>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 pb-4">
            {pages.length === 0 ? (
              <div className="text-gray-400 text-sm text-center mt-8">No pages yet.</div>
            ) : (
              <ul className="space-y-1">
                {pages.map(page => (
                  <li key={page.id}>
                    <PageCard
                      page={page}
                      selected={activeId === page.id}
                      accentBorder={theme.accentBorder}
                      accentText={theme.accentText}
                      paleBg={theme.paleBg}
                      onClick={() => setActiveId(page.id)}
                      onDelete={() => handleDeletePage(page.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 p-0 md:p-8 flex flex-col max-w-full w-full">
          {/* Top Bar: Theme Switcher & Sign Out */}
          <div className="flex items-center justify-between mb-6 px-6 pt-6">
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${theme.accentText}`}>Theme:</span>
              <div className="flex gap-1">
                {THEMES.map(t => (
                  <button
                    key={t.name}
                    className={`w-6 h-6 rounded-full border-2 ${t.accentBorder} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${t.accent}-400`}
                    style={{ background: t.accentHex, borderColor: t.name === theme.name ? t.accentHex : undefined, outline: t.name === theme.name ? `2px solid ${t.accentHex}` : undefined }}
                    aria-label={t.name}
                    onClick={() => handleThemeChange(t)}
                  />
                ))}
              </div>
            </div>
            <button className={`px-3 py-1 rounded ${theme.accentBg} text-white font-semibold hover:brightness-90 transition`} onClick={handleSignOut} style={{ fontFamily: 'Kumbh Sans, sans-serif' }}>Sign Out</button>
          </div>
          {activeId ? (
            <div className={`flex flex-col gap-4 min-h-[60vh] ${theme.paleBg} border ${theme.accentBorder} rounded-lg mx-6 mb-8 p-6`}>
              {/* Title */}
              {isEditing ? (
                <input
                  className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 bg-gray-50"
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { handleSavePage(); } }}
                  onBlur={handleSavePage}
                  style={{ fontFamily: 'Kumbh Sans, sans-serif' }}
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Kumbh Sans, sans-serif' }} onClick={() => setIsEditing(true)}>{editingTitle}</h1>
              )}
              {/* Toolbar */}
              {isEditing && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  <button className={`px-2 py-1 rounded ${theme.paleBg} hover:${theme.accentBg} hover:text-white text-gray-700`} title="Bold" onClick={() => insertAtCursor('**', '**')} style={{ fontFamily: 'Kumbh Sans, sans-serif' }}>B</button>
                  <button className={`px-2 py-1 rounded ${theme.paleBg} hover:${theme.accentBg} hover:text-white text-gray-700 italic`} title="Italic" onClick={() => insertAtCursor('*', '*')} style={{ fontFamily: 'Kumbh Sans, sans-serif' }}>I</button>
                  <button className={`px-2 py-1 rounded ${theme.paleBg} hover:${theme.accentBg} hover:text-white text-gray-700 font-bold`} title="H1" onClick={() => insertAtCursor('# ', '', 'content')} style={{ fontFamily: 'Kumbh Sans, sans-serif' }}>H1</button>
                  <button className={`px-2 py-1 rounded ${theme.paleBg} hover:${theme.accentBg} hover:text-white text-gray-700 font-semibold`} title="H2" onClick={() => insertAtCursor('## ', '', 'content')} style={{ fontFamily: 'Kumbh Sans, sans-serif' }}>H2</button>
                  <button className={`px-2 py-1 rounded ${theme.paleBg} hover:${theme.accentBg} hover:text-white text-gray-700 font-medium`} title="H3" onClick={() => insertAtCursor('### ', '', 'content')} style={{ fontFamily: 'Kumbh Sans, sans-serif' }}>H3</button>
                  <button className={`px-2 py-1 rounded ${theme.paleBg} hover:${theme.accentBg} hover:text-white text-gray-700`} title="Bullet" onClick={() => insertAtCursor('- ', '', 'content')} style={{ fontFamily: 'Kumbh Sans, sans-serif' }}>•</button>
                </div>
              )}
              {/* Content */}
              <textarea
                ref={contentRef}
                className="flex-1 w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-800 bg-white resize-y min-h-[200px] text-base"
                value={editingContent}
                onChange={handleContentChange}
                placeholder="Write your notes here..."
                style={{ fontFamily: 'Kumbh Sans, sans-serif' }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 italic text-lg" style={{ fontFamily: 'Kumbh Sans, sans-serif' }}>
              Select or create a page to begin.
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default NotionLite; 