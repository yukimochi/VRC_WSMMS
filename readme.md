# YUKIMOCHI VRChat WebSocket Multimedia Streaming

## これはなに？
VRChat WebPanelのためのリアルタイム音声ストリーミングサーバです。

## 特徴
 - Web Audio API 使用
 - Adobe Flash Player 不要
 - 空間音響に対応
 - Sound FX で音量変更可能

## 使い方

### staticファイルの変更

`static/listener.html`, `static/publisher.html` の `script` 冒頭の以下の変数を環境に合わせて変更します。

````
        const BUFFER_SIZE = 2048;
        const SAMPLING_RATE = 48000; // Listener.html のみ
        const SERVER = "ws://localhost/websocket";
````

 - BUFFER_SIZE - 小さいほど低遅延ですが、不安定になります。
 - SAMPLING_RATE - 配信ソースのサンプリングレートを記載します。
 - SERVER - `localhost` をあなたのサーバのアドレスに変更します。

### 中継サーバ

`docker-compose` を用いて、 Websocket Server を起動します。

### 配信

`publisher.html` を Firefox, Chrome で実行し `getUserMedia` により配信します。

### 視聴

`listener.html` を VRChat WebPanel, Firefox, Chrome で実行すると視聴できます。
