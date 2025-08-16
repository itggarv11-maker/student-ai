
import React, { useEffect, useState } from 'react';
import { useContent } from '../../contexts/ContentContext';
import Spinner from '../common/Spinner';

const SearchStatusIndicator: React.FC = () => {
    const { searchStatus, searchMessage } = useContent();
    const [show, setShow] = useState(false);

    useEffect(() => {
      // Animate in/out based on search status
      if (searchStatus === 'searching') {
        const timer = setTimeout(() => setShow(true), 100);
        return () => clearTimeout(timer);
      } else {
        setShow(false);
      }
    }, [searchStatus]);

    if (searchStatus !== 'searching' && !show) {
        return null;
    }

    return (
        <div className={`fixed bottom-4 right-4 z-50 bg-slate-800 text-white p-4 rounded-lg shadow-2xl flex items-center gap-4 transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Spinner colorClass="bg-white" />
            <div>
                <p className="font-bold text-sm">Chapter Search in Progress</p>
                <p className="text-xs text-slate-300">{searchMessage}</p>
            </div>
        </div>
    );
};

export default SearchStatusIndicator;
