import React, { useEffect, useState, useCallback } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  DocumentData,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

// Extend Window interface for recaptchaVerifier
declare global {
  interface Window {
    recaptchaVerifier?: any;
  }
}

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only once
if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  if (typeof window !== 'undefined') {
    // Only initialize analytics in the browser
    try {
      // Dynamically import getAnalytics to avoid SSR issues
      import('firebase/analytics').then(({ getAnalytics }) => {
        getAnalytics(app);
      });
    } catch (e) {
      // Analytics not supported or failed to load
    }
  }
}
const db = getFirestore();
const auth = getAuth();

// --- Auth Providers ---
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');

// --- Auth UI ---
const AuthUI: React.FC<{ onPhoneSent: (confirmationResult: any) => void }> = ({ onPhoneSent }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignIn = async () => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, microsoftProvider);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handlePhoneSend = async () => {
    setError(null);
    try {
      if (!window.recaptchaVerifier) {
        // @ts-ignore
        window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', { size: 'invisible' }, auth);
      }
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phone, appVerifier);
      setConfirmationResult(result);
      onPhoneSent(result);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handlePhoneVerify = async () => {
    setError(null);
    try {
      if (confirmationResult) {
        await confirmationResult.confirm(code);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-12 p-6 bg-white rounded shadow border flex flex-col gap-4">
      <h2 className="text-lg font-bold mb-2">Sign in to Vault51</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {/* Email/Password */}
      <div className="flex flex-col gap-2">
        <input className="border p-2 rounded" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="border p-2 rounded" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="bg-blue-600 text-white rounded px-4 py-2 mt-1" onClick={handleEmailSignIn}>Sign in with Email</button>
      </div>
      <div className="flex flex-col gap-2">
        <button className="bg-red-500 text-white rounded px-4 py-2" onClick={handleGoogleSignIn}>Sign in with Google</button>
        <button className="bg-blue-800 text-white rounded px-4 py-2" onClick={handleMicrosoftSignIn}>Sign in with Microsoft</button>
      </div>
      {/* Phone */}
      <div className="flex flex-col gap-2">
        <input className="border p-2 rounded" type="tel" placeholder="Phone (+1234567890)" value={phone} onChange={e => setPhone(e.target.value)} />
        {!confirmationResult ? (
          <button className="bg-green-600 text-white rounded px-4 py-2" onClick={handlePhoneSend}>Send Code</button>
        ) : (
          <>
            <input className="border p-2 rounded" type="text" placeholder="Verification code" value={code} onChange={e => setCode(e.target.value)} />
            <button className="bg-green-700 text-white rounded px-4 py-2" onClick={handlePhoneVerify}>Verify Code</button>
          </>
        )}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

// --- Types ---
type Note = {
  id: string;
  content: string;
  lastModifiedBy: string;
  lastModifiedById: string;
  timestamp: any;
};

type UserInfo = {
  uid: string;
  label: 'User A' | 'User B';
};

// --- User Indicator ---
const UserIndicator: React.FC<{ user: UserInfo | null }> = ({ user }) => (
  <span
    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold shadow-md
      ${user?.label === 'User A' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-purple-100 text-purple-700 border border-purple-300'}`}
  >
    {user?.label || '...'}
  </span>
);

// --- Note Item ---
const NoteItem: React.FC<{
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  currentUser: UserInfo | null;
}> = ({ note, isSelected, onSelect, onDelete, currentUser }) => (
  <div
    className={`flex items-center justify-between p-3 mb-2 rounded-md cursor-pointer border transition
      ${isSelected ? 'bg-white border-blue-400 shadow-md' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}
      ${note.lastModifiedBy === 'User A' ? 'border-l-4 border-blue-400' : 'border-l-4 border-purple-400'}`}
    onClick={onSelect}
  >
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-gray-800 truncate">
        {note.content ? note.content.slice(0, 32) + (note.content.length > 32 ? '…' : '') : <span className="italic text-gray-400">(Empty note)</span>}
      </div>
      <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
        Last by <span className={note.lastModifiedBy === 'User A' ? 'text-blue-600' : 'text-purple-600'}>{note.lastModifiedBy}</span>
      </div>
    </div>
    {currentUser && note.lastModifiedById === currentUser.uid && (
      <button
        className="ml-3 px-2 py-1 text-xs rounded bg-red-100 text-red-600 hover:bg-red-200 border border-red-200"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        title="Delete note"
      >
        Delete
      </button>
    )}
  </div>
);

// --- Note List ---
const NoteList: React.FC<{
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  currentUser: UserInfo | null;
}> = ({ notes, selectedId, onSelect, onNew, onDelete, currentUser }) => (
  <div className="h-full flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-700">Notes</h2>
      <button
        className="px-3 py-1 rounded bg-blue-100 text-blue-700 font-medium hover:bg-blue-200 border border-blue-200"
        onClick={onNew}
      >
        + New Note
      </button>
    </div>
    <div className="flex-1 overflow-y-auto pr-1">
      {notes.length === 0 ? (
        <div className="text-gray-400 text-sm text-center mt-8">No notes yet.</div>
      ) : (
        notes.map(note => (
          <NoteItem
            key={note.id}
            note={note}
            isSelected={selectedId === note.id}
            onSelect={() => onSelect(note.id)}
            onDelete={() => onDelete(note.id)}
            currentUser={currentUser}
          />
        ))
      )}
    </div>
  </div>
);

// --- Note Editor ---
const NoteEditor: React.FC<{
  note: Note | null;
  onChange: (content: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  currentUser: UserInfo | null;
}> = ({ note, onChange, onSave, onCancel, isSaving, currentUser }) => {
  if (!note) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 italic">Select or create a note to begin.</div>
    );
  }
  return (
    <div className="flex flex-col h-full">
      <textarea
        className="flex-1 w-full p-4 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-800 bg-white resize-none mb-4 shadow-sm"
        value={note.content}
        onChange={e => onChange(e.target.value)}
        rows={10}
        placeholder="Write your note here..."
      />
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 flex items-center gap-2">
          Last modified by <span className={note.lastModifiedBy === 'User A' ? 'text-blue-600' : 'text-purple-600'}>{note.lastModifiedBy}</span>
          {currentUser && <UserIndicator user={currentUser} />}
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="px-4 py-1 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 border border-blue-700 shadow-md"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---
const App: React.FC = () => {
  // Auth state
  const [user, setUser] = useState<UserInfo | null>(null);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorValue, setEditorValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [phoneConfirmation, setPhoneConfirmation] = useState<any>(null);

  // --- Auth: Listen for sign-in ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, fbUser => {
      setFbUser(fbUser);
      if (fbUser) {
        // Assign User A/B based on UID sort order (for demo)
        const label: 'User A' | 'User B' = fbUser.uid < 'm' ? 'User A' : 'User B';
        setUser({ uid: fbUser.uid, label });
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Firestore: Real-time notes sync ---
  useEffect(() => {
    const q = query(collection(db, 'notes'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const notesArr: Note[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as Partial<Note>;
        return {
          id: docSnap.id,
          content: typeof data.content === 'string' ? data.content : '',
          lastModifiedBy: data.lastModifiedBy === 'User A' || data.lastModifiedBy === 'User B' ? data.lastModifiedBy : 'User A',
          lastModifiedById: typeof data.lastModifiedById === 'string' ? data.lastModifiedById : '',
          timestamp: data.timestamp || null,
        };
      });
      setNotes(notesArr);
      // If selected note was deleted, clear selection
      if (selectedId && !notesArr.find(n => n.id === selectedId)) {
        setSelectedId(null);
        setEditingNote(null);
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line
  }, [selectedId]);

  // --- Select note for editing ---
  const handleSelect = useCallback((id: string) => {
    const note = notes.find(n => n.id === id) || null;
    setSelectedId(id);
    setEditingNote(note);
    setEditorValue(note?.content || '');
  }, [notes]);

  // --- Create new note ---
  const handleNew = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    const docRef = await addDoc(collection(db, 'notes'), {
      content: '',
      lastModifiedBy: user.label,
      lastModifiedById: user.uid,
      timestamp: serverTimestamp(),
    });
    setSelectedId(docRef.id);
    setEditingNote({
      id: docRef.id,
      content: '',
      lastModifiedBy: user.label,
      lastModifiedById: user.uid,
      timestamp: new Date(),
    });
    setEditorValue('');
    setIsSaving(false);
  }, [user]);

  // --- Delete note ---
  const handleDelete = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'notes', id));
  }, []);

  // --- Cancel editing ---
  const handleCancel = useCallback(() => {
    setSelectedId(null);
    setEditingNote(null);
    setEditorValue('');
  }, []);

  // --- Save note ---
  const handleSave = useCallback(async () => {
    if (!editingNote || !user) return;
    setIsSaving(true);
    await updateDoc(doc(db, 'notes', editingNote.id), {
      content: editorValue,
      lastModifiedBy: user.label,
      lastModifiedById: user.uid,
      timestamp: serverTimestamp(),
    });
    setIsSaving(false);
  }, [editingNote, editorValue, user]);

  // --- Update editor value on note change ---
  useEffect(() => {
    setEditorValue(editingNote?.content || '');
  }, [editingNote]);

  // --- Layout ---
  if (!fbUser) {
    return <AuthUI onPhoneSent={setPhoneConfirmation} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="w-full px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Vault Notes</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">You are:</span>
          <UserIndicator user={user} />
        </div>
      </header>
      <main className="flex-1 flex flex-col md:flex-row max-w-5xl mx-auto w-full h-[80vh] bg-white rounded-lg shadow-lg mt-8 overflow-hidden border border-gray-200">
        {/* Sidebar: Note List */}
        <aside className="w-full md:w-1/3 border-r border-gray-200 bg-gray-50 p-6 overflow-y-auto">
          <NoteList
            notes={notes}
            selectedId={selectedId}
            onSelect={handleSelect}
            onNew={handleNew}
            onDelete={handleDelete}
            currentUser={user}
          />
        </aside>
        {/* Main: Note Editor */}
        <section className="flex-1 p-6 flex flex-col">
          <NoteEditor
            note={editingNote}
            onChange={setEditorValue}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isSaving}
            currentUser={user}
          />
        </section>
      </main>
      <footer className="text-center text-xs text-gray-400 py-4">Vault51 &copy; {new Date().getFullYear()} &mdash; Real-time, collaborative, two-user notes</footer>
    </div>
  );
};

export default App; 