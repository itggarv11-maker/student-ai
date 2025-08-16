

import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'https://esm.sh/react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import { ArrowLeftOnRectangleIcon } from '../icons/ArrowLeftOnRectangleIcon';
import { UserCircleIcon } from '../icons/UserCircleIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { BrainCircuitIcon } from '../icons/BrainCircuitIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { RocketLaunchIcon } from '../icons/RocketLaunchIcon';
import { DocumentDuplicateIcon } from '../icons/DocumentDuplicateIcon';
import { ChatBubbleLeftRightIcon } from '../icons/ChatBubbleLeftRightIcon';
import { MicrophoneIcon } from '../icons/MicrophoneIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { VideoCameraIcon } from '../icons/VideoCameraIcon';
import { GavelIcon } from '../icons/GavelIcon';
import { QuestIcon } from '../icons/QuestIcon';
import { ChatBubbleIcon } from '../icons/ChatBubbleIcon';
import { StuBroMascotIcon } from '../icons/StuBroMascotIcon';
import { TargetIcon } from '../icons/TargetIcon';

const Header: React.FC = () => {
  const { currentUser, logout, loading, tokens, secretAccessActive, endSecretSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleEndSession = () => {
    endSecretSession();
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const headerClasses = 'sticky top-0 z-50 bg-white/70 backdrop-blur-lg border-b border-gray-200/80 shadow-sm py-2';
  const linkClass = "text-gray-600 hover:text-indigo-600 transition-colors duration-300 px-3 py-2 rounded-md font-semibold text-base flex items-center gap-1.5";
  const activeLinkClass = "!text-indigo-600";

  const renderLogo = () => {
      return (
        <NavLink to="/" className="flex items-center gap-2">
            <StuBroMascotIcon className="h-12 w-12" />
            <div>
                <span className="text-xl font-bold text-gray-800">StuBro AI</span>
                <div className="text-xs text-gray-500 -mt-1 font-poppins">by Garv</div>
            </div>
        </NavLink>
      );
  };
  
  const ToolsDropdown = () => (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setDropdownOpen(!dropdownOpen)} className={`${linkClass} ${dropdownOpen ? activeLinkClass : ''}`}>
        AI Toolkit <ChevronDownIcon className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white/90 backdrop-blur-md ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1 grid grid-cols-2 gap-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            <ToolLink to="/app" icon={<ChatBubbleIcon className="w-5 h-5"/>} text="Dashboard" onClick={() => setDropdownOpen(false)} />
            <ToolLink to="/focus-hub" icon={<TargetIcon className="w-5 h-5"/>} text="Focus Hub" onClick={() => setDropdownOpen(false)} />
            <ToolLink to="/chapter-conquest" icon={<QuestIcon className="w-5 h-5"/>} text="Chapter Quest" onClick={() => setDropdownOpen(false)} />
            <ToolLink to="/live-debate" icon={<GavelIcon className="w-5 h-5"/>} text="Live Debate" onClick={() => setDropdownOpen(false)} />
            <ToolLink to="/mind-map" icon={<BrainCircuitIcon className="w-5 h-5"/>} text="Mind Maps" onClick={() => setDropdownOpen(false)} />
            <ToolLink to="/study-planner" icon={<CalendarIcon className="w-5 h-5"/>} text="Study Planner" onClick={() => setDropdownOpen(false)} />
            <ToolLink to="/question-paper" icon={<DocumentDuplicateIcon className="w-5 h-5"/>} text="Question Paper" onClick={() => setDropdownOpen(false)} />
            <ToolLink to="/career-guidance" icon={<RocketLaunchIcon className="w-5 h-5"/>} text="Career Guide" onClick={() => setDropdownOpen(false)} />
            <ToolLink to="/viva" icon={<MicrophoneIcon className="w-5 h-5"/>} text="Viva Prep" onClick={() => setDropdownOpen(false)} />
            <ToolLink to="/gemini-live" icon={<ChatBubbleLeftRightIcon className="w-5 h-5"/>} text="Live Doubts" onClick={() => setDropdownOpen(false)} />
            <ToolLink to="/visual-explanation" icon={<VideoCameraIcon className="w-5 h-5"/>} text="Visual Explainer" onClick={() => setDropdownOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
  
  const ToolLink = ({ to, icon, text, onClick }: { to: string; icon: React.ReactNode; text: string; onClick: () => void; }) => (
    <Link to={to} onClick={onClick} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-indigo-600 w-full text-left rounded-md" role="menuitem">
        {icon} <span className="text-xs">{text}</span>
    </Link>
  );

  const renderNavLinks = () => {
    if (loading) return <Spinner className="w-5 h-5" colorClass="bg-gray-800" />;

    if (!currentUser && secretAccessActive) {
      return (
        <>
          <ToolsDropdown />
          <div className="flex items-center gap-2 bg-amber-100 rounded-full px-3 py-1.5 text-sm">
            <SparklesIcon className="w-4 h-4 text-amber-500" />
            <span className="font-bold text-amber-700">Premium Access</span>
          </div>
          <Button onClick={handleEndSession} variant="outline" size="sm">End Session</Button>
          <Link to="/signup"><Button variant="primary" size="sm">Sign Up & Save</Button></Link>
        </>
      );
    }

    if (currentUser) {
      return (
        <>
          <ToolsDropdown />
          <Link to="/premium" className={`${linkClass} !text-orange-500`}><SparklesIcon className="w-4 h-4"/> Premium</Link>
          <div className="flex items-center gap-2 bg-indigo-100 text-indigo-700 rounded-full px-3 py-1.5 text-sm">
             <span className="font-bold">Tokens: {tokens ?? '...'}</span>
          </div>
          <NavLink to="/profile" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : ''}`}><UserCircleIcon className="w-5 h-5"/> Profile</NavLink>
          <Button onClick={handleLogout} variant="outline" size="sm"><ArrowLeftOnRectangleIcon className="w-4 h-4" /> Logout</Button>
        </>
      );
    }
    
    if (location.pathname === '/') {
      return (
        <>
          <a href="#features" className={linkClass}>Features</a>
          <Link to="/premium" className={`${linkClass} !text-orange-500`}><SparklesIcon className="w-4 h-4"/> Premium</Link>
          <Link to="/signup"><Button variant='primary' size="md" className="font-semibold">Get Started</Button></Link>
        </>
      );
    }

    return (
      <>
        <NavLink to="/" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : ''}`}>Home</NavLink>
        <NavLink to="/contact" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : ''}`}>Contact</NavLink>
        <Link to="/premium" className={`${linkClass} !text-orange-500`}><SparklesIcon className="w-4 h-4"/> Premium</Link>
        <Link to="/login"><Button variant='outline' size="sm" className="hidden md:flex">Login</Button></Link>
        <Link to="/signup"><Button variant='primary' size="sm">Sign Up</Button></Link>
      </>
    );
  };

  return (
    <header className={headerClasses}>
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        {renderLogo()}
        <div className="flex items-center space-x-1 md:space-x-4">
          {renderNavLinks()}
        </div>
      </nav>
    </header>
  );
};

export default Header;
