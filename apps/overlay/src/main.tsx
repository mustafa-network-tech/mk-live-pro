import { createRoot } from 'react-dom/client';
import '../../../packages/themes/src/overlay-themes.css';
import './overlay.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(<App />);
