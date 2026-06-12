// MathQuest Core App Bootstrap
import './style.css';
import { uiManager } from './ui.js';

// Wait for DOM content to be fully loaded
window.addEventListener('DOMContentLoaded', () => {
  // Initialize the Single Page Application UI Flow
  uiManager.init();
});
