// High score name entry screen (game state 4). The text is drawn on the canvas and the
// input and buttons are HTML elements laid over it. Touch devices get a custom on-screen
// keyboard instead of focusing the real input, since native mobile keyboards are unreliable
// to keep aligned with the canvas (the browser pans/resizes the viewport in ways that vary
// by platform and keep drifting out of sync with the canvas underneath).

const NAME_STORAGE_KEY = 'pacManPlayerName';
const NAME_DISALLOWED_CHARS = /[^A-Za-z0-9 _-]/g;
const NAME_PANEL_Y = 410; // centre of the input and buttons, in canvas coordinates (desktop)
const NAME_PANEL_TOP_TOUCH = 345; // top of the input, just below "ENTER YOUR NAME" (touch, since the on-screen keyboard needs more room below than a centred panel allows)
const NAME_SAVED_DELAY_MS = 1000;

const nameEntry = { score: 0, level: 1, rank: 1, message: '', messageColour: 'white', busy: false, touchMode: false };
let nameEntryElements = null;

function getNameEntryElements() {
    if (nameEntryElements) {
        return nameEntryElements;
    }
    nameEntryElements = {
        panel: document.getElementById('nameEntry'),
        input: document.getElementById('nameInput'),
        touchKeyboard: document.getElementById('touchKeyboard'),
        submit: document.getElementById('nameSubmit'),
        skip: document.getElementById('nameSkip')
    };
    const { input, touchKeyboard, submit, skip } = nameEntryElements;

    input.addEventListener('input', () => {
        const cleaned = input.value.replace(NAME_DISALLOWED_CHARS, '').toUpperCase();
        if (cleaned !== input.value) {
            input.value = cleaned;
        }
        if (!nameEntry.busy) {
            setNameEntryMessage('');
        }
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitName();
        } else if (e.key === 'Escape') {
            skipNameEntry();
        }
    });
    // Readonly inputs can still be focused by some browsers; immediately blur to guard
    // against the native keyboard popping up on touch devices.
    input.addEventListener('focus', () => {
        if (input.readOnly) {
            input.blur();
        }
    });
    touchKeyboard.addEventListener('click', e => {
        const key = e.target.closest('[data-key], [data-action]');
        if (!key || nameEntry.busy) {
            return;
        }
        if (key.dataset.action === 'backspace') {
            pressTouchBackspace();
        } else if (key.dataset.key) {
            pressTouchKey(key.dataset.key);
        }
    });
    submit.addEventListener('click', submitName);
    skip.addEventListener('click', skipNameEntry);
    return nameEntryElements;
}

function setNameEntryMessage(text, colour = 'white') {
    nameEntry.message = text;
    nameEntry.messageColour = colour;
}

function setNameEntryBusy(busy) {
    const { input, touchKeyboard, submit, skip } = getNameEntryElements();
    nameEntry.busy = busy;
    input.disabled = busy;
    touchKeyboard.querySelectorAll('button').forEach(key => {
        key.disabled = busy;
    });
    submit.disabled = busy;
    skip.disabled = busy;
}

