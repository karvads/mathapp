// MathQuest Levels & Question Generators

export const LEVELS = [
  {
    id: 'l1_counting',
    title: 'Counting Beads',
    subtitle: 'Pre-K • Numbers 1 to 10',
    description: 'Learn to count objects up to 10 by tapping on the colorful beads.',
    introSpeech: 'Welcome to Counting Beads! Tap the beads to count them. One, two, three! Let us find the total!',
    visualType: 'beads',
    generateQuestion: (isTest = false) => {
      const target = Math.floor(Math.random() * 8) + 3; // 3 to 10 beads
      
      // Generate options
      const options = generateUniqueOptions(target, 3, 1, 10);
      
      return {
        questionText: 'Count the beads:',
        speechText: `Can you count how many beads there are on the line?`,
        visualData: { count: target },
        correctAnswer: target,
        options,
        inputType: 'choices'
      };
    }
  },
  {
    id: 'l2_numbers_to_20',
    title: 'Numbers to 20',
    subtitle: 'Kindergarten • Up to 20 & Comparisons',
    description: 'Count objects on a ten-frame up to 20, and compare which number is bigger.',
    introSpeech: 'Let us practice bigger numbers! We will look at groups of ten and compare which numbers are larger!',
    visualType: 'tenframe',
    generateQuestion: (isTest = false) => {
      const type = Math.random() > 0.5 ? 'count' : 'compare';
      
      if (type === 'count') {
        const target = Math.floor(Math.random() * 10) + 11; // 11 to 20
        const options = generateUniqueOptions(target, 3, 10, 20);
        return {
          questionText: 'How many spheres are there?',
          speechText: 'Count the spheres. We have one full box of ten, and some more! How many in total?',
          visualData: { mode: 'count', count: target },
          correctAnswer: target,
          options,
          inputType: 'choices'
        };
      } else {
        const num1 = Math.floor(Math.random() * 8) + 11; // 11 to 18
        let num2 = Math.floor(Math.random() * 8) + 11;
        while (num2 === num1) {
          num2 = Math.floor(Math.random() * 8) + 11;
        }
        
        const isBiggerQuestion = Math.random() > 0.5;
        const correctAnswer = isBiggerQuestion ? Math.max(num1, num2) : Math.min(num1, num2);
        
        return {
          questionText: isBiggerQuestion ? 'Which number is LARGER?' : 'Which number is SMALLER?',
          speechText: isBiggerQuestion 
            ? `Which group has more? Is ${num1} or ${num2} larger?` 
            : `Which group has fewer? Is ${num1} or ${num2} smaller?`,
          visualData: { mode: 'compare', num1, num2, checkLarger: isBiggerQuestion },
          correctAnswer,
          options: [num1, num2].sort((a, b) => a - b),
          inputType: 'choices'
        };
      }
    }
  },
  {
    id: 'l3_addition',
    title: 'Sunny Addition',
    subtitle: '1st Grade • Basic Sums to 10',
    description: 'Add two groups of objects to learn how numbers join together.',
    introSpeech: 'Let us add! Count the red apples, then count the blue stars, and add them together!',
    visualType: 'apples',
    generateQuestion: (isTest = false) => {
      const num1 = Math.floor(Math.random() * 4) + 1; // 1 to 4
      const num2 = Math.floor(Math.random() * 4) + 1; // 1 to 4
      const sum = num1 + num2;
      
      const options = generateUniqueOptions(sum, 3, 2, 10);
      
      const itemTypes = ['apple', 'star', 'flower'];
      const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];

      return {
        questionText: `${num1} + ${num2} = ?`,
        speechText: `What is ${num1} plus ${num2}? Count the items on the left, then the right, and add them up!`,
        visualData: { num1, num2, itemType },
        correctAnswer: sum,
        options,
        inputType: 'choices'
      };
    }
  },
  {
    id: 'l4_subtraction',
    title: 'Balloon Subtraction',
    subtitle: '1st Grade • Basic Takeaways from 10',
    description: 'Pop balloons to see how numbers get smaller when we subtract.',
    introSpeech: 'Let us subtract! Tap on the balloons to pop them and see how many are left!',
    visualType: 'balloons',
    generateQuestion: (isTest = false) => {
      const num1 = Math.floor(Math.random() * 6) + 4; // 4 to 9 balloons
      const num2 = Math.floor(Math.random() * (num1 - 2)) + 1; // 1 to num1-2
      const difference = num1 - num2;
      
      const options = generateUniqueOptions(difference, 3, 1, 9);
      
      return {
        questionText: `${num1} − ${num2} = ?`,
        speechText: `We have ${num1} balloons, and we take away ${num2}. Pop ${num2} balloons and count how many are left!`,
        visualData: { total: num1, subtract: num2 },
        correctAnswer: difference,
        options,
        inputType: 'choices'
      };
    }
  },
  {
    id: 'l5_two_digit_add',
    title: 'Double Addition',
    subtitle: '2nd Grade • Columns Without Carrying',
    description: 'Learn double-digit addition column by column, from Ones to Tens.',
    introSpeech: 'Double digit addition! Add the Ones column first, then add the Tens column!',
    visualType: 'column_add',
    generateQuestion: (isTest = false) => {
      // Keep digits simple, Ones sum must be <= 9, Tens sum <= 9
      const num1_ones = Math.floor(Math.random() * 5) + 1; // 1 to 5
      const num2_ones = Math.floor(Math.random() * (9 - num1_ones)) + 0; // ensures sum <= 9
      
      const num1_tens = Math.floor(Math.random() * 4) + 1; // 1 to 4
      const num2_tens = Math.floor(Math.random() * (8 - num1_tens)) + 1; // ensures sum <= 9
      
      const num1 = num1_tens * 10 + num1_ones;
      const num2 = num2_tens * 10 + num2_ones;
      const sum = num1 + num2;
      
      return {
        questionText: `${num1} + ${num2}`,
        speechText: `Let us add ${num1} plus ${num2}. First, add the numbers in the Ones column on the right. Then, add the Tens column!`,
        visualData: { num1, num2, num1_tens, num1_ones, num2_tens, num2_ones, carryRequired: false },
        correctAnswer: sum,
        inputType: 'columns_add'
      };
    }
  },
  {
    id: 'l6_two_digit_add_carry',
    title: 'Addition with Carry',
    subtitle: '2nd/3rd Grade • Double Addition with Carry',
    description: 'Learn carrying! When Ones sum to 10 or more, carry the 1 to the Tens column.',
    introSpeech: 'When the Ones column is ten or more, we carry the ten block over to the Tens column!',
    visualType: 'column_add_carry',
    generateQuestion: (isTest = false) => {
      // Ones column must trigger carry (sum >= 10, and each digit must be 1 to 9)
      const num1_ones = Math.floor(Math.random() * 8) + 2; // 2 to 9
      const min_num2_ones = 10 - num1_ones;
      const num2_ones = Math.floor(Math.random() * (9 - min_num2_ones + 1)) + min_num2_ones;
      
      const num1_tens = Math.floor(Math.random() * 3) + 1; // 1 to 3
      const num2_tens = Math.floor(Math.random() * 3) + 1; // 1 to 3
      
      const num1 = num1_tens * 10 + num1_ones;
      const num2 = num2_tens * 10 + num2_ones;
      const sum = num1 + num2;
      
      return {
        questionText: `${num1} + ${num2}`,
        speechText: `Add ${num1} plus ${num2}. The Ones sum is ten or more, so we carry the group of ten to the top of the Tens column!`,
        visualData: { num1, num2, num1_tens, num1_ones, num2_tens, num2_ones, carryRequired: true },
        correctAnswer: sum,
        inputType: 'columns_add_carry'
      };
    }
  },
  {
    id: 'l6b_two_digit_sub_no_borrow',
    title: 'Double Subtraction',
    subtitle: '2nd Grade • Columns Without Borrowing',
    description: 'Subtract double-digit numbers column by column, from Ones to Tens.',
    introSpeech: 'Double digit subtraction! Subtract the Ones column first, then subtract the Tens column!',
    visualType: 'column_sub_no_borrow',
    generateQuestion: (isTest = false) => {
      // Keep digits simple, num1_ones >= num2_ones, num1_tens >= num2_tens
      const num2_ones = Math.floor(Math.random() * 5) + 0; // 0 to 4
      const num1_ones = Math.floor(Math.random() * (9 - num2_ones)) + num2_ones; // ensures num1_ones >= num2_ones
      
      const num2_tens = Math.floor(Math.random() * 4) + 1; // 1 to 4
      const num1_tens = Math.floor(Math.random() * (9 - num2_tens)) + num2_tens; // ensures num1_tens >= num2_tens
      
      const num1 = num1_tens * 10 + num1_ones;
      const num2 = num2_tens * 10 + num2_ones;
      const difference = num1 - num2;
      
      return {
        questionText: `${num1} − ${num2}`,
        speechText: `Subtract ${num2} from ${num1}. First, subtract the numbers in the Ones column on the right. Then, subtract the Tens column!`,
        visualData: { num1, num2, num1_tens, num1_ones, num2_tens, num2_ones, borrowRequired: false },
        correctAnswer: difference,
        inputType: 'columns_sub_no_borrow'
      };
    }
  },
  {
    id: 'l7_two_digit_sub_borrow',
    title: 'Subtraction with borrow',
    subtitle: '2nd/3rd Grade • Double Subtraction with Borrow',
    description: 'Learn borrowing! Break a Ten block into 10 Ones to subtract larger numbers.',
    introSpeech: 'If the top Ones number is too small, borrow from the Tens column by breaking one Ten into ten Ones!',
    visualType: 'column_sub_borrow',
    generateQuestion: (isTest = false) => {
      // Must trigger borrowing: top ones < bottom ones
      const num1_ones = Math.floor(Math.random() * 4) + 1; // 1 to 4
      const num2_ones = Math.floor(Math.random() * 4) + 5; // 5 to 8 (so top < bottom)
      
      const num1_tens = Math.floor(Math.random() * 4) + 4; // 4 to 7
      const num2_tens = Math.floor(Math.random() * (num1_tens - 2)) + 1; // bottom tens < top tens
      
      const num1 = num1_tens * 10 + num1_ones;
      const num2 = num2_tens * 10 + num2_ones;
      const difference = num1 - num2;
      
      return {
        questionText: `${num1} − ${num2}`,
        speechText: `Subtract ${num2} from ${num1}. We cannot subtract ${num2_ones} from ${num1_ones}, so tap the borrow button to unpack a Ten!`,
        visualData: { num1, num2, num1_tens, num1_ones, num2_tens, num2_ones, borrowRequired: true },
        correctAnswer: difference,
        inputType: 'columns_sub_borrow'
      };
    }
  },
  {
    id: 'l8_multiplication',
    title: 'Starlight Arrays',
    subtitle: '3rd Grade • Intro to Multiplication',
    description: 'See multiplication visually as grid rows and columns of stars.',
    introSpeech: 'Multiplication is just adding groups! Let us see rows and columns of bright stars!',
    visualType: 'multiplication_grid',
    generateQuestion: (isTest = false) => {
      const rows = Math.floor(Math.random() * 3) + 2; // 2 to 4 rows
      const cols = Math.floor(Math.random() * 3) + 2; // 2 to 4 columns
      const product = rows * cols;
      
      const options = generateUniqueOptions(product, 3, 4, 20);
      
      return {
        questionText: `${rows} × ${cols} = ?`,
        speechText: `What is ${rows} times ${cols}? Tap the grid to count the stars in ${rows} rows of ${cols}!`,
        visualData: { rows, cols },
        correctAnswer: product,
        options,
        inputType: 'choices'
      };
    }
  },
  {
    id: 'l9_division',
    title: 'Cookie Sharer',
    subtitle: '3rd/4th Grade • Sharing & Division',
    description: 'Divide a batch of cookies equally into cute distribution plates.',
    introSpeech: 'Let us share! Distribute the cookies equally into the plates to solve the division!',
    visualType: 'division_sharing',
    generateQuestion: (isTest = false) => {
      const plates = Math.floor(Math.random() * 2) + 2; // 2 or 3 plates
      const share = Math.floor(Math.random() * 3) + 2; // 2 to 4 cookies per plate
      const total = plates * share;
      
      const options = generateUniqueOptions(share, 3, 1, 6);
      
      return {
        questionText: `${total} ÷ ${plates} = ?`,
        speechText: `We have ${total} cookies, and we want to share them equally into ${plates} plates. How many cookies go on each plate?`,
        visualData: { total, plates, share },
        correctAnswer: share,
        options,
        inputType: 'choices'
      };
    }
  }
];

// Helper to generate distinct multiple choice options including the correct answer
function generateUniqueOptions(correct, count = 3, min = 1, max = 20) {
  const options = new Set([correct]);
  
  while (options.size < count) {
    // Generate nearby distractor options
    const offset = Math.floor(Math.random() * 5) - 2; // -2 to +2
    let option = correct + offset;
    
    // Fallback if equal or out of bounds
    if (option === correct || option < min || option > max) {
      option = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    options.add(option);
  }
  
  // Convert set to array and shuffle
  return Array.from(options).sort(() => Math.random() - 0.5);
}
