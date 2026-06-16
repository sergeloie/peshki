import { DEFAULT_CONFIG } from './engine/GameConfig';
import { GameEngine } from './engine/GameEngine';
import { GameUI } from './ui/GameUI';

const engine = new GameEngine(DEFAULT_CONFIG);

const canvas = document.getElementById('board') as HTMLCanvasElement;
const panel = document.getElementById('panel') as HTMLElement;

new GameUI(engine, canvas, panel);
