// MathQuest SPA UI and Page Router
import { stateManager, LEVEL_IDS, AVATARS, PALETTES } from './state.js';
import { audioEngine } from './audio.js';
import { LEVELS } from './levels.js';
import { VisualsRenderer } from './visuals.js';

export class UIManager {
  constructor() {
    this.visualsRenderer = new VisualsRenderer('visuals-container');
    this.currentView = 'profile-select';
    
    // Active Level state
    this.activeLevel = null;
    this.activeQuestion = null;
    this.activeMode = 'practice'; // 'practice' or 'test'
    
    // Test metrics
    this.testQuestions = [];
    this.currentTestIndex = 0;
    this.testScore = 0;

    // Track state changes inside visuals
    this.visualsState = {};

    // Auto advance timeout tracker
    this.autoAdvanceTimeout = null;

    // Stateful trackers for affirmative verbal/visual reinforcement and towers
    this.correctCountSinceAffirmative = 0;
    this.nextAffirmativeTarget = Math.floor(Math.random() * 3) + 4; // 4, 5, or 6
    this.currentTowerCount = 0;
    this.isTowersAnimating = false;
    this.isTowersStepLoopRunning = false;
    this.isIntroSequenceRunning = false;
    this.introTimeouts = [];
    this.hasCurrentQuestionBeenWrong = false;
    this.practiceSessionCorrectCount = 0;
  }

  init() {
    this.render();
    this.setupGlobalEvents();
  }

  // Basic View Router
  navigate(viewName) {
    audioEngine.playClick();
    audioEngine.stopSpeaking();
    this.clearIntroSequence();
    if (this.autoAdvanceTimeout) {
      clearTimeout(this.autoAdvanceTimeout);
      this.autoAdvanceTimeout = null;
    }
    this.currentView = viewName;
    this.render();
  }

  clearIntroSequence() {
    this.isIntroSequenceRunning = false;
    if (this.introTimeouts) {
      this.introTimeouts.forEach(tId => clearTimeout(tId));
      this.introTimeouts = [];
    }
  }

  runDoubleAdditionIntroSequence(questionNumber = null) {
    const data = this.activeQuestion.visualData;
    if (!data) return;

    this.isIntroSequenceRunning = true;
    this.tensOfNum1Loaded = false;
    this.carryAudioPlayed = false;

    // Speak first part of narration
    const prefix = questionNumber ? `Question ${questionNumber}. ` : '';
    const speakText1 = `${prefix}Let's put the Ones units of the first number, ${data.num1_ones}, in the Ones tower!`;
    audioEngine.speak(speakText1);

    // Wait slightly for DOM mounting
    const tId1 = setTimeout(() => {
      if (!this.isIntroSequenceRunning) return;
      const units = Array.from(document.querySelectorAll('.num1-unit'));

      let delay = 1800; // Allow the voice narration to get started
      let currentAccCount = 0;

      // Fly units sequentially
      units.forEach((unit) => {
        const tIdUnit = setTimeout(() => {
          if (!this.isIntroSequenceRunning) return;
          currentAccCount += 1;
          this.triggerFlyingAnimation(unit, currentAccCount, false);
        }, delay);
        this.introTimeouts.push(tIdUnit);
        delay += 350;
      });

      // Speak second part of narration after all blocks land
      const tIdComplete = setTimeout(() => {
        if (!this.isIntroSequenceRunning) return;
        this.isIntroSequenceRunning = false;

        const speakText2 = `The Ones blocks are loaded! Now, click on the Ones blocks for the second number, ${data.num2_ones}, to add them!`;
        audioEngine.speak(speakText2);
      }, delay + 600);
      this.introTimeouts.push(tIdComplete);

    }, 50);
    this.introTimeouts.push(tId1);
  }

  runSlideOverAnimation(callback) {
    const container = document.getElementById('classroom-towers-container');
    const onesCol = document.querySelector('.ones-section .tower-column');
    const tensContainer = document.querySelector('.tens-columns-container');
    
    if (container && onesCol && tensContainer) {
      this.isTowersAnimating = true;
      
      // 1. Show Ones fully filled (for visual consistency)
      const onesCells = document.querySelectorAll('.ones-section .tower-cell');
      onesCells.forEach(cell => cell.classList.add('filled'));
      
      // Append a temporary placeholder to tensContainer
      const placeholderCol = document.createElement('div');
      placeholderCol.className = 'tower-column';
      placeholderCol.style.opacity = '0';
      tensContainer.appendChild(placeholderCol);
      
      const containerRect = container.getBoundingClientRect();
      const onesRect = onesCol.getBoundingClientRect();
      const placeholderRect = placeholderCol.getBoundingClientRect();
      
      const overlay = document.createElement('div');
      overlay.className = 'sliding-rod-overlay';
      overlay.style.left = `${onesRect.left - containerRect.left}px`;
      overlay.style.top = `${onesRect.top - containerRect.top}px`;
      overlay.style.width = `${onesRect.width}px`;
      overlay.style.height = `${onesRect.height}px`;
      
      for (let i = 0; i < 10; i++) {
        const cell = document.createElement('div');
        cell.className = 'tower-cell filled';
        overlay.appendChild(cell);
      }
      
      const xOffset = placeholderRect.left - onesRect.left;
      overlay.style.setProperty('--slide-x-offset', `${xOffset}px`);
      
      container.appendChild(overlay);
      
      // Fade out the ones cells instantly
      onesCells.forEach(cell => cell.classList.remove('filled'));
      
      setTimeout(() => {
        overlay.remove();
        placeholderCol.remove();
        this.isTowersAnimating = false;
        if (callback) callback();
      }, 800);
    } else {
      if (callback) callback();
    }
  }

  setupGlobalEvents() {
    // Stop TTS when window loses focus to be polite
    window.addEventListener('blur', () => {
      audioEngine.stopSpeaking();
    });
  }

  render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;
    
    appEl.innerHTML = '';
    
    // Main App Container
    const mainContainer = document.createElement('div');
    mainContainer.className = 'main-app-container';
    
    // Active palette variables setup
    const activeProfile = stateManager.getActiveProfile();
    if (activeProfile) {
      const palette = PALETTES[activeProfile.paletteIndex] || PALETTES[0];
      document.documentElement.style.setProperty('--palette-pri', palette.gradient.split('0%')[0].split('#')[1].trim().substring(0, 7) ? '#' + palette.gradient.split('0%')[0].split('#')[1].trim().substring(0, 7) : palette.color);
      document.documentElement.style.setProperty('--palette-grad', palette.gradient);
    } else {
      document.documentElement.style.setProperty('--palette-pri', '#ff6b8b');
      document.documentElement.style.setProperty('--palette-grad', 'linear-gradient(135deg, #ff6b8b 0%, #ff8e53 100%)');
    }

    // Build the views
    switch (this.currentView) {
      case 'profile-select':
        mainContainer.appendChild(this.buildProfileSelectView());
        break;
      case 'dashboard':
        mainContainer.appendChild(this.buildDashboardView());
        break;
      case 'practice':
      case 'test':
        mainContainer.appendChild(this.buildClassroomView());
        break;
    }

