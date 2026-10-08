// High score name entry screen (game state 4). The text is drawn on the canvas and the
// input and buttons are HTML elements laid over it. Touch devices get a classic arcade-style
// letter picker (left/right to move between letter slots, up/down to cycle the letter)
// instead of focusing the real input, since native mobile keyboards are unreliable to keep
// aligned with the canvas (the browser pans/resizes the viewport in ways that vary by
// platform and keep drifting out of sync with the canvas underneath).

const NAME_STORAGE_KEY = 'pacManPlayerName';
const NAME_DISALLOWED_CHARS = /[^A-Za-z0-9 _-]/g;
const NAME_PANEL_Y = 410; // centre of the input and buttons, in canvas coordinates (desktop)
const NAME_PANEL_TOP_TOUCH = 315; // top of the yellow letter slots (touch), shifted up from the desktop input's position to leave room for the status/error message gap above the D-pad
const NAME_ENTER_LABEL_Y = 330; // "ENTER YOUR NAME" y position (desktop)
const NAME_ENTER_LABEL_Y_TOUCH = 300; // "ENTER YOUR NAME" y position (touch), shifted up to match NAME_PANEL_TOP_TOUCH
const NAME_SAVED_DELAY_MS = 1000;
// Characters selectable with the touch D-pad's up/down letter cycle, in cycling order
const NAME_CHARSET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'.split('');

const nameEntry = { score: 0, level: 1, rank: 1, message: '', messageColour: 'white', busy: false, touchMode: false, slots: [], cursor: 0 };
let nameEntryElements = null;

function getNameEntryElements() {
    if (nameEntryElements) {
        return nameEntryElements;
    }
    nameEntryElements = {
        panel: document.getElementById('nameEntry'),
        input: document.getElementById('nameInput'),
        touchNameDisplay: document.getElementById('touchNameDisplay'),
        touchNameMessage: document.getElementById('touchNameMessage'),
        touchDpad: document.getElementById('touchDpad'),
        submit: document.getElementById('nameSubmit'),
        skip: document.getElementById('nameSkip')
    };
    const { input, touchDpad, submit, skip } = nameEntryElements;

    input.addEventListener('input', () => {
        const cleaned = input.value.replace(NAME_DISALLOWED_CHARS, '').toUpperCase();
        if (cleaned !== input.value) {
            input.value = cleaned;
        }
        if (!nameEntry.busy) {
            setNameEntryMessage('');
        }
        updateSubmitAvailability();
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitName();
        } else if (e.key === 'Escape') {
            skipNameEntry();
        }
    });
    touchDpad.addEventListener('click', e => {
        const button = e.target.closest('[data-dpad]');
        if (!button || nameEntry.busy) {
            return;
        }
        switch (button.dataset.dpad) {
            case 'left':
                moveTouchCursor(-1);
                break;
            case 'right':
                moveTouchCursor(1);
                break;
            case 'up':
                cycleTouchChar(1);
                break;
            case 'down':
                cycleTouchChar(-1);
                break;
        }
    });
    setUpDpadPressedHighlight(touchDpad);
    submit.addEventListener('click', submitName);
    skip.addEventListener('click', skipNameEntry);
    return nameEntryElements;
}

// Mobile browsers can leave a tapped button's :active/:focus styling "stuck" on instead of
// releasing it after the tap ends - iOS Safari in particular has a known bug (notably since
// 17.4.1) where pointerup/touchend can silently stop being delivered to the element that
// received the pointerdown/touchstart. So the pressed look is applied/cleared manually via a
// class, release handlers are attached at the document level per Apple's own workaround
// rather than on the button itself, "click" (which keeps firing even when pointerup doesn't)
// is also treated as a release signal, and a short timeout self-heals it if every event-based
// release is missed.
function setUpDpadPressedHighlight(touchDpad) {
    const PRESSED_CLASS = 'dpad-btn-pressed';
    const SAFETY_TIMEOUT_MS = 500;

    touchDpad.addEventListener('pointerdown', e => {
        const button = e.target.closest('.dpad-btn');
        if (!button || button.disabled) {
            return;
        }
        button.classList.add(PRESSED_CLASS);
        clearTimeout(button._dpadPressedSafetyTimer);
        button._dpadPressedSafetyTimer = setTimeout(() => {
            button.classList.remove(PRESSED_CLASS);
        }, SAFETY_TIMEOUT_MS);
    });

    const releaseAllDpadButtons = () => {
        document.querySelectorAll('.' + PRESSED_CLASS).forEach(button => {
            button.classList.remove(PRESSED_CLASS);
            clearTimeout(button._dpadPressedSafetyTimer);
            button.blur();
        });
    };
    // Attached to the document (capture phase) rather than the dpad itself, since the iOS
    // bug above specifically stops delivering further events to the original target.
    ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'mouseup', 'click'].forEach(type => {
        document.addEventListener(type, releaseAllDpadButtons, true);
    });
}

function setNameEntryMessage(text, colour = 'white') {
    nameEntry.message = text;
    nameEntry.messageColour = colour;
    if (nameEntry.touchMode) {
        // Touch mode shows messages in the reserved HTML gap above the D-pad instead of
        // the canvas-drawn text (see drawNameEntry()), since that position would overlap
        // the D-pad/buttons.
        const { touchNameMessage } = getNameEntryElements();
        touchNameMessage.textContent = text;
        touchNameMessage.style.color = colour;
    }
}

// Trimmed, single-spaced name as submitName() would use it
function getTrimmedName() {
    const { input } = getNameEntryElements();
    return input.value.replace(/\s+/g, ' ').trim();
}

// Submit is greyed out (rather than showing an error) whenever there's nothing to submit
function updateSubmitAvailability() {
    const { submit } = getNameEntryElements();
    submit.disabled = nameEntry.busy || getTrimmedName().length === 0;
}

