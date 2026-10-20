import React from 'react';
import { createRoot } from 'react-dom/client';
import './design-tokens.css';
import './styles.css';
import App from './App.jsx';
import { initTelegram } from './tg.js';

initTelegram();
createRoot(document.getElementById('root')).render(<App />);
