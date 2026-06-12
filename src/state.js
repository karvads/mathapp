// MathQuest State Manager

const STORAGE_KEY = 'mathquest_app_data';

// Level IDs in order of pedagogical progression
export const LEVEL_IDS = [
  'l1_counting',
  'l2_numbers_to_20',
  'l3_addition',
  'l4_subtraction',
  'l5_two_digit_add',
  'l6_two_digit_add_carry',
  'l6b_two_digit_sub_no_borrow',
  'l7_two_digit_sub_borrow',
  'l8_multiplication',
  'l9_division'
];

// Presets for kid profiles
export const AVATARS = ['🦖', '🦄', '🚀', '🧸', '🎨', '🐱', '🐶', '🦁', '🦉', '🦊', '🐼', '🐨'];
export const PALETTES = [
  { name: 'Berry Candy', color: '#ff6b8b', gradient: 'linear-gradient(135deg, #ff6b8b 0%, #ff8e53 100%)', text: '#ffffff' },
  { name: 'Ocean Quest', color: '#4facfe', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', text: '#ffffff' },
  { name: 'Jungle Bounce', color: '#4caf50', gradient: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)', text: '#ffffff' },
  { name: 'Sunny Sparkle', color: '#ffb300', gradient: 'linear-gradient(135deg, #ffb300 0%, #fbc02d 100%)', text: '#3e2723' },
  { name: 'Magic Space', color: '#7b1fa2', gradient: 'linear-gradient(135deg, #7b1fa2 0%, #e040fb 100%)', text: '#ffffff' },
  { name: 'Sweet Coral', color: '#ff7a59', gradient: 'linear-gradient(135deg, #ff7a59 0%, #ffc3a0 100%)', text: '#ffffff' }
];

// Initialize application state from LocalStorage or default values
class StateManager {
  constructor() {
    this.data = this.loadFromStorage() || {
      profiles: [],
      activeProfileId: null,
      parentMode: false
    };

    // Migration to ensure existing profiles have all levels in LEVEL_IDS
    if (this.data && this.data.profiles) {
      let migrated = false;
      this.data.profiles.forEach(p => {
        if (!p.progress) p.progress = {};
        LEVEL_IDS.forEach((lvlId, index) => {
          if (!p.progress[lvlId]) {
            migrated = true;
            // Determine if level should be unlocked based on subsequent levels
            let unlocked = index === 0;
            for (let i = index; i < LEVEL_IDS.length; i++) {
              const subsequentLvlId = LEVEL_IDS[i];
              if (p.progress[subsequentLvlId] && p.progress[subsequentLvlId].unlocked) {
                unlocked = true;
                break;
              }
            }
            p.progress[lvlId] = {
              completed: false,
              score: 0,
              unlocked
            };
          }
        });
      });
      if (migrated) {
        this.saveToStorage();
      }
    }
  }

  loadFromStorage() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      return serialized ? JSON.parse(serialized) : null;
    } catch (e) {
      console.error('Failed to load state from LocalStorage:', e);
      return null;
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save state to LocalStorage:', e);
    }
  }

  getProfiles() {
    return this.data.profiles;
  }

  getActiveProfile() {
    if (!this.data.activeProfileId) return null;
    return this.data.profiles.find(p => p.id === this.data.activeProfileId) || null;
  }

  setActiveProfile(profileId) {
    this.data.activeProfileId = profileId;
    this.saveToStorage();
  }

  createProfile(name, avatar, paletteIndex) {
    const id = 'profile_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // Level 1 is unlocked by default
    const progress = {};
    LEVEL_IDS.forEach((lvlId, index) => {
      progress[lvlId] = {
        completed: false,
        score: 0,
        unlocked: index === 0 // only level 1 is unlocked by default
      };
    });

    const newProfile = {
      id,
      name: name.trim() || 'Hero',
      avatar: avatar || '🦖',
      paletteIndex: paletteIndex !== undefined ? paletteIndex : 0,
      progress
    };

    this.data.profiles.push(newProfile);
    this.data.activeProfileId = id;
    this.saveToStorage();
    return newProfile;
  }

  deleteProfile(profileId) {
    this.data.profiles = this.data.profiles.filter(p => p.id !== profileId);
    if (this.data.activeProfileId === profileId) {
      this.data.activeProfileId = this.data.profiles.length > 0 ? this.data.profiles[0].id : null;
    }
    this.saveToStorage();
  }

  // Update profile level stats after a test or practice
  updateLevelProgress(levelId, score, isTest = false) {
    const profile = this.getActiveProfile();
    if (!profile) return;

    const levelProg = profile.progress[levelId];
    if (!levelProg) return;

    if (isTest) {
      // If score is 80% or greater, complete level and unlock next level
      if (score >= 80) {
        levelProg.completed = true;
        levelProg.score = Math.max(levelProg.score, score);
        
        // Unlock next level in progression
        const currentIndex = LEVEL_IDS.indexOf(levelId);
        if (currentIndex !== -1 && currentIndex + 1 < LEVEL_IDS.length) {
          const nextLevelId = LEVEL_IDS[currentIndex + 1];
          if (profile.progress[nextLevelId]) {
            profile.progress[nextLevelId].unlocked = true;
          }
        }
      } else {
        // If not passing, just update the high score attempt if higher
        levelProg.score = Math.max(levelProg.score, score);
      }
    }
    this.saveToStorage();
  }

  // Check if a specific level is unlocked for the active kid
  isLevelUnlocked(levelId) {
    if (this.data.parentMode) return true; // Parent mode unlocks everything
    
    const profile = this.getActiveProfile();
    if (!profile) return false;
    
    return profile.progress[levelId]?.unlocked || false;
  }

  // Toggle Parent Mode
  setParentMode(enabled) {
    this.data.parentMode = !!enabled;
    this.saveToStorage();
  }

  isParentModeActive() {
    return this.data.parentMode;
  }

  // Generate a parent-gate math puzzle
  generateParentGatePuzzle() {
    const a = Math.floor(Math.random() * 5) + 3; // 3 to 7
    const b = Math.floor(Math.random() * 5) + 2; // 2 to 6
    const c = Math.floor(Math.random() * 3) + 2; // 2 to 4
    const d = Math.floor(Math.random() * 6) + 1; // 1 to 6

    // Puzzle equation: (a + b) * c - d
    // e.g. (4 + 3) * 2 - 5 = 7 * 2 - 5 = 14 - 5 = 9
    const questionText = `(${a} + ${b}) × ${c} − ${d}`;
    const answerValue = (a + b) * c - d;

    return {
      text: questionText,
      answer: answerValue
    };
  }
}

export const stateManager = new StateManager();
