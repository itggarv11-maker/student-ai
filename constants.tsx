
import React from 'react';
import { Subject } from './types';
import { BookOpenIcon } from './components/icons/BookOpenIcon';
import { LightBulbIcon } from './components/icons/LightBulbIcon';
import { DocumentTextIcon } from './components/icons/DocumentTextIcon';
import { ChatBubbleIcon } from './components/icons/ChatBubbleIcon';
import { BeakerIcon } from './components/icons/BeakerIcon';
import { GlobeAltIcon } from './components/icons/GlobeAltIcon';
import { ScaleIcon } from './components/icons/ScaleIcon';
import { CpuChipIcon } from './components/icons/CpuChipIcon';


export const SUBJECTS: { name: Subject; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { name: Subject.Math, icon: LightBulbIcon },
  { name: Subject.Physics, icon: LightBulbIcon },
  { name: Subject.Chemistry, icon: BeakerIcon },
  { name: Subject.Biology, icon: BookOpenIcon },
  { name: Subject.Science, icon: BeakerIcon },
  { name: Subject.History, icon: GlobeAltIcon },
  { name: Subject.Geography, icon: GlobeAltIcon },
  { name: Subject.SST, icon: ScaleIcon },
  { name: Subject.English, icon: ChatBubbleIcon },
  { name: Subject.ComputerScience, icon: CpuChipIcon },
];

export const CLASS_LEVELS: string[] = [
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Class 11", "Class 12", "Any"
];