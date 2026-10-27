import React, { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { SpellPanel } from '../screens/Party.jsx';
import { Tabs, toast } from '../ui.jsx';

export default function Spells() {
  const { campaign, update } = useApp();
  const [id, setId] = useState(campaign.playerId);
  const c = campaign.party.find((p) => p.id === id) || campaign.party[0];
  const set = (patch) =>
    update((camp) => {
      const p = camp.party.find((x) => x.id === c.id);
      Object.assign(p, typeof patch === 'function' ? patch(p) || {} : patch);
    });
  return (
    <div className="page">
      <Tabs tabs={campaign.party.map((p) => [p.id, p.name])} value={c.id} onChange={setId} />
      <SpellPanel c={c} set={set} />
      <div className="row">
        <button className="btn sm" onClick={() => { update((camp) => camp.party.forEach((p) => { if (p.spells.slots?.pact) p.spells.used = {}; })); toast('Short rest: pact slots restored'); }}>Party short rest</button>
        <button className="btn sm gold" onClick={() => { update((camp) => camp.party.forEach((p) => { p.spells.used = {}; p.concentration = ''; })); toast('Long rest: all slots restored'); }}>Party long rest</button>
      </div>
    </div>
  );
}
