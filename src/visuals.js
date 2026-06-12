// MathQuest Interactive Visuals Renderer
import { audioEngine } from './audio.js';

export class VisualsRenderer {
  constructor(containerId) {
    this.containerId = containerId;
    this.tappedItems = new Set(); // tracks counted items to avoid double speech count
  }

  getContainer() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Visuals container with ID "${this.containerId}" not found.`);
    }
    return container;
  }

  clear() {
    const container = this.getContainer();
    if (container) {
      container.innerHTML = '';
      container.className = 'visuals-container';
    }
    this.tappedItems.clear();
  }

  // Render the current question's visual helper
  render(levelId, visualData, onStateChange = null) {
    this.clear();
    const container = this.getContainer();
    if (!container) return;

    container.classList.add(`visual-${levelId}`);

    switch (levelId) {
      case 'l1_counting':
        this.renderBeads(visualData.count, onStateChange);
        break;
      case 'l2_numbers_to_20':
        this.renderTenFrame(visualData, onStateChange);
        break;
      case 'l3_addition':
        this.renderApples(visualData, onStateChange);
        break;
      case 'l4_subtraction':
        this.renderBalloons(visualData, onStateChange);
        break;
      case 'l5_two_digit_add':
      case 'l6_two_digit_add_carry':
        this.renderColumnAddition(visualData, onStateChange);
        break;
      case 'l6b_two_digit_sub_no_borrow':
      case 'l7_two_digit_sub_borrow':
        this.renderColumnSubtraction(visualData, onStateChange);
        break;
      case 'l8_multiplication':
        this.renderMultiplicationGrid(visualData.rows, visualData.cols, onStateChange);
        break;
      case 'l9_division':
        this.renderDivisionSharing(visualData.total, visualData.plates, onStateChange);
        break;
      default:
        container.innerHTML = '<div class="no-visuals">✨ Ready for math! ✨</div>';
    }
  }

  // LEVEL 1: Abacus Bead Slider
  renderBeads(totalBeads, onStateChange) {
    const container = this.getContainer();
    
    const abacusFrame = document.createElement('div');
    abacusFrame.className = 'abacus-frame';
    
    const abacusWire = document.createElement('div');
    abacusWire.className = 'abacus-wire';
    
    // We show a total wire length that fits 10 beads.
    const maxBeads = 10;
    const beadsList = [];
    
    // Tracks how many beads have been slid to the "counted" right side
    let countedCount = 0;

    for (let i = 0; i < totalBeads; i++) {
      const bead = document.createElement('button');
      bead.className = 'abacus-bead';
      bead.setAttribute('aria-label', `Bead ${i + 1}`);
      bead.style.setProperty('--bead-color', `hsl(${15 + (i * 35)}, 85%, 65%)`);
      
      bead.addEventListener('click', () => {
        if (bead.classList.contains('slid')) return; // Lock the bead once clicked
        
        // Hide and lock the bead on the wire immediately
        bead.classList.add('slid');
        bead.style.opacity = '0';
        bead.style.pointerEvents = 'none';
        countedCount++;
        audioEngine.playClick();
        audioEngine.speak(`${countedCount}`);
        
        if (onStateChange) {
          onStateChange({ currentCount: countedCount, clickedElement: bead, isIncrement: true });
        }
      });

      beadsList.push(bead);
      abacusWire.appendChild(bead);
    }

    abacusFrame.appendChild(abacusWire);
    container.appendChild(abacusFrame);
  }

  // LEVEL 2: Ten-Frames & Comparisons
  renderTenFrame(data, onStateChange) {
    const container = this.getContainer();

    if (data.mode === 'count') {
      const frameWrapper = document.createElement('div');
      frameWrapper.className = 'tenframe-wrapper';

      const totalSpheres = data.count;
      let clickedCount = 0;

      // Draw two ten-frames (max 20 spheres)
      for (let f = 0; f < 2; f++) {
        const frame = document.createElement('div');
        frame.className = 'ten-frame';

        for (let cellIdx = 0; cellIdx < 10; cellIdx++) {
          const cell = document.createElement('div');
          cell.className = 'ten-frame-cell';

          const sphereIdx = f * 10 + cellIdx;
          if (sphereIdx < totalSpheres) {
            const sphere = document.createElement('button');
            sphere.className = 'tenframe-sphere';
            sphere.style.background = f === 0 ? 'var(--palette-sec)' : 'var(--palette-pri)';
            sphere.setAttribute('aria-label', `Sphere ${sphereIdx + 1}`);
            
            sphere.addEventListener('click', () => {
              if (sphere.classList.contains('clicked')) return;
              
              sphere.classList.add('clicked');
              sphere.disabled = true;
              clickedCount++;
              audioEngine.playClick();
              audioEngine.speak(`${clickedCount}`);
              
              if (onStateChange) {
                onStateChange({ currentCount: clickedCount, clickedElement: sphere, isIncrement: true });
              }
            });
            cell.appendChild(sphere);
          }
          frame.appendChild(cell);
        }
        frameWrapper.appendChild(frame);
      }
      container.appendChild(frameWrapper);

    } else {
      // Comparison Mode: Show two visual groups
      const compareWrapper = document.createElement('div');
      compareWrapper.className = 'compare-wrapper';

      const renderGroup = (num, isLeft) => {
        const groupCard = document.createElement('div');
        groupCard.className = 'compare-group-card';
        
        const numberLabel = document.createElement('div');
        numberLabel.className = 'compare-number';
        numberLabel.innerText = num;
        
        // Towers layout
        const towersLayout = document.createElement('div');
        towersLayout.className = 'compare-towers-layout';

        const tens = Math.floor(num / 10);
        const ones = num % 10;

        // Tens Column
        const tensColWrapper = document.createElement('div');
        tensColWrapper.className = 'compare-tower-wrapper tens-tower-wrapper';
        
        const tensHdr = document.createElement('div');
        tensHdr.className = 'compare-tower-hdr';
        tensHdr.innerText = 'Tens';
        tensColWrapper.appendChild(tensHdr);

        const tensCol = document.createElement('div');
        tensCol.className = 'compare-tower-column tens-column';
        for (let i = 0; i < 10; i++) {
          const cell = document.createElement('div');
          cell.className = 'compare-tower-cell';
          if (i < tens * 10) { // Since tens value is 1, fill all 10 cells of the tens tower
            cell.classList.add('filled-tens');
          }
          tensCol.appendChild(cell);
        }
        tensColWrapper.appendChild(tensCol);

        // Ones Column (with side ruler/number markers)
        const onesColWrapper = document.createElement('div');
        onesColWrapper.className = 'compare-tower-wrapper ones-tower-wrapper';
        
        const onesHdr = document.createElement('div');
        onesHdr.className = 'compare-tower-hdr';
        onesHdr.innerText = 'Ones';
        onesColWrapper.appendChild(onesHdr);

        const onesRow = document.createElement('div');
        onesRow.className = 'compare-ones-row';

        // Ones vertical ruler/number markers
        const ruler = document.createElement('div');
        ruler.className = 'compare-tower-ruler';
        for (let i = 1; i <= 10; i++) {
          const mark = document.createElement('div');
          mark.className = 'compare-ruler-mark';
          if (i === 5) {
            mark.classList.add('mark-mid');
          } else if (i === 10) {
            mark.classList.add('mark-high');
          }
          mark.innerText = i;
          ruler.appendChild(mark);
        }
        onesRow.appendChild(ruler);

        // Ones column tower
        const onesCol = document.createElement('div');
        onesCol.className = 'compare-tower-column ones-column';
        for (let i = 1; i <= 10; i++) {
          const cell = document.createElement('div');
          cell.className = 'compare-tower-cell';
          if (i <= ones) {
            cell.classList.add('filled-ones');
          }
          onesCol.appendChild(cell);
        }
        onesRow.appendChild(onesCol);
        onesColWrapper.appendChild(onesRow);

        towersLayout.appendChild(tensColWrapper);
        towersLayout.appendChild(onesColWrapper);

        groupCard.appendChild(numberLabel);
        groupCard.appendChild(towersLayout);
        return groupCard;
      };

      const leftCard = renderGroup(data.num1, true);
      const rightCard = renderGroup(data.num2, false);

      compareWrapper.appendChild(leftCard);
      compareWrapper.appendChild(rightCard);
      container.appendChild(compareWrapper);
    }
  }

  // LEVEL 3: Addition compartment boxes
  renderApples(data, onStateChange) {
    const container = this.getContainer();
    
    const sandbox = document.createElement('div');
    sandbox.className = 'addition-sandbox';

    const leftBox = document.createElement('div');
    leftBox.className = 'addition-chamber left-chamber';
    leftBox.innerHTML = `<h3>Group 1</h3>`;
    
    const rightBox = document.createElement('div');
    rightBox.className = 'addition-chamber right-chamber';
    rightBox.innerHTML = `<h3>Group 2</h3>`;

    let activeCount = 0;
    const emojiMap = { apple: '🍎', star: '⭐', flower: '🌸' };
    const emoji = emojiMap[data.itemType] || '🍎';

    const createItem = (id, colorClass) => {
      const btn = document.createElement('button');
      btn.className = `addition-item ${colorClass}`;
      btn.innerHTML = emoji;
      btn.setAttribute('aria-label', `item`);
      btn.addEventListener('click', () => {
        if (btn.classList.contains('counted')) return;
        
        btn.classList.add('counted');
        btn.disabled = true;
        activeCount++;
        audioEngine.playClick();
        activeCount = Math.max(0, activeCount);
        audioEngine.speak(`${activeCount}`);
        
        if (onStateChange) {
          onStateChange({ currentCount: activeCount, clickedElement: btn, isIncrement: true });
        }
      });
      return btn;
    };

    for (let i = 0; i < data.num1; i++) {
      leftBox.appendChild(createItem(`l_${i}`, 'red-bubble'));
    }

    for (let i = 0; i < data.num2; i++) {
      rightBox.appendChild(createItem(`r_${i}`, 'blue-bubble'));
    }

    sandbox.appendChild(leftBox);
    sandbox.appendChild(rightBox);
    container.appendChild(sandbox);
  }

  // LEVEL 4: Balloon Subtraction
  renderBalloons(data, onStateChange) {
    const container = this.getContainer();
    const balloonWrapper = document.createElement('div');
    balloonWrapper.className = 'balloon-wrapper';

    let poppedCount = 0;
    const totalBalloons = data.total;

    for (let i = 0; i < totalBalloons; i++) {
      const balloonContainer = document.createElement('div');
      balloonContainer.className = 'balloon-container';

      const balloon = document.createElement('button');
      balloon.className = 'balloon-item';
      balloon.style.setProperty('--balloon-color', `hsl(${200 + (i * 40)}, 85%, 60%)`);
      balloon.innerHTML = `
        <svg viewBox="0 0 100 120" width="70" height="90">
          <ellipse cx="50" cy="50" rx="40" ry="50" />
          <polygon points="50,100 45,108 55,108" />
          <path d="M50,108 Q45,115 50,120" fill="none" stroke="#aaa" stroke-width="2"/>
        </svg>
      `;
      balloon.setAttribute('aria-label', `Balloon ${i + 1}`);

      balloon.addEventListener('click', (e) => {
        if (!balloon.classList.contains('popped')) {
          // Only allow popping up to the minimum of two numbers (which is the subtrahend 'data.subtract')
          if (poppedCount >= data.subtract) {
            return;
          }
          
          balloon.classList.add('popped');
          poppedCount++;
          audioEngine.playIncorrect(); // Play a nice pop synth noise
          audioEngine.speak(`Pop! ${poppedCount}`);

          // Premium popping animation: spawn colorful micro-particles flying outward
          const rect = balloon.getBoundingClientRect();
          const balloonColor = balloon.style.getPropertyValue('--balloon-color') || 'hsl(200, 85%, 60%)';
          
          for (let pIdx = 0; pIdx < 8; pIdx++) {
            const particle = document.createElement('div');
            particle.className = 'pop-particle';
            particle.style.background = balloonColor;
            
            // Outward direction and random distance
            const angle = (pIdx * 45) + (Math.random() * 20 - 10);
            const distance = 40 + Math.random() * 40;
            particle.style.setProperty('--dx', `${Math.cos(angle * Math.PI / 180) * distance}px`);
            particle.style.setProperty('--dy', `${Math.sin(angle * Math.PI / 180) * distance}px`);
            
            // Set initial position at center of balloon button
            particle.style.left = `${rect.left + rect.width / 2}px`;
            particle.style.top = `${rect.top + rect.height / 2}px`;
            
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 600);
          }
          if (poppedCount === data.subtract) {
            balloonWrapper.classList.add('popped-complete');
            setTimeout(() => {
              audioEngine.playSuccess();
              audioEngine.speak(`Awesome! You popped ${data.subtract} balloons. Now count how many balloons are left!`);
            }, 600);
          }
        }

        if (onStateChange) {
          onStateChange({ poppedCount });
        }
      });

      balloonContainer.appendChild(balloon);
      balloonWrapper.appendChild(balloonContainer);
    }

    container.appendChild(balloonWrapper);
  }

  // LEVEL 5 & 6: Two Digit Column Addition (Carrying)
  renderColumnAddition(data, onStateChange) {
    const container = this.getContainer();
    
    const wrapper = document.createElement('div');
    wrapper.className = 'column-math-wrapper';

    // Left visual Blocks
    const blockDisplay = document.createElement('div');
    blockDisplay.className = 'base10-blocks-display';
    blockDisplay.innerHTML = '<h4>Base 10 Visual</h4>';
    
    const renderBase10 = (num, color, isNum1 = true) => {
      const blockGroup = document.createElement('div');
      blockGroup.className = 'base10-group';
      
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      
      // Render tens rods
      const tensDiv = document.createElement('div');
      tensDiv.className = 'base10-tens';
      for (let t = 0; t < tens; t++) {
        const rod = document.createElement('button');
        rod.className = 'base10-rod';
        rod.style.setProperty('--rod-color', color);
        rod.style.background = color;
        rod.title = '10 Rod';
        
        // Add 10 division ticks
        for (let tick = 0; tick < 10; tick++) {
          const tickDiv = document.createElement('div');
          tickDiv.className = 'rod-tick';
          rod.appendChild(tickDiv);
        }
        
        if (isNum1) {
          rod.classList.add('num1-block', 'num1-rod');
        } else {
          rod.addEventListener('click', () => {
            if (rod.classList.contains('moved')) return;

            // Check if ones answer is correct first!
            const onesInput = document.getElementById('ans-ones');
            const correctOnesDigit = (data.num1_ones + data.num2_ones) % 10;
            const currentOnesVal = onesInput ? parseInt(onesInput.value) : NaN;

            if (isNaN(currentOnesVal) || currentOnesVal !== correctOnesDigit) {
              audioEngine.speak("Let's count the Ones blocks first, and write the answer in the Ones column!");
              rod.classList.add('shake');
              setTimeout(() => {
                rod.classList.remove('shake');
              }, 500);
              return;
            }

            audioEngine.playClick();
            if (onStateChange) {
              onStateChange({ blockClicked: true, isTenRod: true, clickedElement: rod });
            }
          });
        }
        
        tensDiv.appendChild(rod);
      }
      
      // Render ones blocks
      const onesDiv = document.createElement('div');
      onesDiv.className = 'base10-ones';
      for (let o = 0; o < ones; o++) {
        const unit = document.createElement('button');
        unit.className = 'base10-unit';
        unit.style.setProperty('--unit-color', color);
        unit.style.background = color;
        unit.title = '1 Unit';
        
        if (isNum1) {
          unit.classList.add('num1-block', 'num1-unit');
        } else {
          unit.addEventListener('click', () => {
            if (unit.classList.contains('moved')) return;
            audioEngine.playClick();
            if (onStateChange) {
              onStateChange({ blockClicked: true, isTenRod: false, clickedElement: unit });
            }
          });
        }
        
        onesDiv.appendChild(unit);
      }
      
      blockGroup.appendChild(tensDiv);
      blockGroup.appendChild(onesDiv);
      return blockGroup;
    };

    blockDisplay.appendChild(renderBase10(data.num1, 'var(--palette-sec)', true));
    blockDisplay.appendChild(renderBase10(data.num2, 'var(--palette-pri)', false));

    // Right Column Math Structure
    const columnContainer = document.createElement('div');
    columnContainer.className = 'column-math-container';

    // Interactive Column solving layout
    let htmlContent = `
      <div class="column-grid">
        <!-- Labels -->
        <div class="col-header carry-col"></div>
        <div class="col-header tens-header">Tens</div>
        <div class="col-header ones-header">Ones</div>
        