    appEl.appendChild(mainContainer);
  }

  // --- 1. PROFILE SELECTION AND SETTINGS ---
  buildProfileSelectView() {
    const container = document.createElement('div');
    container.className = 'view-container profile-select-view';

    const header = document.createElement('header');
    header.innerHTML = `
      <div class="logo">✨ MathQuest ✨</div>
      <p class="tagline">Learn math by doing! Fun, interactive levels for everyone.</p>
    `;
    container.appendChild(header);

    const profilesGrid = document.createElement('div');
    profilesGrid.className = 'profiles-grid';

    const profiles = stateManager.getProfiles();

    // Render Kid Profile Cards
    profiles.forEach(p => {
      const palette = PALETTES[p.paletteIndex] || PALETTES[0];
      const card = document.createElement('button');
      card.className = 'profile-card card-bounce';
      card.style.background = palette.gradient;
      card.style.color = palette.text;
      card.innerHTML = `
        <div class="profile-avatar">${p.avatar}</div>
        <div class="profile-name">${p.name}</div>
        <div class="profile-level-badge">⭐ ${this.getProfileUnlockedCount(p)} Levels</div>
      `;
      card.addEventListener('click', () => {
        stateManager.setActiveProfile(p.id);
        audioEngine.playLevelUnlocked();
        audioEngine.speak(`Welcome back, ${p.name}! Let's play some math!`);
        this.navigate('dashboard');
      });
      profilesGrid.appendChild(card);
    });

    // Add Profile Button
    const addCard = document.createElement('button');
    addCard.className = 'profile-card add-profile-card card-bounce';
    addCard.innerHTML = `
      <div class="profile-avatar">+</div>
      <div class="profile-name">Add Profile</div>
    `;
    addCard.addEventListener('click', () => {
      this.showCreateProfileModal();
    });
    profilesGrid.appendChild(addCard);

    container.appendChild(profilesGrid);

    // Footer panel with Settings / Parent Gate
    const footerPanel = document.createElement('footer');
    footerPanel.className = 'profile-footer';
    
    // Parent Gate Toggle Button
    const btnParent = document.createElement('button');
    btnParent.className = 'btn btn-parent-toggle';
    const isParent = stateManager.isParentModeActive();
    btnParent.innerHTML = isParent 
      ? '🔒 Lock Levels (Disable Parent Mode)' 
      : '🔓 Parents: Unlock All Levels';
    
    btnParent.addEventListener('click', () => {
      if (stateManager.isParentModeActive()) {
        stateManager.setParentMode(false);
        audioEngine.playClick();
        audioEngine.speak("Parent mode disabled! Levels locked by progress.");
        this.render();
      } else {
        this.showParentGateModal();
      }
    });

    // Global Audio Controls
    const audioControls = document.createElement('div');
    audioControls.className = 'global-audio-controls';

    const btnMute = document.createElement('button');
    btnMute.className = `btn btn-audio ${audioEngine.isMuted ? 'muted' : ''}`;
    btnMute.innerText = audioEngine.isMuted ? '🔇 Sounds Off' : '🔊 Sounds On';
    btnMute.addEventListener('click', () => {
      const isMuted = audioEngine.toggleMute();
      btnMute.innerText = isMuted ? '🔇 Sounds Off' : '🔊 Sounds On';
      btnMute.className = `btn btn-audio ${isMuted ? 'muted' : ''}`;
      audioEngine.playClick();
    });

    const btnSpeech = document.createElement('button');
    btnSpeech.className = `btn btn-audio ${audioEngine.speechEnabled ? '' : 'muted'}`;
    btnSpeech.innerText = audioEngine.speechEnabled ? '🗣️ Voice On' : '🔇 Voice Off';
    btnSpeech.addEventListener('click', () => {
      const speech = audioEngine.toggleSpeech();
      btnSpeech.innerText = speech ? '🗣️ Voice On' : '🔇 Voice Off';
      btnSpeech.className = `btn btn-audio ${speech ? '' : 'muted'}`;
      audioEngine.playClick();
      if (speech) {
        audioEngine.speak("Voice narration activated!");
      }
    });

    audioControls.appendChild(btnMute);
    audioControls.appendChild(btnSpeech);

    footerPanel.appendChild(btnParent);
    footerPanel.appendChild(audioControls);
    container.appendChild(footerPanel);

    return container;
  }

  getProfileUnlockedCount(profile) {
    let count = 0;
    Object.keys(profile.progress).forEach(k => {
      if (profile.progress[k].unlocked) count++;
    });
    return count;
  }

  // Profile creation modal dialogue
  showCreateProfileModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    let selectedAvatar = AVATARS[0];
    let selectedPaletteIdx = 0;

    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body profile-modal-body glass-panel';
    modalBody.innerHTML = `
      <h2>Create Kid Profile</h2>
      
      <div class="form-group">
        <label for="new-profile-name">Kid's Name:</label>
        <input type="text" id="new-profile-name" placeholder="E.g. Liam, Emma" maxlength="12">
      </div>

      <div class="form-group">
        <label>Choose an Avatar:</label>
        <div class="avatar-picker-grid">
          ${AVATARS.map(av => `<button class="avatar-option" data-av="${av}">${av}</button>`).join('')}
        </div>
      </div>

      <div class="form-group">
        <label>Choose a Theme Card Palette:</label>
        <div class="palette-picker-grid">
          ${PALETTES.map((pal, idx) => `
            <button class="palette-option" data-idx="${idx}" style="background: ${pal.gradient}; border-color: ${pal.color}">
            </button>
          `).join('')}
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="btn-create-cancel">Cancel</button>
        <button class="btn btn-primary" id="btn-create-save">Create Profile</button>
      </div>
    `;

    modal.appendChild(modalBody);
    document.body.appendChild(modal);

    // Initial highlight for pickers
    const avatarBtns = modalBody.querySelectorAll('.avatar-option');
    avatarBtns[0].classList.add('selected');
    const paletteBtns = modalBody.querySelectorAll('.palette-option');
    paletteBtns[0].classList.add('selected');

    // Event listeners
    avatarBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        avatarBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedAvatar = btn.getAttribute('data-av');
        audioEngine.playClick();
      });
    });

    paletteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        paletteBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedPaletteIdx = parseInt(btn.getAttribute('data-idx'));
        audioEngine.playClick();
      });
    });

    document.getElementById('btn-create-cancel').addEventListener('click', () => {
      audioEngine.playClick();
      modal.remove();
    });

    document.getElementById('btn-create-save').addEventListener('click', () => {
      const nameInput = document.getElementById('new-profile-name');
      const name = nameInput.value.trim();
      if (!name) {
        audioEngine.playIncorrect();
        nameInput.focus();
        nameInput.classList.add('shake');
        setTimeout(() => nameInput.classList.remove('shake'), 500);
        return;
      }

      stateManager.createProfile(name, selectedAvatar, selectedPaletteIdx);
      audioEngine.playLevelUnlocked();
      modal.remove();
      this.navigate('dashboard');
    });
  }

  // Parent Gate Modal showing multi-step math equation
  showParentGateModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const puzzle = stateManager.generateParentGatePuzzle();

    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body parent-modal-body glass-panel';
    modalBody.innerHTML = `
      <h2>🔒 Parents Only!</h2>
      <p class="puzzle-instructions">Please solve this multi-step equation to unlock Parent Mode and unlock all learning levels:</p>
      
      <div class="parent-gate-puzzle">${puzzle.text} = ?</div>
      
      <div class="form-group">
        <input type="number" id="parent-gate-answer" placeholder="Your Answer" pattern="[0-9]*" inputmode="numeric">
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="btn-gate-cancel">Cancel</button>
        <button class="btn btn-primary" id="btn-gate-verify">Unlock</button>
      </div>
    `;

    modal.appendChild(modalBody);
    document.body.appendChild(modal);

    document.getElementById('btn-gate-cancel').addEventListener('click', () => {
      audioEngine.playClick();
      modal.remove();
    });

    const verifyAnswer = () => {
      const inputEl = document.getElementById('parent-gate-answer');
      const val = parseInt(inputEl.value);
      
      if (val === puzzle.answer) {
        stateManager.setParentMode(true);
        audioEngine.playSuccess();
        audioEngine.speak("Parent Mode unlocked! All levels are now open.");
        modal.remove();
        this.render();
      } else {
        audioEngine.playIncorrect();
        audioEngine.speak("Incorrect! Try again.");
        inputEl.value = '';
        inputEl.focus();
        inputEl.classList.add('shake');
        setTimeout(() => inputEl.classList.remove('shake'), 500);
      }
    };

    document.getElementById('btn-gate-verify').addEventListener('click', verifyAnswer);
    document.getElementById('parent-gate-answer').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        verifyAnswer();
      }
    });
  }

  // --- 2. GAME ROADMAP DASHBOARD ---
  buildDashboardView() {
    const container = document.createElement('div');
    container.className = 'view-container dashboard-view';

    const profile = stateManager.getActiveProfile();
    if (!profile) {
      this.navigate('profile-select');
      return container;
    }

    const palette = PALETTES[profile.paletteIndex] || PALETTES[0];

    // Profile Bar Header
    const dashboardHeader = document.createElement('header');
    dashboardHeader.className = 'dashboard-header glass-panel';
    dashboardHeader.style.borderColor = palette.color;
    dashboardHeader.innerHTML = `
      <div class="profile-info-left">
        <div class="dash-avatar">${profile.avatar}</div>
        <div class="dash-name-panel">
          <h2>${profile.name}'s Learning Quest</h2>
          <span class="unlock-ratio">⭐ Levels Unlocked: ${this.getProfileUnlockedCount(profile)} / ${LEVEL_IDS.length}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-header" id="btn-switch-profile">👥 Switch Profile</button>
      </div>
    `;
    container.appendChild(dashboardHeader);

    // Event listener
    dashboardHeader.querySelector('#btn-switch-profile').addEventListener('click', () => {
      this.navigate('profile-select');
    });

    // Path Roadmap container
    const roadmapContainer = document.createElement('div');
    roadmapContainer.className = 'roadmap-container';

    // Title for the map
    const mapTitle = document.createElement('h3');
    mapTitle.className = 'roadmap-section-title';
    mapTitle.innerText = '🗺️ Your Math Roadmap';
    roadmapContainer.appendChild(mapTitle);

    // Dynamic Board Game winding path map
    const pathGrid = document.createElement('div');
    pathGrid.className = 'roadmap-path-grid';

    LEVELS.forEach((lvl, idx) => {
      const isUnlocked = stateManager.isLevelUnlocked(lvl.id);
      const isCompleted = profile.progress[lvl.id]?.completed || false;
      const highScore = profile.progress[lvl.id]?.score || 0;

      const node = document.createElement('div');
      node.className = `roadmap-node ${isUnlocked ? 'unlocked' : 'locked'} ${isCompleted ? 'completed' : ''}`;
      
      // Determine if this is the active pulsing next level node
      const prevLvlId = idx > 0 ? LEVELS[idx - 1].id : null;
      const prevCompleted = prevLvlId ? (profile.progress[prevLvlId]?.completed || false) : true;
      const isActiveNode = isUnlocked && !isCompleted && prevCompleted;
      if (isActiveNode) {
        node.classList.add('active-node');
      }

      node.innerHTML = `
        <div class="node-number-card">${idx + 1}</div>
        <div class="node-detail">
          <h4>${lvl.title}</h4>
          <span class="node-subtitle">${lvl.subtitle}</span>
          ${isCompleted ? `<div class="node-score-tag">🎉 Passed: ${highScore}%</div>` : ''}
          ${!isUnlocked ? `<div class="node-lock-tag">🔒 Locked</div>` : ''}
        </div>
      `;

      if (isUnlocked) {
        node.addEventListener('click', () => {
          this.showLevelSelectionModal(lvl);
        });
      } else {
        node.addEventListener('click', () => {
          audioEngine.playIncorrect();
          audioEngine.speak(`Level ${idx + 1} is locked! Complete the test on Level ${idx} with eighty percent or more to unlock it!`);
        });
      }

      pathGrid.appendChild(node);
    });

    roadmapContainer.appendChild(pathGrid);
    container.appendChild(roadmapContainer);

    return container;
  }

  showLevelSelectionModal(level) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body level-modal-body glass-panel';
    modalBody.innerHTML = `
      <h2>${level.title}</h2>
      <p class="level-desc">${level.description}</p>
      
      <div class="level-mode-options">
        <button class="mode-select-card card-bounce" id="btn-start-practice">
          <div class="mode-icon">📚</div>
          <h3>Practice Mode</h3>
          <p>Endless questions with warm step-by-step visual helpers. Great for learning!</p>
        </button>

        <button class="mode-select-card card-bounce test-card" id="btn-start-test">
          <div class="mode-icon">🏆</div>
          <h3>Level Evaluation Test</h3>
          <p>Answer 10 questions to unlock the next level. Requires 80% to pass!</p>
        </button>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="btn-lvl-cancel">Cancel</button>
      </div>
    `;

    modal.appendChild(modalBody);
    document.body.appendChild(modal);

    document.getElementById('btn-lvl-cancel').addEventListener('click', () => {
      audioEngine.playClick();
      modal.remove();
    });

    document.getElementById('btn-start-practice').addEventListener('click', () => {
      modal.remove();
      this.startSession(level, 'practice');
    });

    document.getElementById('btn-start-test').addEventListener('click', () => {
      modal.remove();
      this.startSession(level, 'test');
    });
  }

  showEvaluationPromptModal() {
    audioEngine.stopSpeaking();
    audioEngine.playLevelUnlocked();
    audioEngine.speak(`Awesome job! You got ${this.practiceSessionCorrectCount} correct answers! Would you like to take the level evaluation test to unlock the next map level?`);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body level-modal-body glass-panel';
    modalBody.innerHTML = `
      <h2>✨ Awesome Job! ✨</h2>
      <p class="level-desc" style="text-align: center; font-size: 1.2rem; margin-bottom: 1.5rem;">
        You got <strong>${this.practiceSessionCorrectCount}</strong> correct answers! Would you like to take the level evaluation test to unlock the next map level?
      </p>
      
      <div class="level-mode-options">
        <button class="mode-select-card card-bounce test-card" id="btn-prompt-test">
          <div class="mode-icon">🏆</div>
          <h3>Take the Evaluation Test</h3>
          <p>Answer 10 questions to test your skills and unlock the next level!</p>
        </button>

        <button class="mode-select-card card-bounce" id="btn-prompt-practice">
          <div class="mode-icon">📚</div>
          <h3>Keep Practicing</h3>
          <p>Stay in practice mode to keep building your skills!</p>
        </button>
      </div>
    `;

    modal.appendChild(modalBody);
    document.body.appendChild(modal);

    document.getElementById('btn-prompt-test').addEventListener('click', () => {
      audioEngine.playClick();
      modal.remove();
      this.startSession(this.activeLevel, 'test');
    });

    document.getElementById('btn-prompt-practice').addEventListener('click', () => {
      audioEngine.playClick();
      modal.remove();
      this.generateNextPracticeQuestion();
    });
  }

  // --- 3. CLASSROOM AND QUESTION SOLVING ---
  startSession(level, mode) {
    if (this.autoAdvanceTimeout) {
      clearTimeout(this.autoAdvanceTimeout);
      this.autoAdvanceTimeout = null;
    }
    this.activeLevel = level;
    this.activeMode = mode;
    
    audioEngine.playLevelUnlocked();
    
    if (mode === 'practice') {
      this.currentView = 'practice';
      this.practiceSessionCorrectCount = 0;
      audioEngine.speak(level.introSpeech);
      this.generateNextPracticeQuestion();
    } else {
      this.currentView = 'test';
      this.currentTestIndex = 0;
      this.testScore = 0;
      this.testQuestions = [];
      
      // Generate 10 evaluation test questions
      for (let i = 0; i < 10; i++) {
        this.testQuestions.push(level.generateQuestion(true));
      }
      
      audioEngine.speak(`Let us start the ${level.title} evaluation! Answer ten questions as best as you can. Good luck!`);
      this.loadTestQuestion(0);
    }
  }

  generateNextPracticeQuestion() {
    this.clearIntroSequence();
    this.hasCurrentQuestionBeenWrong = false;
    if (this.autoAdvanceTimeout) {
      clearTimeout(this.autoAdvanceTimeout);
      this.autoAdvanceTimeout = null;
    }
    this.activeQuestion = this.activeLevel.generateQuestion(false);
    this.visualsState = {};
    this.render();
    
    // Mount visuals
    setTimeout(() => {
      this.initTowers();
      const isDoubleAdd = ['l5_two_digit_add', 'l6_two_digit_add_carry'].includes(this.activeLevel.id);
      let initialCount = 0;
      if (this.activeLevel.id === 'l4_subtraction' && this.activeQuestion.visualData) {
        initialCount = this.activeQuestion.visualData.total;
      } else if (['l5_two_digit_add', 'l6_two_digit_add_carry', 'l6b_two_digit_sub_no_borrow', 'l7_two_digit_sub_borrow'].includes(this.activeLevel.id) && this.activeQuestion.visualData) {
        initialCount = isDoubleAdd ? 0 : this.activeQuestion.visualData.num1;
        if (['l6b_two_digit_sub_no_borrow', 'l7_two_digit_sub_borrow'].includes(this.activeLevel.id)) {
          this.subInitialTens = this.activeQuestion.visualData.num1_tens;
          this.subInitialOnes = this.activeQuestion.visualData.num1_ones;
        }
      }
      this.currentTowerCount = initialCount;
      this.towerTargetCount = initialCount;
      this.tensOfNum1Loaded = false;
      this.carryAudioPlayed = false;
      this.updateTowers(initialCount, true);

      this.visualsRenderer.render(this.activeLevel.id, this.activeQuestion.visualData, (state) => {
        this.visualsState = state;
        this.onVisualStateChange(state);
      });
      
      if (isDoubleAdd) {
        this.runDoubleAdditionIntroSequence();
      } else {
        // Speak the question narration
        audioEngine.speak(this.activeQuestion.speechText);
      }
    }, 100);
  }

  loadTestQuestion(index) {
    this.clearIntroSequence();
    this.hasCurrentQuestionBeenWrong = false;
    if (this.autoAdvanceTimeout) {
      clearTimeout(this.autoAdvanceTimeout);
      this.autoAdvanceTimeout = null;
    }
    this.currentTestIndex = index;
    this.activeQuestion = this.testQuestions[index];
    this.visualsState = {};
    this.render();

    // Mount visuals
    setTimeout(() => {
      this.initTowers();
      const isDoubleAdd = ['l5_two_digit_add', 'l6_two_digit_add_carry'].includes(this.activeLevel.id);
      let initialCount = 0;
      if (this.activeLevel.id === 'l4_subtraction' && this.activeQuestion.visualData) {
        initialCount = this.activeQuestion.visualData.total;
      } else if (['l5_two_digit_add', 'l6_two_digit_add_carry', 'l6b_two_digit_sub_no_borrow', 'l7_two_digit_sub_borrow'].includes(this.activeLevel.id) && this.activeQuestion.visualData) {
        initialCount = isDoubleAdd ? 0 : this.activeQuestion.visualData.num1;
        if (['l6b_two_digit_sub_no_borrow', 'l7_two_digit_sub_borrow'].includes(this.activeLevel.id)) {
          this.subInitialTens = this.activeQuestion.visualData.num1_tens;
          this.subInitialOnes = this.activeQuestion.visualData.num1_ones;
        }
      }
      this.currentTowerCount = initialCount;
      this.towerTargetCount = initialCount;
      this.tensOfNum1Loaded = false;
      this.carryAudioPlayed = false;
      this.updateTowers(initialCount, true);

      this.visualsRenderer.render(this.activeLevel.id, this.activeQuestion.visualData, (state) => {
        this.visualsState = state;
        this.onVisualStateChange(state);
      });
      
      if (isDoubleAdd) {
        this.runDoubleAdditionIntroSequence(index + 1);
      } else {
        // Speak the test question
        audioEngine.speak(`Question ${index + 1}. ${this.activeQuestion.speechText}`);
      }
    }, 100);
  }

  // Visual active interactive state tracking
  onVisualStateChange(state) {
    if (!state) return;
    
    // Ignore block clicks while towers are already animating (like carry slide or programmatic rod loading)
    if (this.isTowersAnimating && state.blockClicked) {
      return;
    }
    
    const levelId = this.activeLevel.id;
    const data = this.activeQuestion.visualData;
    if (!data) return;
    
    if (levelId === 'l1_counting' || levelId === 'l3_addition' || levelId === 'l8_multiplication') {
      if (state.currentCount !== undefined) {
        if (state.clickedElement && state.isIncrement) {
          this.triggerFlyingAnimation(state.clickedElement, state.currentCount);
        } else {
          this.updateTowers(state.currentCount);
        }
      }
    } else if (levelId === 'l2_numbers_to_20') {
      if (data.mode === 'count' && state.currentCount !== undefined) {
        if (state.clickedElement && state.isIncrement) {
          this.triggerFlyingAnimation(state.clickedElement, state.currentCount);
        } else {
          this.updateTowers(state.currentCount);
        }
      }
    } else if (levelId === 'l4_subtraction') {
      if (state.poppedCount !== undefined) {
        this.updateTowers(data.total - state.poppedCount);
      }
    } else if (levelId === 'l9_division') {
      if (state.distributedCount !== undefined) {
        if (state.clickedElement && state.isIncrement) {
          this.triggerFlyingAnimation(state.clickedElement, state.distributedCount);
        } else {
          this.updateTowers(state.distributedCount);
        }
      }
    } else if (levelId === 'l5_two_digit_add' || levelId === 'l6_two_digit_add_carry') {
      if (this.isIntroSequenceRunning) return;
      if (state.blockClicked) {
        const increment = state.isTenRod ? 10 : 1;
        const newCount = this.towerTargetCount + increment;
        this.towerTargetCount = newCount;
        
        this.triggerFlyingAnimation(state.clickedElement, newCount, state.isTenRod);
        return;
      }

      const correctOnesDigit = (data.num1_ones + data.num2_ones) % 10;
      const correctTensDigit = Math.floor((data.num1 + data.num2) / 10);
      
      const userOnes = parseInt(state.onesVal);
      const userTens = parseInt(state.tensVal);
      
      const clickedOnes = document.querySelectorAll('.base10-ones .base10-unit.moved').length;
      const clickedTens = document.querySelectorAll('.base10-tens .base10-rod.moved').length;
      const clickedCount = clickedTens * 10 + clickedOnes;

      const hasInteracted = (document.querySelectorAll('.base10-ones .base10-unit.moved').length > data.num1_ones) ||
                            (document.querySelectorAll('.base10-tens .base10-rod.moved').length > 0);

      if (!isNaN(userTens) && userTens === correctTensDigit && !isNaN(userOnes) && userOnes === correctOnesDigit) {
        if (hasInteracted) {
          this.updateTowers(data.num1 + data.num2);
        }
      } else if (!isNaN(userOnes) && userOnes === correctOnesDigit) {
        if (!this.tensOfNum1Loaded) {
          this.tensOfNum1Loaded = true;
          this.isTowersAnimating = true;

          // Speak transition instruction first
          if (levelId === 'l6_two_digit_add_carry') {
            audioEngine.speak("Great job solving the Ones! The ten Ones blocks carry over to the Tens column as one Ten. Now let's load the Tens blocks of the first number.");
          } else {
            audioEngine.speak("Great job solving the Ones! Let's move to the Tens column. We will load the Tens blocks of the first number first.");
          }

          // Delay the animations so they start after narration starts
          setTimeout(() => {
            const startTensLoad = () => {
              if (this.activeLevel.id !== levelId) return;
              const rods = Array.from(document.querySelectorAll('.num1-rod'));
              let delay = 100;
              let count = levelId === 'l6_two_digit_add_carry' ? 10 + (data.num1_ones + data.num2_ones) % 10 : (data.num1_ones + data.num2_ones);
              
              this.towerTargetCount = count;
              this.currentTowerCount = count;
              this.updateTowers(count, true, true);

              rods.forEach((rod) => {
                setTimeout(() => {
                  if (this.activeLevel.id !== levelId) return;
                  count += 10;
                  this.towerTargetCount = count;
                  this.triggerFlyingAnimation(rod, count, true);
                }, delay);
                delay += 450;
              });

              setTimeout(() => {
                if (this.activeLevel.id !== levelId) return;
                this.isTowersAnimating = false;
                audioEngine.speak("Now, click on the Tens blocks of the second number to add them!");
              }, delay + 600);
            };

            if (levelId === 'l6_two_digit_add_carry') {
              this.runSlideOverAnimation(() => {
                startTensLoad();
              });
            } else {
              startTensLoad();
            }
          }, 3500); // 3.5s delay to let the instruction voice narration speak first
        } else {
          if (hasInteracted) {
            this.updateTowers(data.num1 + data.num2_ones);
          }
        }
      } else {
        if (hasInteracted) {
          this.updateTowers(clickedCount);
        }
      }
    } else if (levelId === 'l6b_two_digit_sub_no_borrow' || levelId === 'l7_two_digit_sub_borrow') {
      if (this.isIntroSequenceRunning) return;
      
      if (state.borrowTriggered && levelId === 'l7_two_digit_sub_borrow') {
        this.subInitialTens = data.num1_tens - 1;
        this.subInitialOnes = data.num1_ones + 10;
        this.updateTowers(this.towerTargetCount, true);
      }

      if (state.blockClicked) {
        const increment = state.isTenRod ? 10 : 1;
        const newCount = this.towerTargetCount - increment;
        this.towerTargetCount = newCount;
        
        this.triggerFlyingAnimation(state.clickedElement, newCount, state.isTenRod);
        return;
      }

      const isBorrow = levelId === 'l7_two_digit_sub_borrow';
      const correctOnesDigit = isBorrow 
        ? (10 + data.num1_ones) - data.num2_ones 
        : data.num1_ones - data.num2_ones;
      const correctTensDigit = isBorrow 
        ? (data.num1_tens - 1) - data.num2_tens 
        : data.num1_tens - data.num2_tens;
      
      const userOnes = parseInt(state.onesVal);
      const userTens = parseInt(state.tensVal);
      
      const subtractedOnes = document.querySelectorAll('.base10-ones .base10-unit:not(.sub-placeholder)').length;
      const subtractedTens = document.querySelectorAll('.base10-tens .base10-rod:not(.sub-placeholder)').length;
      const remainingCount = (this.subInitialTens - subtractedTens) * 10 + (this.subInitialOnes - subtractedOnes);

      const hasSubInteracted = subtractedOnes > 0 || subtractedTens > 0 || this.subInitialOnes > data.num1_ones;

      if (!isNaN(userTens) && userTens === correctTensDigit && !isNaN(userOnes) && userOnes === correctOnesDigit) {
        if (hasSubInteracted) {
          this.updateTowers(data.num1 - data.num2);
        }
      } else if (!isNaN(userOnes) && userOnes === correctOnesDigit) {
        if (hasSubInteracted) {
          this.updateTowers(data.num1 - data.num2_ones);
        }
      } else {
        if (hasSubInteracted) {
          this.updateTowers(remainingCount);
        }
      }
    }

    // Auto submit column inputs when last input box is completed
    if (state && state.autoSubmit) {
      const onesInpVal = state.onesVal || '0';
      const tensInpVal = state.tensVal || '0';
      const totalSubmitted = parseInt(tensInpVal) * 10 + parseInt(onesInpVal);
      
      setTimeout(() => {
        this.evaluateSubmission(totalSubmitted);
      }, 200);
    }
  }

  buildClassroomView() {
    const container = document.createElement('div');
    container.className = 'view-container classroom-view';

    const level = this.activeLevel;
    const quest = this.activeQuestion;
    
    // Classroom header
    const classHeader = document.createElement('header');
    classHeader.className = 'classroom-header glass-panel';
    classHeader.innerHTML = `
      <div class="class-header-left">
        <button class="btn btn-secondary" id="btn-quit-classroom">⬅️ Back to Map</button>
        <div class="class-title-info">
          <h2>${level.title}</h2>
          ${this.activeMode === 'practice'
            ? `
              <div class="practice-progress-wrapper">
                <span class="class-subtitle">📚 Practice Progress: ${this.practiceSessionCorrectCount % 25} / 25 to Test</span>
                <div class="practice-progress-bar-container" title="${this.practiceSessionCorrectCount % 25} out of 25 correct answers toward evaluation suggestion">
                  <div class="practice-progress-bar" style="width: ${((this.practiceSessionCorrectCount % 25) / 25) * 100}%"></div>
                </div>
              </div>
            `
            : `<span class="class-subtitle">🏆 Evaluation Question ${this.currentTestIndex + 1}/10</span>`
          }
        </div>
      </div>
      
      <div class="class-header-right">
        <!-- Text to speech speaker button -->
        <button class="btn btn-audio-icon card-bounce" id="btn-repeat-instruction" title="Read question out loud">🗣️ Read Out Loud</button>
      </div>
    `;

    container.appendChild(classHeader);

    classHeader.querySelector('#btn-quit-classroom').addEventListener('click', () => {
      audioEngine.playClick();
      this.navigate('dashboard');
    });

    classHeader.querySelector('#btn-repeat-instruction').addEventListener('click', () => {
      audioEngine.playClick();
      audioEngine.speak(quest.speechText);
    });

    // Main workspace
    const workspace = document.createElement('div');
    workspace.className = `classroom-workspace ${quest.inputType !== 'choices' ? 'keypad-layout' : ''}`;

    // Left workspace side: Animated Pedagogical Visuals
    const visualsCard = document.createElement('div');
    visualsCard.className = 'classroom-visuals-card glass-panel';
    
    const isColumnLevel = ['l5_two_digit_add', 'l6_two_digit_add_carry', 'l6b_two_digit_sub_no_borrow', 'l7_two_digit_sub_borrow'].includes(level.id);
    if (!isColumnLevel) {
      const instructionPanel = document.createElement('div');
      instructionPanel.className = 'instruction-panel';
      instructionPanel.innerHTML = `<h3>${quest.questionText}</h3>`;
      visualsCard.appendChild(instructionPanel);
    }

    // Layout wrapping both interactive model and pedagogical Base-10 towers
    const visualsLayout = document.createElement('div');
    visualsLayout.className = 'classroom-visuals-layout';

    const visualsContainer = document.createElement('div');
    visualsContainer.id = 'visuals-container';
    visualsContainer.className = 'visuals-container';
    visualsLayout.appendChild(visualsContainer);

    const towersContainer = document.createElement('div');
    towersContainer.id = 'classroom-towers-container';
    towersContainer.className = 'classroom-towers-container';
    visualsLayout.appendChild(towersContainer);

    visualsCard.appendChild(visualsLayout);

    workspace.appendChild(visualsCard);

    // Right workspace side: Soft-button keyboards & input forms
    const controlsCard = document.createElement('div');
    controlsCard.className = 'classroom-controls-card glass-panel';

    const interactiveInputs = document.createElement('div');
    interactiveInputs.className = 'interactive-inputs-deck';

    if (quest.inputType === 'choices') {
      // Multiple choices deck
      const choicesGrid = document.createElement('div');
      choicesGrid.className = 'choices-grid';

      quest.options.forEach(opt => {
        const choiceBtn = document.createElement('button');
        choiceBtn.className = 'btn-choice card-bounce';
        choiceBtn.innerText = opt;
        
        choiceBtn.addEventListener('click', () => {
          this.evaluateSubmission(opt, choiceBtn);
        });
        choicesGrid.appendChild(choiceBtn);
      });
      interactiveInputs.appendChild(choicesGrid);
    } else {
      // Column/Numeric digital Keyboard inputs
      const keypadWrapper = document.createElement('div');
      keypadWrapper.className = 'custom-keypad-wrapper';

      const padDisplay = document.createElement('div');
      padDisplay.className = 'keypad-instruction';
      padDisplay.innerHTML = `<p>Use the keypad to enter numbers</p>`;
      keypadWrapper.appendChild(padDisplay);

      const numpad = document.createElement('div');
      numpad.className = 'custom-numpad';

      // Numpad Buttons 0 to 9, Clear, Enter
      const keyLayout = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫', '↵ Enter'];
      
      keyLayout.forEach(key => {
        const keyBtn = document.createElement('button');
        keyBtn.className = `btn-key ${key.includes('Enter') ? 'btn-key-enter' : ''}`;
        keyBtn.innerText = key;
        
        keyBtn.addEventListener('click', () => {
          if (this.isIntroSequenceRunning) return;
          if (key === '⌫') {
            this.visualsRenderer.handleColumnInput('');
          } else if (key.includes('Enter')) {
            // Evaluate column math answers
            const onesInpVal = document.getElementById('ans-ones')?.value || '0';
            const tensInpVal = document.getElementById('ans-tens')?.value || '0';
            const totalSubmitted = parseInt(tensInpVal) * 10 + parseInt(onesInpVal);
            
            this.evaluateSubmission(totalSubmitted, keyBtn);
          } else {
            this.visualsRenderer.handleColumnInput(key);
          }
        });
        numpad.appendChild(keyBtn);
      });

      keypadWrapper.appendChild(numpad);
      interactiveInputs.appendChild(keypadWrapper);
    }

    // Inline feedback container (hidden by default)
    const feedbackContainer = document.createElement('div');
    feedbackContainer.id = 'inline-feedback-container';
    feedbackContainer.className = 'inline-feedback-container hidden';
    controlsCard.appendChild(feedbackContainer);

    controlsCard.appendChild(interactiveInputs);
    workspace.appendChild(controlsCard);
    container.appendChild(workspace);

    return container;
  }

  // Evaluate submitting a math answer
  evaluateSubmission(submittedVal, targetBtn) {
    const quest = this.activeQuestion;
    const isCorrect = parseInt(submittedVal) === quest.correctAnswer;
    
    // Temporarily lock further clicks to allow sound to complete
    const buttons = document.querySelectorAll('.btn-choice, .btn-key');
    buttons.forEach(b => b.disabled = true);

    if (isCorrect) {
      // Explicitly update the towers to the correct answer on successful submission
      this.updateTowers(quest.correctAnswer);

      audioEngine.playSuccess();
      if (targetBtn) targetBtn.classList.add('choice-correct');
      
      this.correctCountSinceAffirmative++;
      let headingText = "That's right!";
      let speechText = "That's right!";

      // Stateful interval for randomized affirmative reinforcement
      if (this.correctCountSinceAffirmative >= this.nextAffirmativeTarget) {
        const affirmatives = ["Good", "Great", "Awesome"];
        const word = affirmatives[Math.floor(Math.random() * affirmatives.length)];
        headingText = `${word}! That's right!`;
        speechText = `${word}! That's right!`;
        
        // Reset counters
        this.correctCountSinceAffirmative = 0;
        this.nextAffirmativeTarget = Math.floor(Math.random() * 3) + 4; // next trigger after 4 to 6 correct answers
      }
      
      audioEngine.speak(speechText);

      if (this.activeMode === 'practice') {
        this.practiceSessionCorrectCount++;
      } else if (this.activeMode === 'test' && !this.hasCurrentQuestionBeenWrong) {
        this.testScore++;
      }

      this.showInlineFeedback(true, headingText);
      
      this.autoAdvanceTimeout = setTimeout(() => {
        if (this.activeMode === 'practice') {
          if (this.practiceSessionCorrectCount > 0 && this.practiceSessionCorrectCount % 25 === 0) {
            this.showEvaluationPromptModal();
          } else {
            this.generateNextPracticeQuestion();
          }
        } else {
          this.advanceTest();
        }
      }, 1000);

    } else {
      this.hasCurrentQuestionBeenWrong = true;
      audioEngine.playIncorrect();
      if (targetBtn) targetBtn.classList.add('choice-incorrect');
      
      const incorrectFeedback = `That's not quite right. Keep trying!`;
      audioEngine.speak(incorrectFeedback);

      this.showInlineFeedback(false, "Keep Trying!");

      this.autoAdvanceTimeout = setTimeout(() => {
        // Hide inline feedback and restore inputs deck
        const feedbackContainer = document.getElementById('inline-feedback-container');
        const inputsDeck = document.querySelector('.interactive-inputs-deck');
        if (feedbackContainer && inputsDeck) {
          feedbackContainer.classList.add('hidden');
          inputsDeck.classList.remove('hidden');
        }

        // Re-enable choice buttons that are not marked incorrect
        const choices = document.querySelectorAll('.btn-choice');
        choices.forEach(b => {
          if (!b.classList.contains('choice-incorrect')) {
            b.disabled = false;
          }
        });

        // Re-enable all custom keypad buttons
        const keys = document.querySelectorAll('.btn-key');
        keys.forEach(b => {
          b.disabled = false;
          b.classList.remove('choice-incorrect');
        });
      }, 1000);
    }
  }

  showInlineFeedback(isCorrect, headingText) {
    const feedbackContainer = document.getElementById('inline-feedback-container');
    const inputsDeck = document.querySelector('.interactive-inputs-deck');
    if (!feedbackContainer || !inputsDeck) return;

    inputsDeck.classList.add('hidden');
    feedbackContainer.classList.remove('hidden');

    if (isCorrect) {
      feedbackContainer.innerHTML = `
        <div class="inline-feedback-card correct">
          <div class="inline-feedback-icon correct-pop">🎉</div>
          <h3>${headingText}</h3>
          <div class="countdown-bar-container">
            <div class="countdown-bar correct-bar"></div>
          </div>
        </div>
      `;
    } else {
      feedbackContainer.innerHTML = `
        <div class="inline-feedback-card incorrect">
          <div class="inline-feedback-icon incorrect-pop">💡</div>
          <h3>${headingText}</h3>
          <div class="countdown-bar-container">
            <div class="countdown-bar incorrect-bar"></div>
          </div>
        </div>
      `;
    }
  }

  // Advancing evaluation deck questions
  advanceTest() {
    const nextIdx = this.currentTestIndex + 1;
    if (nextIdx < 10) {
      this.loadTestQuestion(nextIdx);
    } else {
      // Evaluation Completed! Check pass threshold
      this.evaluateTestFinished();
    }
  }

  evaluateTestFinished() {
    const percent = Math.round((this.testScore / 10) * 100);
    const passed = percent >= 80;

    audioEngine.stopSpeaking();

    // Update level status in profile
    stateManager.updateLevelProgress(this.activeLevel.id, percent, true);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body result-modal-body glass-panel';

    if (passed) {
      audioEngine.playLevelUnlocked();
      
      // Determine if a subsequent level has unlocked
      const currentIdx = LEVEL_IDS.indexOf(this.activeLevel.id);
      const nextLevelUnlocked = currentIdx !== -1 && currentIdx + 1 < LEVEL_IDS.length;
      const nextLevelTitle = nextLevelUnlocked ? LEVELS[currentIdx + 1].title : '';

      modalBody.innerHTML = `
        <div class="result-avatar">🏆</div>
        <h2>Quest Passed!</h2>
        <p class="result-score-highlight">You scored ${percent}% (${this.testScore} out of 10!)</p>
        <p>Fantastic job! You've mastered ${this.activeLevel.title}.</p>
        ${nextLevelUnlocked ? `<div class="next-unlock-alert">🌟 UNLOCKED: Level ${currentIdx + 2} - ${nextLevelTitle}! 🌟</div>` : ''}
        
        <button class="btn btn-primary" id="btn-finish-test">✨ Hurray! Back to Roadmap</button>
      `;
      
      audioEngine.speak(`Congratulations! You passed the evaluation with a score of ${percent} percent! Outstanding job!`);
    } else {
      audioEngine.playIncorrect();
      modalBody.innerHTML = `
        <div class="result-avatar" style="filter: grayscale(0.5)">📚</div>
        <h2>Keep Learning!</h2>
        <p class="result-score-highlight">You scored ${percent}% (${this.testScore} out of 10!)</p>
        <p>To advance to the next level, you need eighty percent or higher. Let's do some practice runs and try the test again!</p>
        
        <button class="btn btn-primary" id="btn-finish-test">📚 Back to Roadmap</button>
      `;
      
      audioEngine.speak(`You scored ${percent} percent. That is a great try! Let's do some more practice and solve it next time!`);
    }

    modal.appendChild(modalBody);
    document.body.appendChild(modal);

    document.getElementById('btn-finish-test').addEventListener('click', () => {
      audioEngine.playClick();
      modal.remove();
      this.navigate('dashboard');
    });
  }

  initTowers() {
    const container = document.getElementById('classroom-towers-container');
    if (!container) return;
    container.innerHTML = '';

    const level = this.activeLevel;
    const quest = this.activeQuestion;
    const data = quest.visualData;

    // Do not show the towers container on the side for Level 2 comparison mode or Level 9 division
    const isCompareMode = (level.id === 'l2_numbers_to_20' && data && data.mode === 'compare');
    const isDivision = level.id === 'l9_division';
    if (isCompareMode || isDivision) {
      container.classList.add('hidden');
      return;
    } else {
      container.classList.remove('hidden');
    }

    const isDoubleDigit = 
      level.id === 'l2_numbers_to_20' ||
      level.id === 'l5_two_digit_add' ||
      level.id === 'l6_two_digit_add_carry' ||
      level.id === 'l6b_two_digit_sub_no_borrow' ||
      level.id === 'l7_two_digit_sub_borrow' ||
      (quest.correctAnswer && quest.correctAnswer > 9) ||
      (data && (data.count > 9 || data.total > 9 || data.num1 > 9));

    if (isDoubleDigit) {
      const tensSection = document.createElement('div');
      tensSection.className = 'tower-section tens-section';
      
      const label = document.createElement('div');
      label.className = 'tower-label';
      label.innerText = 'Tens';
      tensSection.appendChild(label);
      
      const tensDigit = document.createElement('div');
      tensDigit.className = 'tower-digit';
      tensDigit.id = 'tens-tower-digit';
      tensDigit.innerText = '0';
      tensSection.appendChild(tensDigit);
      
      const colsContainer = document.createElement('div');
      colsContainer.className = 'tens-columns-container';
      tensSection.appendChild(colsContainer);
      
      container.appendChild(tensSection);
    }

    if (level.id === 'l6_two_digit_add_carry') {
      const carrySection = document.createElement('div');
      carrySection.className = 'tower-section carry-section hidden';
      
      const carryLabel = document.createElement('div');
      carryLabel.className = 'tower-label';
      carryLabel.innerText = 'Carry';
      carrySection.appendChild(carryLabel);
      
      const carryDigit = document.createElement('div');
      carryDigit.className = 'tower-digit';
      carryDigit.id = 'carry-tower-digit';
      carryDigit.innerText = '0';
      carrySection.appendChild(carryDigit);
      
      const carryCols = document.createElement('div');
      carryCols.className = 'carry-columns-container';
      carrySection.appendChild(carryCols);
      
      container.appendChild(carrySection);
    }

    const onesSection = document.createElement('div');
    onesSection.className = 'tower-section ones-section';
    
    const onesLabel = document.createElement('div');
    onesLabel.className = 'tower-label';
    onesLabel.innerText = 'Ones';
    onesSection.appendChild(onesLabel);
    
    const onesDigit = document.createElement('div');
    onesDigit.className = 'tower-digit';
    onesDigit.id = 'ones-tower-digit';
    onesDigit.innerText = '0';
    onesSection.appendChild(onesDigit);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'ones-column-wrapper';
    
    const ruler = document.createElement('div');
    ruler.className = 'tower-ruler';
    for (let i = 1; i <= 10; i++) {
      const mark = document.createElement('div');
      mark.className = 'ruler-mark';
      if (i === 10) mark.classList.add('mark-high');
      else if (i === 5) mark.classList.add('mark-mid');
      mark.innerText = i;
      ruler.appendChild(mark);
    }
    wrapper.appendChild(ruler);
    
    const onesContainer = document.createElement('div');
    onesContainer.className = 'ones-columns-container';
    wrapper.appendChild(onesContainer);
    
    onesSection.appendChild(wrapper);
    container.appendChild(onesSection);
  }

  triggerFlyingAnimation(clickedElement, targetCount, isTenRod = false) {
    if (!clickedElement) {
      this.updateTowers(targetCount, isTenRod, true);
      return;
    }

    const isSubtraction = ['l6b_two_digit_sub_no_borrow', 'l7_two_digit_sub_borrow'].includes(this.activeLevel.id);

    // 1. Get positions and copy computed styles BEFORE hiding/graying out
    const rect = clickedElement.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(clickedElement);
    const beadColor = clickedElement.style.getPropertyValue('--bead-color');
    const rodColor = clickedElement.style.getPropertyValue('--rod-color');
    const unitColor = clickedElement.style.getPropertyValue('--unit-color');
    
    const originalBackground = computedStyle.background;
    const originalBorderRadius = computedStyle.borderRadius;
    const originalInnerHTML = clickedElement.innerHTML;
    const originalColor = computedStyle.color;
    const originalFontSize = computedStyle.fontSize;
    const originalFontFamily = computedStyle.fontFamily;

    // 2. Hide / gray out clicked element immediately at the start of the animation
    if (isSubtraction) {
      clickedElement.style.opacity = '0';
      clickedElement.style.pointerEvents = 'none';
    } else {
      clickedElement.classList.add('moved');
      clickedElement.style.pointerEvents = 'none';
    }
    
    let targetCell;
    if (isSubtraction) {
      if (isTenRod) {
        targetCell = document.querySelector('.base10-tens .base10-rod.sub-placeholder');
      } else {
        targetCell = document.querySelector('.base10-ones .base10-unit.sub-placeholder');
      }
    } else {
      if (isTenRod) {
        const tensContainer = document.querySelector('.tens-columns-container');
        if (tensContainer) {
          targetCell = tensContainer.lastElementChild || tensContainer;
        }
      } else {
        const onesCells = document.querySelectorAll('.ones-section .tower-cell');
        const onesDigit = targetCount % 10;
        const cellIndex = onesDigit === 0 ? 9 : onesDigit - 1;
        targetCell = onesCells[cellIndex] || document.querySelector('.ones-section .tower-column');
      }
    }
    
    if (!targetCell) {
      this.updateTowers(targetCount, isTenRod, true);
      return;
    }
    
    const targetRect = targetCell.getBoundingClientRect();
    
    // 3. Create flyer particle
    const flyer = document.createElement('div');
    flyer.className = isTenRod ? 'flying-rod-particle' : 'flying-bead-particle';
    
    // Position flyer initially at clicked element (using fixed position)
    flyer.style.position = 'fixed';
    flyer.style.left = `${rect.left}px`;
    flyer.style.top = `${rect.top}px`;
    flyer.style.width = `${rect.width}px`;
    flyer.style.height = `${rect.height}px`;
    flyer.style.zIndex = '9999';
    flyer.style.pointerEvents = 'none';
    
    if (isSubtraction) {
      if (isTenRod) {
        flyer.style.background = 'linear-gradient(135deg, #80d8ff, #40c4ff)';
        flyer.style.borderRadius = '6px';
        flyer.style.border = '2px solid #00b0ff';
        flyer.style.display = 'flex';
        flyer.style.flexDirection = 'column';
        flyer.style.justifyContent = 'space-between';
        for (let k = 0; k < 10; k++) {
          const tick = document.createElement('div');
          tick.className = 'rod-tick';
          flyer.appendChild(tick);
        }
      } else {
        flyer.style.background = 'linear-gradient(135deg, #ff8a80, #ff5252)';
        flyer.style.borderRadius = '4px';
        flyer.style.border = '2px solid #ff1744';
      }
    } else {
      if (isTenRod) {
        flyer.style.background = rodColor || originalBackground;
        flyer.style.borderRadius = originalBorderRadius || '6px';
        flyer.style.border = '2px solid rgba(0,0,0,0.15)';
        flyer.innerHTML = originalInnerHTML;
        flyer.style.display = 'flex';
        flyer.style.flexDirection = 'column';
        flyer.style.justifyContent = 'space-between';
      } else if (beadColor) {
        flyer.style.background = beadColor;
        flyer.style.borderRadius = '50%';
        flyer.style.border = '2px solid rgba(0,0,0,0.15)';
      } else if (unitColor) {
        flyer.style.background = unitColor;
        flyer.style.borderRadius = originalBorderRadius || '4px';
        flyer.style.border = '2px solid rgba(0,0,0,0.15)';
      } else {
        flyer.innerHTML = originalInnerHTML;
        flyer.style.background = originalBackground || 'var(--palette-pri)';
        flyer.style.borderRadius = originalBorderRadius;
        flyer.style.display = 'flex';
        flyer.style.alignItems = 'center';
        flyer.style.justifyContent = 'center';
        flyer.style.color = originalColor;
        flyer.style.fontSize = originalFontSize;
        flyer.style.fontFamily = originalFontFamily;
      }
    }
    
    document.body.appendChild(flyer);
    
    // Force reflow
    flyer.getBoundingClientRect();
    
    // 4. Animate flyer towards target cell (deferred to next tick to prevent style batching)
    setTimeout(() => {
      flyer.style.transition = 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
      flyer.style.left = `${targetRect.left}px`;
      flyer.style.top = `${targetRect.top}px`;
      flyer.style.width = `${targetRect.width}px`;
      flyer.style.height = `${targetRect.height}px`;
      flyer.style.opacity = '0.3';
      flyer.style.transform = 'scale(0.7)';
    }, 20);
    
    // 5. Upon completion, remove flyer and update towers
    setTimeout(() => {
      flyer.remove();
      this.updateTowers(targetCount, isTenRod, true);
    }, 520);
  }

  updateTowers(targetCount, immediate = false, force = false) {
    if (this.isTowersAnimating && !force) {
      setTimeout(() => this.updateTowers(targetCount, immediate, force), 100);
      return;
    }
    
    const isDoubleDigit = !!document.querySelector('.tens-section');
    
    const drawFilledState = (countVal) => {
      let ones = countVal % 10;
      let tens = Math.floor(countVal / 10);
      
      const levelId = this.activeLevel.id;
      const data = this.activeQuestion ? this.activeQuestion.visualData : null;
      const isSubtraction = ['l6b_two_digit_sub_no_borrow', 'l7_two_digit_sub_borrow'].includes(levelId);

      if (isSubtraction && this.subInitialOnes > 9) {
        tens = Math.min(this.subInitialTens, Math.floor(countVal / 10));
        ones = countVal - tens * 10;
      }
      if (levelId === 'l6_two_digit_add_carry' && !this.tensOfNum1Loaded) {
        if (countVal >= 10) {
          tens = 0;
          ones = countVal - 10;
        } else {
          tens = 0;
          ones = countVal;
        }
      }
      
      const carrySection = document.querySelector('.carry-section');
      const carryCols = document.querySelector('.carry-columns-container');
      const carryDigit = document.getElementById('carry-tower-digit');

      if (carrySection && carryCols && carryDigit) {
        if (levelId === 'l6_two_digit_add_carry') {
          if (!this.tensOfNum1Loaded && countVal >= 10) {
            carrySection.classList.remove('hidden');
            carryDigit.innerText = '1';
            
            carryCols.innerHTML = '';
            const col = document.createElement('div');
            col.className = 'tower-column';
            for (let i = 0; i < 10; i++) {
              const cell = document.createElement('div');
              cell.className = 'tower-cell filled carry-yellow';
              col.appendChild(cell);
            }
            carryCols.appendChild(col);
          } else {
            carrySection.classList.add('hidden');
            carryDigit.innerText = '0';
            carryCols.innerHTML = '';
          }
        }
      }
      const onesContainer = document.querySelector('.ones-columns-container');
      if (onesContainer) {
        onesContainer.innerHTML = '';
        if (ones > 10) {
          const colsCount = [10, ones - 10];
          colsCount.forEach((colFilledCount, colIdx) => {
            const col = document.createElement('div');
            col.className = 'tower-column';
            for (let i = 0; i < 10; i++) {
              const cell = document.createElement('div');
              cell.className = 'tower-cell';
              if (i < colFilledCount) {
                cell.classList.add('filled');
                if (isSubtraction && data) {
                  cell.style.cursor = 'pointer';
                  cell.onclick = () => {
                    const hasBorrowed = this.subInitialOnes > 9;
                    if (data.borrowRequired && !hasBorrowed) {
                      audioEngine.speak("We do not have enough Ones blocks to subtract! Tap on a Tens tower column on the right to borrow and unpack a Ten first.");
                      cell.classList.add('shake');
                      setTimeout(() => cell.classList.remove('shake'), 500);
                      return;
                    }
                    let currentOnesInTower = this.towerTargetCount % 10;
                    if (hasBorrowed) {
                      const t = Math.min(this.subInitialTens, Math.floor(this.towerTargetCount / 10));
                      currentOnesInTower = this.towerTargetCount - t * 10;
                    }
                    const currentOnesSubtracted = this.subInitialOnes - currentOnesInTower;
                    if (currentOnesSubtracted >= data.num2_ones) {
                      audioEngine.speak("You've already subtracted all the Ones!");
                      return;
                    }
                    this.visualsState.blockClicked = true;
                    this.visualsState.isTenRod = false;
                    this.visualsState.clickedElement = cell;
                    this.onVisualStateChange(this.visualsState);
                  };
                }
              }
              col.appendChild(cell);
            }
            onesContainer.appendChild(col);
          });
        } else {
          const col = document.createElement('div');
          col.className = 'tower-column';
          for (let i = 0; i < 10; i++) {
            const cell = document.createElement('div');
            cell.className = 'tower-cell';
            if (i < ones) {
              cell.classList.add('filled');
              if (isSubtraction && data) {
                cell.style.cursor = 'pointer';
                cell.onclick = () => {
                  const hasBorrowed = this.subInitialOnes > 9;
                  if (data.borrowRequired && !hasBorrowed) {
                    audioEngine.speak("We do not have enough Ones blocks to subtract! Tap on a Tens tower column on the right to borrow and unpack a Ten first.");
                    cell.classList.add('shake');
                    setTimeout(() => cell.classList.remove('shake'), 500);
                    return;
                  }
                  let currentOnesInTower = this.towerTargetCount % 10;
                  if (hasBorrowed) {
                    const t = Math.min(this.subInitialTens, Math.floor(this.towerTargetCount / 10));
                    currentOnesInTower = this.towerTargetCount - t * 10;
                  }
                  const currentOnesSubtracted = this.subInitialOnes - currentOnesInTower;
                  if (currentOnesSubtracted >= data.num2_ones) {
                    audioEngine.speak("You've already subtracted all the Ones!");
                    return;
                  }
                  this.visualsState.blockClicked = true;
                  this.visualsState.isTenRod = false;
                  this.visualsState.clickedElement = cell;
                  this.onVisualStateChange(this.visualsState);
                };
              }
            }
            col.appendChild(cell);
          }
          onesContainer.appendChild(col);
        }
      }
      
      const tensContainer = document.querySelector('.tens-columns-container');
      if (tensContainer) {
        tensContainer.innerHTML = '';
        for (let t = 0; t < tens; t++) {
          const col = document.createElement('div');
          col.className = 'tower-column';
          
          if (isSubtraction && data) {
            col.style.cursor = 'pointer';
            col.onclick = () => {
              const hasBorrowed = this.subInitialOnes > 9;

              if (levelId === 'l7_two_digit_sub_borrow' && !hasBorrowed) {
                const borrowTrigger = document.getElementById('btn-borrow-trigger');
                if (borrowTrigger) {
                  borrowTrigger.click();
                } else {
                  this.visualsState.borrowTriggered = true;
                  this.onVisualStateChange(this.visualsState);
                }
                return;
              }

              // Check if ones answer is correct first!
              const onesInput = document.getElementById('ans-ones');
              const correctOnesDigit = data.borrowRequired 
                ? (10 + data.num1_ones) - data.num2_ones 
                : data.num1_ones - data.num2_ones;
              const currentOnesVal = onesInput ? parseInt(onesInput.value) : NaN;
              
              if (isNaN(currentOnesVal) || currentOnesVal !== correctOnesDigit) {
                audioEngine.speak("Let's subtract the Ones blocks first, and write the answer in the Ones column!");
                col.classList.add('shake');
                setTimeout(() => col.classList.remove('shake'), 500);
                return;
              }

              const currentTensSubtracted = this.subInitialTens - Math.floor(this.towerTargetCount / 10);
              if (currentTensSubtracted >= data.num2_tens) {
                audioEngine.speak("You've already subtracted all the Tens!");
                return;
              }

              this.visualsState.blockClicked = true;
              this.visualsState.isTenRod = true;
              this.visualsState.clickedElement = col;
              this.onVisualStateChange(this.visualsState);
            };
          }

          for (let i = 0; i < 10; i++) {
            const cell = document.createElement('div');
            cell.className = 'tower-cell filled';
            if (levelId === 'l6_two_digit_add_carry' && t === 0) {
              cell.classList.add('carry-yellow');
            }
            col.appendChild(cell);
          }
          tensContainer.appendChild(col);
        }
      }

      // Update tower digits!
      const onesDigitEl = document.getElementById('ones-tower-digit');
      if (onesDigitEl) {
        onesDigitEl.innerText = ones;
      }
      const tensDigitEl = document.getElementById('tens-tower-digit');
      if (tensDigitEl) {
        tensDigitEl.innerText = tens;
      }

      const carryBubble = document.getElementById('tens-carry-bubble');
      if (carryBubble) {
        if (levelId === 'l6_two_digit_add_carry') {
          if (countVal >= 10) {
            carryBubble.innerText = '1';
            carryBubble.classList.add('visible-carry');
            carryBubble.classList.remove('hidden-carry');
            if (!this.carryAudioPlayed) {
              this.carryAudioPlayed = true;
              audioEngine.playSuccess();
              audioEngine.speak("Ten Ones make one Ten! Let's write the carry 1 above the Tens column!");
            }
          } else {
            if (!this.tensOfNum1Loaded) {
              carryBubble.innerText = '0';
              carryBubble.classList.add('hidden-carry');
              carryBubble.classList.remove('visible-carry');
            }
          }
        }
      }

      // For subtraction levels, update the left side blocks (num2 placeholders)
      if (isSubtraction && data) {
        const subtractedOnes = Math.max(0, this.subInitialOnes - ones);
        const subtractedTens = Math.max(0, this.subInitialTens - tens);
        
        const leftRods = document.querySelectorAll('.base10-tens .base10-rod');
        leftRods.forEach((rod, idx) => {
          if (idx < subtractedTens) {
            rod.classList.remove('sub-placeholder');
            rod.style.background = 'var(--palette-sec)';
          } else {
            rod.classList.add('sub-placeholder');
            rod.style.background = '';
          }
        });

        const leftUnits = document.querySelectorAll('.base10-ones .base10-unit');
        leftUnits.forEach((unit, idx) => {
          if (idx < subtractedOnes) {
            unit.classList.remove('sub-placeholder');
            unit.style.background = 'var(--palette-sec)';
          } else {
            unit.classList.add('sub-placeholder');
            unit.style.background = '';
          }
        });
      }
    };
    
    this.towerTargetCount = targetCount;

    if (immediate) {
      this.currentTowerCount = targetCount;
      drawFilledState(targetCount);
      return;
    }
    
    if (this.isTowersStepLoopRunning) {
      return;
    }
    this.isTowersStepLoopRunning = true;
    
    const step = () => {
      if (this.currentTowerCount === this.towerTargetCount) {
        this.isTowersStepLoopRunning = false;
        return;
      }
      
      if (this.currentTowerCount < this.towerTargetCount) {
        const nextCount = this.currentTowerCount + 1;
        const prevOnes = this.currentTowerCount % 10;
        const nextOnes = nextCount % 10;
        
        if (prevOnes === 9 && nextOnes === 0 && isDoubleDigit && !(this.activeLevel.id === 'l6_two_digit_add_carry' && !this.tensOfNum1Loaded)) {
          this.isTowersAnimating = true;
          
          // 1. Show Ones fully filled
          const onesCells = document.querySelectorAll('.ones-section .tower-cell');
          onesCells.forEach(cell => cell.classList.add('filled'));
          
          // 2. Animate the slide-over
          const container = document.getElementById('classroom-towers-container');
          const onesCol = document.querySelector('.ones-section .tower-column');
          const tensContainer = document.querySelector('.tens-columns-container');
          
          if (container && onesCol && tensContainer) {
            // Append a temporary placeholder to tensContainer
            const placeholderCol = document.createElement('div');
            placeholderCol.className = 'tower-column';
            placeholderCol.style.opacity = '0';
            tensContainer.appendChild(placeholderCol);
            
            const containerRect = container.getBoundingClientRect();
            const onesRect = onesCol.getBoundingClientRect();
            const placeholderRect = placeholderCol.getBoundingClientRect();
            
            const overlay = document.createElement('div');
            overlay.className = 'sliding-rod-overlay';
            overlay.style.left = `${onesRect.left - containerRect.left}px`;
            overlay.style.top = `${onesRect.top - containerRect.top}px`;
            overlay.style.width = `${onesRect.width}px`;
            overlay.style.height = `${onesRect.height}px`;
            
            // Build 10 filled cells inside overlay to look like a full tower
            for (let i = 0; i < 10; i++) {
              const cell = document.createElement('div');
              cell.className = 'tower-cell filled';
              overlay.appendChild(cell);
            }
            
            const xOffset = placeholderRect.left - onesRect.left;
            overlay.style.setProperty('--slide-x-offset', `${xOffset}px`);
            
            container.appendChild(overlay);
            
            // Fade out the ones cells instantly
            onesCells.forEach(cell => cell.classList.remove('filled'));
            
            // Wait for slide animation (800ms)
            setTimeout(() => {
              overlay.remove();
              placeholderCol.remove();
              this.currentTowerCount = nextCount;
              drawFilledState(nextCount);
              this.isTowersAnimating = false;
              
              // Proceed to next step
              setTimeout(step, 100);
            }, 800);
          } else {
            this.currentTowerCount = nextCount;
            drawFilledState(nextCount);
            this.isTowersAnimating = false;
            setTimeout(step, 100);
          }
        } else {
          this.currentTowerCount = nextCount;
          drawFilledState(nextCount);
          setTimeout(step, 100);
        }
      } else {
        // Decrementing
        this.currentTowerCount--;
        drawFilledState(this.currentTowerCount);
        setTimeout(step, 100);
      }
    };
    
    step();
  }
}

export const uiManager = new UIManager();
