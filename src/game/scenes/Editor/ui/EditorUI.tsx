/**
 * EditorUI.tsx
 *
 * React UI overlay for the level editor.
 *
 * Rendered as a fixed full-screen transparent overlay (pointer-events:none)
 * with a single dockable palette (pointer-events:auto).  Because only the dock
 * captures mouse events, hovering it freezes the Phaser placement ghost (Phaser
 * stops receiving pointermove) and dock clicks never accidentally reach the
 * canvas — no coordinate conversion or hidden overlay needed.
 *
 * Communication with Phaser goes entirely through EventBus:
 *   React → Phaser:  'editor-start-placement', 'editor-cancel-placement',
 *                    'editor-change-dimensions'
 *   Phaser → React:  'editor-placement-active', 'editor-confirm-dialog'
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DropdownMenu, Popover } from 'radix-ui';
import { Component2Icon, Cross1Icon, DotFilledIcon } from '@radix-ui/react-icons';
import { EventBus } from '../../../EventBus';
import {
    DOCK_SLOTS,
    DockPosition,
    DockSlotConfig,
    DropdownOption,
    PlacementActivePayload,
    StartPlacementPayload,
    SpriteFrame,
} from '../types/DockTypes';
import ConfirmationDialog from './ConfirmationDialog';
import styles from './EditorUI.module.css';

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function EditorUI() {
    const [dockPosition, setDockPosition] = useState<DockPosition>('bottom');
    const [placementActive, setPlacementActive] = useState(false);

    // Listen for placement state changes emitted by PlacementController.
    useEffect(() => {
        const handler = ({ active }: PlacementActivePayload) => {
            setPlacementActive(active);
        };
        EventBus.on('editor-placement-active', handler);
        return () => { EventBus.off('editor-placement-active', handler); };
    }, []);

    // Confirmation dialog state (driven by 'editor-confirm-dialog' events).
    const [dialogState, setDialogState] = useState<{
        open: boolean;
        message: string;
        onConfirm: () => void;
        onCancel: () => void;
    } | null>(null);

    useEffect(() => {
        const handler = (payload: { message: string; onConfirm: () => void; onCancel: () => void }) => {
            setDialogState({
                open: true,
                message: payload.message,
                onConfirm: () => { payload.onConfirm(); setDialogState(null); },
                onCancel: () => { payload.onCancel(); setDialogState(null); },
            });
        };
        EventBus.on('editor-confirm-dialog', handler);
        return () => { EventBus.off('editor-confirm-dialog', handler); };
    }, []);

    const handleEntitySelect = useCallback(({ entityType, variant }: StartPlacementPayload) => {
        EventBus.emit('editor-start-placement', { entityType, variant });
    }, []);

    const handleCancelPlacement = useCallback(() => {
        EventBus.emit('editor-cancel-placement');
    }, []);

    const cycleDockPosition = useCallback(() => {
        const order: DockPosition[] = ['bottom', 'right', 'top', 'left'];
        setDockPosition(prev => order[(order.indexOf(prev) + 1) % order.length]);
    }, []);

    const dockClass = {
        bottom: styles.dockBottom,
        top:    styles.dockTop,
        left:   styles.dockLeft,
        right:  styles.dockRight,
    }[dockPosition];

    return (
        <div className={styles.overlay}>
            <div className={`${styles.dock} ${dockClass}`}>
                {DOCK_SLOTS.map((slot, i) => (
                    <DockSlot
                        key={i}
                        config={slot}
                        placementActive={placementActive}
                        onEntitySelect={handleEntitySelect}
                        onCancelPlacement={handleCancelPlacement}
                        onCycleDockPosition={cycleDockPosition}
                    />
                ))}
            </div>
            {dialogState && (
                <ConfirmationDialog
                    open={dialogState.open}
                    message={dialogState.message}
                    onConfirm={dialogState.onConfirm}
                    onCancel={dialogState.onCancel}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// DockSlot dispatcher
// ---------------------------------------------------------------------------

interface DockSlotProps {
    config: DockSlotConfig;
    placementActive: boolean;
    onEntitySelect: (payload: StartPlacementPayload) => void;
    onCancelPlacement: () => void;
    onCycleDockPosition: () => void;
}

function DockSlot({ config, placementActive, onEntitySelect, onCancelPlacement, onCycleDockPosition }: DockSlotProps) {
    switch (config.kind) {
        case 'entity-dropdown':
            return (
                <EntityDropdownSlot
                    label={config.label}
                    iconSrc={config.iconSrc}
                    iconSpriteFrame={config.iconSpriteFrame}
                    options={config.options}
                    onSelect={onEntitySelect}
                />
            );
        case 'action-button': {
            // Respect visibility rules.
            if (config.visibleDuringPlacement === 'only' && !placementActive) return null;

            const isCancel = config.action === 'cancel-placement';
            const onClick = config.action === 'cancel-placement'
                ? onCancelPlacement
                : onCycleDockPosition;

            return (
                <button
                    className={`${styles.slotButton} ${isCancel ? styles.cancelButton : ''}`}
                    title={config.label}
                    onClick={onClick}
                >
                    {isCancel
                        ? <Cross1Icon width={18} height={18} />
                        : <DotFilledIcon width={18} height={18} />
                    }
                </button>
            );
        }
        case 'popover':
            return <LevelSizePopoverSlot />;
    }
}

// ---------------------------------------------------------------------------
// DropdownItemIcon
// ---------------------------------------------------------------------------

const DROPDOWN_ICON_PX = 22; // must match .dropdownItemIcon height in CSS module

/**
 * Renders an icon from a standalone image or a specific frame within a spritesheet.
 * - If `spriteFrame` is provided, crops the correct frame using CSS custom properties
 *   (background-image / background-position) and the `.spriteIcon` CSS class.
 * - Otherwise renders `assetSrc` as a plain <img>.
 *
 * Used both for dropdown option icons and for the dock button's representative icon
 * when it points to a spritesheet.
 */