        <!-- Carry Row (Only Level 6) -->
        <div class="grid-cell carry-col"></div>
        <div class="grid-cell carry-cell" id="carry-box-container">
          <div class="carry-bubble ${data.carryRequired ? 'visible-carry' : 'hidden-carry'}" id="tens-carry-bubble">0</div>
        </div>
        <div class="grid-cell"></div>

        <!-- First Number -->
        <div class="grid-cell op-cell"></div>
        <div class="grid-cell number-cell font-tens">${data.num1_tens}</div>
        <div class="grid-cell number-cell font-ones">${data.num1_ones}</div>

        <!-- Second Number -->
        <div class="grid-cell op-cell">+</div>
        <div class="grid-cell number-cell font-tens">${data.num2_tens}</div>
        <div class="grid-cell number-cell font-ones">${data.num2_ones}</div>

        <!-- Separation line -->
        <div class="grid-line" style="grid-column: span 3"></div>

        <!-- Inputs Row -->
        <div class="grid-cell"></div>
        <div class="grid-cell input-cell">
          <input type="text" id="ans-tens" class="col-input" pattern="[0-9]*" inputmode="numeric" maxlength="1" readonly>
        </div>
        <div class="grid-cell input-cell">
          <input type="text" id="ans-ones" class="col-input active-field" pattern="[0-9]*" inputmode="numeric" maxlength="1" readonly>
        </div>
      </div>
    `;

    columnContainer.innerHTML = htmlContent;
    wrapper.appendChild(blockDisplay);
    wrapper.appendChild(columnContainer);
    container.appendChild(wrapper);

    // Setup focus and custom inputs
    const onesInput = document.getElementById('ans-ones');
    const tensInput = document.getElementById('ans-tens');
    const carryBubble = document.getElementById('tens-carry-bubble');

    let activeField = 'ones'; // start with ones column solving

    onesInput.addEventListener('click', () => {
      activeField = 'ones';
      onesInput.classList.add('active-field');
      tensInput.classList.remove('active-field');
    });

    tensInput.addEventListener('click', () => {
      activeField = 'tens';
      tensInput.classList.add('active-field');
      onesInput.classList.remove('active-field');
    });

    // We will communicate inputs to this Renderer from the custom visual keyboard in UI
    this.handleColumnInput = (val) => {
      audioEngine.playClick();
      if (activeField === 'ones') {
        onesInput.value = val;
        
        // Level 6 Carrying Trigger
        if (data.carryRequired) {
          const onesSum = data.num1_ones + data.num2_ones; // e.g. 8+5 = 13
          const correctOnesDigit = onesSum % 10; // 3
          
          if (parseInt(val) === correctOnesDigit) {
            // Animate Carry!
            carryBubble.innerText = '1';
            carryBubble.classList.add('animate-carry');
            audioEngine.playSuccess();
            audioEngine.speak("Great! Write three in the Ones column and carry the one to the Tens column!");
            
            // Move active focus to tens field
            setTimeout(() => {
              activeField = 'tens';
              tensInput.classList.add('active-field');
              onesInput.classList.remove('active-field');
            }, 1000);
          }
        } else {
          // Level 5 (no carry) - Auto advance focus if digit matches
          if (parseInt(val) === (data.num1_ones + data.num2_ones)) {
            setTimeout(() => {
              activeField = 'tens';
              tensInput.classList.add('active-field');
              onesInput.classList.remove('active-field');
            }, 500);
          }
        }
      } else if (activeField === 'tens') {
        tensInput.value = val;
        if (val !== '' && onStateChange) {
          onStateChange({
            onesVal: onesInput.value,
            tensVal: tensInput.value,
            autoSubmit: true
          });
          return;
        }
      }

      if (onStateChange) {
        onStateChange({
          onesVal: onesInput.value,
          tensVal: tensInput.value
        });
      }
    };
  }

  // LEVEL 7: Subtraction with Borrowing
  renderColumnSubtraction(data, onStateChange) {
    const container = this.getContainer();
    const wrapper = document.createElement('div');
    wrapper.className = 'column-math-wrapper';

    // Left visual Blocks (representing the second number)
    const blockDisplay = document.createElement('div');
    blockDisplay.className = 'base10-blocks-display';
    blockDisplay.id = 'sub-base10-display';
    
    // Draw initial state
    const drawBlocks = () => {
      blockDisplay.innerHTML = '<h4>Base 10 Visual</h4>';
      
      const blockGroup = document.createElement('div');
      blockGroup.className = 'base10-group';
      
      const tensDiv = document.createElement('div');
      tensDiv.className = 'base10-tens';
      
      for (let t = 0; t < data.num2_tens; t++) {
        const rod = document.createElement('div');
        rod.className = 'base10-rod sub-placeholder';
        for (let k = 0; k < 10; k++) {
          const tick = document.createElement('div');
          tick.className = 'rod-tick';
          rod.appendChild(tick);
        }
        tensDiv.appendChild(rod);
      }

      const onesDiv = document.createElement('div');
      onesDiv.className = 'base10-ones';
      
      for (let o = 0; o < data.num2_ones; o++) {
        const unit = document.createElement('div');
        unit.className = 'base10-unit sub-placeholder';
        onesDiv.appendChild(unit);
      }

      blockGroup.appendChild(tensDiv);
      blockGroup.appendChild(onesDiv);
      blockDisplay.appendChild(blockGroup);
    };

    drawBlocks();

    // Right Column Math Structure
    const columnContainer = document.createElement('div');
    columnContainer.className = 'column-math-container';

    // Subtracting columns
    let htmlContent = `
      <div class="column-grid">
        <div class="col-header borrow-col"></div>
        <div class="col-header tens-header">Tens</div>
        <div class="col-header ones-header">Ones</div>

