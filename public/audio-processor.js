// AudioWorklet processor for real-time audio processing
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input[0]) {
      const inputData = input[0];
      
      // バッファにデータを蓄積
      for (let i = 0; i < inputData.length; i++) {
        this.buffer[this.bufferIndex++] = inputData[i];
        
        // バッファが満杯になったら送信
        if (this.bufferIndex >= this.bufferSize) {
          this.port.postMessage({
            type: 'audio',
            buffer: this.buffer.slice(0, this.bufferSize)
          });
          this.bufferIndex = 0;
        }
      }
    }
    
    return true; // プロセッサを継続
  }
}

registerProcessor('audio-processor', AudioProcessor);