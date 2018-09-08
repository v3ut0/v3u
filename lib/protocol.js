const { EventEmitter } = require('fbemitter')

const BE_A_WORKER = 0
const BE_A_JOB = 1
const BE_A_RESULT = 2
const BE_A_PROGRESS = 3
const PROCESS_IT = 100
const DONE_IT = 101
const PROGRESS_IT = 102

const decomposeElems = (buffer, separator, maxSize) => {
  const elemSizes = []
  const bufLen = buffer.length
  const sepLen = separator.length
  let prevIndex = 0
  for (let i = 0; i < bufLen - sepLen + 1; i += 1) {
    if (buffer.slice(i, sepLen + i) === separator) {
      elemSizes.push(i + sepLen - prevIndex)
      prevIndex = i + sepLen
      if (elemSizes.length === maxSize) break
    }
  }
  return elemSizes
}

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
      let elemSizes = decomposeElems(this.buffer, '\r\n', 4)
      while (elemSizes.length >= 4) {
        const elems = []
        elemSizes.forEach((elemSize) => {
          const content = this.buffer.slice(1, elemSize - 2)
          if (this.buffer[0] === ':') elems.push(parseInt(content, 10))
          if (this.buffer[0] === '+') elems.push(content)
          this.buffer = this.buffer.slice(elemSize)
        })
        if (elems.length === 4) {
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
        elemSizes = decomposeElems(this.buffer, '\r\n', 4)
      }
    })
  }
}

module.exports = Protocol
