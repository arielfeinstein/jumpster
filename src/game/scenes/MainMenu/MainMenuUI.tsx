import { useReducer } from 'react';
import { EventBus } from '../../EventBus';
import styles from './MainMenuUI.module.css';

type MenuType = 'main' | 'myLevels' | 'play' | 'options' | 'createLevel';

interface LevelMeta {
  id: string;
  name: string;
  createdAt: string; // ISO string
}

// Mock levels (placeholder until real data source is wired)
const mockLevels: LevelMeta[] = [
  {
    id: 'lvl-1',
    name: 'Grassland Beginnings',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
  },
  {
    id: 'lvl-2',
    name: "Caverns of Echoes",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // 26h ago
  },
  {
    id: 'lvl-3',
    name: 'Skybridge Sprint',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3d ago
  },
  {
    id: 'lvl-4',
    name: 'Nether Trial Alpha',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15m ago
  },
];

export default function MainMenuUI() {

  const [menuStack, dispatch] = useReducer(reducer, ['main']);

  function reducer(menuStack: MenuType[], action: MenuType | 'back') {
    switch (action) {
      case 'back':
        return menuStack.slice(0, -1);
      default:
        return [...menuStack, action];
    }
  }

  const current = menuStack[menuStack.length - 1];

  return (
    <div className={styles.menuContainer}>
      {current === 'main' && <MainMenu onNavigate={(m) => dispatch(m)} />}
      {current === 'myLevels' && (
        <MyLevelsUI
          onBack={() => dispatch('back')}
          levels={mockLevels}
          onCreateNew={() => dispatch('createLevel')}
        />
      )}
      {current === 'options' && (
        <PlaceholderScreen title="Options" onBack={() => dispatch('back')} />
      )}
      {current === 'play' && (
        <PlaceholderScreen title="Play (Coming Soon)" onBack={() => dispatch('back')} />
      )}
      {current === 'createLevel' && (
        <CreateLevelUI onBack={() => dispatch('back')} />
      )}
    </div>
  );
}

function MainMenu({ onNavigate }: { onNavigate: (menu: MenuType) => void }) {
  return (
    <div className={styles.menuInner}>
      <button type="button" className={styles.menuButton} onClick={() => onNavigate('play')}>Play</button>
      <button type="button" className={styles.menuButton} onClick={() => onNavigate('myLevels')}>My Levels</button>
      <button type="button" className={styles.menuButton} onClick={() => onNavigate('options')}>Options</button>
    </div>
  );
}

function MyLevelsUI({ onBack, onCreateNew, levels }: { onBack: () => void; onCreateNew: () => void; levels: LevelMeta[] }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>My Levels</div>
      <LevelList levels={levels} />
      <div className={styles.footerRow}>
  <button type="button" className={styles.menuButton} onClick={onCreateNew}>New Level</button>
        <button type="button" className={styles.menuButton} onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

function LevelList({ levels }: { levels: LevelMeta[] }) {
  return (
    <ul className={styles.levelList}>
      {levels.map(l => <LevelItem key={l.id} level={l} />)}
    </ul>
  );
}

function LevelItem({ level }: { level: LevelMeta }) {
  const createdDate = new Date(level.createdAt);
  const relTimeMsg = timeAgo(createdDate);
  return (
    <li className={styles.levelItem}>
      <div className={styles.levelItemPrimary}>{level.name}</div>
      <div className={styles.levelItemMeta}>{relTimeMsg}</div>
    </li>
  );
}

function PlaceholderScreen({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>{title}</div>
      <div className={styles.placeholderBody}>Coming soon...</div>
      <div className={styles.footerRow}>
        <button type="button" className={styles.menuButton} onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

function CreateLevelUI({ onBack }: { onBack: () => void }) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>Create Level</div>
      <div className={styles.formGroup}>
        <label className={styles.textLabel} htmlFor="levelName">Level Name</label>
        <input id="levelName" name="levelName" type="text" className={styles.textInput} placeholder="Enter name" />
      </div>
      <div className={styles.footerRow}>
        <button type="button" className={styles.menuButton} onClick={() => EventBus.emit('create-level')}>Create</button>
        <button type="button" className={styles.menuButton} onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}