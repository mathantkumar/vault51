import React, { useState, useEffect, useRef } from 'react';

// --- Types ---
type Page = {
  id: string;
  title: string;
  content: string;
};

type Theme = {
  name: string;
  accent: string; // Tailwind color e.g. 'blue'
  accentHex: string; // For pale backgrounds
  accentBg: string; // Tailwind bg class
  accentBorder: string; // Tailwind border class
  accentText: string; // Tailwind text class
  paleBg: string; // Tailwind bg class for pale area
};

const THEMES: Theme[] = [
  {
    name: 'Pastel Sky',
    accent: 'blue',
    accentHex: '#A7C7E7', // Soft sky blue
    accentBg: 'bg-blue-300',
    accentBorder: 'border-blue-200',
    accentText: 'text-blue-700',
    paleBg: 'bg-blue-50',
  },
  {
    name: 'Pastel Lavender',
    accent: 'purple',
    accentHex: '#D6BEF8', // Gentle lavender
    accentBg: 'bg-purple-300',
    accentBorder: 'border-purple-200',
    accentText: 'text-purple-700',
    paleBg: 'bg-purple-50',
  },
  {
    name: 'Pastel Lilac',
    accent: 'lilac',
    accentHex: '#C5A3FF', // Light lilac purple
    accentBg: 'bg-indigo-300',
    accentBorder: 'border-indigo-200',
    accentText: 'text-indigo-700',
    paleBg: 'bg-indigo-50',
  },
  {
    name: 'Pastel Rose',
    accent: 'pink',
    accentHex: '#F8B4CD', // Delicate rose pink
    accentBg: 'bg-pink-300',
    accentBorder: 'border-pink-200',
    accentText: 'text-pink-700',
    paleBg: 'bg-pink-50',
  },
  {
    name: 'Pastel Coral',
    accent: 'coral',
    accentHex: '#FFB6B0', // Soft coral
    accentBg: 'bg-red-300',
    accentBorder: 'border-red-200',
    accentText: 'text-red-700',
    paleBg: 'bg-red-50',
  },
  {
    name: 'Pastel Peach',
    accent: 'orange',
    accentHex: '#FFCBA4', // Soft peach
    accentBg: 'bg-orange-300',
    accentBorder: 'border-orange-200',
    accentText: 'text-orange-700',
    paleBg: 'bg-orange-50',
  },
  {
    name: 'Pastel Lemon',
    accent: 'yellow',
    accentHex: '#FDFD96', // Pale lemon yellow
    accentBg: 'bg-yellow-200',
    accentBorder: 'border-yellow-100',
    accentText: 'text-yellow-700',
    paleBg: 'bg-yellow-50',
  },
  {
    name: 'Pastel Mint',
    accent: 'green',
    accentHex: '#BFFCC6', // Light mint green
    accentBg: 'bg-green-300',
    accentBorder: 'border-green-200',
    accentText: 'text-green-700',
    paleBg: 'bg-green-50',
  },
  {
    name: 'Pastel Sage',
    accent: 'sage',
    accentHex: '#B2AC88', // Muted sage green
    accentBg: 'bg-gray-400', // Using a more muted gray/green for better sage match
    accentBorder: 'border-gray-300',
    accentText: 'text-gray-700',
    paleBg: 'bg-gray-100',
  },
  {
    name: 'Pastel Teal',
    accent: 'teal',
    accentHex: '#A7DBD8', // Muted teal
    accentBg: 'bg-teal-300',
    accentBorder: 'border-teal-200',
    accentText: 'text-teal-700',
    paleBg: 'bg-teal-50',
  },
];
const THEME_KEY = 'notionlite_theme';

// --- Local Storage Helpers ---
const STORAGE_KEY = 'notionlite_pages';
function loadPages(): Page[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}
function savePages(pages: Page[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
}
function loadTheme(): Theme {
  const name = localStorage.getItem(THEME_KEY);
  return THEMES.find(t => t.name === name) || THEMES[0];
}
function saveTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme.name);
}

// --- Markdown to HTML (very basic) ---
function renderMarkdown(md: string): string {
  let html = md
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/^\s*\- (.*$)/gim, '<li>$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[^<]*<\/li>(?:<br\/>)*?)+/g, match => `<ul class="list-disc pl-6 my-2">${match.replace(/<br\/>/g, '')}</ul>`);
  html = html.replace(/\n/g, '<br/>');
  return html;
}

