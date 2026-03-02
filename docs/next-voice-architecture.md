# Next.js音声対話システムアーキテクチャ

## 概要
Pipecatを使用せず、Next.jsのみで音声対話システムを実装する方法

## システム構成

### フロントエンド（React）
```typescript
// 1. Web Audio APIを使用した音声入力
const mediaRecorder = new MediaRecorder(stream);
mediaRecorder.ondataavailable = (event) => {
  // 音声データをバックエンドに送信
  sendAudioToBackend(event.data);
};

// 2. 音声再生
const audio = new Audio();
audio.src = audioUrl;
audio.play();
```

### バックエンド（Next.js API Routes）

#### /api/speech-to-text
```typescript
export async function POST(request: Request) {
  const audioBlob = await request.blob();
  
  // OpenAI Whisper APIに送信
  const transcription = await openai.audio.transcriptions.create({
    file: audioBlob,
    model: "whisper-1",
  });
  
  return Response.json({ text: transcription.text });
}
```

#### /api/analyze-vision
```typescript
export async function POST(request: Request) {
  const { text, image } = await request.json();
  
  // GPT-4Vで画像分析
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [{
      role: "user",
      content: [
        { type: "text", text },
        { type: "image_url", image_url: { url: image } }
      ]
    }]
  });
  
  return Response.json({ analysis: response.choices[0].message.content });
}
```

#### /api/text-to-speech
```typescript
export async function POST(request: Request) {
  const { text } = await request.json();
  
  // OpenAI TTS APIで音声合成
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: text,
  });
  
  const buffer = Buffer.from(await mp3.arrayBuffer());
  return new Response(buffer, {
    headers: { "Content-Type": "audio/mpeg" }
  });
}
```

## リアルタイム通信の実装

### WebSocketを使用
```typescript
// pages/api/socket.ts
import { Server } from 'socket.io';

export default function SocketHandler(req, res) {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  io.on('connection', socket => {
    socket.on('audio-stream', async (audioData) => {
      // リアルタイム音声処理
      const transcription = await processAudio(audioData);
      socket.emit('transcription', transcription);
    });
  });

  res.end();
}
```

### Server-Sent Events（SSE）を使用
```typescript
// 代替案：SSEでストリーミング
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // OpenAI Streaming API
      const stream = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [...],
        stream: true,
      });

      for await (const chunk of stream) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
        );
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## 実装の流れ

1. **音声入力**: MediaRecorder APIで音声を録音
2. **音声認識**: Whisper APIで文字起こし
3. **画像分析**: 必要に応じてGPT-4Vで画像を分析
4. **応答生成**: GPT-4で応答を生成
5. **音声合成**: TTS APIで音声に変換
6. **音声出力**: Audio APIで再生

## メリット

- **統一されたスタック**: Next.jsのみで完結
- **型安全性**: TypeScriptによる型チェック
- **簡単なデプロイ**: Vercelに直接デプロイ可能
- **コスト効率**: サーバーレス関数で必要な時だけ実行
- **柔軟性**: 各コンポーネントを独立して最適化可能

## 考慮事項

- **レイテンシ**: 各APIコールのレイテンシを最小化
- **エラーハンドリング**: 各ステップでの適切なエラー処理
- **セキュリティ**: APIキーの安全な管理
- **スケーラビリティ**: 同時接続数の制限に注意