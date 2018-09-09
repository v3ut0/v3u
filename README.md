## Why v3u
[bee-queue](https://github.com/bee-queue/bee-queue), [kue](https://github.com/Automattic/kue), [bull](https://github.com/OptimalBits/bull)
they did a great job. Their speed are increased by `pipeline` and `lua` scripts. However, there is room for improvement:
- `Redis` does not natively support job-queue, thus library logic is complex and inefficient
- `Pipeline` and `lua` scripts can not completely remove round trip times, for example: library sends `blrpoplpush` command to server
every job.
- It is hard to monitor job's meta data from library: execution time, number of queues, ...
- It is hard to convert the library vto other languages
## Benchmark
These basic benchmarks ran 10,000 jobs through each library, Node (v10.5.0), system: MacOS 10.13, ram 8G, processor 2G intel core i5.
The number shown are average of 10 runs.
- bee-queue: 3017.1725 ms
- v3u: 2144.2959 ms
## Start Cheetah job server
Read document at [cheetah](https://github.com/v3ut0/cheetah)
## Get started
```bash
yarn add v3u
```

Create a queue:

```node
const { Queue } = require('v3u')
const queue = new Queue('mul', {
  uri: 'cheetah://localhost:1991',
})
```
Create a worker:

```node
queue.process(({ x, y}, done, progress) => {
  done(null, x * y);
})
```
Create a producer:

```node
queue.createJob({x: 2, y: 3}, (value) => {
  // job done, value = 6
}, (p) => {
  // job progress, is called multiple times
})
```