// --- Main Component ---
const NotionLite: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [theme, setTheme] = useState<Theme>(THEMES[0]);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadPages();
    setPages(loaded);
    if (loaded.length > 0) setActiveId(loaded[0].id);
    setTheme(loadTheme());
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    savePages(pages);
  }, [pages]);
  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  // When switching page, update editing fields
  useEffect(() => {
    const page = pages.find(p => p.id === activeId);
    setEditingTitle(page?.title || '');
    setEditingContent(page?.content || '');
    setIsEditing(false);
  }, [activeId, pages]);

  // --- Page Actions ---
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

  // --- Formatting Toolbar ---
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

  // --- Theme Switcher ---
  function handleThemeChange(next: Theme) {
    setTheme(next);
  }

  // --- Sign Out (placeholder) ---
  function handleSignOut() {
    // If integrated with auth, call signOut here
    window.location.reload(); // For now, just reload to simulate sign out
  }

  // --- UI ---
  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans ${theme.paleBg}`} style={{ fontFamily: 'Lexend, sans-serif' }}>
      {/* Sidebar */}
      <aside className={`w-full md:w-64 bg-white border-r ${theme.accentBorder} p-4 flex flex-col gap-4 md:min-h-screen`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className={`text-lg font-bold ${theme.accentText}`}>Pages</h2>
          <button className={`${theme.accentBg} text-white font-semibold hover:brightness-90 transition px-3 py-1 rounded`} onClick={handleNewPage}>+ New Page</button>
        </div>
        <nav className="flex-1 overflow-y-auto">
          {pages.length === 0 ? (
            <div className="text-gray-400 text-sm text-center mt-8">No pages yet.</div>
          ) : (
            <ul className="space-y-1">
              {pages.map(page => (
                <li key={page.id}>
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg transition font-medium truncate ${activeId === page.id ? `${theme.paleBg} ${theme.accentText}` : 'hover:bg-gray-100 text-gray-800'}`}
                    onClick={() => setActiveId(page.id)}
                    style={{ fontFamily: 'Lexend, sans-serif' }}
                  >
                    {page.title || <span className="italic text-gray-400">Untitled</span>}
                  </button>
                  <button
                    className="ml-2 text-xs text-red-500 hover:text-red-700"
                    onClick={() => handleDeletePage(page.id)}
                    title="Delete page"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-4 flex flex-col max-w-3xl mx-auto w-full">
        {/* Top Bar: Theme Switcher & Sign Out */}
        <div className="flex items-center justify-between mb-4">
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
          <button className={`px-3 py-1 rounded ${theme.accentBg} text-white font-semibold hover:brightness-90 transition`} onClick={handleSignOut}>Sign Out</button>
        </div>
        {activeId ? (
          <div className={`rounded-lg shadow p-6 flex flex-col gap-4 min-h-[60vh] ${theme.paleBg} border ${theme.accentBorder}`}> 
            {/* Title */}
            {isEditing ? (
              <input
                className="text-2xl font-bold text-gray-900 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 bg-gray-50"
                value={editingTitle}
                onChange={e => setEditingTitle(e.target.value)}
                style={{ fontFamily: 'Lexend, sans-serif' }}
              />
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Lexend, sans-serif' }}>{editingTitle}</h1>
                <button className={`text-xs ${theme.accentText} hover:underline`} onClick={handleEditPage}>Edit</button>
              </div>
            )}
            {/* Toolbar */}
            {isEditing && (
              <div className="flex gap-2 mb-2 flex-wrap">
                <button className={`px-2 py-1 rounded ${theme.paleBg} hover:${theme.accentBg} hover:text-white text-gray-700`} title="Bold" onClick={() => insertAtCursor('**', '**')}>B</button>
                <button className={`px-2 py-1 rounded ${theme.paleBg} hover:${theme.accentBg} hover:text-white text-gray-700 italic`} title="Italic" onClick={() => insertAtCursor('*', '*')}>I</button>
                <button className={`px-2 py-1 rounded ${theme.paleBg} hover:${theme.accentBg} hover:text-white text-gray-700 font-bold`} title="H1" onClick={() => insertAtCursor('# ', '', 'content')}>H1</button>
                <button className={`px-2 py-1 rounded ${theme.paleBg} hover:${theme.accentBg} hover:text-white text-gray-700 font-semibold`} title="H2" onClick={() => insertAtCursor('## ', '', 'content')}>H2</button>
                <button className={`px-2 py-1 rounded ${theme.paleBg} hover:${theme.accentBg} hover:text-white text-gray-700 font-medium`} title="H3" onClick={() => insertAtCursor('### ', '', 'content')}>H3</button>
                <button className={`px-2 py-1 rounded ${theme.paleBg} hover:${theme.accentBg} hover:text-white text-gray-700`} title="Bullet" onClick={() => insertAtCursor('- ', '', 'content')}>•</button>
                <button className={`px-2 py-1 rounded ${theme.accentBg} text-white hover:brightness-90`} onClick={handleSavePage}>Save</button>
              </div>
            )}
            {/* Content */}
            {isEditing ? (
              <textarea
                ref={contentRef}
                className="flex-1 w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-800 bg-white resize-y min-h-[200px] text-base"
                value={editingContent}
                onChange={e => setEditingContent(e.target.value)}
                placeholder="Write your notes here..."
                style={{ fontFamily: 'Lexend, sans-serif' }}
              />
            ) : (
              <div
                className="prose prose-blue max-w-none text-gray-900"
                style={{ fontFamily: 'Lexend, sans-serif' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(editingContent) }}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 italic text-lg" style={{ fontFamily: 'Lexend, sans-serif' }}>
            Select or create a page to begin.
          </div>
        )}
      </main>
    </div>
  );
};

export default NotionLite; 