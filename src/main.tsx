import { createRoot } from 'react-dom/client';
import { App } from './App';
import { setupPwa } from './pwa';
import './styles.css';
createRoot(document.getElementById('root')!).render(<App />);
if (import.meta.env.PROD) void setupPwa();
