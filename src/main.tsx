import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { gameService } from './services/gameService';
import './index.css';

/**
 * Boot sequence:
 * The production bundle freezes `src/data/games.json` at build time, so any game
 * published after the last build would be invisible. Load the live server-side
 * catalog first (falling back silently to the bundled snapshot when unavailable)
 * so the very first render already reflects the current production catalog.
 */
async function bootstrap() {
  await gameService.refreshCatalog();

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
