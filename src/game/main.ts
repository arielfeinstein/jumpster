'use client';

import Phaser from 'phaser';
import { makeConfig } from './config';

// Keep the same API the template expects:
// StartGame('game-container') -> returns Phaser.Game
const StartGame = (parent: string) => {
  // The template passed a string ID; our config wants an HTMLElement.
  const el = (typeof parent === 'string')
    ? document.getElementById(parent)
    : (parent as unknown as HTMLElement);

  if (!el) {
    throw new Error(
      `StartGame: could not find element with id "${parent}". ` +
      `Make sure <div id="${parent}"></div> exists on the page.`
    );
  }

  const config = makeConfig(el);
  return new Phaser.Game(config);
};

export default StartGame;