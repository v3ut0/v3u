const net = require('net')
const url = require('url')
const { EventEmitter } = require('fbemitter')
const Protocol = require('./protocol')

class Queue {
  constructor(queueName = '', settings = {}) {
    const { hostname: host, port } = url.parse(settings.cheetah)
    this.emitter = new EventEmitter()
    this.client = net.createConnection(
      { host, port },
      () => this.emitter.emit('ready'),
    )
    this.protocol = new Protocol(this.client, queueName)
    this.jobId = 0
  }

  on(ev, cb) {
    return this.emitter.addListener(ev, cb)
  }

  createJob(data, cb) {
    this.protocol.requestAWorker(this.jobId, data)
    if (cb) {
      this.protocol.on(
        `job:done:${this.jobId}`,
        ({ e, r }) => cb(e ? new Error(e) : e, r),
      )
    }
    this.jobId += 1
  }

  process(cb) {
    if (this.jobHandler) return
    this.jobHandler = cb
    this.protocol.beAWorker()
    this.protocol.on('job:process', (jobId, d) => {
      const done = (e, r) => this
        .protocol
        .reportResult(jobId, { e, r })
      this.jobHandler(d, done)
    })
  }

  close() {
    if (this.client) {
      this.client.end()
    }
  }
}

module.exports = Queue
