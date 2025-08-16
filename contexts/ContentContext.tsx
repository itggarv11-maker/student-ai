import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Subject, ClassLevel } from '../types';

export type SearchStatus = 'idle' | 'searching' | 'success' | 'error';
export type PostSearchAction = {
    tool: string;
    navigate: (path: string) => void;
} | null;

interface ContentContextType {
  extractedText: string;
  setExtractedText: (text: string) => void;
  subject: Subject | null;
  setSubject: (subject: Subject | null) => void;
  classLevel: ClassLevel;
  setClassLevel: (level: ClassLevel) => void;
  
  // New state for background search
  searchStatus: SearchStatus;
  searchMessage: string;
  postSearchAction: PostSearchAction;
  setPostSearchAction: (action: PostSearchAction) => void;
  
  // New state to manage session lifecycle and fix bugs
  hasSessionStarted: boolean;
  
  startBackgroundSearch: (searchFn: () => Promise<string>) => void;
  startSessionWithContent: (text: string) => void;
  resetContent: () => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const useContent = (): ContentContextType => {
  const context = useContext(ContentContext);
  if (context === undefined) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};

interface ContentProviderProps {
  children: ReactNode;
}

export const ContentProvider: React.FC<ContentProviderProps> = ({ children }) => {
  const [extractedText, setExtractedText] = useState<string>('');
  const [subject, setSubject] = useState<Subject | null>(null);
  const [classLevel, setClassLevel] = useState<ClassLevel>('Class 10');

  // State for background chapter search
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [searchMessage, setSearchMessage] = useState('');
  const [postSearchAction, setPostSearchAction] = useState<PostSearchAction>(null);

  // Single source of truth for whether the user has started a session
  const [hasSessionStarted, setHasSessionStarted] = useState(false);

  const startBackgroundSearch = async (searchFn: () => Promise<string>) => {
      setHasSessionStarted(true); // User has started their session
      setSearchStatus('searching');
      setSearchMessage('Initiating search...');
      try {
          // Simulate stages of searching for better UX
          setTimeout(() => setSearchMessage('Analyzing search parameters...'), 1000);
          setTimeout(() => setSearchMessage('Searching across web sources... (Est. 90s)'), 5000);
          setTimeout(() => setSearchMessage('Compiling and structuring content...'), 45000);

          const text = await searchFn();
          
          setExtractedText(text);
          setSearchStatus('success');
          setSearchMessage('Chapter content loaded successfully!');

          if (postSearchAction) {
              postSearchAction.navigate(postSearchAction.tool);
          }

          setTimeout(() => {
              setSearchStatus('idle');
              setSearchMessage('');
              setPostSearchAction(null);
          }, 5000); // Hide success message after 5 seconds
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during search.";
          setSearchStatus('error');
          setSearchMessage(errorMessage);
          setPostSearchAction(null); // Clear action on error
           setTimeout(() => {
              setSearchStatus('idle');
              setSearchMessage('');
          }, 8000);
      }
  };
  
  const startSessionWithContent = (text: string) => {
    setExtractedText(text);
    setHasSessionStarted(true);
  };


  const resetContent = () => {
    setExtractedText('');
    setSubject(null);
    setClassLevel('Class 10');
    setSearchStatus('idle');
    setSearchMessage('');
    setPostSearchAction(null);
    setHasSessionStarted(false);
  };

  const value = {
    extractedText,
    setExtractedText,
    subject,
    setSubject,
    classLevel,
    setClassLevel,
    searchStatus,
    searchMessage,
    postSearchAction,
    setPostSearchAction,
    hasSessionStarted,
    startBackgroundSearch,
    startSessionWithContent,
    resetContent
  };

  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  );
};