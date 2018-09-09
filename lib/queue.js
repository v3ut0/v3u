const net = require('net')
const url = require('url')
const Protocol = require('./protocol')
const Emitter = require('./emitter')

class Queue extends Emitter {
  constructor(queueName = '', settings = {}) {
    super()
    const { hostname: host, port } = url.parse(settings.uri)
    const ready = () => this.emitter.emit('ready')
    this.client = net.createConnection({ host, port }, ready)
    this.protocol = new Protocol(this.client, queueName)
    this.jobId = 0
    this.eventMaps = {}
  }

  createJob(data, rcb, pcb) {
    this.protocol.requestAWorker(this.jobId, data)
    if (rcb) {
      const ev = `job:done:${this.jobId}`
      this.protocol.on(ev, ({ e, r }) => rcb(e, r))
    }
    if (pcb) {
      const ev = `job:progress:${this.jobId}`
      this.protocol.on(ev, pcb)
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
      const progress = p => this
        .protocol
        .reportProgress(jobId, p)
      this.jobHandler(d, done, progress)
    })
  }

  close() {
    this.client.end()
  }
}

module.exports = Queue