function setNameEntryBusy(busy) {
    const { input, touchDpad, skip } = getNameEntryElements();
    nameEntry.busy = busy;
    input.disabled = busy;
    touchDpad.querySelectorAll('button').forEach(button => {
        button.disabled = busy;
    });
    updateSubmitAvailability();
    skip.disabled = busy;
}

// Writes the current slot letters into the (hidden, on touch) input so submitName() and its
// existing validation keep working unchanged regardless of which UI is being used.
function syncTouchNameToInput() {
    const { input } = getNameEntryElements();
    input.value = nameEntry.slots.join('');
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

function renderTouchNameDisplay() {
    const { touchNameDisplay } = getNameEntryElements();
    touchNameDisplay.innerHTML = '';
    nameEntry.slots.forEach((char, index) => {
        const slot = document.createElement('div');
        slot.className = 'touch-name-slot' + (index === nameEntry.cursor ? ' touch-name-slot-active' : '');
        slot.textContent = char === ' ' ? '' : char;
        touchNameDisplay.appendChild(slot);
    });
}

function moveTouchCursor(delta) {
    nameEntry.cursor = Math.min(LEADERBOARD_NAME_LENGTH - 1, Math.max(0, nameEntry.cursor + delta));
    renderTouchNameDisplay();
}

function cycleTouchChar(delta) {
    let index = NAME_CHARSET.indexOf(nameEntry.slots[nameEntry.cursor]);
    if (index === -1) {
        index = 0;
    }
    index = (index + delta + NAME_CHARSET.length) % NAME_CHARSET.length;
    nameEntry.slots[nameEntry.cursor] = NAME_CHARSET[index];
    syncTouchNameToInput();
    renderTouchNameDisplay();
}

function startNameEntry() {
    const { panel, input, touchNameDisplay, touchNameMessage, touchDpad, submit, skip } = getNameEntryElements();
    nameEntry.score = finalScore;
    nameEntry.level = finalLevel;
    nameEntry.rank = leaderboardRankFor(finalScore);
    nameEntry.touchMode = isTouchDevice();
    setNameEntryMessage('');
    setNameEntryBusy(false);
    // Undo hideNameEntrySaveControls() from a previous visit to this screen
    submit.style.display = '';
    skip.style.display = '';

    let storedName = '';
    try {
        storedName = (localStorage.getItem(NAME_STORAGE_KEY) || '').replace(NAME_DISALLOWED_CHARS, '').toUpperCase();
    } catch (e) {
        storedName = '';
    }
    input.value = storedName;

    game = 4;
    panel.style.display = 'flex';

    const touchMode = nameEntry.touchMode;
    panel.classList.toggle('touch-mode', touchMode);
    // On touch devices, hide the real input (so it can never summon the native keyboard)
    // and use the letter-slot display and D-pad instead; desktop keeps the real input.
    input.style.display = touchMode ? 'none' : '';
    touchNameDisplay.style.display = touchMode ? 'flex' : 'none';
    touchNameMessage.style.display = touchMode ? 'flex' : 'none';
    touchDpad.style.display = touchMode ? 'grid' : 'none';

    if (touchMode) {
        nameEntry.slots = storedName.padEnd(LEADERBOARD_NAME_LENGTH, ' ').slice(0, LEADERBOARD_NAME_LENGTH).split('');
        nameEntry.cursor = Math.min(storedName.length, LEADERBOARD_NAME_LENGTH - 1);
        syncTouchNameToInput();
        renderTouchNameDisplay();
    }
    updateSubmitAvailability();

    updateNameEntryLayout();
    if (!touchMode) {
        input.focus({ preventScroll: true });
        input.select();
    }
}

// Detects touch-capable devices (phones/tablets) so they get the D-pad letter picker
// instead of the native keyboard
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
        // Anchored by its top edge so the slot display and D-pad below have room to grow
        // downward without overlapping the score/rank text drawn above it on the canvas.
        panel.style.top = `${canvasRect.top + NAME_PANEL_TOP_TOUCH * canvasScale}px`;
        panel.style.transform = `translate(-50%, 0) scale(${canvasScale})`;
    } else {
        panel.style.top = `${canvasRect.top + NAME_PANEL_Y * canvasScale}px`;
        panel.style.transform = `translate(-50%, -50%) scale(${canvasScale})`;
    }
}

// Hides the D-pad and Submit/Skip buttons so the "SCORE SAVED!" message (drawn on the
// canvas just below them) has clear space instead of overlapping still-visible controls.
function hideNameEntrySaveControls() {
    const { touchDpad, submit, skip } = getNameEntryElements();
    touchDpad.style.display = 'none';
    submit.style.display = 'none';
    skip.style.display = 'none';
}

function submitName() {
    if (nameEntry.busy) {
        return;
    }
    const name = getTrimmedName();
    if (name.length === 0) {
        // No error message; Submit is already greyed out via updateSubmitAvailability()
        // whenever there's nothing to submit. This is just a safety net for Enter being
        // pressed in the real input while it's empty, which doesn't go through the
        // (disabled) button at all.
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
            hideNameEntrySaveControls();
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
    drawCentredText(ctx, "ENTER YOUR NAME", nameEntry.touchMode ? NAME_ENTER_LABEL_Y_TOUCH : NAME_ENTER_LABEL_Y);

    // Touch mode shows status/error messages in the reserved HTML gap above the D-pad
    // instead (see setNameEntryMessage()), since this canvas position would overlap it.
    if (nameEntry.message && !nameEntry.touchMode) {
        ctx.fillStyle = nameEntry.messageColour;
        drawCentredText(ctx, nameEntry.message, 540);
    }
}
