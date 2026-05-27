import { useEffect, useState } from 'react';
import { supabase, getCurrentUser, type CurrentUser } from '@/lib/supabase';
import styles from '../MainMenuUI.module.css';

interface SettingsProps {
    onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
    const [user, setUser] = useState<CurrentUser | null>(null);

    useEffect(() => {
        getCurrentUser().then(setUser);
    }, []);

    async function handleLogout() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout failed:', error.message);
        } else {
            console.log('Logout successful');
        }
        window.location.href = '/login';
    }

    return (
        <div className={styles.contentPanel}>
            <div className={styles.contentHeader}>
                <button type="button" className={styles.backButton} onClick={onBack}>{'< Back'}</button>
                <span className={styles.contentTitle}>SETTINGS</span>
            </div>
            <div className={styles.settingsBody}>
                <div className={styles.settingsInfo}>
                    <div><span className={styles.settingsLabel}>Username</span></div>
                    <div>{user?.username ?? '...'}</div>
                    <br />
                    <div><span className={styles.settingsLabel}>Email</span></div>
                    <div>{user?.email ?? '...'}</div>
                </div>
                <button type="button" className={styles.menuButton} onClick={handleLogout}>
                    Log Out
                </button>
            </div>
        </div>
    );
}