function DropdownItemIcon({ assetSrc, spriteFrame, alt }: { assetSrc: string; spriteFrame?: SpriteFrame; alt: string }) {
    if (spriteFrame) {
        const { frameX, frameY, frameSize } = spriteFrame;
        const scale = DROPDOWN_ICON_PX / frameSize;
        return (
            <div
                className={`${styles.dropdownItemIcon} ${styles.spriteIcon}`}
                role="img"
                aria-label={alt}
                style={{
                    '--sprite-src': `url('${assetSrc}')`,
                    '--sprite-pos': `-${frameX * scale}px -${frameY * scale}px`,
                } as React.CSSProperties}
            />
        );
    }
    return <img src={assetSrc} className={styles.dropdownItemIcon} alt={alt} />;
}

// ---------------------------------------------------------------------------
// EntityDropdownSlot
// ---------------------------------------------------------------------------

interface EntityDropdownSlotProps {
    label: string;
    iconSrc: string;
    iconSpriteFrame?: SpriteFrame;
    options: DropdownOption[];
    onSelect: (payload: StartPlacementPayload) => void;
}

/**
 * Dock button that opens a Radix DropdownMenu listing entity variants.
 * Selecting an option emits 'editor-start-placement' with the chosen type and
 * optional variant.  Every entity always shows a dropdown — even with one
 * option — for consistency and to support future texture variants.
 */
function EntityDropdownSlot({ label, iconSrc, iconSpriteFrame, options, onSelect }: EntityDropdownSlotProps) {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button className={styles.slotButton} title={label}>
                    {iconSpriteFrame
                        ? <DropdownItemIcon assetSrc={iconSrc} spriteFrame={iconSpriteFrame} alt={label} />
                        : <img src={iconSrc} className={styles.slotIcon} alt={label} />
                    }
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content className={styles.dropdownContent} sideOffset={6}>
                    {options.map(option => (
                        <DropdownMenu.Item
                            key={`${option.entityType}-${option.variant ?? 'default'}`}
                            className={styles.dropdownItem}
                            onSelect={() => onSelect({ entityType: option.entityType, variant: option.variant })}
                        >
                            <DropdownItemIcon assetSrc={option.assetSrc} spriteFrame={option.spriteFrame} alt={option.label} />
                            {option.label}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}

// ---------------------------------------------------------------------------
// LevelSizePopoverSlot
// ---------------------------------------------------------------------------

/**
 * Dock button that opens a Radix Popover for changing the level dimensions.
 * Width and height are integer multipliers of the viewport size (e.g. 2 = 2×
 * the canvas width).  Emits 'editor-change-dimensions' on Apply.
 */
function LevelSizePopoverSlot() {
    const widthRef  = useRef<HTMLInputElement>(null);
    const heightRef = useRef<HTMLInputElement>(null);

    const handleApply = useCallback(() => {
        const worldWidthUnit  = parseInt(widthRef.current?.value  ?? '0', 10);
        const worldHeightUnit = parseInt(heightRef.current?.value ?? '0', 10);
        EventBus.emit('editor-change-dimensions', { worldWidthUnit, worldHeightUnit });
    }, []);

    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <button className={styles.slotButton} title="Level Size">
                    <Component2Icon width={22} height={22} />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content className={styles.popoverContent} sideOffset={6}>
                    <p className={styles.popoverTitle}>Level Size</p>
                    <fieldset className={styles.fieldset}>
                        <label className={styles.label} htmlFor="level-width">Width</label>
                        <input
                            id="level-width"
                            className={styles.input}
                            type="number"
                            min={1}
                            defaultValue={1}
                            ref={widthRef}
                        />
                    </fieldset>
                    <fieldset className={styles.fieldset}>
                        <label className={styles.label} htmlFor="level-height">Height</label>
                        <input
                            id="level-height"
                            className={styles.input}
                            type="number"
                            min={1}
                            defaultValue={1}
                            ref={heightRef}
                        />
                    </fieldset>
                    <div className={styles.popoverActions}>
                        <Popover.Close className={styles.applyButton} onClick={handleApply}>
                            Apply
                        </Popover.Close>
                    </div>
                    <Popover.Close className={styles.popoverClose} aria-label="Close">
                        <Cross1Icon />
                    </Popover.Close>
                    <Popover.Arrow className={styles.popoverArrow} />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
