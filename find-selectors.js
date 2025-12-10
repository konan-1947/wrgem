/**
 * Debug Script - Chạy trong browser console để tìm selectors
 * Copy và paste vào Console tab trong DevTools
 */

console.log('=== AI Studio Response Debug ===\n');

// 1. Tìm tất cả containers có thể chứa response
const possibleContainers = [
    'conversation-turn',
    'chat-turn',
    'message-content',
    'response-container',
    'model-response',
    'turn-container'
];

possibleContainers.forEach(className => {
    const elements = document.querySelectorAll(`[class*="${className}"]`);
    if (elements.length > 0) {
        console.log(`✓ Found ${elements.length} elements with class containing "${className}"`);
        console.log('  First element:', elements[0]);
        console.log('  Class name:', elements[0].className);
    }
});

// 2. Tìm element chứa text "Hello! How can I help you today?"
console.log('\n=== Searching for response text ===');
const allElements = document.querySelectorAll('*');
let responseElement = null;

for (let el of allElements) {
    if (el.textContent.includes('Hello! How can I help you today?') &&
        !el.querySelector('*')?.textContent.includes('Hello! How can I help you today?')) {
        console.log('✓ Found response element:');
        console.log('  Tag:', el.tagName);
        console.log('  Class:', el.className);
        console.log('  ID:', el.id);
        console.log('  Parent class:', el.parentElement?.className);
        console.log('  Element:', el);
        responseElement = el;
        break;
    }
}

// 3. Tìm container cha
if (responseElement) {
    console.log('\n=== Parent hierarchy ===');
    let parent = responseElement.parentElement;
    let level = 1;
    while (parent && level <= 5) {
        console.log(`Level ${level}:`, {
            tag: parent.tagName,
            class: parent.className,
            id: parent.id
        });
        parent = parent.parentElement;
        level++;
    }
}

// 4. In ra selector có thể dùng
console.log('\n=== Suggested Selectors ===');
if (responseElement) {
    const classes = responseElement.className.split(' ').filter(c => c);
    if (classes.length > 0) {
        console.log('By class:', `.${classes[0]}`);
        console.log('All classes:', classes.map(c => `.${c}`).join(''));
    }

    // Selector dựa trên parent
    const parentClass = responseElement.parentElement?.className.split(' ')[0];
    if (parentClass) {
        console.log('Parent + child:', `.${parentClass} > ${responseElement.tagName.toLowerCase()}`);
    }
}

console.log('\n=== Copy selector và update vào _waitForResponse.js ===');
