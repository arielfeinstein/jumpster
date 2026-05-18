import { useRef, useState, useCallback } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import MainMenuUI from './game/scenes/MainMenu/MainMenuUI'
import EditorUI from './game/scenes/Editor/ui/EditorUI';
import PlayUI from './game/scenes/Play/ui/PlayUI';


function App() {

    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [currentScene, setCurrentScene] = useState<string | null>(null);
    console.log('Current Scene:', currentScene);


    return (
        <PhaserGame ref={phaserRef} currentActiveScene={scene => setCurrentScene(scene.scene.key)}>
            {currentScene === 'MainMenu' && <MainMenuUI /> }
            {currentScene === 'Editor' && <EditorUI />}
            {currentScene === 'Play' && <PlayUI />}
        </PhaserGame>
    );
}

export default App
