import { useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import MainMenuUI from './game/scenes/MainMenu/MainMenuUI'


function App()
{
    
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [currentScene, setCurrentScene] = useState<string | null>(null);
    console.log('Current Scene:', currentScene);

    return ( <>
        <PhaserGame ref={phaserRef} currentActiveScene={scene => setCurrentScene(scene.scene.key)}  />
        {currentScene === 'MainMenu' && <MainMenuUI />}
    </> );
}

export default App
