/**
 * Help.tsx
 *
 * "How to Play" screen accessible from the main menu.
 *
 * Shows two tabs — EDITOR and PLAY — each containing a scrollable list of
 * help items.  Entity icons reuse DropdownItemIcon (same cropped-spritesheet
 * logic as the editor palette) so the images stay consistent with what the
 * player sees in the editor.
 */

import { useState } from 'react';
import { Component2Icon, DotFilledIcon } from '@radix-ui/react-icons';
import { Undo2, Redo2, Save } from 'lucide-react';
import { DOCK_SLOTS } from '@/game/scenes/Editor/types/DockTypes';
import { DropdownItemIcon } from '@/game/scenes/Editor/ui/DropdownItemIcon';
import styles from '../MainMenuUI.module.css';

interface HelpProps {
    onBack: () => void;
}

type Tab = 'editor' | 'play';

// ---------------------------------------------------------------------------
// Convenience: pull named slot configs out of DOCK_SLOTS so we can hand them
// to DropdownItemIcon without hard-coding asset paths again.
// ---------------------------------------------------------------------------

/** Returns the first entity-dropdown or background-dropdown slot whose label matches. */
function slotByLabel(label: string) {
    return DOCK_SLOTS.find(s => s.label === label);
}

/** Returns the first DropdownOption inside a named slot. */
function optionByLabel(slotLabel: string, optLabel: string) {
    const slot = slotByLabel(slotLabel);
    if (!slot || slot.kind !== 'entity-dropdown') return undefined;
    return slot.options.find(o => o.label === optLabel);
}

// Specific options used for entity icons in the EDITOR tab.
const platformOption  = optionByLabel('Platform', 'Grass 1');
const coinOption      = optionByLabel('Coin', 'Gold');
const goombaOption    = optionByLabel('Enemy', 'Slime');
const spikesOption    = optionByLabel('Enemy', 'Spikes');
const checkpointFlag  = optionByLabel('Flags', 'Checkpoint');
const startFlag       = optionByLabel('Flags', 'Start Flag');
const endFlag         = optionByLabel('Flags', 'End Flag');

// ---------------------------------------------------------------------------
// HelpItem component
// ---------------------------------------------------------------------------

interface HelpItemProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
}

