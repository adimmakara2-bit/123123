import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection, MediaConnection } from 'peerjs';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Send, 
  Copy, 
  Check, 
  User, 
  MessageSquare, 
  X, 
  Mic, 
  MicOff,
  Monitor,
  Settings,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Message } from './types';

export default function App() {
  const [myId, setMyId] = useState<string>('');
  const [peerIdInput, setPeerIdInput] = useState<string>('');
  const [connectedPeerId, setConnectedPeerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [callAccepted, setCallAccepted] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Peer
  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setMyId(id);
    });

    peer.on('connection', (conn) => {
      connRef.current = conn;
      setConnectedPeerId(conn.peer);
      setupConnection(conn);
    });

    peer.on('call', (call) => {
      callRef.current = call;
      setIsReceivingCall(true);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setError(`Connection error: ${err.type}`);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      peer.destroy();
    };
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const setupConnection = (conn: DataConnection) => {
    conn.on('data', (data: any) => {
      if (data.type === 'chat') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'peer',
            text: data.text,
            timestamp: Date.now(),
          },
        ]);
      }
    });

    conn.on('close', () => {
      setConnectedPeerId(null);
      connRef.current = null;
    });
  };

  const connectToPeer = () => {
    if (!peerIdInput || !peerRef.current) return;
    
    const conn = peerRef.current.connect(peerIdInput);
    connRef.current = conn;
    
    conn.on('open', () => {
      setConnectedPeerId(peerIdInput);
      setupConnection(conn);
    });
  };

  const sendMessage = () => {
    if (!inputText.trim() || !connRef.current) return;

    const msg: Message = {
      id: Date.now().toString(),
      sender: 'me',
      text: inputText,
      timestamp: Date.now(),
    };

    connRef.current.send({ type: 'chat', text: inputText });
    setMessages((prev) => [...prev, msg]);
    setInputText('');
  };

  const startCall = async (video: boolean = true) => {
    if (!connectedPeerId || !peerRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const call = peerRef.current.call(connectedPeerId, stream);
      callRef.current = call;
      setIsCalling(true);

      call.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        setCallAccepted(true);
      });

      call.on('close', endCall);
    } catch (err) {
      console.error('Failed to get local stream', err);
      setError('Could not access camera/microphone');
    }
  };

  const answerCall = async () => {
    if (!callRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      callRef.current.answer(stream);
      setIsReceivingCall(false);
      setCallAccepted(true);
      setIsCalling(true);

      callRef.current.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });

      callRef.current.on('close', endCall);
    } catch (err) {
      console.error('Failed to get local stream', err);
      setError('Could not access camera/microphone');
    }
  };

  const endCall = () => {
    callRef.current?.close();
    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setIsCalling(false);
    setIsReceivingCall(false);
    setCallAccepted(false);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
      setIsVideoOff(!isVideoOff);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(myId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-black/5 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Zap size={24} />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">PeerConnect</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#9e9e9e] font-bold">P2P Secure Communication</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-[#f0f0f0] px-3 py-1.5 rounded-full border border-black/5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-xs font-medium text-[#4a4a4a]">End-to-End Encrypted</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
            <User size={18} />
          </div>
        </div>
      </header>

      <main className="pt-24 pb-8 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-6rem)]">
        {/* Left Panel: Connection & Profile */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
          {/* My ID Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
            <h2 className="text-sm font-semibold text-[#9e9e9e] uppercase tracking-wider mb-4">Your Connection ID</h2>
            <div className="flex items-center gap-3 bg-[#f9f9f9] p-4 rounded-2xl border border-black/5 group">
              <code className="flex-1 font-mono text-sm truncate text-[#4a4a4a]">
                {myId || 'Generating...'}
              </code>
              <button 
                onClick={copyToClipboard}
                className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-black/5 active:scale-95"
              >
                {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} className="text-[#9e9e9e]" />}
              </button>
            </div>
            <p className="mt-4 text-xs text-[#9e9e9e] leading-relaxed">
              Share this ID with someone to start a private conversation. No data passes through our servers.
            </p>
          </div>

          {/* Connect Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5">
            <h2 className="text-sm font-semibold text-[#9e9e9e] uppercase tracking-wider mb-4">Connect to Peer</h2>
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Enter Peer ID..."
                  value={peerIdInput}
                  onChange={(e) => setPeerIdInput(e.target.value)}
                  className="w-full bg-[#f9f9f9] border border-black/5 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                />
              </div>
              <button 
                onClick={connectToPeer}
                disabled={!peerIdInput || !!connectedPeerId}
                className="w-full bg-[#1a1a1a] text-white rounded-2xl py-3.5 font-medium text-sm hover:bg-[#333] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-black/10"
              >
                <Zap size={16} />
                {connectedPeerId ? 'Connected' : 'Establish Link'}
              </button>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 flex-1">
            <h2 className="text-sm font-semibold text-[#9e9e9e] uppercase tracking-wider mb-4">Connection Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f9f9f9] border border-black/5">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", connectedPeerId ? "bg-emerald-500" : "bg-amber-500")} />
                  <span className="text-sm font-medium">{connectedPeerId ? 'Active Session' : 'Waiting for Peer'}</span>
                </div>
                {connectedPeerId && (
                  <button onClick={() => setConnectedPeerId(null)} className="text-[#9e9e9e] hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </div>
              
              {connectedPeerId && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <p className="text-xs text-emerald-700 font-medium mb-1">Peer Identity</p>
                  <p className="text-sm font-mono text-emerald-900 truncate">{connectedPeerId}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Chat & Video */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-full relative">
          <AnimatePresence>
            {isCalling ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-40 bg-black rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
              >
                {/* Video Area */}
                <div className="flex-1 relative bg-[#0a0a0a]">
                  {/* Remote Video (Full Screen) */}
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Local Video (PIP) */}
                  <div className="absolute bottom-6 right-6 w-48 aspect-video bg-[#1a1a1a] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
                    <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover"
                    />
                    {isVideoOff && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
                        <VideoOff size={24} className="text-white/40" />
                      </div>
                    )}
                  </div>

                  {/* Call Info */}
                  <div className="absolute top-8 left-8 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white text-xs font-medium tracking-wide">LIVE CALL • {callAccepted ? 'CONNECTED' : 'RINGING...'}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="bg-[#0a0a0a] p-8 flex items-center justify-center gap-6 border-t border-white/5">
                  <button 
                    onClick={toggleMute}
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center transition-all border",
                      isMuted ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    )}
                  >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                  <button 
                    onClick={toggleVideo}
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center transition-all border",
                      isVideoOff ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                    )}
                  >
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                  </button>
                  <button 
                    onClick={endCall}
                    className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-90"
                  >
                    <PhoneOff size={28} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col h-full bg-white rounded-[2.5rem] shadow-sm border border-black/5 overflow-hidden">
                {/* Chat Header */}
                <div className="px-8 py-6 border-b border-black/5 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{connectedPeerId ? 'Secure Channel' : 'No Active Session'}</h3>
                      <p className="text-xs text-[#9e9e9e] font-medium uppercase tracking-wider">
                        {connectedPeerId ? `PEER: ${connectedPeerId.slice(0, 8)}...` : 'Select a peer to start chatting'}
                      </p>
                    </div>
                  </div>

                  {connectedPeerId && (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => startCall(false)}
                        className="p-3 hover:bg-[#f5f5f5] rounded-2xl transition-all text-[#4a4a4a] border border-transparent hover:border-black/5"
                      >
                        <Phone size={20} />
                      </button>
                      <button 
                        onClick={() => startCall(true)}
                        className="p-3 bg-emerald-500 text-white rounded-2xl transition-all hover:bg-emerald-600 shadow-lg shadow-emerald-200 active:scale-95"
                      >
                        <Video size={20} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#fcfcfc]">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <div className="w-20 h-20 bg-[#f0f0f0] rounded-full flex items-center justify-center mb-4">
                        <Zap size={32} />
                      </div>
                      <p className="text-sm font-medium">No messages yet.<br/>Your conversation is private and temporary.</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={cn(
                          "flex flex-col max-w-[80%]",
                          msg.sender === 'me' ? "ml-auto items-end" : "items-start"
                        )}
                      >
                        <div 
                          className={cn(
                            "px-5 py-3.5 rounded-3xl text-sm leading-relaxed shadow-sm",
                            msg.sender === 'me' 
                              ? "bg-[#1a1a1a] text-white rounded-tr-none" 
                              : "bg-white border border-black/5 text-[#1a1a1a] rounded-tl-none"
                          )}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-[#9e9e9e] mt-2 font-medium uppercase tracking-widest">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-8 bg-white border-t border-black/5">
                  <div className="flex items-center gap-4 bg-[#f9f9f9] border border-black/5 rounded-3xl p-2 pl-6 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/50 transition-all">
                    <input 
                      type="text" 
                      placeholder={connectedPeerId ? "Type your message..." : "Connect to a peer first"}
                      disabled={!connectedPeerId}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1 bg-transparent border-none focus:outline-none text-sm py-3"
                    />
                    <button 
                      onClick={sendMessage}
                      disabled={!inputText.trim() || !connectedPeerId}
                      className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 active:scale-90"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Incoming Call Overlay */}
      <AnimatePresence>
        {isReceivingCall && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-6"
          >
            <div className="bg-white rounded-3xl p-6 shadow-2xl border border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 animate-bounce">
                  <Phone size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Incoming Call</h4>
                  <p className="text-xs text-[#9e9e9e] font-medium uppercase tracking-wider">Peer is calling you...</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={endCall}
                  className="w-12 h-12 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-200 transition-all"
                >
                  <X size={24} />
                </button>
                <button 
                  onClick={answerCall}
                  className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
                >
                  <Check size={24} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-24 right-8 z-[100]"
          >
            <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3">
              <X size={18} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}
