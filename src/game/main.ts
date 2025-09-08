'use client';

import Phaser from 'phaser';
import { makeConfig } from './config';

const StartGame = (parent: string) => {
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