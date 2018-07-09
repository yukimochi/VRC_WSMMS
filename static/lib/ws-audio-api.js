//  This module is based Ivan-Feofanov/ws-audio-api.
//  Modified for VRC_WSMMS by YUKIMOCHI.

//  WebSockets Audio API
//
//  Opus Quality Settings
//  =====================
//  App: 2048=voip, 2049=audio, 2051=low-delay
//  Sample Rate: 8000, 12000, 16000, 24000, or 48000
//  Frame Duration: 2.5, 5, 10, 20, 40, 60
//  Buffer Size = sample rate/6000 * 1024

(function (global) {
    var defaultConfig = {
        codec: {
            sampleRate: 48000,
            channels: 2,
            app: 2049,
            frameDuration: 2.5,
            bufferSize: 8192
        },
        server: "ws://localhost/websocket"
    };

    var audioContext = new (window.AudioContext || window.webkitAudioContext)();

    var WSAudioAPI = global.WSAudioAPI = {
        Player: function (config, protocol) {
            this.config = {};
            this.config.codec = config.codec || defaultConfig.codec;
            this.config.server = config.server || defaultConfig.server;
            this.protocol = protocol;
            this.sampler = new Resampler(this.config.codec.sampleRate, 48000, 2, this.config.codec.bufferSize);
            this.decoder = new OpusDecoder(this.config.codec.sampleRate, this.config.codec.channels);
            this.silence = new Float32Array(this.config.codec.bufferSize);
        },
        Streamer: function (config, protocol) {
            this.config = {};
            this.config.codec = config.codec || defaultConfig.codec;
            this.config.server = config.server || defaultConfig.server;
            this.protocol = protocol;
            this.sampler = new Resampler(48000, this.config.codec.sampleRate, 2, this.config.codec.bufferSize);
            this.encoder = new OpusEncoder(this.config.codec.sampleRate, this.config.codec.channels, this.config.codec.app, this.config.codec.frameDuration);
            var _this = this;
            this._makeStream = function (onError) {
                navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                    }
                })
                    .then(function (stream) {
                        _this.stream = stream;
                        _this.audioInput = audioContext.createMediaStreamSource(stream);
                        _this.gainNode = audioContext.createGain();
                        _this.recorder = audioContext.createScriptProcessor(_this.config.codec.bufferSize / 2, 2, 2);
                        _this.recorder.onaudioprocess = function (e) {
                            var l_buffer = e.inputBuffer.getChannelData(0);
                            var r_buffer = e.inputBuffer.getChannelData(1);
                            var buffer = new Float32Array(_this.config.codec.bufferSize);
                            for (var i = 0; i < _this.config.codec.bufferSize; i++) {
                                buffer[i * 2] = l_buffer[i];
                                buffer[i * 2 + 1] = r_buffer[i];
                            }
                            var resampled = _this.sampler.resampler(buffer);
                            var packets = _this.encoder.encode_float(resampled);
                            for (var i = 0; i < packets.length; i++) {
                                if (_this.socket.readyState == 1) _this.socket.send(packets[i]);
                            }
                        };
                        _this.audioInput.connect(_this.gainNode);
                        _this.gainNode.connect(_this.recorder);
                        _this.recorder.connect(audioContext.destination);
                    }).catch(function (e) {
                        console.error('FAILED Activate Audio Device.', e);
                        return;
                    });
            }
        }
    };

    WSAudioAPI.Player.prototype.start = function () {
        var _this = this;

        this.audioQueue = {
            buffer: new Float32Array(0),

            write: function (newAudio) {
                var currentQLength = this.buffer.length;
                newAudio = _this.sampler.resampler(newAudio);
                var newBuffer = new Float32Array(currentQLength + newAudio.length);
                newBuffer.set(this.buffer, 0);
                newBuffer.set(newAudio, currentQLength);
                this.buffer = newBuffer;
            },

            read: function (nSamples) {
                var samplesToPlay = this.buffer.subarray(0, nSamples);
                this.buffer = this.buffer.subarray(nSamples, this.buffer.length);
                return samplesToPlay;
            },

            length: function () {
                return this.buffer.length;
            }
        };

        this.scriptNode = audioContext.createScriptProcessor(this.config.codec.bufferSize / 2, 2, 2);
        this.scriptNode.onaudioprocess = function (e) {
            if (_this.audioQueue.length()) {
                var buffer = _this.audioQueue.read(_this.config.codec.bufferSize);

                var l_buffer = new Float32Array(_this.config.codec.bufferSize / 2)
                var r_buffer = new Float32Array(_this.config.codec.bufferSize / 2)
                for (var i = 0; i < _this.config.codec.bufferSize / 2; i++) {
                    l_buffer[i] = buffer[i * 2];
                    r_buffer[i] = buffer[i * 2 + 1];
                }
                e.outputBuffer.getChannelData(0).set(l_buffer);
                e.outputBuffer.getChannelData(1).set(r_buffer);
            } else {
                e.outputBuffer.getChannelData(0).set(_this.silence);
                e.outputBuffer.getChannelData(1).set(_this.silence);
            }
        };
        this.gainNode = audioContext.createGain();
        this.scriptNode.connect(this.gainNode);
        this.gainNode.connect(audioContext.destination);

        this.socket = new WebSocket(this.config.server, this.protocol);
        var _onmessage = this.parentOnmessage = this.socket.onmessage;
        this.socket.onmessage = function (message) {
            if (_onmessage) {
                _onmessage(message);
            }
            if (message.data instanceof Blob) {
                var reader = new FileReader();
                reader.onload = function () {
                    _this.audioQueue.write(_this.decoder.decode_float(reader.result));
                };
                reader.readAsArrayBuffer(message.data);
            }
        };
    };

    WSAudioAPI.Streamer.prototype.start = function (onError) {
        var _this = this;
        this.socket = new WebSocket(this.config.server, this.protocol);
        this.socket.binaryType = 'arraybuffer';

        if (this.socket.readyState == WebSocket.OPEN) {
            this._makeStream(onError);
        } else if (this.socket.readyState == WebSocket.CONNECTING) {
            var _onopen = this.socket.onopen;
            this.socket.onopen = function () {
                if (_onopen) {
                    _onopen();
                }
                _this._makeStream(onError);
            }
        } else {
            console.error('Socket is in CLOSED state');
        }

        var _onclose = this.socket.onclose;
        this.socket.onclose = function () {
            if (_onclose) {
                _onclose();
            }
            if (_this.audioInput) {
                _this.audioInput.disconnect();
                _this.audioInput = null;
            }
            if (_this.gainNode) {
                _this.gainNode.disconnect();
                _this.gainNode = null;
            }
            if (_this.recorder) {
                _this.recorder.disconnect();
                _this.recorder = null;
            }
            _this.stream.getTracks()[0].stop();
            console.log('Disconnected from server');
        };
    };

})(window);