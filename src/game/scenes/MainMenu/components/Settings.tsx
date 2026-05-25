import { mockCurrentUser } from '@/mocks/users';
import styles from '../MainMenuUI.module.css';

interface SettingsProps {
    onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
    function handleLogout() {
        // TODO (wiring): call supabase.auth.signOut() then redirect to /login
        console.log('Logout clicked — not wired yet');
    }

    return (
        <div className={styles.contentPanel}>
            <div className={styles.contentHeader}>
                <button type="button" className={styles.backButton} onClick={onBack}>{'< Back'}</button>
                <span className={styles.contentTitle}>SETTINGS</span>
            </div>
            <div className={styles.settingsBody}>
                <div className={styles.settingsInfo}>
                    {/* TODO (wiring): replace mockCurrentUser with real session from supabase.auth.getSession() */}
                    <div><span className={styles.settingsLabel}>Username</span></div>
                    <div>{mockCurrentUser.username}</div>
                    <br />
                    <div><span className={styles.settingsLabel}>Email</span></div>
                    <div>{mockCurrentUser.email}</div>
                </div>
                <button type="button" className={styles.menuButton} onClick={handleLogout}>
                    Log Out
                </button>
            </div>
        </div>
    );
}
