class fruit {
    row;
    column;
    active;
    timer;

    constructor(row, column) {
        this.row = row;
        this.column = column;
        this.active = false;
        this.timer = 0;
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
}
