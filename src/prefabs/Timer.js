/*
Track players time to complete game
*/
export class Timer {
    constructor(prevTime=0) {
      this.startTime = 0;
      this.prevTime = prevTime;
      this.elapsedSeconds = 0;
    }
  
    start() {
      this.startTime = Date.now();
    }
  
    update() {
      const currentTime = Date.now();
      const elapsedMilliseconds = currentTime - this.startTime;
      this.elapsedSeconds = Math.floor(elapsedMilliseconds / 1000) + this.prevTime;
    }
}

  