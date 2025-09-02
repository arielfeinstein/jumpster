import styles from './EditorUI.module.css';
import { useDrag } from 'react-dnd';
import { useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend'

// Editor palette of placeable entities
export default function EditorUI() {
    return (
        <DndProvider backend={HTML5Backend}>
            <>
                <div className={styles.palette}>
                    <PaletteItem entityType="platform" imgSrc="/assets/phaser/platform.png" />
                    <PaletteItem entityType="enemy" imgSrc="/assets/react/goomba.png" />
                    <PaletteItem entityType="coin" imgSrc="/assets/phaser/star.png" />
                </div>
                <HiddenCanvasWrapper />
            </>
        </DndProvider>
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
        <div ref={el => { dropRef(el) }} className={styles.hiddenCanvas} style={{ backgroundColor: isOver ? 'rgba(217, 15, 15, 0.2)' : undefined }}>
            {isOver && <div className={styles.dropIndicator}>Release to drop</div>}
        </div>
    );
}