        <!-- Helper Row (Carry/Borrow visual markings) -->
        <div class="grid-cell"></div>
        <div class="grid-cell borrow-mark-cell" id="borrow-tens-mark"></div>
        <div class="grid-cell borrow-mark-cell" id="borrow-ones-mark"></div>

        <!-- First Number -->
        <div class="grid-cell op-cell"></div>
        <div class="grid-cell number-cell font-tens" id="digit-tens">${data.num1_tens}</div>
        <div class="grid-cell number-cell font-ones" id="digit-ones">${data.num1_ones}</div>

        <!-- Second Number -->
        <div class="grid-cell op-cell">−</div>
        <div class="grid-cell number-cell font-tens">${data.num2_tens}</div>
        <div class="grid-cell number-cell font-ones">${data.num2_ones}</div>

        <!-- Separation line -->
        <div class="grid-line" style="grid-column: span 3"></div>

        <!-- Inputs Row -->
        <div class="grid-cell"></div>
        <div class="grid-cell input-cell">
          <input type="text" id="ans-tens" class="col-input" pattern="[0-9]*" inputmode="numeric" maxlength="1" readonly>
        </div>
        <div class="grid-cell input-cell">
          <input type="text" id="ans-ones" class="col-input active-field" pattern="[0-9]*" inputmode="numeric" maxlength="1" readonly>
        </div>
      </div>
      
