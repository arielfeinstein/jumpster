import styles from './EditorUI.module.css';
import { useDrag } from 'react-dnd';
import { useDrop } from 'react-dnd';

// Editor palette of placeable entities
export default function EditorUI() {
    return (
        <div  className={styles.paletteContainer}>
            <div className={styles.palette}>
            <PaletteItem entityType="platform" imgSrc="/assets/phaser/platform.png" />
            <PaletteItem entityType="enemy" imgSrc="/assets/react/goomba.png" />
            <PaletteItem entityType="coin" imgSrc="/assets/phaser/star.png" />
            </div>
            <HiddenCanvasWrapper />
        </div>
    );
}

function PaletteItem({ entityType, imgSrc }: { entityType: string; imgSrc: string }) {
    const [{ isDragging }, dragRef] = useDrag({
        type: 'game-object',
        item: { entityType },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });
    
    return (
        <button
            ref={el => { dragRef(el) }}
            data-entity={entityType}
            className={styles.tileButton}
        >
            <img src={imgSrc} className={styles.tileIcon} />
        </button>
    );
}

function HiddenCanvasWrapper() {
    const [{ isOver }, dropRef] = useDrop({
        accept: 'game-object',
        drop: (item) => { console.log('dropped', item); },
        collect: (monitor) => ({
            isOver: monitor.isOver()
        })
    })

    return (
        <div ref={el => { dropRef(el) }} className={styles.hiddenCanvas}>
            {isOver && <div className={styles.dropIndicator}>Release to drop</div>}
        </div>
    );
}