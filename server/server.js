const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PROXY_PORT || 8080;

if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     🚀 OpenAI Realtime API プロキシサーバー                ║');
console.log('║     📝 Nodemon テスト: 自動再起動確認中...                 ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log(`\n🔑 APIキー: ${OPENAI_API_KEY.substring(0, 7)}...${OPENAI_API_KEY.substring(OPENAI_API_KEY.length - 4)}`);

// Create HTTP server
const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OpenAI Realtime API Proxy Server\n');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// メッセージタイプの日本語マッピング
const messageTypeJapanese = {
  'session.created': 'セッション作成',
  'session.updated': 'セッション更新',
  'input_audio_buffer.append': '音声データ送信',
  'input_audio_buffer.speech_started': '音声認識開始',
  'input_audio_buffer.speech_stopped': '音声認識停止',
  'input_audio_buffer.committed': '音声バッファ確定',
  'conversation.item.created': '会話アイテム作成',
  'response.created': '応答作成',
  'response.done': '応答完了',
  'response.audio.delta': '音声データ受信',
  'response.audio_transcript.delta': '文字起こし受信',
  'response.function_call_arguments.delta': '関数呼び出し',
  'response.output_item.added': '出力アイテム追加',
  'response.content_part.added': 'コンテンツ追加',
  'conversation.item.input_audio_transcription.completed': '音声認識完了',
  'error': 'エラー'
};

// 音声データカウンター
let audioDataCounter = 0;
let sessionStartTime = null;

wss.on('connection', (clientWs, req) => {
  const clientInfo = req.headers.origin || '不明';
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 新しいクライアントが接続しました`);
  console.log(`📍 接続元: ${clientInfo}`);
  console.log(`⏰ 時刻: ${new Date().toLocaleString('ja-JP')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  audioDataCounter = 0;
  sessionStartTime = Date.now();
  
  // Connect to OpenAI Realtime API
  const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-5-mini', {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  });

  let isConnected = false;

  openaiWs.on('open', () => {
    console.log('\n🔗 【接続成功】 OpenAI Realtime APIに接続しました');
    isConnected = true;
  });

  openaiWs.on('message', (data) => {
    // Forward messages from OpenAI to client
    if (clientWs.readyState === WebSocket.OPEN) {
      try {
        const message = JSON.parse(data.toString());
        const messageTypeJp = messageTypeJapanese[message.type] || message.type;
        const timestamp = new Date().toLocaleTimeString('ja-JP');
        
        // メッセージの種類によって表示を分ける
        if (message.type === 'error') {
          console.log(`\n❌ [${timestamp}] 【エラー】 ${message.error?.message || 'エラーが発生しました'}`);
        } else if (message.type === 'response.created') {
          console.log(`\n💬 [${timestamp}] 【応答開始】 AIがメッセージを生成中...`);
        } else if (message.type === 'response.done') {
          console.log(`✅ [${timestamp}] 【応答完了】 AIの応答が完了しました`);
        } else if (message.type === 'input_audio_buffer.speech_started') {
          console.log(`\n👂 [${timestamp}] 【音声検出】 ユーザーが話し始めました`);
        } else if (message.type === 'input_audio_buffer.speech_stopped') {
          console.log(`🤐 [${timestamp}] 【音声終了】 ユーザーが話し終わりました`);
        } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
          const transcript = message.transcript || '';
          if (transcript) {
            console.log(`📝 [${timestamp}] 【認識結果】 「${transcript}」`);
          }
        } else if (message.type === 'response.audio_transcript.delta') {
          // 音声文字起こしは後でまとめて表示するため、ここでは表示しない
        } else if (message.type.includes('audio.delta')) {
          // 音声データの送受信は表示しない（多すぎるため）
        } else if (!message.type.includes('.delta')) {
          // その他の重要なメッセージのみ表示
          console.log(`📥 [${timestamp}] ${messageTypeJp}`);
        }
        clientWs.send(data.toString());
      } catch (err) {
        console.error('Error parsing OpenAI message:', err);
        clientWs.send(data.toString());
      }
    }
  });

  openaiWs.on('error', (error) => {
    console.error('\n🚨 OpenAI WebSocketエラー:', error.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'error',
        error: {
          type: 'connection_error',
          message: 'Failed to connect to OpenAI Realtime API',
          details: error.message
        }
      }));
    }
  });

  openaiWs.on('close', (code, reason) => {
    const duration = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : 0;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔌 【接続終了】 OpenAI接続が切断されました');
    console.log(`  📊 セッション統計:`);
    console.log(`     - 接続時間: ${minutes}分${seconds}秒`);
    console.log(`     - 音声データ: ${audioDataCounter}チャンク`);
    console.log(`     - 終了コード: ${code}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    isConnected = false;
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code, reason);
    }
  });

  // Handle messages from client
  clientWs.on('message', (data) => {
    // Forward messages from client to OpenAI
    if (openaiWs.readyState === WebSocket.OPEN) {
      try {
        const message = JSON.parse(data.toString());
        const messageTypeJp = messageTypeJapanese[message.type] || message.type;
        const timestamp = new Date().toLocaleTimeString('ja-JP');
        
        // 音声データ送信をカウント
        if (message.type === 'input_audio_buffer.append') {
          audioDataCounter++;
          // 50回ごとにまとめて表示（ノイズを減らす）
          if (audioDataCounter % 50 === 0) {
            console.log(`🎤 [${timestamp}] 音声データ送信中... (${audioDataCounter}チャンク)`);
          }
        } else {
          // 重要なメッセージのみ表示
          if (message.type === 'session.update') {
            console.log(`⚙️  [${timestamp}] 【設定更新】 セッション設定を更新しました`);
          } else if (!message.type.includes('audio')) {
            console.log(`📤 [${timestamp}] ${messageTypeJp}`);
          }
        }
        openaiWs.send(data.toString());
      } catch (err) {
        console.error('Error parsing client message:', err);
        openaiWs.send(data.toString());
      }
    } else {
      // WebSocketの状態に応じて適切なメッセージを表示
      if (openaiWs.readyState === WebSocket.CONNECTING) {
        // 接続中の場合は待機メッセージ（エラーは送信しない）
        if (audioDataCounter % 10 === 0) {
          console.log(`⏳ OpenAI接続待機中... 状態: CONNECTING`);
        }
      } else {
        console.log(`❌ OpenAI WebSocketが準備できていません。状態: ${openaiWs.readyState}`);
        if (!isConnected) {
          clientWs.send(JSON.stringify({
            type: 'error',
            error: {
              type: 'connection_error',
              message: 'Not connected to OpenAI Realtime API. Please wait for connection to establish.'
            }
          }));
        }
      }
    }
  });

  clientWs.on('error', (error) => {
    console.error('Client WebSocket error:', error);
  });

  clientWs.on('close', (code, reason) => {
    console.log(`\n👋 クライアントが切断されました`);
    console.log(`  コード: ${code}`);
    console.log(`  理由: ${reason.toString() || '不明'}`);
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.close();
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n✨ プロキシサーバーが起動しました!`);
  console.log(`\n📡 HTTPサーバー:        http://localhost:${PORT}`);
  console.log(`🔌 WebSocketエンドポイント: ws://localhost:${PORT}/realtime`);
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              🎧 音声対話の準備が完了しました                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
});

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 プロキシサーバーをシャットダウン中...');
  wss.clients.forEach((client) => {
    client.close();
  });
  server.close(() => {
    console.log('✅ サーバーが正常に終了しました');
    process.exit(0);
  });
});