    `;

    if (data.borrowRequired) {
      htmlContent += `
        <!-- Borrow Action Panel -->
        <div class="borrow-panel" id="borrow-action-panel">
          <button class="btn btn-borrow" id="btn-borrow-trigger">🤝 Borrow 1 Ten</button>
        </div>
      `;
    }

    columnContainer.innerHTML = htmlContent;
    wrapper.appendChild(blockDisplay);
    wrapper.appendChild(columnContainer);
    container.appendChild(wrapper);

    const onesInput = document.getElementById('ans-ones');
    const tensInput = document.getElementById('ans-tens');
    const borrowTrigger = document.getElementById('btn-borrow-trigger');
    const borrowPanel = document.getElementById('borrow-action-panel');
    const tensHeaderMark = document.getElementById('borrow-tens-mark');
    const onesHeaderMark = document.getElementById('borrow-ones-mark');
    const originalTensDigit = document.getElementById('digit-tens');
    const originalOnesDigit = document.getElementById('digit-ones');

    let activeField = 'ones';
    let borrowed = false;

    onesInput.addEventListener('click', () => {
      activeField = 'ones';
      onesInput.classList.add('active-field');
      tensInput.classList.remove('active-field');
    });

    tensInput.addEventListener('click', () => {
      activeField = 'tens';
      tensInput.classList.add('active-field');
      onesInput.classList.remove('active-field');
    });

    if (borrowTrigger) {
      borrowTrigger.addEventListener('click', () => {
        if (borrowed) return;
        borrowed = true;
        audioEngine.playLevelUnlocked();
        audioEngine.speak("Let us unpack a Ten block! Now we have ten extra Ones. Twelve ones and three Tens!");

        // Update Column Markings
        originalTensDigit.classList.add('digit-crossed');
        originalOnesDigit.classList.add('digit-crossed');
        
        tensHeaderMark.innerText = `${data.num1_tens - 1}`;
        tensHeaderMark.classList.add('borrow-active');
        
        onesHeaderMark.innerText = `1${data.num1_ones}`;
        onesHeaderMark.classList.add('borrow-active');

        // Hide borrow trigger
        borrowTrigger.style.display = 'none';
        borrowPanel.innerHTML = '<span class="borrow-success-label">🎉 Ten Unpacked!</span>';
        
        if (onStateChange) {
          onStateChange({
            borrowTriggered: true,
            onesVal: onesInput.value,
            tensVal: tensInput.value
          });
        }
      });
    }

    this.handleColumnInput = (val) => {
      audioEngine.playClick();
      if (activeField === 'ones') {
        onesInput.value = val;
        
        // Auto focus advance if Ones value is correct
        const correctOnes = data.borrowRequired 
          ? (10 + data.num1_ones) - data.num2_ones 
          : data.num1_ones - data.num2_ones;
        if (parseInt(val) === correctOnes) {
          setTimeout(() => {
            activeField = 'tens';
            tensInput.classList.add('active-field');
            onesInput.classList.remove('active-field');
          }, 500);
        }
      } else if (activeField === 'tens') {
        tensInput.value = val;
        if (val !== '' && onStateChange) {
          onStateChange({
            onesVal: onesInput.value,
            tensVal: tensInput.value,
            borrowTriggered: borrowed,
            autoSubmit: true
          });
          return;
        }
      }

      if (onStateChange) {
        onStateChange({
          onesVal: onesInput.value,
          tensVal: tensInput.value,
          borrowTriggered: borrowed
        });
      }
    };
  }

  // LEVEL 8: Multiplication Stars Array
  renderMultiplicationGrid(rows, cols, onStateChange) {
    const container = this.getContainer();
    
    const wrapper = document.createElement('div');
    wrapper.className = 'mult-wrapper';

    const multGrid = document.createElement('div');
    multGrid.className = 'mult-grid';
    multGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    multGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    let tappedCells = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const star = document.createElement('button');
        star.className = 'mult-star';
        star.innerHTML = '⭐';
        star.setAttribute('aria-label', `Row ${r + 1} Col ${c + 1}`);

        star.addEventListener('click', () => {
          let isIncrement = false;
          if (!star.classList.contains('active-star')) {
            star.classList.add('active-star');
            tappedCells++;
            isIncrement = true;
            audioEngine.playClick();
            audioEngine.speak(`${tappedCells}`);
          } else {
            star.classList.remove('active-star');
            tappedCells = Math.max(0, tappedCells - 1);
            audioEngine.playClick();
            if (tappedCells > 0) {
              audioEngine.speak(`${tappedCells}`);
            }
          }

          if (onStateChange) {
            onStateChange({ currentCount: tappedCells, clickedElement: star, isIncrement });
          }
        });

        multGrid.appendChild(star);
      }
    }

    wrapper.appendChild(multGrid);
    container.appendChild(wrapper);
  }

  // LEVEL 9: Division Cookie Plate distribution
  renderDivisionSharing(total, plates, onStateChange) {
    const container = this.getContainer();
    
    const divWrapper = document.createElement('div');
    divWrapper.className = 'division-wrapper';

    // Cookies reservoir
    const cookiesContainer = document.createElement('div');
    cookiesContainer.className = 'cookies-reservoir';
    cookiesContainer.innerHTML = '<h4>Tap a cookie to share!</h4>';

    const cookiesGrid = document.createElement('div');
    cookiesGrid.className = 'cookies-grid';

    // Plates container
    const platesContainer = document.createElement('div');
    platesContainer.className = 'plates-container';

    const platesData = [];
    for (let p = 0; p < plates; p++) {
      const plate = document.createElement('div');
      plate.className = 'division-plate';
      plate.innerHTML = `
        <div class="plate-dish"></div>
        <div class="plate-label">Plate ${p + 1}</div>
        <div class="plate-count-badge">0 cookies</div>
        <div class="plate-cookies-display"></div>
      `;
      platesContainer.appendChild(plate);
      platesData.push({
        element: plate.querySelector('.plate-cookies-display'),
        badgeElement: plate.querySelector('.plate-count-badge'),
        cookies: 0
      });
    }

    // Distribute cookie clicking
    let distributedCount = 0;

    for (let i = 0; i < total; i++) {
      const cookie = document.createElement('button');
      cookie.className = 'cookie-item';
      cookie.innerHTML = '🍪';
      cookie.setAttribute('aria-label', `Cookie ${i + 1}`);

      cookie.addEventListener('click', () => {
        if (cookie.classList.contains('shared')) return;
        
        // Find the plate with the fewest cookies to distribute equally
        let targetPlate = platesData[0];
        for (let p = 1; p < platesData.length; p++) {
          if (platesData[p].cookies < targetPlate.cookies) {
            targetPlate = platesData[p];
          }
        }

        cookie.classList.add('shared');
        cookie.style.opacity = '0.3';
        cookie.style.transform = 'scale(0.7)';
        cookie.disabled = true;

        targetPlate.cookies++;
        distributedCount++;

        // Update badge text dynamically with animation
        if (targetPlate.badgeElement) {
          targetPlate.badgeElement.innerText = `${targetPlate.cookies} ${targetPlate.cookies === 1 ? 'cookie' : 'cookies'}`;
          targetPlate.badgeElement.classList.add('pulse');
          setTimeout(() => targetPlate.badgeElement.classList.remove('pulse'), 300);
        }

        // Render small cookie in plate
        const plateCookie = document.createElement('div');
        plateCookie.className = 'plate-cookie';
        plateCookie.innerHTML = '🍪';
        targetPlate.element.appendChild(plateCookie);

        audioEngine.playClick();
        audioEngine.speak(`${distributedCount}`);

        if (onStateChange) {
          onStateChange({
            distributedCount,
            platesContent: platesData.map(p => p.cookies),
            clickedElement: cookie,
            isIncrement: true
          });
        }
      });

      cookiesGrid.appendChild(cookie);
    }

    cookiesContainer.appendChild(cookiesGrid);
    divWrapper.appendChild(cookiesContainer);
    divWrapper.appendChild(platesContainer);
    container.appendChild(divWrapper);
  }
}
