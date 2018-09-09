const { EventEmitter } = require('fbemitter')

class Emitter {
  constructor() {
    this.emitter = new EventEmitter()
  }

  on(ev, cb) {
    return this.emitter.addListener(ev, cb)
  }
}

module.exports = Emitter
