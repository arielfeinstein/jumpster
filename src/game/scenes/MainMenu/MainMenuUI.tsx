<<<<<<< HEAD
import { useReducer } from 'react';
import { useUser } from '@/hooks/useUser';
=======
import { useReducer, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
>>>>>>> eec3b38d16ebb2cefc75a7563df11cde726a5efc
import styles from './MainMenuUI.module.css';
import BrowseLevels from './components/BrowseLevels';
import MyLevels from './components/MyLevels';
import CreateLevel from './components/CreateLevel';
import Settings from './components/Settings';

type View = 'home' | 'browse' | 'myLevels' | 'create' | 'settings';

type NavAction = { type: 'push'; view: View } | { type: 'back' };

function navReducer(stack: View[], action: NavAction): View[] {
    switch (action.type) {
        case 'push': return [...stack, action.view];
        case 'back': return stack.slice(0, -1);
    }
}

export default function MainMenuUI() {
    const [stack, dispatch] = useReducer(navReducer, ['home' as View]);
    const current = stack[stack.length - 1];
<<<<<<< HEAD
    const { user } = useUser();
=======
    const [username, setUsername] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUsername(session?.user.user_metadata.username ?? null);
        });
    }, []);
>>>>>>> eec3b38d16ebb2cefc75a7563df11cde726a5efc

    const push = (view: View) => dispatch({ type: 'push', view });
    const back = () => dispatch({ type: 'back' });

    return (
        <div className={styles.overlay}>
            {current === 'home' && (
                <div className={styles.homePanel}>
                    <div className={styles.logo}>JUMPSTER</div>
<<<<<<< HEAD
                    <div className={styles.greeting}>Hello, {user?.username ?? '...'}!</div>
=======
                    <div className={styles.greeting}>Hello, {username ?? '...'}!</div>
>>>>>>> eec3b38d16ebb2cefc75a7563df11cde726a5efc
                    <div className={styles.homeButtons}>
                        <button type="button" className={styles.menuButton} onClick={() => push('browse')}>
                            Browse Levels
                        </button>
                        <button type="button" className={styles.menuButton} onClick={() => push('myLevels')}>
                            My Levels
                        </button>
                        <button type="button" className={styles.menuButton} onClick={() => push('create')}>
                            Create Level
                        </button>
                        <button type="button" className={styles.menuButton} onClick={() => push('settings')}>
                            Settings
                        </button>
                    </div>
                </div>
            )}
            {current === 'browse'   && <BrowseLevels onBack={back} />}
            {current === 'myLevels' && <MyLevels onBack={back} />}
            {current === 'create'   && <CreateLevel onBack={back} />}
            {current === 'settings' && <Settings onBack={back} />}
        </div>
    );
}
