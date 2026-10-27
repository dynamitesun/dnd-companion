import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useApp } from './lib/store.jsx';
import { ToastHost } from './ui.jsx';
import Campaigns from './screens/Campaigns.jsx';
import Play from './screens/Play.jsx';
import Party from './screens/Party.jsx';
import MapScreen from './screens/Map.jsx';
import Dice from './screens/Dice.jsx';
import Settings from './screens/Settings.jsx';
import { TOOLS } from './tools/index.jsx';

const TABS = [
  ['play', '📜', 'Play'],
  ['party', '🛡️', 'Party'],
  ['map', '🗺️', 'Map'],
  ['dice', '🎲', 'Dice'],
  ['tools', '🧰', 'Tools'],
];

export default function App() {
  const { campaign, closeCampaign } = useApp();
  const [tab, setTab] = useState('play');
  const [tool, setTool] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const backRef = useRef(() => false);

  // Android hardware back button: close tool / settings / go to Play.
  backRef.current = () => {
    if (showSettings) return setShowSettings(false), true;
    if (tool) return setTool(null), true;
    if (campaign && tab !== 'play') return setTab('play'), true;
    return false;
  };
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let sub;
    import('@capacitor/app').then(({ App: CapApp }) => {
      sub = CapApp.addListener('backButton', () => {
        if (!backRef.current()) CapApp.minimizeApp();
      });
    });
    return () => sub && sub.then?.((s) => s.remove());
  }, []);

  if (showSettings) {
    return (
      <div className="app">
        <div className="topbar">
          <button className="iconbtn" onClick={() => setShowSettings(false)}>‹</button>
          <div className="title">Settings</div>
        </div>
        <div className="main"><Settings /></div>
        <ToastHost />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="app">
        <div className="topbar">
          <div className="title">🕯️ Solo DM</div>
          <button className="iconbtn" onClick={() => setShowSettings(true)} aria-label="Settings">⚙️</button>
        </div>
        <div className="main"><Campaigns /></div>
        <ToastHost />
      </div>
    );
  }

  const T = tool ? TOOLS.find((t) => t.id === tool) : null;

  return (
    <div className="app">
      <div className="topbar">
        {T ? (
          <button className="iconbtn" onClick={() => setTool(null)}>‹</button>
        ) : (
          <button className="iconbtn" onClick={closeCampaign} title="Campaigns">🏰</button>
        )}
        <div className="grow">
          <div className="title">{T ? `${T.icon} ${T.name}` : campaign.name}</div>
          {!T && <div className="sub">{campaign.location || campaign.setting || 'Adventure awaits'}</div>}
        </div>
        <button className="iconbtn" onClick={() => setShowSettings(true)} aria-label="Settings">⚙️</button>
      </div>
      <div className="main" style={tab === 'play' && !T ? { overflow: 'hidden' } : tab === 'map' && !T ? { overflow: 'hidden', display: 'flex', flexDirection: 'column' } : undefined}>
        {T ? (
          <T.Component openTool={setTool} goTab={(t) => { setTool(null); setTab(t); }} />
        ) : tab === 'play' ? (
          <Play openTool={setTool} />
        ) : tab === 'party' ? (
          <Party openTool={setTool} />
        ) : tab === 'map' ? (
          <MapScreen />
        ) : tab === 'dice' ? (
          <Dice />
        ) : (
          <ToolMenu onOpen={setTool} />
        )}
      </div>
      <nav className="nav">
        {TABS.map(([k, ic, label]) => (
          <button key={k} className={tab === k && !T ? 'on' : ''} onClick={() => { setTool(null); setTab(k); }}>
            <span className="ic">{ic}</span>
            {label}
          </button>
        ))}
      </nav>
      <ToastHost />
    </div>
  );
}

function ToolMenu({ onOpen }) {
  return (
    <div className="page">
      <div className="toolgrid">
        {TOOLS.map((t) => (
          <button key={t.id} className="tool" onClick={() => onOpen(t.id)}>
            <span className="ic">{t.icon}</span>
            <span className="nm">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