// Appends a character typed via the on-screen keyboard, reusing the same cleanup/validation
// the real input already does on its 'input' event.
function pressTouchKey(char) {
    const { input } = getNameEntryElements();
    if (input.value.length >= LEADERBOARD_NAME_LENGTH) {
        return;
    }
    input.value += char;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function pressTouchBackspace() {
    const { input } = getNameEntryElements();
    input.value = input.value.slice(0, -1);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function startNameEntry() {
    const { panel, input, touchKeyboard } = getNameEntryElements();
    nameEntry.score = finalScore;
    nameEntry.level = finalLevel;
    nameEntry.rank = leaderboardRankFor(finalScore);
    setNameEntryMessage('');
    setNameEntryBusy(false);
    try {
        input.value = (localStorage.getItem(NAME_STORAGE_KEY) || '').replace(NAME_DISALLOWED_CHARS, '').toUpperCase();
    } catch (e) {
        input.value = '';
    }
    game = 4;
    panel.style.display = 'flex';

    const touchMode = isTouchDevice();
    nameEntry.touchMode = touchMode;
    panel.classList.toggle('touch-mode', touchMode);
    // On touch devices, make the input readonly (so tapping it can't summon the native
    // keyboard) and show our own on-screen keyboard instead; desktop keeps the real input.
    input.readOnly = touchMode;
    input.inputMode = touchMode ? 'none' : '';
    touchKeyboard.style.display = touchMode ? 'flex' : 'none';

    updateNameEntryLayout();
    if (!touchMode) {
        input.focus({ preventScroll: true });
        input.select();
    }
}

// Detects touch-capable devices (phones/tablets) so they get the on-screen keyboard
// instead of the native one
function isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function hideNameEntry() {
    const { panel, input } = getNameEntryElements();
    panel.style.display = 'none';
    input.blur();
}

// Keeps the HTML controls aligned with the canvas as it scales
function updateNameEntryLayout() {
    if (game !== 4) {
        return;
    }
    const { panel } = getNameEntryElements();
    const canvasRect = canvas.getBoundingClientRect();
    const canvasScale = canvasRect.width / baseWidth;
    panel.style.left = `${canvasRect.left + (baseWidth / 2) * canvasScale}px`;
    if (nameEntry.touchMode) {
        // Anchored by its top edge so the keyboard below the input has room to grow
        // downward without overlapping the score/rank text drawn above it on the canvas.
        panel.style.top = `${canvasRect.top + NAME_PANEL_TOP_TOUCH * canvasScale}px`;
        panel.style.transform = `translate(-50%, 0) scale(${canvasScale})`;
    } else {
        panel.style.top = `${canvasRect.top + NAME_PANEL_Y * canvasScale}px`;
        panel.style.transform = `translate(-50%, -50%) scale(${canvasScale})`;
    }
}

function submitName() {
    if (nameEntry.busy) {
        return;
    }
    const { input } = getNameEntryElements();
    const name = input.value.replace(/\s+/g, ' ').trim();
    if (name.length === 0) {
        setNameEntryMessage('ENTER A NAME', 'red');
        return;
    }
    if (!isNameAllowed(name)) {
        setNameEntryMessage('NAME NOT ALLOWED', 'red');
        return;
    }
    try {
        localStorage.setItem(NAME_STORAGE_KEY, name);
    } catch (e) {
        // storage unavailable; the name just won't be remembered
    }

    setNameEntryBusy(true);
    setNameEntryMessage('SAVING...');
    submitLeaderboardEntry(name, nameEntry.score, nameEntry.level)
        .then(() => {
            const index = insertLeaderboardEntryLocally({ name, score: nameEntry.score, level: nameEntry.level, createdAt: new Date() });
            setNameEntryMessage('SCORE SAVED!', '#7CFC00');
            setTimeout(() => {
                if (game === 4) {
                    hideNameEntry();
                    endGame();
                    showLeaderboardPageForRank(index);
                }
            }, NAME_SAVED_DELAY_MS);
        })
        .catch(err => {
            console.warn('Could not save score:', err);
            setNameEntryBusy(false);
            setNameEntryMessage('COULD NOT SAVE - TRY AGAIN', 'red');
        });
}

function skipNameEntry() {
    if (nameEntry.busy) {
        return;
    }
    hideNameEntry();
    endGame();
}

function drawNameEntry(ctx) {
    ctx.drawImage(pacManLogo, 0, 0, 300, 78, xOffset + 85, yOffset + 15, 300, 78);

    ctx.font = "bold 32px Courier New";
    ctx.fillStyle = "yellow";
    drawCentredText(ctx, "NEW HIGH SCORE!", 175);

    ctx.font = "bold 20px Courier New";
    ctx.fillStyle = "white";
    drawCentredText(ctx, "SCORE " + nameEntry.score + "   LEVEL " + nameEntry.level, 225);
    drawCentredText(ctx, "RANK #" + nameEntry.rank, 255);
    drawCentredText(ctx, "ENTER YOUR NAME", 330);

    if (nameEntry.message) {
        ctx.fillStyle = nameEntry.messageColour;
        drawCentredText(ctx, nameEntry.message, 540);
    }
}
