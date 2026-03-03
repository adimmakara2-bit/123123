export interface Message {
  id: string;
  sender: 'me' | 'peer';
  text: string;
  timestamp: number;
}

export interface PeerState {
  id: string;
  connected: boolean;
  peerId: string;
  messages: Message[];
  isCalling: boolean;
  isReceivingCall: boolean;
  callAccepted: boolean;
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
}
