import { useState, useEffect } from 'react';
import { EventBus } from '../../EventBus';
import { EventBusRegistry } from '../../shared/registry/EventRegistry';
import styles from './PreloaderUI.module.css';

interface Props {
    /** True while no scene has become active yet (i.e. we are still in the Preloader). */
    visible: boolean;
}

export default function PreloaderUI({ visible }: Props) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const onProgress = (payload: EventBusRegistry['preloader-progress']) => {
            setProgress(payload.value);
        };

        EventBus.on('preloader-progress', onProgress);
        return () => {
            EventBus.off('preloader-progress', onProgress);
        };
    }, []);

    return (
        <div className={`${styles.overlay}${visible ? '' : ` ${styles.hidden}`}`}>
            <div className={styles.card}>
                <span className={styles.title}>LOADING...</span>
                <div className={styles.track}>
                    <div className={styles.fill} style={{ width: `${progress * 100}%` }} />
                </div>
            </div>
        </div>
    );
}
