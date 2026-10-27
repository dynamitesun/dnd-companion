import Adventure from './Adventure.jsx';
import Initiative from './Initiative.jsx';
import Spells from './Spells.jsx';
import Journal from './Journal.jsx';
import Encounters from './Encounters.jsx';
import Generators from './Generators.jsx';
import LevelUp from './LevelUp.jsx';
import Strahd from './Strahd.jsx';
import Rules from './Rules.jsx';
import Shop from './Shop.jsx';
import Downtime from './Downtime.jsx';
import Calendar from './Calendar.jsx';
import Sound from './Sound.jsx';
import Recap from './Recap.jsx';
import Homebrew from './Homebrew.jsx';
import Backup from './Backup.jsx';

export const TOOLS = [
  { id: 'adventure', name: 'Adventure Book', icon: '📕', Component: Adventure },
  { id: 'initiative', name: 'Initiative', icon: '⚔️', Component: Initiative },
  { id: 'spells', name: 'Spells', icon: '✨', Component: Spells },
  { id: 'journal', name: 'Journal', icon: '📓', Component: Journal },
  { id: 'encounters', name: 'Encounter Builder', icon: '🐉', Component: Encounters },
  { id: 'generators', name: 'Generators', icon: '🎰', Component: Generators },
  { id: 'levelup', name: 'Level Up', icon: '⬆️', Component: LevelUp },
  { id: 'strahd', name: 'Strahd Tracker', icon: '🦇', Component: Strahd },
  { id: 'rules', name: 'Rules Lookup', icon: '📖', Component: Rules },
  { id: 'shop', name: 'Shops', icon: '💰', Component: Shop },
  { id: 'downtime', name: 'Downtime', icon: '🔨', Component: Downtime },
  { id: 'calendar', name: 'Calendar', icon: '🌙', Component: Calendar },
  { id: 'sound', name: 'Soundboard', icon: '🔊', Component: Sound },
  { id: 'recap', name: 'Session Recap', icon: '📰', Component: Recap },
  { id: 'homebrew', name: 'Homebrew', icon: '🧪', Component: Homebrew },
  { id: 'backup', name: 'Save & Backup', icon: '💾', Component: Backup },
];