function HelpItem({ title, description, icon }: HelpItemProps) {
    return (
        <div className={styles.helpItem}>
            {icon && <span className={styles.helpItemIcon}>{icon}</span>}
            <span className={styles.helpItemTitle}>{title}</span>
            <span className={styles.helpItemText}>{description}</span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Editor tab content
// ---------------------------------------------------------------------------

function EditorHelp() {
    return (
        <>
            <HelpItem
                title="PLACING ENTITIES"
                description="Palette at the bottom — click an entity to start placement. It appears as a ghost on the canvas; a red tint means it can't be placed there. Click to place. Non-singleton entities (anything except start/finish flags) immediately re-enter placement mode. Cancel with X on the palette or Esc."
            />
            <HelpItem
                title="SELECTING"
                description="Click an entity to select it, or drag to box-select multiple. Then delete or drag-and-drop to move them."
            />
            <HelpItem
                title="UNDO / REDO"
                icon={
                    <>
                        <Undo2 size={13} />
                        <Redo2 size={13} />
                    </>
                }
                description="Ctrl+Z to undo, Ctrl+Shift+Z to redo."
            />
            <HelpItem
                title="LEVEL SIZE"
                icon={<Component2Icon width={13} height={13} />}
                description="Resize the level. 1 unit = 1 viewport (the visible area of your screen). Default is 1×1."
            />
            <HelpItem
                title="NAVIGATION"
                description="Arrow keys move the camera. At the default 1×1 size there is nothing to pan — the level fills the screen."
            />
            <HelpItem
                title="DOCK POSITION"
                icon={<DotFilledIcon width={13} height={13} />}
                description="Click the dot icon to cycle the palette position (bottom, right, top, left)."
            />
            <HelpItem
                title="SAVING & EXITING"
                icon={<Save size={13} />}
                description="Save your level with the save button, or exit without saving."
            />
            <HelpItem
                title="TEMPLATES"
                description="From the main menu you can start a new level from scratch or use a template as a starting point."
            />
            <HelpItem
                title="PUBLISHING"
                description="Once a level is published it cannot be edited."
            />
            <HelpItem
                title="FLAGS"
                icon={
                    <>
                        {checkpointFlag && (
                            <DropdownItemIcon
                                assetSrc={checkpointFlag.assetSrc}
                                spriteFrame={checkpointFlag.spriteFrame}
                                alt="Checkpoint flag"
                            />
                        )}
                        {startFlag && (
                            <DropdownItemIcon
                                assetSrc={startFlag.assetSrc}
                                spriteFrame={startFlag.spriteFrame}
                                alt="Start flag"
                            />
                        )}
                        {endFlag && (
                            <DropdownItemIcon
                                assetSrc={endFlag.assetSrc}
                                spriteFrame={endFlag.spriteFrame}
                                alt="End flag"
                            />
                        )}
                    </>
                }
                description="Red flag = start / checkpoint (one per level). Finish flag = end goal (one per level)."
            />
            <HelpItem
                title="ENEMIES"
                icon={
                    goombaOption ? (
                        <DropdownItemIcon
                            assetSrc={goombaOption.assetSrc}
                            spriteFrame={goombaOption.spriteFrame}
                            alt="Goomba enemy"
                        />
                    ) : undefined
                }
                description="Goombas are stationary in the editor. In play they patrol left and right. Jump on them to defeat them."
            />
            <HelpItem
                title="PLATFORMS"
                icon={
                    platformOption ? (
                        <DropdownItemIcon
                            assetSrc={platformOption.assetSrc}
                            spriteFrame={platformOption.spriteFrame}
                            alt="Platform"
                        />
                    ) : undefined
                }
                description="The main surface to walk on."
            />
            <HelpItem
                title="COINS"
                icon={
                    coinOption ? (
                        <DropdownItemIcon
                            assetSrc={coinOption.assetSrc}
                            spriteFrame={coinOption.spriteFrame}
                            alt="Coin"
                        />
                    ) : undefined
                }
                description="Collect as many as you can."
            />
            <HelpItem
                title="SPIKES"
                icon={
                    spikesOption ? (
                        <DropdownItemIcon
                            assetSrc={spikesOption.assetSrc}
                            spriteFrame={spikesOption.spriteFrame}
                            alt="Spikes"
                        />
                    ) : undefined
                }
                description="Instant death on contact — avoid them."
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// Play tab content
// ---------------------------------------------------------------------------

function PlayHelp() {
    return (
        <>
            <HelpItem
                title="CONTROLS"
                description="Arrow keys: ← → to move, ↑ to jump."
            />
            <HelpItem
                title="ENEMIES"
                description="Avoid spikes and goombas. Jump on a goomba to defeat it."
            />
            <HelpItem
                title="OBJECTIVE"
                description="Collect coins and reach the finish flag."
            />
            <HelpItem
                title="CHECKPOINTS"
                description="Touch a red flag to activate it (the flag rises). On death, you respawn at your last checkpoint."
            />
            <HelpItem
                title="PAUSE"
                description="Press Esc to open the pause menu."
            />
        </>
    );
}

// ---------------------------------------------------------------------------
// Help (root export)
// ---------------------------------------------------------------------------

export default function Help({ onBack }: HelpProps) {
    const [tab, setTab] = useState<Tab>('editor');

    return (
        <div className={styles.contentPanel}>
            {/* Header */}
            <div className={styles.contentHeader}>
                <button type="button" className={styles.backButton} onClick={onBack}>{'< Back'}</button>
                <span className={styles.contentTitle}>HOW TO PLAY</span>
            </div>

            {/* Tab bar */}
            <div className={styles.tabBar}>
                <button
                    type="button"
                    className={`${styles.tab} ${tab === 'editor' ? styles.tabActive : ''}`}
                    onClick={() => setTab('editor')}
                >
                    EDITOR
                </button>
                <button
                    type="button"
                    className={`${styles.tab} ${tab === 'play' ? styles.tabActive : ''}`}
                    onClick={() => setTab('play')}
                >
                    PLAY
                </button>
            </div>

            {/* Scrollable body */}
            <div className={styles.helpBody}>
                {tab === 'editor' ? <EditorHelp /> : <PlayHelp />}
            </div>
        </div>
    );
}
