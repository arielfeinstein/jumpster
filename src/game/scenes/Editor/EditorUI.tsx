import styles from './EditorUI.module.css';

// Editor palette of placeable entities
export default function EditorUI() {
    return (
        <div className={styles.palette}>
            <button draggable="true" data-entity="platform" className={styles.tileButton}>
                <img src="/assets/phaser/platform.png" alt="Platform" className={styles.tileIcon} />
            </button>
            <button draggable="true" data-entity="enemy" className={styles.tileButton}>
                <img src="/assets/react/goomba.png" alt="Enemy" className={styles.tileIcon} />
            </button>
            <button draggable="true" data-entity="coin" className={styles.tileButton}>
                <img src="/assets/phaser/star.png" alt="Coin" className={styles.tileIcon} />
            </button>
        </div>
    );
}