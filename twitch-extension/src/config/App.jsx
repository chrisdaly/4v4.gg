import React, { useState, useEffect } from 'react';

const App = () => {
  const [battletag, setBattletag] = useState('');
  const [savedTag, setSavedTag] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadConfig = () => {
      try {
        const raw = window.Twitch?.ext?.configuration?.broadcaster?.content;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.battletag) {
            setBattletag(parsed.battletag);
            setSavedTag(parsed.battletag);
          }
        }
      } catch {}
    };

    window.Twitch?.ext?.configuration?.onChanged(loadConfig);
    if (window.Twitch?.ext) {
      window.Twitch.ext.onAuthorized(() => loadConfig());
    }
    loadConfig();
  }, []);

  const handleSave = () => {
    const tag = battletag.trim();
    if (!tag) return;
    window.Twitch?.ext?.configuration?.set('broadcaster', '1', JSON.stringify({ battletag: tag }));
    setSavedTag(tag);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="ext-config">
      <div className="ext-config-logo">4v4.gg</div>
      <p className="ext-config-desc">
        Show your live W3Champions match stats to viewers as they watch your stream.
        Enter your battle tag below to enable the overlay.
      </p>

      {savedTag && (
        <div className="ext-config-current">
          Active tag: <strong>{savedTag}</strong>
        </div>
      )}

      <div className="ext-config-form">
        <input
          type="text"
          className="ext-config-input"
          placeholder="YourName#1234"
          value={battletag}
          onChange={e => setBattletag(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        <button
          className={`ext-config-btn${saved ? ' saved' : ''}`}
          onClick={handleSave}
        >
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <p className="ext-config-note">
        Your battle tag is shown in W3Champions as "Name#Server" — for example, Player#21207.
        The overlay appears automatically when you start a 4v4 match and disappears when it ends.
      </p>
    </div>
  );
};

export default App;
