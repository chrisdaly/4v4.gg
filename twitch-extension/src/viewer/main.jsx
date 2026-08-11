import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@main/styles/App.css';
import '@main/styles/components/Game.css';
import '../styles/extension.css';

createRoot(document.getElementById('root')).render(<App />);
