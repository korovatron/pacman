class fruit {
    row;
    column;
    active;
    timer;
    totalTime;
    fadeDuration = 0.3; // seconds to fade in/out when appearing/disappearing

    constructor(row, column) {
        this.row = row;
        this.column = column;
        this.active = false;
        this.timer = 0;
        this.totalTime = 0;
    }

    getRow() {
        return (this.row);
    }

    getColumn() {
        return (this.column);
    }

    setActive(b) {
        this.active = b;
    }

    getActive() {
        return (this.active)
    }

    // makes the fruit appear for the given number of seconds
    spawn(seconds) {
        this.active = true;
        this.timer = seconds;
        this.totalTime = seconds;
    }

    // counts down the time left on screen and removes the fruit when it runs out
    update(delta) {
        if (this.active == true) {
            this.timer -= delta;
            if (this.timer <= 0) {
                this.active = false;
            }
        }
    }

    // opacity to draw the fruit at: fades in when it first appears and fades out
    // just before it disappears (fruit remains eatable throughout the fade)
    getAlpha() {
        if (this.active == false) {
            return 0;
        }
        const elapsed = this.totalTime - this.timer;
        const fadeIn = Math.min(1, elapsed / this.fadeDuration);
        const fadeOut = Math.min(1, this.timer / this.fadeDuration);
        return Math.max(0, Math.min(fadeIn, fadeOut));
    }
}
