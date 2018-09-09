const Emitter = require('./emitter')

const BE_A_WORKER = 0
const BE_A_JOB = 1
const BE_A_RESULT = 2
const BE_A_PROGRESS = 3
const PROCESS_IT = 100
const DONE_IT = 101
const PROGRESS_IT = 102

class Protocol extends Emitter {
  constructor(client, queueName) {
    super()
    this.client = client
    this.queueName = queueName
    this.buffer = ''
    this.elems = []
    this.eventHandlers = {
      [PROCESS_IT]: (jobId, d) => this.emitter.emit('job:process', jobId, d),
      [DONE_IT]: (jobId, d) => this.emitter.emit(`job:done:${jobId}`, d),
      [PROGRESS_IT]: (jobId, d) => this.emitter.emit(`job:progress:${jobId}`, d),
    }
    this.waitForData()
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
    this.client.on('data', (buf) => {
      this.buffer += buf.toString()
      while (this.buffer.includes('\r\n')) {
        const sepIndex = this.buffer.indexOf('\r\n') + 2
        const data = this.buffer.slice(0, sepIndex)
        const content = data.slice(1, data.length - 2)
        const [prefix] = data
        const elem = prefix === ':' ? parseInt(content, 10) : content
        this.elems.push(elem)
        this.buffer = this.buffer.slice(sepIndex)
      }
      while (this.elems.length >= 4) {
        const [opcode, queueName, jobId, jobData] = this.elems
        this.eventHandlers[opcode](jobId, JSON.parse(jobData).d)
        this.elems = this.elems.slice(4)
      }
    })
  }
}

module.exports = Protocol
