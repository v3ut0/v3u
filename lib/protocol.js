const { EventEmitter } = require('fbemitter')

const BE_A_WORKER = 0
const BE_A_JOB = 1
const BE_A_RESULT = 2
const BE_A_PROGRESS = 3
const PROCESS_IT = 100
const DONE_IT = 101
const PROGRESS_IT = 102

class Protocol {
  constructor(client, queueName) {
    this.client = client
    this.emitter = new EventEmitter()
    this.queueName = queueName
    this.buffer = ''
    this.waitForData()
  }

  on(ev, cb) {
    this.emitter.addListener(ev, cb)
  }

  send(data) {
    let packet = ''
    packet += `:${data[0]}\r\n`
    packet += `+${data[1]}\r\n`
    packet += `:${data[2]}\r\n`
    packet += `+${data[3]}\r\n`
    this.client.write(Buffer.from(packet))
  }

  beAWorker() {
    this.send([BE_A_WORKER, this.queueName, 0, ''])
  }

  requestAWorker(jobId, d) {
    this.send([
      BE_A_JOB,
      this.queueName,
      jobId,
      JSON.stringify({ d }),
    ])
  }

  reportResult(jobId, d) {
    this.send([
      BE_A_RESULT,
      this.queueName,
      jobId,
      JSON.stringify({ d }),
    ])
  }

  reportProgress(jobId, d) {
    this.send([
      BE_A_PROGRESS,
      this.queueName,
      jobId,
      JSON.stringify({ d }),
    ])
  }

  waitForData() {
    this.client.on('data', (data) => {
      this.buffer += data.toString()
      let elems = []
      while (this.buffer.split('\r\n').length >= 4) {
        for (let i = 0; i < 4; i += 1) {
          const sepIndex = this.buffer.indexOf('\r\n')
          elems = this.buffer[0] === ':'
            ? elems.concat([parseInt(this.buffer.slice(1, sepIndex), 10)])
            : elems.concat([this.buffer.slice(1, sepIndex)])
          this.buffer = this.buffer.slice(sepIndex + 2)
        }
        const [opcode, queueName, jobId, jobData] = elems
        if (queueName === this.queueName) {
          const { d } = JSON.parse(jobData)
          switch (opcode) {
            case PROCESS_IT: {
              this.emitter.emit('job:process', jobId, d)
              break
            }
            case DONE_IT: {
              this.emitter.emit(`job:done:${jobId}`, d)
              break
            }
            case PROGRESS_IT: {
              this.emitter.emit(`job:progress:${jobId}`, d)
              break
            }
            default: {
              break
            }
          }
        }
      }
    })
  }
}

module.exports = Protocol
