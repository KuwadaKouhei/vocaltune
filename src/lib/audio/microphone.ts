import { FFT_SIZE } from "@/lib/pitch/detector";

export interface MicrophoneHandle {
  analyser: AnalyserNode;
  audioContext: AudioContext;
  stream: MediaStream;
}

/**
 * マイク入力を取得し、AudioContext → MediaStreamSource → AnalyserNode のチェーンを構築
 * エコーキャンセル/ノイズサプレッション/オートゲイン すべてOFF（DAW的な生音入力）
 */
export async function startMicrophone(): Promise<MicrophoneHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  const audioContext = new AudioContext();

  // ブラウザのAutoplay Policyにより suspended の場合がある
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = FFT_SIZE;

  source.connect(analyser);

  return { analyser, audioContext, stream };
}

/**
 * マイク入力を停止し、リソースを解放
 */
export async function stopMicrophone(handle: MicrophoneHandle): Promise<void> {
  handle.stream.getTracks().forEach((track) => track.stop());
  await handle.audioContext.close();
}
